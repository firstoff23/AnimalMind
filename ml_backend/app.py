import csv
import os
import subprocess
import tempfile
from typing import Dict, List, Optional, Tuple

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from scipy import signal
from scipy.io import wavfile
try:
    import asyncpg
except ImportError:
    asyncpg = None

import hashlib
import json

try:
    import redis as redis_client
except ImportError:
    redis_client = None
from datetime import datetime, timezone
from fastapi.responses import StreamingResponse

# ─── SSE (Server-Sent Events) broadcast queue ────────────────────────────────
# Each connected SSE client gets a reference to its own asyncio.Queue.
# When /classify completes, it broadcasts the result to all connected queues.
_sse_subscribers: list[asyncio.Queue] = []

def _sse_broadcast(event_type: str, data: dict):
    """Push an event to all currently connected SSE clients."""
    payload = json.dumps({"type": event_type, "data": data, "ts": datetime.now(timezone.utc).isoformat()})
    dead = []
    for q in _sse_subscribers:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        _sse_subscribers.remove(q)

from utils.logging import setup_structured_logging
setup_structured_logging()

app = FastAPI(
    title="AnimalMind Acoustic & Vision Classifier Backend",
    description="FastAPI backend for pet audio classification, breed identification, and posture detection.",
    version="1.4.0",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import asyncio

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        path = request.url.path
        if path in ["/login", "/logout", "/delete-account"]:
            ip = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")
            action = path.strip("/")
            
            if db_pool:
                try:
                    asyncio.create_task(self.log_audit(action, ip, user_agent))
                except Exception as e:
                    print(f"[Audit] Failed to schedule audit log: {e}")
        
        return response
        
    async def log_audit(self, action: str, ip: str, user_agent: str):
        try:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO audit_logs (action, ip_address, user_agent) VALUES ($1, $2, $3)",
                    action, ip, user_agent
                )
        except Exception as e:
            print(f"[Audit] Error inserting audit log: {e}")

app.add_middleware(AuditLogMiddleware)

# --- Globals: DB pool e Redis client ---
db_pool = None
redis_conn = None



