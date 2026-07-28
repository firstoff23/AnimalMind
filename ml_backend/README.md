---
title: AnimalMind Backend
emoji: 🐾
colorFrom: pink
colorTo: indigo
sdk: docker
app_port: 7860
---

# AnimalMind ML Backend

FastAPI backend for AnimalMind — pet audio classification, breed identification, quality assessment, uncertainty calibration, and user feedback collection.

**Version**: 1.4.0  
**Base URL (production)**: `https://firstoff-animalmind-backend.hf.space`

---

## 📁 Architecture Overview

The backend follows a modular, production-ready structure using FastAPI `APIRouter`:

```
ml_backend/
├── app.py                     # Core FastAPI gateway (loads .env, mounts routers, CORS)
├── routers/
│   ├── classify_breed.py      # POST /v1/classify-breed (Quality check + Breed AI + Cache + Temp Scaling)
│   ├── feedback.py            # POST /v1/feedback (PostgreSQL / SQLite storage + Image attachment)
│   └── health.py              # GET /ready (Readiness & model warm-up check)
├── services/
│   ├── quality.py             # Laplacian variance blur & lighting detection
│   └── breed_knowledge.py     # Rich breed knowledge lookup (temperament, health risks, life expectancy)
├── schemas/
│   ├── breed.py               # Pydantic request/response schemas for breed classification
│   └── feedback.py            # Pydantic schemas for feedback collection
├── utils/
│   ├── auth.py                # Supabase JWT & X-API-Key authentication dependency
│   ├── cache.py               # Redis & In-Memory SHA-256 inference caching (24h TTL)
│   └── logging.py             # Structured JSON logger with Correlation IDs
├── training/
│   ├── train_dog_breeds.py    # Stanford Dogs ViT training pipeline + Temperature Scaling
│   ├── training_metrics.json  # Training metrics, ECE logs & history report
│   └── requirements_training.txt # Training dependencies (datasets, timm, etc.)
├── models/
│   └── temperature.pt         # Calibrated temperature scaling parameter T
├── feedback_images/           # Storage directory for feedback image attachments
├── data/
│   └── breed_knowledge/
│       ├── dogs.json          # Dog breed metadata, health risks, weight & life expectancy
│       └── cats.json          # Cat breed metadata, health risks, weight & life expectancy
├── .env.example               # Environment variables configuration template
└── requirements.txt           # Production Python dependencies
```

---

## ⚙️ Environment Variables Configuration

Copy `.env.example` to `.env` or configure variables in your hosting provider:

| Variable | Default / Format | Description |
|----------|------------------|-------------|
| `ENVIRONMENT` | `development` | Environment mode (`development` / `production`) |
| `PORT` | `7860` | Server listening port |
| `CORS_ORIGINS` | `https://animalmind.vercel.app,http://localhost:5173` | Comma-separated allowed CORS origins |
| `SUPABASE_JWT_SECRET` | `""` | Secret key for verifying Supabase JWT tokens |
| `API_KEY` | `""` | Static API key for client authentication (`X-API-Key`) |
| `HF_TOKEN` | `""` | Hugging Face Access Token for private model weights |
| `DATABASE_URL` | `""` | PostgreSQL connection string (`postgresql://...`) |
| `REDIS_URL` | `""` | Redis connection URL (`redis://...`) for 24h cache |
| `LAPLACIAN_THRESHOLD` | `100.0` | Minimum image sharpness variance threshold |

---

## 🔒 Authentication (`/v1/*` Endpoints)

All endpoints under `/v1/*` (`/v1/classify-breed` and `/v1/feedback`) are protected by authentication when `SUPABASE_JWT_SECRET` or `API_KEY` environment variables are set.

> **Development Mode**: When neither variable is configured, authentication is automatically bypassed for convenient local development.

### Supported Authentication Methods & cURL Examples:

1. **Supabase JWT Token (Bearer Authentication)**:
   Pass the user JWT token in the `Authorization` header:
   ```bash
   curl -X POST https://firstoff-animalmind-backend.hf.space/v1/classify-breed?include_info=true \
     -H "Authorization: Bearer <your_supabase_jwt_token>" \
     -F "file=@dog_photo.jpg"
   ```

2. **Static API Key (`X-API-Key` Header)**:
   Pass the static API key in the `X-API-Key` header:
   ```bash
   curl -X POST https://firstoff-animalmind-backend.hf.space/v1/classify-breed?include_info=true \
     -H "X-API-Key: <your_secret_api_key>" \
     -F "file=@dog_photo.jpg"
   ```

> **Legacy Endpoints**: Unprotected endpoints (`/classify`, `/classify-image`, `/detect-posture`, `/health`, etc.) remain unauthenticated for backward compatibility.

---

## 🚀 Endpoints Specification

### 🏷️ v1 Breed Classification & Feedback

#### `POST /v1/classify-breed`

Performs breed classification with **image quality assessment**, **temperature scaling confidence calibration**, and optional **breed knowledge enrichment**.

**Query Parameters**:
- `include_info` (optional, boolean, default `false`): Includes detailed breed description, temperament, exercise needs, health risks, average weight, and life expectancy.

**Request** — `multipart/form-data`:
- `file`: Image file (`JPEG`, `PNG`, `WebP`, max 10 MB).

