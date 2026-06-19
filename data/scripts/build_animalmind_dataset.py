"""
AnimalMind Custom Dataset Builder
===================================
Creates, validates and optionally pushes the proprietary AnimalMind dataset
to Hugging Face Hub.

The schema is purpose-built for behaviour/emotion model training on dogs and
cats and is fully compatible with the `datasets` library.

Usage
-----
  # Validate an existing JSONL annotation file
  python data/scripts/build_animalmind_dataset.py validate \
      --input data/annotations/batch_001.jsonl

  # Convert annotation JSONL files into a Hugging Face Dataset
  python data/scripts/build_animalmind_dataset.py build \
      --input  data/annotations/ \
      --output data/processed/animalmind \
      [--push-to-hub firstoff/animalmind-behavior]

  # Print the schema reference
  python data/scripts/build_animalmind_dataset.py schema
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Schema definition
# ---------------------------------------------------------------------------

SCHEMA_VERSION = "1.0.0"

# Valid controlled-vocabulary values
VALID_SPECIES      = {"dog", "cat"}
VALID_BEHAVIORS    = {
    "playing", "resting", "eating", "grooming", "barking", "meowing",
    "running", "jumping", "sitting", "standing", "lying_down",
    "wagging_tail", "hissing", "growling", "begging", "socialising",
    "hiding", "exploring", "sleeping", "alert", "unknown",
}
VALID_EMOTIONS     = {
    "relaxed", "excited", "anxious", "fearful", "aggressive",
    "playful", "curious", "sad", "hungry", "content", "distress",
    "attention_seeking", "unknown",
}
VALID_ENVIRONMENTS = {
    "indoor_home", "outdoor_garden", "outdoor_street", "outdoor_park",
    "veterinary_clinic", "shelter", "car", "unknown",
}
VALID_IMAGE_QUALITY = {"high", "medium", "low"}
VALID_SOURCES       = {
    "oxford_iiit_pet",   # baseline import
    "user_upload",        # uploaded by registered Pawra user
    "annotator_capture",  # captured by internal annotator
    "partner_dataset",    # licensed third-party dataset
    "synthetic",          # AI-generated or augmented
}

# Required fields for each annotation record
REQUIRED_FIELDS = {
    "image_path",         # relative path to image file  (string)
    "species",            # "dog" | "cat"                (string)
    "behavior",           # see VALID_BEHAVIORS           (string)
    "environment",        # see VALID_ENVIRONMENTS        (string)
    "image_quality",      # "high" | "medium" | "low"    (string)
    "label_confidence",   # 0.0 – 1.0                    (float)
    "source",             # see VALID_SOURCES             (string)
}

# Optional fields (can be null/missing)
OPTIONAL_FIELDS = {
    "breed",         # e.g. "Golden Retriever"  (string | null)
    "emotion",       # see VALID_EMOTIONS        (string | null)
    "notes",         # free text                 (string | null)
}


def get_full_schema() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "description": (
            "AnimalMind proprietary dataset for pet behaviour and emotion "
            "classification. Focused on domestic dogs and cats."
        ),
        "columns": {
            "image_path": {
                "type": "string",
                "description": "Relative path to the image file from the dataset root.",
                "required": True,
            },
            "species": {
                "type": "string",
                "enum": sorted(VALID_SPECIES),
                "required": True,
            },
            "breed": {
                "type": "string | null",
                "description": "Optional breed name in English (title case). Use null if unknown.",
                "required": False,
            },
            "behavior": {
                "type": "string",
                "enum": sorted(VALID_BEHAVIORS),
                "description": "Primary observable behaviour in the image.",
                "required": True,
            },
            "emotion": {
                "type": "string | null",
                "enum": sorted(VALID_EMOTIONS) + ["null"],
                "description": (
                    "Inferred emotional state. Use null when behaviour does "
                    "not provide enough signal or when annotator confidence < 0.5."
                ),
                "required": False,
            },
            "environment": {
                "type": "string",
                "enum": sorted(VALID_ENVIRONMENTS),
                "required": True,
            },
            "image_quality": {
                "type": "string",
                "enum": ["high", "medium", "low"],
                "description": (
                    "high: sharp, well-lit, animal clearly visible. "
                    "medium: minor blur/occlusion. "
                    "low: heavy blur, poor lighting, or significant occlusion."
                ),
                "required": True,
            },
            "label_confidence": {
                "type": "float",
                "range": [0.0, 1.0],
                "description": (
                    "Annotator confidence in behaviour AND emotion labels. "
                    "Records with confidence < 0.5 should be reviewed before training."
                ),
                "required": True,
            },
            "source": {
                "type": "string",
                "enum": sorted(VALID_SOURCES),
                "required": True,
            },
            "notes": {
                "type": "string | null",
                "description": "Free-text annotation notes (max 500 chars). Use null if empty.",
                "required": False,
            },
        },
        "annotation_rules": {
            "1_single_primary_behaviour": (
                "Choose ONE primary behaviour per image. If multiple are visible, "
                "pick the most prominent."
            ),
            "2_confidence_threshold": (
                "Only submit records with label_confidence >= 0.6. "
                "Uncertain records (0.5–0.59) should be marked for second review."
            ),
            "3_emotion_only_with_confidence": (
                "Only set 'emotion' when you are confident (>= 0.6). "
                "Otherwise leave null."
            ),
            "4_breed_in_english": (
                "Use English breed names in title case (e.g. 'Golden Retriever', "
                "'Domestic Shorthair'). Use null for mixed or unknown breeds."
            ),
            "5_image_quality_definition": (
                "high: animal face and at least 50 % of body visible, sharp focus. "
                "medium: partial occlusion or slight blur, still useful for training. "
                "low: discard from training unless explicitly needed for robustness."
            ),
            "6_no_human_faces": (
                "Do not annotate images where a human face is clearly identifiable. "
                "Blur or exclude such images before inclusion."
            ),
            "7_source_traceability": (
                "Every record must have a traceable source. "
                "For user uploads set source='user_upload' and ensure the user "
                "accepted the data-contribution terms."
            ),
        },
    }


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_record(record: dict[str, Any], line_no: int) -> list[str]:
    errors: list[str] = []

    # Required fields
    for field in REQUIRED_FIELDS:
        if field not in record or record[field] is None:
            errors.append(f"L{line_no}: missing required field '{field}'")

    if errors:
        return errors  # skip further checks if required fields missing

    if record.get("species") not in VALID_SPECIES:
        errors.append(f"L{line_no}: invalid species '{record.get('species')}'")
    if record.get("behavior") not in VALID_BEHAVIORS:
        errors.append(f"L{line_no}: invalid behavior '{record.get('behavior')}'")
    if record.get("environment") not in VALID_ENVIRONMENTS:
        errors.append(f"L{line_no}: invalid environment '{record.get('environment')}'")
    if record.get("image_quality") not in VALID_IMAGE_QUALITY:
        errors.append(f"L{line_no}: invalid image_quality '{record.get('image_quality')}'")
    if record.get("source") not in VALID_SOURCES:
        errors.append(f"L{line_no}: invalid source '{record.get('source')}'")

    # label_confidence must be float in [0, 1]
    lc = record.get("label_confidence")
    try:
        lc_f = float(lc)  # type: ignore[arg-type]
        if not (0.0 <= lc_f <= 1.0):
            errors.append(f"L{line_no}: label_confidence {lc_f} out of range [0,1]")
    except (TypeError, ValueError):
        errors.append(f"L{line_no}: label_confidence must be a float, got {lc!r}")

    # Optional: emotion enum if present
    emotion = record.get("emotion")
    if emotion is not None and emotion not in VALID_EMOTIONS:
        errors.append(f"L{line_no}: invalid emotion '{emotion}'")

    # Optional: notes max length
    notes = record.get("notes")
    if notes is not None and len(str(notes)) > 500:
        errors.append(f"L{line_no}: notes exceeds 500 characters")

    return errors


def validate_file(jsonl_path: Path) -> tuple[int, int, list[str]]:
    """Returns (total_records, error_count, error_messages)."""
    all_errors: list[str] = []
    total = 0
    with jsonl_path.open("r", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as exc:
                all_errors.append(f"L{line_no}: JSON parse error – {exc}")
                continue
            total += 1
            all_errors.extend(validate_record(record, line_no))
    return total, len(all_errors), all_errors


# ---------------------------------------------------------------------------
# Dataset builder
# ---------------------------------------------------------------------------

def build_dataset(input_dir: Path, output_dir: Path) -> None:
    try:
        from datasets import Dataset, DatasetDict
        from PIL import Image as PILImage
    except ImportError:
        sys.exit("Missing dependencies. Run: pip install datasets Pillow")

    jsonl_files = sorted(input_dir.glob("*.jsonl"))
    if not jsonl_files:
        sys.exit(f"No .jsonl annotation files found in {input_dir}")

    print(f"📂  Found {len(jsonl_files)} annotation file(s).")

    all_records: list[dict[str, Any]] = []
    for jf in jsonl_files:
        total, nerrors, errs = validate_file(jf)
        if nerrors:
            print(f"⚠️   {jf.name}: {nerrors}/{total} records have errors – fix before building.")
            for e in errs[:10]:
                print(f"     {e}")
            if nerrors > 10:
                print(f"     … and {nerrors - 10} more errors.")
            continue
        print(f"✅  {jf.name}: {total} valid records.")
        with jf.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    all_records.append(json.loads(line))

    if not all_records:
        sys.exit("No valid records to build dataset from.")

    print(f"\n🏗️   Building dataset from {len(all_records)} records …")

    # Load images
    images = []
    skipped = 0
    for rec in all_records:
        img_path = input_dir.parent / rec["image_path"]
        try:
            img = PILImage.open(img_path).convert("RGB")
            images.append(img)
        except Exception:
            images.append(None)
            skipped += 1

    if skipped:
        print(f"⚠️   {skipped} images could not be loaded and will be None.")

    data = {
        "image":           images,
        "species":         [r["species"] for r in all_records],
        "breed":           [r.get("breed") for r in all_records],
        "behavior":        [r["behavior"] for r in all_records],
        "emotion":         [r.get("emotion") for r in all_records],
        "environment":     [r["environment"] for r in all_records],
        "image_quality":   [r["image_quality"] for r in all_records],
        "label_confidence":[float(r["label_confidence"]) for r in all_records],
        "source":          [r["source"] for r in all_records],
        "notes":           [r.get("notes") for r in all_records],
    }

    ds = Dataset.from_dict(data)
    output_dir.mkdir(parents=True, exist_ok=True)
    ds.save_to_disk(str(output_dir / "dataset"))
    print(f"💾  Saved to {output_dir / 'dataset'}")
    print(f"✅  AnimalMind dataset built: {len(ds)} records.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="AnimalMind custom dataset tools",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # schema
    sub.add_parser("schema", help="Print the full schema as JSON")

    # validate
    val = sub.add_parser("validate", help="Validate a JSONL annotation file")
    val.add_argument("--input", type=Path, required=True, help="Path to .jsonl file")

    # build
    bld = sub.add_parser("build", help="Build Hugging Face Dataset from annotations")
    bld.add_argument("--input", type=Path, default=Path("data/annotations"),
                     help="Directory containing .jsonl files")
    bld.add_argument("--output", type=Path, default=Path("data/processed/animalmind"),
                     help="Output directory")
    bld.add_argument("--push-to-hub", metavar="REPO_ID", default=None,
                     help="Optional: push to HF Hub after building")

    args = parser.parse_args()

    if args.command == "schema":
        print(json.dumps(get_full_schema(), indent=2, ensure_ascii=False))

    elif args.command == "validate":
        total, nerrors, errs = validate_file(args.input)
        print(f"\nValidated {total} records — {nerrors} error(s).")
        for e in errs:
            print(f"  {e}")
        sys.exit(0 if nerrors == 0 else 1)

    elif args.command == "build":
        build_dataset(args.input, args.output)
        if args.push_to_hub:
            try:
                from datasets import load_from_disk
            except ImportError:
                sys.exit("Missing 'datasets'.")
            ds = load_from_disk(str(args.output / "dataset"))
            print(f"\n🚀  Pushing to Hugging Face Hub: {args.push_to_hub} …")
            ds.push_to_hub(args.push_to_hub, private=True)
            print("✅  Push complete!")


if __name__ == "__main__":
    main()
