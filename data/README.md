# AnimalMind — Data Pipeline

This directory contains everything needed to build and maintain the AnimalMind dataset.

## Directory structure

```
data/
├── README.md                         ← This file
├── annotations/                      ← JSONL annotation files (one per batch)
│   └── sample_batch_001.jsonl        ← Example annotation file
├── processed/
│   ├── oxford_pet/                   ← Processed Oxford-IIIT Pet dataset (auto-generated)
│   └── animalmind/                   ← Processed AnimalMind proprietary dataset (auto-generated)
├── raw/                              ← Raw image files (not tracked by git)
├── schemas/
│   └── animalmind_schema.json        ← Full JSON schema reference
└── scripts/
    ├── import_oxford_pet.py          ← Oxford-IIIT Pet import pipeline
    └── build_animalmind_dataset.py   ← AnimalMind dataset builder & validator
```

---

## Setup

Install dependencies once:

```bash
pip install datasets huggingface_hub Pillow torch torchvision
```

Authenticate with Hugging Face (needed to push datasets):

```bash
huggingface-cli login
```

---

## 1 — Import Oxford-IIIT Pet (baseline validation)

Downloads, normalises and saves the Oxford-IIIT Pet dataset locally.

```bash
# Basic: save locally
python data/scripts/import_oxford_pet.py \
  --output data/processed/oxford_pet

# Optional: push processed dataset to your HF Hub repo
python data/scripts/import_oxford_pet.py \
  --output data/processed/oxford_pet \
  --push-to-hub firstoff/animalmind-oxford-pet
```

**Output columns**: `image`, `species`, `breed`, `split`, `source`

---

## 2 — AnimalMind Custom Dataset

### 2a — Print the full schema

```bash
python data/scripts/build_animalmind_dataset.py schema
```

### 2b — Validate an annotation file before building

```bash
python data/scripts/build_animalmind_dataset.py validate \
  --input data/annotations/sample_batch_001.jsonl
```

### 2c — Build the Hugging Face Dataset

```bash
# Build locally
python data/scripts/build_animalmind_dataset.py build \
  --input  data/annotations/ \
  --output data/processed/animalmind

# Build + push to HF Hub
python data/scripts/build_animalmind_dataset.py build \
  --input  data/annotations/ \
  --output data/processed/animalmind \
  --push-to-hub firstoff/animalmind-behavior
```

**Output columns**: `image`, `species`, `breed`, `behavior`, `emotion`, `environment`, `image_quality`, `label_confidence`, `source`, `notes`

---

## Annotation format (JSONL)

Each line in a `.jsonl` annotation file is a self-contained JSON object.

```jsonc
{
  "image_path": "raw/user_uploads/img_0001.jpg",  // relative to data/
  "species":    "dog",                             // "dog" | "cat"
  "breed":      "Golden Retriever",                // string | null
  "behavior":   "playing",                         // see schema for valid values
  "emotion":    "excited",                         // string | null
  "environment":"outdoor_garden",                  // see schema for valid values
  "image_quality": "high",                         // "high" | "medium" | "low"
  "label_confidence": 0.92,                        // float [0.0, 1.0]
  "source":     "user_upload",                     // see schema for valid values
  "notes":      "Dog fetching ball."               // string | null, max 500 chars
}
```

---

## Annotation rules (summary)

| # | Rule |
|---|------|
| 1 | Choose **one** primary behaviour per image |
| 2 | Only submit records with `label_confidence >= 0.6` |
| 3 | Only set `emotion` when confidence >= 0.6, else `null` |
| 4 | Breed names in English, title case (e.g. `"Golden Retriever"`) |
| 5 | `image_quality` definition: **high** = sharp + ≥50 % body visible, **medium** = minor issues, **low** = exclude from training |
| 6 | Do **not** include images with identifiable human faces |
| 7 | Every record must have a traceable `source` |

---

## Roadmap

| Phase | Goal | Status |
|-------|------|--------|
| **Phase 0** | Folder & pipeline setup | ✅ Done |
| **Phase 1** | Import Oxford-IIIT Pet → validate pipeline end-to-end | 🔜 Next |
| **Phase 2** | Collect first 500 proprietary annotations (user uploads + annotator captures) | 🔜 |
| **Phase 3** | Fine-tune a vision model on combined dataset | 🔜 |
| **Phase 4** | Integrate model into FastAPI backend (`ml_backend/app.py`) | 🔜 |
| **Phase 5** | Release AnimalMind dataset publicly on HF Hub under open licence | 🔜 |