**cURL Example**:
```bash
curl -X POST "https://firstoff-animalmind-backend.hf.space/v1/classify-breed?include_info=true" \
  -H "X-API-Key: your_api_key" \
  -F "file=@labrador.jpg"
```

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
    "health_risks": ["Displasia da anca", "Displasia do cotovelo", "Atrofia progressiva da retina", "Obesidade"],
    "life_expectancy": "10-12 anos",
    "average_weight": "25-36 kg"
  },
  "quality_assessed": true,
  "laplacian_variance": 420.5
}
```

---

#### `POST /v1/feedback` (With Image Attachment Support)

Submits user feedback regarding model predictions for dataset retraining. Supports JSON or `multipart/form-data` with optional image attachment.

**Request Form-Data Parameters**:
- `json_data`: JSON string matching `FeedbackRequest` payload.
- `image` (optional): Uploaded image binary (`UploadFile`).

**cURL Example (Multipart with Image)**:
```bash
curl -X POST "https://firstoff-animalmind-backend.hf.space/v1/feedback" \
  -H "X-API-Key: your_api_key" \
  -F 'json_data={"model_name":"animalmind-breed-classifier","model_version":"v1.0.0","input_hash":"hash123","prediction":"Labrador Retriever","confidence":0.92,"is_correct":false,"correct_label":"Golden Retriever","feedback_text":"O cão é mais claro"}' \
  -F "image=@feedback_photo.jpg"
```

**Response** — `application/json`:
```json
{
  "status": "success",
  "id": "c7a81d45-312a-4b92-80ff-0a12e4bf8892",
  "image_path": "feedback_images/d5a1e31b5144a63714db3838bb8334449e7175536fbb12ec0ae74199fba6266f.jpg"
}
```

---

## 🏋️ Model Training & Temperature Calibration

The backend includes a state-of-the-art training pipeline (`ml_backend/training/train_dog_breeds.py`) to fine-tune ViT on Stanford Dogs (120 breeds) targeting **>90% accuracy**.

### Training Features:
- **Augmentations**: `RandAugment(num_ops=2, magnitude=9)`, `MixUp`, `CutMix`, `ColorJitter`, `RandomRotation`.
- **Regularization**: `Label Smoothing (0.1)`, `EMA (Exponential Moving Average)`, `Stochastic Depth (0.2)`.
- **Calibration**: Automatic **Temperature Scaling** via L-BFGS optimization on validation set logits.

### Running Training & GPU Execution Options:

- **Option A (Google Colab / Kaggle Notebook)**:
  Open [`ml_backend/training/run_training.ipynb`](training/run_training.ipynb) in Google Colab with GPU T4/V100 enabled.

- **Option B (Shell Script for Linux GPU Server)**:
  ```bash
  chmod +x training/run_training.sh
  ./training/run_training.sh
  ```

- **Option C (Manual Command)**:
  ```bash
  pip install -r requirements_training.txt
  python -m training.train_dog_breeds --batch-size 32 --epochs 50 --model-name google/vit-base-patch16-224 --push-to-hub firstoff/animalmind-breed-classifier
  ```

> 📌 **Hugging Face Published Models**:
> - Dog Classifier: [`firstoff/animalmind-breed-classifier`](https://huggingface.co/firstoff/animalmind-breed-classifier)
> - Cat Classifier: [`firstoff/animalmind-cat-classifier`](https://huggingface.co/firstoff/animalmind-cat-classifier)
> - Audio Vocalization Classifier: [`firstoff/animalmind-audio-classifier`](https://huggingface.co/firstoff/animalmind-audio-classifier)

### 🏆 Model Performance & Calibration Benchmark:
| Model / Task | Architecture | Validation Accuracy | Temperature ($T$) | ECE | Status |
|--------------|--------------|---------------------|-------------------|-----|--------|
| **Dog Breed Classifier** | `google/vit-base-patch16-224` | **91.40%** | **1.7221** | **2.69%** | Active ✅ |
| **Cat Breed Classifier** | `google/vit-base-patch16-224` | **94.17%** | **1.8345** | **4.96%** | Active ✅ |
| **Audio Classifier** | `facebook/wav2vec2-base` | **92.10%** | **1.5028** | **3.85%** | Active ✅ |

---

## 🩺 Symptom Model Feasibility Evaluation

For a detailed analysis on why AnimalMind relies on a **Guided Interactive Questionnaire + YOLO Posture Detection** rather than an autonomous medical vision model, read the full feasibility report:  
📄 [Symptom Model Feasibility Report](docs/symptom_model_feasibility.md)

---

## 📊 Monitoring & Calibration Metrics

- **Training & Calibration Logs**: After training completes, detailed logs (epochs, train/val loss, train/val accuracy, ECE - Expected Calibration Error, and calibrated temperature $T$) are written to `ml_backend/training/training_metrics.json`.
- **Temperature Scaling Parameter**: The calibrated scalar $T$ is saved to `ml_backend/models/temperature.pt`. `app.py` automatically loads this parameter during inference to scale raw logits (`logits / T`) before `softmax`.
- **Feedback Images Store**: Uploaded feedback images are stored securely in `ml_backend/feedback_images/{sha256_hash}.jpg` and indexed in the `image_path` DB column.

---

## 🧪 Testing

Run all backend unit tests:

```bash
python -m pytest tests/
```
