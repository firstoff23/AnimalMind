# AnimalMind ML Backend

FastAPI backend for AnimalMind — pet audio classification, breed identification, and vision-based species/behaviour analysis.

**Version**: 1.4.0  
**Base URL (production)**: `https://firstoff-animalmind-backend.hf.space`

---

## Endpoints

### 🔊 Audio Classification

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/classify` | Classify pet audio (YAMNet) → state + emoji |
| `POST` | `/analyze-audio` | Full audio analysis with Gemini |

---

### 🖼️ Vision Classification *(NEW in v1.4.0)*

#### `POST /classify-image`

Classifies a pet image, returning **species** and **breed**.

**Request** — `multipart/form-data`:

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | JPEG, PNG or WebP image of the pet |

**Response** — `application/json`:

```json
{
  "species":            "dog",
  "breed":              "golden retriever",
  "confidence":         0.8432,
  "processing_time_ms": 312.5,
  "model_source":       "fine-tuned"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `species` | string | `"dog"` or `"cat"` |
| `breed` | string | One of 37 recognised breeds |
| `confidence` | float | Combined confidence \[0–1\] (geometric mean of species × breed) |
| `processing_time_ms` | float | Server-side inference time in milliseconds |
| `model_source` | string | `"fine-tuned"` or `"pretrained-fallback"` |

**Example — cURL**:
```bash
curl -X POST https://firstoff-animalmind-backend.hf.space/classify-image \
  -F "file=@my_dog.jpg"
```

**Example — Python (requests)**:
```python
import requests

with open("my_dog.jpg", "rb") as f:
    resp = requests.post(
        "https://firstoff-animalmind-backend.hf.space/classify-image",
        files={"file": ("my_dog.jpg", f, "image/jpeg")},
    )
print(resp.json())
# {'species': 'dog', 'breed': 'golden retriever', 'confidence': 0.84, ...}
```

**Example — JavaScript (fetch)**:
```js
const formData = new FormData();
formData.append("file", imageFile);

const res = await fetch("https://firstoff-animalmind-backend.hf.space/classify-image", {
  method: "POST",
  body: formData,
});
const result = await res.json();
console.log(result.species, result.breed, result.confidence);
```

**Error codes**:

| Code | Meaning |
|------|---------|
| 400 | Invalid or unreadable image |
| 415 | Unsupported content type (must be JPEG/PNG/WebP) |
| 503 | Model failed to load |

---

#### `GET /model-health`

Returns current status of the vision model.

**Response**:
```json
{
  "loaded":       true,
  "model_source": "fine-tuned",
  "loaded_at":    "2026-06-19T20:00:00Z",
  "num_species":  2,
  "num_breeds":   37,
  "device":       "cpu"
}
```

> The model is loaded **lazily** on first request to `/classify-image` to reduce startup time.

---

### ❤️ Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Basic health check — `{"status": "healthy"}` |
| `GET` | `/` | Root — version info |

---

## Model architecture

The vision classifier is a **dual-head ViT** (`google/vit-base-patch16-224`):

```
Input image (224×224 RGB)
    ↓
ViT backbone ([CLS] token output, 768-dim)
    ├── head_species → softmax → dog | cat
    └── head_breed   → softmax → 37 breed classes
```

**Confidence** = √(P(species) × P(breed)) — geometric mean of the two top probabilities.

### Supported breeds

**Cats (12)**: Abyssinian, Bengal, Birman, Bombay, British Shorthair, Egyptian Mau, Maine Coon, Persian, Ragdoll, Russian Blue, Siamese, Sphynx

**Dogs (25)**: American Bulldog, American Pit Bull Terrier, Basset Hound, Beagle, Boxer, Chihuahua, English Cocker Spaniel, English Setter, German Shorthaired, Great Pyrenees, Havanese, Japanese Chin, Keeshond, Leonberger, Miniature Pinscher, Newfoundland, Pomeranian, Pug, Saint Bernard, Samoyed, Scottish Terrier, Shiba Inu, Staffordshire Bull Terrier, Wheaten Terrier, Yorkshire Terrier

---

## Running locally

```bash
# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# API docs (Swagger UI)
open http://localhost:8000/docs
```

## Running tests

```bash
pip install pytest httpx Pillow
pytest ml_backend/tests/test_classify.py -v
```

---

## Training the classifier

See [`data/scripts/train_species_classifier.py`](../data/scripts/train_species_classifier.py).

```bash
# Dry-run (pipeline validation):
python data/scripts/train_species_classifier.py --dry-run

# Full training (CPU, linear probe, 5 epochs, ~20 min):
python data/scripts/train_species_classifier.py \
  --output ml_backend/models/species_classifier \
  --epochs 5

# Train + push model to HF Hub:
python data/scripts/train_species_classifier.py \
  --output ml_backend/models/species_classifier \
  --push-to-hub firstoff/animalmind-species-classifier
```

After training, restart the backend — it will auto-load the fine-tuned weights.
