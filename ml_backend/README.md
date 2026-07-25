---
title: AnimalMind Backend
emoji: 🐾
colorFrom: pink
colorTo: indigo
sdk: docker
app_port: 7860
---

# AnimalMind ML Backend

FastAPI backend for AnimalMind — pet audio classification, breed identification, quality assessment, and user feedback collection.

**Version**: 1.4.0  
**Base URL (production)**: `https://firstoff-animalmind-backend.hf.space`

---

## 📁 Architecture Overview

The backend follows a modular, production-ready structure using FastAPI `APIRouter`:

```
ml_backend/
├── app.py                     # Core FastAPI gateway (loads .env, mounts routers, CORS)
├── routers/
│   ├── classify_breed.py      # POST /v1/classify-breed (Quality check + Breed AI + Cache)
│   ├── feedback.py            # POST /v1/feedback (PostgreSQL / SQLite storage)
│   └── health.py              # GET /ready (Readiness & model warm-up check)
├── services/
│   ├── quality.py             # Laplacian variance blur & lighting detection
│   └── breed_knowledge.py     # Rich breed knowledge lookup (temperament, health risks, etc.)
├── schemas/
│   ├── breed.py               # Pydantic request/response schemas for breed classification
│   └── feedback.py            # Pydantic schemas for feedback collection
├── utils/
│   ├── cache.py               # Redis & In-Memory SHA-256 inference caching (24h TTL)
│   └── logging.py             # Structured JSON logger with Correlation IDs
├── data/
│   └── breed_knowledge/
│       ├── dogs.json          # Dog breed metadata & health risks
│       └── cats.json          # Cat breed metadata & health risks
├── .env.example               # Environment variables configuration template
└── requirements.txt           # Python dependencies
```

---

## ⚙️ Environment Variables Configuration

Copy `.env.example` to `.env` or configure variables in your hosting provider (e.g., Hugging Face Spaces / Docker):

| Variable | Default / Format | Description |
|----------|------------------|-------------|
| `ENVIRONMENT` | `development` | Environment mode (`development` / `production`) |
| `PORT` | `7860` | Server listening port |
| `CORS_ORIGINS` | `https://animalmind.vercel.app,http://localhost:5173` | Comma-separated allowed CORS origins |
| `HF_TOKEN` | `""` | Hugging Face Access Token for private model weights |
| `DATABASE_URL` | `""` | PostgreSQL connection string (`postgresql://...`) |
| `REDIS_URL` | `""` | Redis connection URL (`redis://...`) for 24h cache |
| `LAPLACIAN_THRESHOLD` | `100.0` | Minimum image sharpness variance threshold |

---

## 🚀 Endpoints Specification

### 🏷️ v1 Breed Classification & Feedback (NEW)

#### `POST /v1/classify-breed`

Performs breed classification with **image blur/lighting quality assessment** and optional **breed knowledge enrichment**.

**Query Parameters**:
- `include_info` (optional, boolean, default `false`): If `true`, returns detailed breed description, temperament, exercise needs, and health risks.

**Request** — `multipart/form-data`:
- `file`: Image file (`JPEG`, `PNG`, `WebP`, max 10 MB).

**Response** — `application/json`:
```json
{
  "breed": "Labrador Retriever",
  "confidence": 0.95,
  "species": "dog",
  "top3": [
    {"breed": "Labrador Retriever", "confidence": 0.95},
    {"breed": "Golden Retriever", "confidence": 0.03},
    {"breed": "Chesapeake Bay Retriever", "confidence": 0.01}
  ],
  "info": {
    "species": "dog",
    "group": "Sporting",
    "temperament": ["Amigável", "Ativo", "Inteligente", "Leal"],
    "description": "O Labrador Retriever é uma das raças mais populares do mundo...",
    "exercise_needs": "Elevada (60-90 min/dia)",
    "health_risks": ["Displasia da anca", "Displasia do cotovelo", "Atrofia progressiva da retina", "Obesidade"]
  },
  "processing_time_ms": 142.5
}
```

**Quality Check Rejection (HTTP 400)**:
If the image is too blurry or dark (Laplacian variance < 100.0):
```json
{
  "detail": "A imagem está desfocada ou com pouca luz. Tira outra foto."
}
```

**cURL Example**:
```bash
curl -X POST "https://firstoff-animalmind-backend.hf.space/v1/classify-breed?include_info=true" \
  -F "file=@pet.jpg"
```

---

#### `POST /v1/feedback`

Collects user feedback on AI predictions for continuous model evaluation. Supports dual storage (PostgreSQL when `DATABASE_URL` is configured, or local SQLite fallback `feedback.db`).

**Request** — `application/json`:
```json
{
  "model_name": "animalmind-breed-classifier",
  "model_version": "v1.0.0",
  "input_hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
  "prediction": "Labrador Retriever",
  "confidence": 0.92,
  "is_correct": false,
  "correct_label": "Golden Retriever",
  "user_confidence": 4,
  "feedback_text": "O cão é dourado, não preto!",
  "metadata": {"device": "iPhone", "os": "iOS 17"}
}
```

**Response** — `application/json`:
```json
{
  "status": "success",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**cURL Example**:
```bash
curl -X POST https://firstoff-animalmind-backend.hf.space/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "animalmind-breed-classifier",
    "model_version": "v1.0.0",
    "input_hash": "hash123",
    "prediction": "Labrador Retriever",
    "confidence": 0.92,
    "is_correct": true
  }'
```

---

#### `GET /ready`

Readiness check to verify model warm-up status and connection health.

**Response (HTTP 200)**:
```json
{
  "status": "ready",
  "vision_model_loaded": true,
  "db_connected": true,
  "redis_connected": true
}
```

---

### 🔊 Legacy Audio & Vision Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/classify` | Classify pet audio (YAMNet) → state + emoji |
| `POST` | `/identify-breed` | Identify dog/cat breed via species-specific ViT |
| `POST` | `/detect-posture` | Detect posture (sitting, lying, standing) via YOLOv8n-pose |
| `POST` | `/detect-species` | Detect species (dog, cat, unknown) |
| `POST` | `/analyze-audio-advanced` | Spectral audio metrics (RMS, ZCR, centroid, pitch) |
| `POST` | `/classify-image` | Legacy dual-head species & breed classification |
| `GET`  | `/model-health` | Metadata for loaded vision model |
| `GET`  | `/health` | Basic health check — `{"status": "healthy"}` |

---

## 🛠️ Local Development & Running

### Using Python / Uvicorn

```bash
# 1. Clone repository & enter ml_backend
cd ml_backend

# 2. Copy .env template
cp .env.example .env

# 3. Install requirements
pip install -r requirements.txt

# 4. Start Uvicorn development server
uvicorn app:app --host 0.0.0.0 --port 7860 --reload

# 5. Access Interactive Swagger Documentation
open http://localhost:7860/docs
```

### Using Docker

```bash
# Build Docker image
docker build -t animalmind-ml-backend .

# Run Docker container
docker run -p 7860:7860 --env-file .env animalmind-ml-backend
```

### Running Tests

```bash
python tests/test_v1_routes.py
```
