"""
Oxford-IIIT Pet Dataset Import Pipeline
========================================
Imports the Oxford-IIIT Pet dataset from Hugging Face, normalises it to the
AnimalMind schema (image, species, breed, split, source) and optionally
exports it as a new Hugging Face Dataset ready for vision model training.

Usage
-----
  python data/scripts/import_oxford_pet.py \
      --output data/processed/oxford_pet \
      [--push-to-hub firstoff/animalmind-oxford-pet]

Dependencies (install once)
---------------------------
  pip install datasets huggingface_hub Pillow torch torchvision
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

HF_OXFORD_REPO = "pcuenq/oxford-pets"   # canonical HF mirror of Oxford-IIIT Pet

# Oxford label_id → (species, breed)
# The dataset ships breed names via the "label" feature; species is derived
# from the breed name convention: uppercase first letter → Cat, else → Dog.
# We build a lookup at runtime directly from the ClassLabel names.

IMAGE_SIZE = (224, 224)   # resize target for vision models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def derive_species(breed_name: str) -> str:
    """
    In the Oxford-IIIT Pet naming convention, cat breeds start with an
    uppercase letter (Abyssinian, Bengal …) while dog breeds start with a
    lowercase letter after the underscore split OR are all lowercase.
    The HF mirror exposes breed names already in title case, so we rely on
    the original dataset README: cats are the first 12 classes.
    Instead we check against a known cat breed list derived from the paper.
    """
    CAT_BREEDS = {
        "Abyssinian", "Bengal", "Birman", "Bombay", "British_Shorthair",
        "Egyptian_Mau", "Maine_Coon", "Persian", "Ragdoll", "Russian_Blue",
        "Siamese", "Sphynx",
    }
    normalised = breed_name.replace(" ", "_").strip()
    return "cat" if normalised in CAT_BREEDS else "dog"


def normalise_breed(raw_label: str) -> str:
    """Replace underscores with spaces and title-case the breed name."""
    return raw_label.replace("_", " ").strip()


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def build_pipeline(output_dir: Path) -> None:
    try:
        from datasets import load_dataset, DatasetDict, Features, ClassLabel, Image, Value
        from PIL import Image as PILImage
    except ImportError:
        sys.exit(
            "Missing dependencies. Run:\n"
            "  pip install datasets huggingface_hub Pillow"
        )

    print("📥  Loading Oxford-IIIT Pet from Hugging Face …")
    raw: DatasetDict = load_dataset(HF_OXFORD_REPO, trust_remote_code=True)  # type: ignore[arg-type]

    # The HF mirror ships train/test splits
    print(f"    Splits available: {list(raw.keys())}")

    label_names: list[str] = raw["train"].features["label"].names  # type: ignore[index]
    print(f"    Found {len(label_names)} breed classes.")

    def transform(batch: dict[str, Any], split_name: str) -> dict[str, Any]:
        images = batch["image"]
        labels = batch["label"]

        out_images = []
        out_species = []
        out_breeds = []
        out_splits = []
        out_sources = []

        for img, lbl in zip(images, labels):
            raw_breed = label_names[lbl]
            breed = normalise_breed(raw_breed)
            species = derive_species(raw_breed)

            # Resize for vision model compatibility
            if isinstance(img, PILImage.Image):
                img = img.convert("RGB").resize(IMAGE_SIZE, PILImage.LANCZOS)

            out_images.append(img)
            out_species.append(species)
            out_breeds.append(breed)
            out_splits.append(split_name)
            out_sources.append("oxford_iiit_pet")

        return {
            "image": out_images,
            "species": out_species,
            "breed": out_breeds,
            "split": out_splits,
            "source": out_sources,
        }

    processed_splits = {}
    for split_name, split_ds in raw.items():
        print(f"    Processing split '{split_name}' ({len(split_ds)} examples) …")
        processed = split_ds.map(
            lambda batch: transform(batch, split_name),
            batched=True,
            batch_size=64,
            remove_columns=split_ds.column_names,
            desc=f"Transforming {split_name}",
        )
        processed_splits[split_name] = processed

    final_dataset = DatasetDict(processed_splits)

    # -------------------------------------------------------------------
    # Save locally
    # -------------------------------------------------------------------
    output_dir.mkdir(parents=True, exist_ok=True)
    save_path = output_dir / "dataset"
    print(f"\n💾  Saving processed dataset to {save_path} …")
    final_dataset.save_to_disk(str(save_path))

    # Also export a small JSON manifest for quick inspection
    manifest = {
        "source": HF_OXFORD_REPO,
        "image_size": list(IMAGE_SIZE),
        "columns": ["image", "species", "breed", "split", "source"],
        "splits": {
            split: len(ds) for split, ds in final_dataset.items()
        },
        "breeds": sorted(set(normalise_breed(n) for n in label_names)),
        "species": ["cat", "dog"],
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"📋  Manifest written to {manifest_path}")

    print("\n✅  Oxford-IIIT Pet import complete!")
    print(f"    Total examples: {sum(len(ds) for ds in final_dataset.values())}")


def push_to_hub(output_dir: Path, hub_repo: str) -> None:
    try:
        from datasets import load_from_disk
    except ImportError:
        sys.exit("Missing 'datasets'. Run: pip install datasets")

    print(f"\n🚀  Pushing to Hugging Face Hub: {hub_repo} …")
    ds = load_from_disk(str(output_dir / "dataset"))
    ds.push_to_hub(hub_repo, private=True)
    print("✅  Push complete!")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Import Oxford-IIIT Pet dataset")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/processed/oxford_pet"),
        help="Local output directory (default: data/processed/oxford_pet)",
    )
    parser.add_argument(
        "--push-to-hub",
        metavar="REPO_ID",
        default=None,
        help="Optional: push processed dataset to HF Hub (e.g. firstoff/animalmind-oxford-pet)",
    )
    args = parser.parse_args()

    build_pipeline(args.output)

    if args.push_to_hub:
        push_to_hub(args.output, args.push_to_hub)


if __name__ == "__main__":
    main()