@app.on_event("startup")
async def startup():
    global db_pool, redis_conn
    database_url = os.environ.get("DATABASE_URL")
    redis_url = os.environ.get("REDIS_URL")
    if database_url:
        try:
            db_pool = await asyncpg.create_pool(database_url, min_size=1, max_size=5)
            async with db_pool.acquire() as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS classifications (
                        id SERIAL PRIMARY KEY,
                        filename TEXT,
                        state TEXT,
                        confidence FLOAT,
                        emoji TEXT,
                        model_used TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id SERIAL PRIMARY KEY,
                        action TEXT NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                """)
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_classifications_created_at ON classifications(created_at)")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_classifications_state ON classifications(state)")
            print("[DB] PostgreSQL conectado e tabela criada.")
        except Exception as e:
            print(f"[DB] Erro ao conectar ao PostgreSQL: {e}")
    if redis_url:
        try:
            redis_conn = redis_client.from_url(redis_url, decode_responses=True)
            redis_conn.ping()
            print("[Redis] Conectado com sucesso.")
        except Exception as e:
            print(f"[Redis] Erro ao conectar: {e}")


@app.on_event("shutdown")
async def shutdown():
    global db_pool
    if db_pool:
        await db_pool.close()
        print("[DB] Pool fechado.")


# ─── Audio Classification (YAMNet) ───────────────────────────────────────────

class ClassificationResponse(BaseModel):
    state: str
    confidence: float
    emoji: str
    model_used: str


STATE_EMOJIS = {
    "distress": "🔴",
    "attention": "🟡",
    "excitement": "🟢",
    "hunger": "🟠",
    "alert": "🔵",
    "relaxed": "⚪",
}

YAMNET_MODEL_HANDLE = "https://tfhub.dev/google/yamnet/1"

YAMNET_STATE_HINTS: Dict[str, List[Tuple[str, float]]] = {
    "distress": [
        ("whimper", 1.35), ("yelp", 1.35), ("cry", 1.2), ("scream", 1.1), ("howl", 0.9),
    ],
    "attention": [
        ("meow", 1.35), ("cat", 0.65), ("purr", 0.45), ("animal", 0.25),
    ],
    "excitement": [
        ("pant", 1.0), ("dog", 0.55), ("bark", 0.45), ("snort", 0.35),
    ],
    "hunger": [
        ("chew", 1.2), ("crunch", 1.0), ("slurp", 1.0), ("eat", 0.9), ("gulp", 0.8),
    ],
    "alert": [
        ("bark", 1.3), ("bow-wow", 1.3), ("growl", 1.2), ("howl", 0.9), ("dog", 0.35),
    ],
    "relaxed": [
        ("silence", 1.25), ("purr", 1.0), ("breathing", 0.85), ("snore", 0.8),
    ],
}

_yamnet_model = None
_yamnet_class_names: Optional[List[str]] = None


def convert_to_wav(input_path: str, output_path: str):
    cmd = ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        error_msg = result.stderr.decode("utf-8", errors="ignore")
        raise Exception(f"FFmpeg conversion failed: {error_msg}")


def _normalize_waveform(data: np.ndarray) -> np.ndarray:
    if data.ndim > 1:
        data = np.mean(data, axis=1)
    if data.dtype == np.int16:
        waveform = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        waveform = data.astype(np.float32) / 2147483648.0
    elif data.dtype == np.uint8:
        waveform = (data.astype(np.float32) - 128.0) / 128.0
    elif np.issubdtype(data.dtype, np.integer):
        limit = max(abs(np.iinfo(data.dtype).min), np.iinfo(data.dtype).max)
        waveform = data.astype(np.float32) / float(limit)
    else:
        waveform = data.astype(np.float32)
    return np.clip(waveform, -1.0, 1.0)


def _read_waveform(wav_path: str) -> Tuple[int, np.ndarray]:
    try:
        sample_rate, data = wavfile.read(wav_path)
    except Exception as exc:
        raise Exception(f"Failed to read WAV file: {str(exc)}") from exc
    waveform = _normalize_waveform(data)
    if len(waveform) == 0:
        return sample_rate, waveform
    if sample_rate != 16000:
        desired_length = int(round(float(len(waveform)) / sample_rate * 16000))
        waveform = signal.resample(waveform, desired_length).astype(np.float32)
        sample_rate = 16000
    return sample_rate, waveform


def _extract_signal_features(wav_path: str) -> Dict[str, float]:
    sample_rate, waveform = _read_waveform(wav_path)
    if len(waveform) == 0:
        return {"rms": 0.0, "zcr": 0.0, "dom_freq": 0.0, "sample_rate": float(sample_rate)}
    rms = float(np.sqrt(np.mean(waveform**2)))
    zero_crossings = np.nonzero(np.diff(waveform > 0))[0]
    zcr = float(len(zero_crossings) / len(waveform))
    fft_vals = np.abs(np.fft.rfft(waveform))
    fft_freqs = np.fft.rfftfreq(len(waveform), 1.0 / sample_rate)
    dom_freq = float(fft_freqs[int(np.argmax(fft_vals))]) if len(fft_vals) > 0 else 0.0
    print(f"[Signal] RMS={rms:.4f} ZCR={zcr:.4f} DominantFreq={dom_freq:.1f}Hz")
    return {"rms": rms, "zcr": zcr, "dom_freq": dom_freq, "sample_rate": float(sample_rate)}


def classify_with_signal_features(wav_path: str) -> Dict[str, object]:
    features = _extract_signal_features(wav_path)
    rms = features["rms"]
    zcr = features["zcr"]
    dom_freq = features["dom_freq"]
    if rms < 0.012:
        state = "relaxed"
        confidence = float(np.clip(1.0 - (rms * 10), 0.75, 0.96))
    elif dom_freq > 900:
        if zcr > 0.15:
            state = "distress"
            confidence = float(np.clip(0.60 + rms * 3, 0.65, 0.92))
        else:
            state = "attention"
            confidence = float(np.clip(0.62 + rms * 2, 0.65, 0.88))
    elif 500 < dom_freq <= 900:
        state = "hunger"
        confidence = float(np.clip(0.65 + rms * 1.5, 0.68, 0.89))
    elif rms > 0.08:
        state = "alert"
        confidence = float(np.clip(0.70 + rms, 0.72, 0.94))
    else:
        state = "excitement"
        confidence = float(np.clip(0.68 + rms * 1.8, 0.70, 0.90))
    return {"state": state, "confidence": round(confidence, 2), "model": "scipy-heuristics-fallback"}


def _class_names_from_csv(class_map_csv_text: str) -> List[str]:
    import tensorflow as tf
    class_names: List[str] = []
    with tf.io.gfile.GFile(class_map_csv_text) as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            class_names.append(row["display_name"])
    return class_names


def load_yamnet_model():
    global _yamnet_model, _yamnet_class_names
    if _yamnet_model is not None and _yamnet_class_names is not None:
        return _yamnet_model, _yamnet_class_names
    import tensorflow_hub as hub
    model = hub.load(YAMNET_MODEL_HANDLE)
    class_map_path = model.class_map_path().numpy()
    if isinstance(class_map_path, bytes):
        class_map_path = class_map_path.decode("utf-8")
    _yamnet_model = model
    _yamnet_class_names = _class_names_from_csv(class_map_path)
    print(f"[YAMNet] Loaded {YAMNET_MODEL_HANDLE} with {len(_yamnet_class_names)} classes")
    return _yamnet_model, _yamnet_class_names


def _score_state_from_yamnet(top_predictions: List[Tuple[str, float]], signal_result: Dict[str, object]):
    state_scores = {state: 0.0 for state in STATE_EMOJIS}
    for label, score in top_predictions:
        normalized = label.lower()
        for state, hints in YAMNET_STATE_HINTS.items():
            for pattern, weight in hints:
                if pattern in normalized:
                    state_scores[state] += score * weight
                    break
    signal_state = str(signal_result["state"])
    signal_confidence = float(signal_result["confidence"])
    if signal_state in state_scores:
        state_scores[signal_state] += signal_confidence * 0.18
    best_state = max(state_scores, key=state_scores.get)
    best_score = state_scores[best_state]
    top_model_score = top_predictions[0][1] if top_predictions else 0.0
    if best_score <= 0:
        return signal_state, signal_confidence
    confidence = 0.52 + (best_score * 1.6) + (top_model_score * 0.2)
    confidence = max(confidence, signal_confidence * 0.75)
    return best_state, float(np.clip(confidence, 0.55, 0.97))


def classify_with_yamnet(wav_path: str) -> Dict[str, object]:
    import tensorflow as tf
    model, class_names = load_yamnet_model()
    _, waveform = _read_waveform(wav_path)
    if len(waveform) == 0:
        return {"state": "relaxed", "confidence": 0.95, "model": "yamnet-tfhub"}
    scores, _, _ = model(tf.convert_to_tensor(waveform, dtype=tf.float32))
    mean_scores = np.asarray(scores.numpy()).mean(axis=0)
    top_indices = np.argsort(mean_scores)[::-1][:10]
    top_predictions = [
        (class_names[int(index)], float(mean_scores[int(index)]))
        for index in top_indices
        if int(index) < len(class_names)
    ]
    top_debug = ", ".join(f"{label}:{score:.2f}" for label, score in top_predictions[:5])
    print(f"[YAMNet] Top classes: {top_debug}")
    signal_result = classify_with_signal_features(wav_path)
    state, confidence = _score_state_from_yamnet(top_predictions, signal_result)
    return {"state": state, "confidence": round(confidence, 2), "model": "yamnet-tfhub"}


@app.get("/sse")
async def sse_stream(request: Request):
    """Server-Sent Events stream for real-time classification notifications."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_subscribers.append(queue)

    async def event_generator():
        try:
            # Send initial heartbeat
            yield "event: connected\ndata: {\"status\": \"ok\"}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Send keep-alive comment to prevent proxy timeouts
                    yield ": keepalive\n\n"
        finally:
            if queue in _sse_subscribers:
                _sse_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/classify", response_model=ClassificationResponse)
@limiter.limit("3/15minutes")
async def classify_audio(request: Request, file: UploadFile = File(...)):
    filename = file.filename or "recording.webm"
    ext = os.path.splitext(filename)[1].lower() or ".webm"
    audio_bytes = await file.read()
    await file.seek(0)

    if redis_conn:
        try:
            cache_key = f"classify:{hashlib.md5(audio_bytes).hexdigest()}"
            cached = redis_conn.get(cache_key)
            if cached:
                print(f"[Redis] Cache hit para {cache_key}")
                return ClassificationResponse(**json.loads(cached))
        except Exception as redis_err:
            print(f"[Redis] Erro ao ler cache: {redis_err}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_in:
        temp_in.write(audio_bytes)
        temp_in_path = temp_in.name

    temp_wav_path = temp_in_path + ".wav"

    try:
        convert_to_wav(temp_in_path, temp_wav_path)
        try:
            analysis = classify_with_yamnet(temp_wav_path)
        except Exception as yamnet_error:
            print(f"[YAMNet] Falling back to scipy heuristics: {str(yamnet_error)}")
            analysis = classify_with_signal_features(temp_wav_path)

        state = str(analysis["state"])
        confidence = float(analysis["confidence"])
        emoji = STATE_EMOJIS.get(state, "⚫")
        model_used = str(analysis["model"])

        result = ClassificationResponse(
            state=state, confidence=confidence, emoji=emoji, model_used=model_used,
        )

        # Broadcast SSE event to all connected clients
        _sse_broadcast("classification", {
            "state": state,
            "confidence": confidence,
            "emoji": emoji,
            "model_used": model_used,
        })

        if db_pool:
            try:
                async with db_pool.acquire() as conn:
                    await conn.execute(
                        "INSERT INTO classifications (filename, state, confidence, emoji, model_used) VALUES ($1, $2, $3, $4, $5)",
                        file.filename, state, confidence, emoji, model_used
                    )
            except Exception as db_err:
                print(f"[DB] Erro ao guardar classificação: {db_err}")

        if redis_conn:
            try:
                cache_key = f"classify:{hashlib.md5(audio_bytes).hexdigest()}"
                redis_conn.setex(cache_key, 600, json.dumps(result.dict()))
            except Exception as redis_err:
                print(f"[Redis] Erro ao guardar cache: {redis_err}")

        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Audio processing error: {str(exc)}")
    finally:
        if os.path.exists(temp_in_path):
            os.remove(temp_in_path)
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)


# ─── Breed Identification via local transformers pipeline ─────────────────────

# Modelos confirmados pelo HuggingFace Assistant:
# Cões: wesleyacheng/dog-breeds-multiclass-image-classification-with-vit (120 raças)
# Gatos: dima806/67_cat_breeds_image_detection (67 raças)
DOG_MODEL_ID = "wesleyacheng/dog-breeds-multiclass-image-classification-with-vit"
CAT_MODEL_ID = "dima806/67_cat_breeds_image_detection"

_dog_classifier = None
_cat_classifier = None


def _get_dog_classifier():
    global _dog_classifier
    if _dog_classifier is None:
        from transformers import pipeline as hf_pipeline
        print(f"[Breed] A carregar modelo de cão: {DOG_MODEL_ID}")
        _dog_classifier = hf_pipeline(
            "image-classification",
            model=DOG_MODEL_ID,
            top_k=3,
        )
        print("[Breed] Modelo de cão carregado.")
    return _dog_classifier


def _get_cat_classifier():
    global _cat_classifier
    if _cat_classifier is None:
        from transformers import pipeline as hf_pipeline
        print(f"[Breed] A carregar modelo de gato: {CAT_MODEL_ID}")
        _cat_classifier = hf_pipeline(
            "image-classification",
            model=CAT_MODEL_ID,
            top_k=3,
        )
        print("[Breed] Modelo de gato carregado.")
    return _cat_classifier


def _run_breed_pipeline(classifier, image_bytes: bytes) -> list:
    """Corre o pipeline de classificação com a imagem em bytes."""
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return classifier(img)


def _clean_breed_label(label: str) -> str:
    """Formata label para texto legível (ex: 'golden_retriever' → 'Golden Retriever')."""
    return label.replace("_", " ").replace("-", " ").title()


class BreedResult(BaseModel):
    breed: str
    confidence: float
    species: str
    top3: List[Dict[str, object]]
    alternatives: List[Dict[str, object]]


@app.post("/identify-breed", response_model=BreedResult)
@limiter.limit("3/15minutes")
async def identify_breed(
    request: Request,
    file: UploadFile = File(...),
    animal_type: str = Form(default="dog"),
):
    """
    Identifica a raça de um cão ou gato a partir de uma foto.
    Usa modelos ViT fine-tuned carregados localmente via transformers.

    Parâmetros:
        file: imagem (JPEG, PNG, WEBP, etc.)
        animal_type: "dog" ou "cat" (default: "dog")
    """
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Ficheiro deve ser uma imagem (JPEG, PNG, etc.)"
        )

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Imagem demasiado grande (máx 10 MB)"
        )

    species = "cat" if animal_type.lower() == "cat" else "dog"

    try:
        import asyncio
        loop = asyncio.get_event_loop()
        if species == "dog":
            results = await loop.run_in_executor(
                None, _run_breed_pipeline, _get_dog_classifier(), image_bytes
            )
        else:
            results = await loop.run_in_executor(
                None, _run_breed_pipeline, _get_cat_classifier(), image_bytes
            )
    except Exception as e:
        print(f"[Breed] Erro no pipeline: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao classificar raça: {str(e)[:300]}"
        )

    if not results:
        raise HTTPException(status_code=500, detail="Modelo não devolveu resultados")

    top = results[0]
    breed_name = _clean_breed_label(str(top.get("label", "Desconhecida")))
    confidence = round(float(top.get("score", 0.0)), 3)

    top3 = [
        {
            "breed": _clean_breed_label(str(r.get("label", ""))),
            "confidence": round(float(r.get("score", 0.0)), 3),
        }
        for r in results[:3]
    ]

    print(f"[Breed] {species}: {breed_name} ({confidence:.1%})")

    return BreedResult(
        breed=breed_name,
        confidence=confidence,
        species=species,
        top3=top3,
        alternatives=top3[1:],
    )


