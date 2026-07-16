"""
AnimalMind — ViT Species & Breed Classifier Training
=====================================================
Fine-tunes google/vit-base-patch16-224 on the AnimalMind Oxford-IIIT Pet dataset
using a dual-head classification strategy:
  - head_species : 2 classes  (dog | cat)
  - head_breed   : 37 classes (one per breed)

CPU strategy (default): linear probe — ViT backbone frozen, only heads trained.
GPU strategy          : pass --full-finetune to unfreeze all layers.

Usage
-----
  # Quick dry-run (2 steps, no HF push):
  python data/scripts/train_species_classifier.py --dry-run

  # Full training on CPU (linear probe, 5 epochs):
  python data/scripts/train_species_classifier.py

  # Full fine-tune on GPU:
  python data/scripts/train_species_classifier.py --full-finetune --epochs 10

  # Train + push to HF Hub:
  python data/scripts/train_species_classifier.py --push-to-hub firstoff/animalmind-species-classifier

Dependencies
------------
  pip install transformers datasets accelerate scikit-learn
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# ── Silence tokenizer parallelism warning ─────────────────────────────────────
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

HF_DATASET_REPO   = "firstoff/animalmind-oxford-pet"
BASE_MODEL        = "google/vit-base-patch16-224"
DEFAULT_OUTPUT    = Path("ml_backend/models/species_classifier")
SPECIES_LABELS    = ["cat", "dog"]
IMAGE_SIZE        = 224

# Breed list in the same order used during preprocessing (must match dataset)
BREED_LABELS = [
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


# ---------------------------------------------------------------------------
# Model definition
# ---------------------------------------------------------------------------

def build_model(num_breeds: int, freeze_backbone: bool = True):
    """Build a dual-head ViT classifier."""
    try:
        import torch
        import torch.nn as nn
        from transformers import ViTModel
    except ImportError:
        sys.exit("Run: pip install transformers torch")

    class DualHeadViT(nn.Module):
        def __init__(self, backbone, num_species: int, num_breeds: int):
            super().__init__()
            self.backbone    = backbone
            hidden_size      = backbone.config.hidden_size
            self.head_species = nn.Linear(hidden_size, num_species)
            self.head_breed   = nn.Linear(hidden_size, num_breeds)

        def forward(self, pixel_values, labels_species=None, labels_breed=None):
            outputs = self.backbone(pixel_values=pixel_values)
            cls_token = outputs.last_hidden_state[:, 0, :]   # [CLS] token

            logits_species = self.head_species(cls_token)
            logits_breed   = self.head_breed(cls_token)

            loss = None
            if labels_species is not None and labels_breed is not None:
                import torch.nn.functional as F
                loss_s = F.cross_entropy(logits_species, labels_species)
                loss_b = F.cross_entropy(logits_breed,   labels_breed)
                loss   = loss_s + loss_b          # equal weighting

            return {
                "loss":            loss,
                "logits_species":  logits_species,
                "logits_breed":    logits_breed,
            }

    print(f"[INFO] Loading backbone: {BASE_MODEL}")
    backbone = ViTModel.from_pretrained(BASE_MODEL)

    if freeze_backbone:
        print("[INFO] Freezing backbone (linear probe mode)")
        for param in backbone.parameters():
            param.requires_grad = False
    else:
        print("[INFO] Full fine-tune mode — all layers trainable")

    model = DualHeadViT(backbone, num_species=len(SPECIES_LABELS), num_breeds=num_breeds)
    return model


# ---------------------------------------------------------------------------
# Dataset preparation
# ---------------------------------------------------------------------------

def load_and_prepare(dry_run: bool = False):
    try:
        from datasets import load_dataset
        from transformers import ViTImageProcessor
    except ImportError:
        sys.exit("Run: pip install datasets transformers")

    processor = ViTImageProcessor.from_pretrained(BASE_MODEL)

    print(f"[INFO] Loading dataset: {HF_DATASET_REPO}")
    ds = load_dataset(HF_DATASET_REPO, trust_remote_code=False)

    if dry_run:
        print("[DRY-RUN] Limiting to 32 train / 16 test samples")
        ds["train"] = ds["train"].select(range(min(32, len(ds["train"]))))
        ds["test"]  = ds["test"].select(range(min(16, len(ds["test"]))))

    species2id = {s: i for i, s in enumerate(SPECIES_LABELS)}
    breed2id   = {b: i for i, b in enumerate(BREED_LABELS)}

    def preprocess(batch):
        images = [img.convert("RGB") for img in batch["image"]]
        encoding = processor(images=images, return_tensors="pt")

        labels_species = [species2id.get(s, 0)   for s in batch["species"]]
        labels_breed   = [breed2id.get(b, 0)      for b in batch["breed"]]

        return {
            "pixel_values":   encoding["pixel_values"],
            "labels_species": labels_species,
            "labels_breed":   labels_breed,
        }

    print("[INFO] Preprocessing images ...")
    ds = ds.map(
        preprocess,
        batched=True,
        batch_size=32,
        remove_columns=["image", "species", "breed", "split", "source"],
        desc="Preprocessing",
    )
    ds.set_format("torch")
    return ds, processor


# ---------------------------------------------------------------------------
# Training loop
# ---------------------------------------------------------------------------

def train(
    output_dir: Path,
    epochs: int,
    batch_size: int,
    lr: float,
    full_finetune: bool,
    dry_run: bool,
):
    try:
        import torch
        from torch.utils.data import DataLoader
    except ImportError:
        sys.exit("Run: pip install torch")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[INFO] Device: {device}")

    ds, processor = load_and_prepare(dry_run=dry_run)
    model = build_model(num_breeds=len(BREED_LABELS), freeze_backbone=not full_finetune)
    model.to(device)

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total     = sum(p.numel() for p in model.parameters())
    print(f"[INFO] Trainable params: {trainable:,} / {total:,} ({100*trainable/total:.1f}%)")

    train_loader = DataLoader(ds["train"], batch_size=batch_size, shuffle=True)
    test_loader  = DataLoader(ds["test"],  batch_size=batch_size, shuffle=False)

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()), lr=lr
    )

    history = []

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        t0 = time.time()

        for step, batch in enumerate(train_loader, start=1):
            pixel_values   = batch["pixel_values"].to(device)
            labels_species = batch["labels_species"].to(device)
            labels_breed   = batch["labels_breed"].to(device)

            optimizer.zero_grad()
            out  = model(pixel_values, labels_species, labels_breed)
            loss = out["loss"]
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

            if step % 10 == 0 or dry_run:
                print(
                    f"  Epoch {epoch}/{epochs}  step {step}/{len(train_loader)}"
                    f"  loss={loss.item():.4f}"
                )

        avg_loss = total_loss / len(train_loader)
        elapsed  = time.time() - t0

        # ── Evaluation ──────────────────────────────────────────────────
        model.eval()
        correct_s = correct_b = total_samples = 0

        with torch.no_grad():
            for batch in test_loader:
                pixel_values   = batch["pixel_values"].to(device)
                labels_species = batch["labels_species"].to(device)
                labels_breed   = batch["labels_breed"].to(device)

                out = model(pixel_values)
                pred_s = out["logits_species"].argmax(dim=-1)
                pred_b = out["logits_breed"].argmax(dim=-1)

                correct_s    += (pred_s == labels_species).sum().item()
                correct_b    += (pred_b == labels_breed).sum().item()
                total_samples += labels_species.size(0)

        acc_species = correct_s / max(total_samples, 1)
        acc_breed   = correct_b / max(total_samples, 1)

        row = {
            "epoch":       epoch,
            "train_loss":  round(avg_loss, 4),
            "acc_species": round(acc_species, 4),
            "acc_breed":   round(acc_breed, 4),
            "elapsed_s":   round(elapsed, 1),
        }
        history.append(row)

        print(
            f"[Epoch {epoch}/{epochs}] "
            f"loss={avg_loss:.4f}  "
            f"acc_species={acc_species:.2%}  "
            f"acc_breed={acc_breed:.2%}  "
            f"({elapsed:.0f}s)"
        )

    return model, processor, history


# ---------------------------------------------------------------------------
# Save artefacts
# ---------------------------------------------------------------------------

def save_model(model, processor, history: list, output_dir: Path, breed_labels: list):
    import torch

    output_dir.mkdir(parents=True, exist_ok=True)

    # Save backbone + heads as state_dict
    torch.save(model.state_dict(), output_dir / "pytorch_model.bin")
    processor.save_pretrained(str(output_dir))

    # Label mappings
    config = {
        "base_model":     BASE_MODEL,
        "architecture":   "DualHeadViT",
        "species_labels": SPECIES_LABELS,
        "breed_labels":   breed_labels,
        "image_size":     IMAGE_SIZE,
    }
    (output_dir / "config.json").write_text(
        json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Training history
    (output_dir / "training_history.json").write_text(
        json.dumps(history, indent=2), encoding="utf-8"
    )

    print(f"[OK] Model saved to {output_dir}")
    if history:
        last = history[-1]
        print(f"     Best epoch {last['epoch']} | "
              f"acc_species={last['acc_species']:.2%} | "
              f"acc_breed={last['acc_breed']:.2%}")


def push_to_hub(output_dir: Path, hub_repo: str, token: str | None):
    from huggingface_hub import HfApi
    import torch
    import json

    config = json.loads((output_dir / "config.json").read_text(encoding="utf-8"))
    history = json.loads((output_dir / "training_history.json").read_text(encoding="utf-8"))
    last = history[-1] if history else {}

    api = HfApi()

    # Upload model files
    for fpath in output_dir.glob("*"):
        if fpath.is_file():
            api.upload_file(
                path_or_fileobj=str(fpath),
                path_in_repo=fpath.name,
                repo_id=hub_repo,
                repo_type="model",
                token=token,
                commit_message=f"Upload model file: {fpath.name}",
            )

    # Upload README card
    card = f"""---
