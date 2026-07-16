"""
Oxford-IIIT Pet Dataset Import Pipeline
========================================
Imports the Oxford-IIIT Pet dataset from Hugging Face (pcuenq/oxford-pets),
normalises it to the AnimalMind schema and saves it locally as a HF Dataset.

Real schema of pcuenq/oxford-pets:
  - path   : string   (original filename)
  - label  : string   (breed name, e.g. "Siamese")
  - dog    : bool     (True = dog, False = cat)
  - image  : Image    (PIL image)

Output columns (AnimalMind standard):
  image | species | breed | split | source

Usage
-----
  python data/scripts/import_oxford_pet.py --output data/processed/oxford_pet
  python data/scripts/import_oxford_pet.py --output data/processed/oxford_pet \\
      --push-to-hub firstoff/animalmind-oxford-pet

Dependencies
------------
  pip install datasets huggingface_hub Pillow
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

HF_OXFORD_REPO = "pcuenq/oxford-pets"
IMAGE_SIZE = (224, 224)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalise_breed(raw_label: str) -> str:
    """Replace underscores with spaces and strip whitespace."""
    return raw_label.replace("_", " ").strip()


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def build_pipeline(output_dir: Path) -> None:
    try:
        from datasets import load_dataset, DatasetDict
        from PIL import Image as PILImage
    except ImportError:
        sys.exit(
            "Missing dependencies. Run:\n"
            "  pip install datasets huggingface_hub Pillow"
        )

    print("[>>] Loading Oxford-IIIT Pet from Hugging Face ...")
    # trust_remote_code is no longer supported in datasets >= 2.20
    raw: DatasetDict = load_dataset(HF_OXFORD_REPO)  # type: ignore[arg-type]

    print(f"    Splits available: {list(raw.keys())}")

    # The HF mirror only ships a single 'train' split — we create our own
    # train/test 90/10 split deterministically.
    full_split = raw["train"]
    print(f"    Total records: {len(full_split)}")

    split_ds = full_split.train_test_split(test_size=0.1, seed=42)
    print(f"    train: {len(split_ds['train'])}  |  test: {len(split_ds['test'])}")

    def transform(batch: dict[str, Any], split_name: str) -> dict[str, Any]:
        images_out  = []
        species_out = []
        breeds_out  = []
        splits_out  = []
        sources_out = []

        for img, label, is_dog in zip(
            batch["image"], batch["label"], batch["dog"]
        ):
            breed   = normalise_breed(str(label))
            species = "dog" if is_dog else "cat"

            # Resize to standard vision-model input
            if isinstance(img, PILImage.Image):
                img = img.convert("RGB").resize(IMAGE_SIZE, PILImage.LANCZOS)

            images_out.append(img)
            species_out.append(species)
            breeds_out.append(breed)
            splits_out.append(split_name)
            sources_out.append("oxford_iiit_pet")

        return {
            "image":   images_out,
            "species": species_out,
            "breed":   breeds_out,
            "split":   splits_out,
            "source":  sources_out,
        }

    processed_splits = {}
    for split_name, ds in split_ds.items():
        print(f"    Processing split '{split_name}' ({len(ds)} examples) ...")
        processed = ds.map(
            lambda batch, sn=split_name: transform(batch, sn),
            batched=True,
            batch_size=64,
            remove_columns=ds.column_names,
            desc=f"Transforming {split_name}",
        )
        processed_splits[split_name] = processed

    final_dataset = DatasetDict(processed_splits)

    # -------------------------------------------------------------------
    # Save locally
    # -------------------------------------------------------------------
    output_dir.mkdir(parents=True, exist_ok=True)
    save_path = output_dir / "dataset"
    print(f"\n[SAVE] Saving processed dataset to {save_path} ...")
    final_dataset.save_to_disk(str(save_path))

    # Collect unique breeds from the raw dataset
    all_breeds = sorted(set(normalise_breed(str(x)) for x in full_split["label"]))

    manifest = {
        "source":     HF_OXFORD_REPO,
        "image_size": list(IMAGE_SIZE),
        "columns":    ["image", "species", "breed", "split", "source"],
        "splits":     {s: len(d) for s, d in final_dataset.items()},
        "num_breeds": len(all_breeds),
        "breeds":     all_breeds,
        "species":    ["cat", "dog"],
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"[INFO] Manifest written to {manifest_path}")

    total = sum(len(d) for d in final_dataset.values())
    print(f"\n[OK] Oxford-IIIT Pet import complete!")
    print(f"    Total examples : {total}")
    print(f"    Breeds         : {len(all_breeds)}")
    print(f"    Output dir     : {output_dir}")


def push_to_hub(output_dir: Path, hub_repo: str) -> None:
    try:
        from datasets import load_from_disk
    except ImportError:
        sys.exit("Missing 'datasets'. Run: pip install datasets")

    print(f"\n[>>] Pushing to Hugging Face Hub: {hub_repo} ...")
    ds = load_from_disk(str(output_dir / "dataset"))
    ds.push_to_hub(hub_repo, private=True)
    print("[OK] Push complete!")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import Oxford-IIIT Pet dataset into AnimalMind schema"
    )
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
        help="Optional: push processed dataset to HF Hub",
    )
    args = parser.parse_args()

    build_pipeline(args.output)

    if args.push_to_hub:
        push_to_hub(args.output, args.push_to_hub)


if __name__ == "__main__":
    main()