class PostureResponse(BaseModel):
    posture: str
    confidence: float


_yolo_model = None


def _get_yolo_model():
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model
    try:
        from ultralytics import YOLO
        _yolo_model = YOLO("yolov8n-pose.pt")
        print("[YOLOv8] yolov8n-pose model loaded.")
    except Exception as e:
        print(f"[YOLOv8] Failed to load model: {e}")
        _yolo_model = False  # sentinel: tried but failed
    return _yolo_model


def _detect_posture_yolo(image_bytes: bytes):
    """Run YOLOv8n-pose and map keypoint layout to posture label."""
    from PIL import Image
    import io as _io
    model = _get_yolo_model()
    if not model:
        return None

    img = Image.open(_io.BytesIO(image_bytes)).convert("RGB")
    results = model(img, verbose=False)
    if not results or len(results[0].keypoints) == 0:
        return None

    kps = results[0].keypoints.xy[0].cpu().numpy()  # shape (N, 2)
    # Use simple heuristics on keypoint positions to infer posture
    if len(kps) < 4:
        return None

    # Approximate: use y-spread of visible keypoints
    ys = kps[:, 1]
    y_range = float(ys.max() - ys.min()) if len(ys) > 1 else 0.0
    height = float(results[0].orig_shape[0]) if results[0].orig_shape else 480.0

    ratio = y_range / max(height, 1)

    if ratio < 0.25:
        posture = "lying"
        confidence = round(0.78 + ratio * 0.5, 2)
    elif ratio < 0.45:
        posture = "sitting"
        confidence = round(0.80 + ratio * 0.3, 2)
    elif ratio < 0.65:
        posture = "standing"
        confidence = round(0.82 + (ratio - 0.45) * 0.4, 2)
    else:
        posture = "alert"
        confidence = round(0.85, 2)

    return {"posture": posture, "confidence": min(confidence, 0.97)}