license: mit
base_model: {BASE_MODEL}
tags:
- image-classification
- animals
- pets
- dogs
- cats
- breeds
datasets:
- firstoff/animalmind-oxford-pet
---

# AnimalMind Species & Breed Classifier

Dual-head ViT fine-tuned on the [AnimalMind Oxford-IIIT Pet dataset](https://huggingface.co/datasets/firstoff/animalmind-oxford-pet).

## Task
- **Head 1**: Species classification (`dog` | `cat`) — 2 classes
- **Head 2**: Breed classification — {len(config['breed_labels'])} classes

## Performance (test split)
| Metric | Value |
|--------|-------|
| Species accuracy | {last.get('acc_species', 'N/A'):.2%} |
| Breed accuracy | {last.get('acc_breed', 'N/A'):.2%} |

## Usage (via AnimalMind API)
```
POST /classify-image
Content-Type: multipart/form-data
file: <image file>
```
"""
    api.upload_file(
        path_or_fileobj=card.encode("utf-8"),
        path_in_repo="README.md",
        repo_id=hub_repo,
        repo_type="model",
        token=token,
        commit_message="Add model card",
    )

    print(f"[OK] Model pushed to https://huggingface.co/{hub_repo}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Train AnimalMind species/breed ViT classifier"
    )
    parser.add_argument("--output",        type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--epochs",        type=int,  default=5)
    parser.add_argument("--batch-size",    type=int,  default=16)
    parser.add_argument("--lr",            type=float, default=1e-3)
    parser.add_argument("--full-finetune", action="store_true",
                        help="Unfreeze backbone (needs GPU)")
    parser.add_argument("--dry-run",       action="store_true",
                        help="Run 2 steps with 32 samples to verify pipeline")
    parser.add_argument("--push-to-hub",   metavar="REPO_ID", default=None)
    parser.add_argument("--hf-token",      default=os.environ.get("HUGGING_FACE_HUB_TOKEN"))
    args = parser.parse_args()

    t_start = time.time()
    model, processor, history = train(
        output_dir    = args.output,
        epochs        = args.epochs,
        batch_size    = args.batch_size,
        lr            = args.lr,
        full_finetune = args.full_finetune,
        dry_run       = args.dry_run,
    )

    save_model(model, processor, history, args.output, BREED_LABELS)

    if args.push_to_hub:
        push_to_hub(args.output, args.push_to_hub, args.hf_token)

    total_time = time.time() - t_start
    print(f"\n[DONE] Total training time: {total_time/60:.1f} min")


if __name__ == "__main__":
    main()
