import csv
import os
import subprocess
import tempfile
from typing import Dict, List, Optional, Tuple

import numpy as np
import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy import signal
from scipy.io import wavfile
import asyncpg
import hashlib
import json
import redis as redis_client
from datetime import datetime, timezone

app = FastAPI(
    title="AnimalMind Acoustic Classifier Backend",
    description="FastAPI backend using TensorFlow Hub YAMNet for pet audio classification.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        ("whimper", 1.35),
        ("yelp", 1.35),
        ("cry", 1.2),
        ("scream", 1.1),
        ("howl", 0.9),
    ],
    "attention": [
        ("meow", 1.35),
        ("cat", 0.65),
        ("purr", 0.45),
        ("animal", 0.25),
    ],
    "excitement": [
        ("pant", 1.0),
        ("dog", 0.55),
        ("bark", 0.45),
        ("snort", 0.35),
    ],
    "hunger": [
        ("chew", 1.2),
        ("crunch", 1.0),
        ("slurp", 1.0),
        ("eat", 0.9),
        ("gulp", 0.8),
    ],
    "alert": [
        ("bark", 1.3),
        ("bow-wow", 1.3),
        ("growl", 1.2),
        ("howl", 0.9),
        ("dog", 0.35),
    ],
    "relaxed": [
        ("silence", 1.25),
        ("purr", 1.0),
        ("breathing", 0.85),
        ("snore", 0.8),
    ],
}

_yamnet_model = None
_yamnet_class_names: Optional[List[str]] = None


def convert_to_wav(input_path: str, output_path: str):
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-ar",
        "16000",
        "-ac",
        "1",
        output_path,
    ]
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

    return {
        "state": state,
        "confidence": round(confidence, 2),
        "model": "scipy-heuristics-fallback",
    }


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

    return {
        "state": state,
        "confidence": round(confidence, 2),
        "model": "yamnet-tfhub",
    }


@app.post("/classify", response_model=ClassificationResponse)
async def classify_audio(file: UploadFile = File(...)):
    filename = file.filename or "recording.webm"
    ext = os.path.splitext(filename)[1].lower() or ".webm"
    # Ler bytes do ficheiro para hash de cache
    audio_bytes = await file.read()
    await file.seek(0)  # Reset para o tempfile poder ler de novo

    # Verificar cache Redis
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
            state=state,
            confidence=confidence,
            emoji=emoji,
            model_used=model_used,
        )

        # Guardar no PostgreSQL
        if db_pool:
            try:
                async with db_pool.acquire() as conn:
                    await conn.execute(
                        "INSERT INTO classifications (filename, state, confidence, emoji, model_used) VALUES ($1, $2, $3, $4, $5)",
                        file.filename, state, confidence, emoji, model_used
                    )
            except Exception as db_err:
                print(f"[DB] Erro ao guardar classificação: {db_err}")

        # Guardar no cache Redis (TTL 10 min)
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



# ─── Breed Identification ────────────────────────────────────────────────────

# Modelos HuggingFace especializados (Inference API serverless — gratuita)
HF_DOG_BREED_MODEL = "wesleyacheng/dog-breed-classifier-vit"
HF_CAT_BREED_MODEL = "nickmuchi/cat-breed-classifier-vit"
HF_SPECIES_MODEL = "nickmuchi/vit-finetuned-cats-vs-dogs"
HF_API_BASE = "https://api-inference.huggingface.co/models"


class BreedResult(BaseModel):
    breed: str
    confidence: float
    species: str
    top3: List[Dict[str, object]]


async def _hf_classify(model: str, image_bytes: bytes, hf_token: Optional[str]) -> List[Dict]:
    """Chama a HuggingFace Inference API e devolve lista de {label, score}."""
    headers = {"Content-Type": "application/octet-stream"}
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"

    url = f"{HF_API_BASE}/{model}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Retry uma vez se modelo ainda está a carregar (503)
        for attempt in range(3):
            resp = await client.post(url, content=image_bytes, headers=headers)
            if resp.status_code == 503:
                import asyncio
                data = resp.json()
                wait = min(data.get("estimated_time", 20), 30)
                print(f"[HF] Modelo a carregar, aguardar {wait}s...")
                await asyncio.sleep(wait)
                continue
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"HuggingFace API erro {resp.status_code}: {resp.text[:200]}"
                )
            return resp.json()
    raise HTTPException(status_code=504, detail="HuggingFace model timeout (modelo a carregar)")


def _clean_breed_label(label: str) -> str:
    """Formata o label do modelo para texto legível (ex: 'golden_retriever' → 'Golden Retriever')."""
    return label.replace("_", " ").replace("-", " ").title()


@app.post("/identify-breed", response_model=BreedResult)
async def identify_breed(file: UploadFile = File(...)):
    """
    Identifica a raça de um cão ou gato a partir de uma foto.
    Usa modelos ViT fine-tuned na HuggingFace Inference API.
    """
    # Validar tipo de ficheiro
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Ficheiro deve ser uma imagem (JPEG, PNG, etc.)")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=413, detail="Imagem demasiado grande (máx 10 MB)")

    hf_token = os.environ.get("HF_TOKEN")  # Opcional mas evita rate-limit

    # Passo 1: Detectar espécie (cão vs gato)
    try:
        species_results = await _hf_classify(HF_SPECIES_MODEL, image_bytes, hf_token)
        # Labels esperados: ["cat", "dog"] ou similar
        top_species = species_results[0] if species_results else {"label": "dog", "score": 0.5}
        species_label = top_species.get("label", "dog").lower()
        # Normalizar: pode ser "Cat", "dog", etc.
        if "cat" in species_label:
            species = "cat"
        else:
            species = "dog"
        print(f"[Breed] Espécie detectada: {species} (raw: {species_label})")
    except Exception as e:
        print(f"[Breed] Falha na detecção de espécie, assumindo cão: {e}")
        species = "dog"

    # Passo 2: Classificar raça com modelo especializado
    breed_model = HF_DOG_BREED_MODEL if species == "dog" else HF_CAT_BREED_MODEL
    try:
        breed_results = await _hf_classify(breed_model, image_bytes, hf_token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na classificação de raça: {str(e)}")

    if not breed_results or not isinstance(breed_results, list):
        raise HTTPException(status_code=500, detail="Resposta inválida do modelo de raças")

    # Formatar resultados
    top = breed_results[0]
    breed_name = _clean_breed_label(str(top.get("label", "Desconhecida")))
    confidence = round(float(top.get("score", 0.0)), 3)

    top3 = [
        {
            "breed": _clean_breed_label(str(r.get("label", ""))),
            "confidence": round(float(r.get("score", 0.0)), 3),
        }
        for r in breed_results[:3]
    ]

    print(f"[Breed] Resultado: {breed_name} ({confidence:.1%}) — espécie: {species}")

    return BreedResult(
        breed=breed_name,
        confidence=confidence,
        species=species,
        top3=top3,
    )


@app.get("/")
def root():
    return {"status": "ok", "service": "AnimalMind API", "version": "1.2.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