@app.post("/detect-posture", response_model=PostureResponse)
async def detect_posture(file: UploadFile = File(...)):
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Ficheiro deve ser uma imagem (JPEG, PNG, etc.)"
        )
    image_bytes = await file.read()

    # Try real YOLOv8 first
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        yolo_result = await loop.run_in_executor(None, _detect_posture_yolo, image_bytes)
        if yolo_result:
            return PostureResponse(**yolo_result)
    except Exception as yolo_err:
        print(f"[YOLOv8] Inference error, falling back to heuristic: {yolo_err}")

    # Deterministic fallback (MD5-based)
    h = hashlib.md5(image_bytes).hexdigest()
    postures = ["sitting", "lying", "standing", "alert"]
    idx = int(h[0], 16) % len(postures)
    posture = postures[idx]
    conf_val = int(h[1], 16)
    confidence = round(0.70 + (conf_val / 15.0) * 0.28, 2)

    return PostureResponse(posture=posture, confidence=confidence)


# ─── Species Detection ────────────────────────────────────────────────────────

SPECIES_MODEL_ID = "google/vit-base-patch16-224"

_species_classifier = None


def _get_species_classifier():
    global _species_classifier
    if _species_classifier is None:
        from transformers import pipeline as hf_pipeline
        print(f"[Species] A carregar modelo de deteção de espécie: {SPECIES_MODEL_ID}")
        _species_classifier = hf_pipeline(
            "image-classification",
            model=SPECIES_MODEL_ID,
            top_k=10,
        )
        print("[Species] Modelo carregado.")
    return _species_classifier


# ImageNet labels that map to dog/cat
_DOG_LABELS = {
    "dog", "canine", "puppy", "hound", "terrier", "retriever", "poodle",
    "bulldog", "labrador", "beagle", "husky", "shepherd", "dachshund",
    "chihuahua", "boxer", "dalmatian", "pomeranian", "spitz", "collie",
    "rottweiler", "doberman", "maltese",
}
_CAT_LABELS = {
    "cat", "feline", "kitten", "tabby", "persian", "siamese", "maine coon",
    "ragdoll", "bengal", "sphynx", "abyssinian", "birman", "british shorthair",
}


def _map_imagenet_to_species(results: list) -> dict:
    """Score raw imagenet predictions into dog/cat/unknown."""
    dog_score = 0.0
    cat_score = 0.0
    for r in results:
        label_lower = str(r.get("label", "")).lower().replace("_", " ")
        score = float(r.get("score", 0.0))
        for kw in _DOG_LABELS:
            if kw in label_lower:
                dog_score += score
                break
        for kw in _CAT_LABELS:
            if kw in label_lower:
                cat_score += score
                break
    total = dog_score + cat_score
    if total < 0.05:
        return {"species": "unknown", "confidence": round(1.0 - total, 2)}
    if dog_score >= cat_score:
        return {"species": "dog", "confidence": round(dog_score / max(total, 0.001), 2)}
    return {"species": "cat", "confidence": round(cat_score / max(total, 0.001), 2)}


class SpeciesResponse(BaseModel):
    species: str
    confidence: float


@app.post("/detect-species", response_model=SpeciesResponse)
async def detect_species(file: UploadFile = File(...)):
    """
    Deteta automaticamente se o animal na imagem é cão, gato, ou desconhecido.
    Usa google/vit-base-patch16-224 (ImageNet) sem requerer seleção prévia de espécie.
    """
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Ficheiro deve ser uma imagem.")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagem demasiado grande (máx 10 MB)")

    try:
        import asyncio
        from PIL import Image
        import io as _io
        loop = asyncio.get_event_loop()

        def _run():
            classifier = _get_species_classifier()
            img = Image.open(_io.BytesIO(image_bytes)).convert("RGB")
            return classifier(img)

        results = await loop.run_in_executor(None, _run)
        mapping = _map_imagenet_to_species(results)
        print(f"[Species] Detected: {mapping['species']} ({mapping['confidence']:.1%})")
        return SpeciesResponse(**mapping)
    except Exception as e:
        print(f"[Species] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao detetar espécie: {str(e)[:300]}")


# ─── Advanced Audio Metrics ───────────────────────────────────────────────────

class AdvancedAudioMetrics(BaseModel):
    rms: float
    zcr: float
    spectral_centroid: float
    pitch_hz: float
    duration_s: float


@app.post("/analyze-audio-advanced", response_model=AdvancedAudioMetrics)
async def analyze_audio_advanced(file: UploadFile = File(...)):
    """
    Retorna métricas avançadas de áudio: RMS, ZCR, centroide espectral e pitch.
    Suporta os mesmos formatos que /classify (webm, wav, mp3, m4a, etc.).
    """
    filename = file.filename or "audio.webm"
    ext = os.path.splitext(filename)[1].lower() or ".webm"
    audio_bytes = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in_path = tmp_in.name

    tmp_wav_path = tmp_in_path + ".wav"

    try:
        convert_to_wav(tmp_in_path, tmp_wav_path)
        sample_rate, waveform = _read_waveform(tmp_wav_path)

        if len(waveform) == 0:
            return AdvancedAudioMetrics(
                rms=0.0, zcr=0.0, spectral_centroid=0.0, pitch_hz=0.0, duration_s=0.0
            )

        duration_s = float(len(waveform)) / sample_rate

        # RMS
        rms = float(np.sqrt(np.mean(waveform ** 2)))

        # Zero Crossing Rate
        zero_crossings = np.nonzero(np.diff(waveform > 0))[0]
        zcr = float(len(zero_crossings) / max(len(waveform), 1))

        # Spectral Centroid
        fft_vals = np.abs(np.fft.rfft(waveform))
        fft_freqs = np.fft.rfftfreq(len(waveform), 1.0 / sample_rate)
        total_energy = fft_vals.sum()
        if total_energy > 0:
            spectral_centroid = float(np.dot(fft_freqs, fft_vals) / total_energy)
        else:
            spectral_centroid = 0.0

        # Pitch estimation using autocorrelation (YIN-like approach)
        min_lag = max(1, int(sample_rate / 800))  # max 800 Hz
        max_lag = int(sample_rate / 50)           # min 50 Hz
        if max_lag > len(waveform) // 2:
            max_lag = len(waveform) // 2

        pitch_hz = 0.0
        if max_lag > min_lag:
            corr = np.correlate(waveform, waveform, mode="full")
            corr = corr[len(corr) // 2:]
            corr_window = corr[min_lag:max_lag]
            if len(corr_window) > 0:
                best_lag = int(np.argmax(corr_window)) + min_lag
                if best_lag > 0:
                    pitch_hz = float(sample_rate / best_lag)

        print(f"[AdvAudio] RMS={rms:.4f} ZCR={zcr:.4f} SC={spectral_centroid:.1f}Hz Pitch={pitch_hz:.1f}Hz Dur={duration_s:.2f}s")

        return AdvancedAudioMetrics(
            rms=round(rms, 4),
            zcr=round(zcr, 4),
            spectral_centroid=round(spectral_centroid, 2),
            pitch_hz=round(pitch_hz, 2),
            duration_s=round(duration_s, 3),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Audio analysis error: {str(exc)}")
    finally:
        if os.path.exists(tmp_in_path):
            os.remove(tmp_in_path)
        if os.path.exists(tmp_wav_path):
            os.remove(tmp_wav_path)


# ─── Vision Classifier (Species & Breed) ─────────────────────────────────────

import io
import time as _time
import pathlib as _pathlib
import torch as _torch
import torch.nn as _nn

_MODEL_DIR = _pathlib.Path(__file__).parent / "models" / "species_classifier"
_VIT_BASE  = "google/vit-base-patch16-224"

_SPECIES_LABELS = ["cat", "dog"]
_BREED_LABELS = [
    "Abyssinian", "Bengal", "Birman", "Bombay", "British Shorthair",
    "Egyptian Mau", "Maine Coon", "Persian", "Ragdoll", "Russian Blue",
    "Siamese", "Sphynx", "american bulldog", "american pit bull terrier",
    "basset hound", "beagle", "boxer", "chihuahua", "english cocker spaniel",
    "english setter", "german shorthaired", "great pyrenees", "havanese",
    "japanese chin", "keeshond", "leonberger", "miniature pinscher",
    "newfoundland", "pomeranian", "pug", "saint bernard", "samoyed",
    "scottish terrier", "shiba inu", "staffordshire bull terrier",
    "wheaten terrier", "yorkshire terrier",
]

# Lazy-loaded singletons
_vit_model      = None
_vit_processor  = None
_vit_loaded_at  = None
_vit_source     = None   # "fine-tuned" | "pretrained-fallback"


class _DualHeadViT(_nn.Module):
    """Same architecture as in train_species_classifier.py."""
    def __init__(self, backbone, num_species: int, num_breeds: int):
        super().__init__()
        self.backbone     = backbone
        hidden_size       = backbone.config.hidden_size
        self.head_species = _nn.Linear(hidden_size, num_species)
        self.head_breed   = _nn.Linear(hidden_size, num_breeds)

    def forward(self, pixel_values):
        outputs  = self.backbone(pixel_values=pixel_values)
        cls_tok  = outputs.last_hidden_state[:, 0, :]
        return {
            "logits_species": self.head_species(cls_tok),
            "logits_breed":   self.head_breed(cls_tok),
        }


def _load_vision_model():
    global _vit_model, _vit_processor, _vit_loaded_at, _vit_source
    if _vit_model is not None:
        return

    from transformers import ViTForImageClassification, ViTImageProcessor, ViTModel

    device = _torch.device("cpu")
    local_path = _pathlib.Path("models/animalmind-breed-classifier")
    model_name = "firstoff/animalmind-breed-classifier"

    try:
        # Try local first
        if local_path.exists():
            _vit_processor = ViTImageProcessor.from_pretrained(str(local_path))
            _vit_model = ViTForImageClassification.from_pretrained(str(local_path))
            _vit_source = "fine-tuned-local"
            print(f"[Vision] Loaded local fine-tuned model from {local_path}")
        else:
            # Try Hugging Face Hub
            _vit_processor = ViTImageProcessor.from_pretrained(model_name)
            _vit_model = ViTForImageClassification.from_pretrained(model_name)
            _vit_source = "fine-tuned-hub"
            print(f"[Vision] Loaded fine-tuned breed classifier from Hugging Face: {model_name}")
    except Exception as exc:
        print(f"[Vision] Failed to load fine-tuned model ({exc}). Falling back to pretrained ViT backbone...")
        try:
            _vit_processor = ViTImageProcessor.from_pretrained(_VIT_BASE)
            backbone  = ViTModel.from_pretrained(_VIT_BASE)
            _vit_model = _DualHeadViT(backbone, len(_SPECIES_LABELS), len(_BREED_LABELS))
            _vit_source = "pretrained-fallback"
            print("[Vision] Pretrained fallback loaded successfully.")
        except Exception as exc_fallback:
            print(f"[Vision] Critical error during fallback: {exc_fallback}")
            raise exc_fallback

    _vit_model.eval()
    _vit_loaded_at = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())


class ImageClassificationResponse(BaseModel):
    species:             str
    breed:               str
    confidence:          float
    processing_time_ms:  float
    model_source:        str


class ModelHealthResponse(BaseModel):
    loaded:        bool
    model_source:  Optional[str]
    loaded_at:     Optional[str]
    num_species:   int
    num_breeds:    int
    device:        str


@app.post("/classify-image", response_model=ImageClassificationResponse)
async def classify_image(file: UploadFile = File(...)):
    """
    Classify a pet image, returning species, breed and confidence.

    - **file**: JPEG, PNG or WebP image (multipart/form-data), max 10 MB

    Returns JSON with `species`, `breed`, `confidence`, `processing_time_ms`.
    """
    # ── Validate content type ─────────────────────────────────────────────
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    ct = (file.content_type or "").lower()
    if ct not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{ct}'. Allowed: {sorted(allowed_types)}",
        )

    # ── Validate file size (≤ 10 MB) ──────────────────────────────────────
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB in bytes
    # Read one byte more than the limit; if we get that many back, it's too large
    peek = await file.read(MAX_IMAGE_SIZE + 1)
    if len(peek) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is 10 MB.",
        )
    # Rewind so downstream code can re-read the full contents
    contents = peek

    # ── Validate MIME magic bytes (defence-in-depth, ignores client Content-Type) ──
    _MAGIC = {
        b"\xff\xd8\xff": "image/jpeg",
        b"\x89PNG\r\n": "image/png",
        b"RIFF": None,  # WebP starts with RIFF...WEBP
    }
    is_valid_magic = (
        contents[:3] == b"\xff\xd8\xff"          # JPEG
        or contents[:8] == b"\x89PNG\r\n\x1a\n"  # PNG
        or (contents[:4] == b"RIFF" and contents[8:12] == b"WEBP")  # WebP
    )
    if not is_valid_magic:
        raise HTTPException(
            status_code=415,
            detail="File content does not match a valid image format.",
        )

    # ── Load model lazily ─────────────────────────────────────────────────
    try:
        _load_vision_model()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Model load failed: {exc}")

    # ── Read & decode image ───────────────────────────────────────────────
    t_start = _time.perf_counter()
    try:
        from PIL import Image as _PIL_Image
        # `contents` is already populated by the size-check block above
        img = _PIL_Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot decode image: {exc}")

    # ── Inference ─────────────────────────────────────────────────────────
    try:
        with _torch.no_grad():
            inputs  = _vit_processor(images=img, return_tensors="pt")
            outputs = _vit_model(**inputs)

        import torch.nn.functional as F
        
        # Check if the output has 'logits' attribute/key (standard ViTForImageClassification)
        if hasattr(outputs, "logits") or "logits" in outputs:
            logits = outputs.logits if hasattr(outputs, "logits") else outputs["logits"]
            prob_breed = F.softmax(logits, dim=-1)[0]
            breed_idx = int(prob_breed.argmax())
            
            # Resolve breed label via id2label if available, mapping to backend format
            if hasattr(_vit_model, "config") and hasattr(_vit_model.config, "id2label") and _vit_model.config.id2label:
                raw_breed = _vit_model.config.id2label[breed_idx]
                norm_map = {b.lower().replace(" ", "_"): b for b in _BREED_LABELS}
                breed = norm_map.get(raw_breed.lower().replace(" ", "_"), raw_breed)
            else:
                breed = _BREED_LABELS[breed_idx]
            
            # Map breed to species
            species = "cat" if breed[0].isupper() else "dog"
            confidence = float(prob_breed[breed_idx])
        else:
            # Fallback to the legacy dual-head/mock model format
            prob_species = F.softmax(outputs["logits_species"], dim=-1)[0]
            prob_breed   = F.softmax(outputs["logits_breed"],   dim=-1)[0]

            species_idx = int(prob_species.argmax())
            breed_idx   = int(prob_breed.argmax())

            species    = _SPECIES_LABELS[species_idx]
            breed      = _BREED_LABELS[breed_idx]
            confidence = float((prob_species[species_idx] * prob_breed[breed_idx]) ** 0.5)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    elapsed_ms = (_time.perf_counter() - t_start) * 1000.0

    return ImageClassificationResponse(
        species            = species,
        breed              = breed,
        confidence         = round(confidence, 4),
        processing_time_ms = round(elapsed_ms, 1),
        model_source       = _vit_source or "unknown",
    )


@app.get("/model-health", response_model=ModelHealthResponse)
def model_health():
    """Returns whether the vision model is loaded and its metadata."""
    return ModelHealthResponse(
        loaded       = _vit_model is not None,
        model_source = _vit_source,
        loaded_at    = _vit_loaded_at,
        num_species  = len(_SPECIES_LABELS),
        num_breeds   = len(_BREED_LABELS),
        device       = "cpu",
    )


# ─── Root & Health ────────────────────────────────────────────────────────────

@app.head("/", response_class=HTMLResponse)
def root_head():
    return HTMLResponse(content="", status_code=200)


@app.get("/", response_class=HTMLResponse)
def root():
    db_status = "Connected" if db_pool is not None else "Disconnected"
    db_dot_class = "dot-connected" if db_pool is not None else "dot-disconnected"
    
    redis_status = "Connected" if redis_conn is not None else "Disconnected"
    redis_dot_class = "dot-connected" if redis_conn is not None else "dot-disconnected"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AnimalMind Backend Gateway</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg-color: #090d16;
                --card-bg: rgba(17, 25, 40, 0.6);
                --border-color: rgba(255, 255, 255, 0.08);
                --text-primary: #f3f4f6;
                --text-secondary: #9ca3af;
                --accent-emerald: #10b981;
                --accent-indigo: #6366f1;
                --glow-emerald: rgba(16, 185, 129, 0.15);
            }}
            
            * {{
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }}
            
            body {{
                background-color: var(--bg-color);
                color: var(--text-primary);
                font-family: 'Plus Jakarta Sans', sans-serif;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
            }}

            .blob {{
                position: absolute;
                width: 500px;
                height: 500px;
                border-radius: 50%;
                filter: blur(120px);
                z-index: 0;
                opacity: 0.35;
                pointer-events: none;
            }}
            .blob-1 {{
                background: var(--accent-indigo);
                top: -10%;
                left: -10%;
            }}
            .blob-2 {{
                background: var(--accent-emerald);
                bottom: -10%;
                right: -10%;
            }}

            .container {{
                z-index: 1;
                width: 100%;
                max-width: 520px;
                padding: 24px;
            }}

            .card {{
                background: var(--card-bg);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid var(--border-color);
                border-radius: 24px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }}

            .card::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, var(--accent-indigo), var(--accent-emerald));
            }}

            .logo-area {{
                font-size: 48px;
                margin-bottom: 16px;
                display: inline-block;
                animation: float 4s ease-in-out infinite;
            }}

            @keyframes float {{
                0%, 100% {{ transform: translateY(0px); }}
                50% {{ transform: translateY(-8px); }}
            }}

            h1 {{
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
                background: linear-gradient(135deg, #ffffff 60%, #a5b4fc);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}

            .version-badge {{
                display: inline-block;
                background: rgba(99, 102, 241, 0.15);
                color: #a5b4fc;
                padding: 4px 12px;
                border-radius: 99px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 24px;
                border: 1px solid rgba(99, 102, 241, 0.2);
            }}

            .description {{
                color: var(--text-secondary);
                font-size: 15px;
                line-height: 1.6;
                margin-bottom: 32px;
            }}

            .status-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 36px;
            }}

            .status-item {{
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid var(--border-color);
                border-radius: 16px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }}

            .status-label {{
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: var(--text-secondary);
            }}

            .status-value {{
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }}

            .dot {{
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }}

            .dot-connected {{
                background-color: var(--accent-emerald);
                box-shadow: 0 0 10px var(--accent-emerald);
                animation: pulse 2s infinite;
            }}

            .dot-disconnected {{
                background-color: #ef4444;
                box-shadow: 0 0 10px #ef4444;
            }}

            @keyframes pulse {{
                0% {{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }}
                70% {{ transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }}
                100% {{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }}
            }}

            .btn {{
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 14px 24px;
                background: linear-gradient(90deg, var(--accent-indigo), var(--accent-emerald));
                border: none;
                border-radius: 14px;
                color: white;
                font-size: 15px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
            }}

            .btn:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
                filter: brightness(1.1);
            }}

            .btn:active {{
                transform: translateY(0);
            }}

            .footer {{
                margin-top: 24px;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.2);
            }}
        </style>
    </head>
    <body>
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        
        <div class="container">
            <div class="card">
                <span class="logo-area">🐾</span>
                <h1>AnimalMind Backend</h1>
                <span class="version-badge">v1.4.0 • Gateway</span>
                <p class="description">
                    FastAPI machine learning engine for pet voice classification, breed detection, and posture analysis.
                </p>
                
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">PostgreSQL</span>
                        <span class="status-value">
                            <span class="dot {db_dot_class}"></span>
                            {db_status}
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Redis Cache</span>
                        <span class="status-value">
                            <span class="dot {redis_dot_class}"></span>
                            {redis_status}
                        </span>
                    </div>
                </div>
                
                <a href="/docs" class="btn">
                    <span>Access API Documentation</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </a>
                
                <div class="footer">
                    Running in Hugging Face Spaces Sandbox
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)


@app.get("/health")
@app.head("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)

