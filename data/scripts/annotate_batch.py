"""
AnimalMind — Manual Behaviour Annotation CLI
=============================================
Carrega imagens de uma pasta local, apresenta-as ao utilizador e pede
anotação interactiva de comportamento e emoção.
As anotações são guardadas em data/annotations/batch_XXX.jsonl.

Usage
-----
  # Anotar imagens de uma pasta:
  python data/scripts/annotate_batch.py --images data/raw/my_photos/ --batch 002

  # Retomar anotação de um batch existente (salta imagens já anotadas):
  python data/scripts/annotate_batch.py --images data/raw/my_photos/ --batch 002 --resume

  # Mudar pasta de output:
  python data/scripts/annotate_batch.py --images photos/ --output data/annotations/

Dependencies
------------
  pip install rich Pillow
  (opcional) pip install matplotlib   # para mostrar imagem no terminal
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

VALID_BEHAVIORS = [
    "alert", "barking", "begging", "eating", "exploring",
    "grooming", "growling", "hiding", "hissing", "jumping",
    "lying_down", "meowing", "playing", "resting", "running",
    "sitting", "sleeping", "socialising", "standing",
    "unknown", "wagging_tail",
]

VALID_EMOTIONS = [
    "aggressive", "anxious", "attention_seeking", "content",
    "curious", "distress", "excited", "fearful", "hungry",
    "playful", "relaxed", "sad", "unknown",
]

VALID_ENVIRONMENTS = [
    "car", "indoor_home", "outdoor_garden", "outdoor_park",
    "outdoor_street", "shelter", "unknown", "veterinary_clinic",
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def print_menu(title: str, options: list[str]) -> str:
    """Print a numbered menu and return the chosen value."""
    print(f"\n  {title}")
    for i, opt in enumerate(options, 1):
        print(f"    [{i:2d}] {opt}")
    while True:
        raw = input("  > ").strip()
        if raw.lower() in ("s", "skip", ""):
            return "unknown"
        if raw.lower() in ("q", "quit", "exit"):
            sys.exit(0)
        try:
            idx = int(raw) - 1
            if 0 <= idx < len(options):
                return options[idx]
        except ValueError:
            pass
        # Allow typing the value directly
        if raw in options:
            return raw
        print("  Invalid choice. Try again (or 's' to skip / 'q' to quit):")


def try_show_image(img_path: Path) -> None:
    """Try to display the image using matplotlib (optional)."""
    try:
        import matplotlib.pyplot as plt
        from PIL import Image
        img = Image.open(img_path)
        plt.imshow(img)
        plt.axis("off")
        plt.title(img_path.name)
        plt.tight_layout()
        plt.pause(0.1)
        plt.show(block=False)
    except Exception:
        pass  # silently skip if matplotlib/PIL not available


def load_existing(jsonl_path: Path) -> set[str]:
    """Return set of already-annotated image paths."""
    done: set[str] = set()
    if jsonl_path.exists():
        with jsonl_path.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    rec = json.loads(line)
                    done.add(rec.get("image_path", ""))
    return done


def annotate(images_dir: Path, output_dir: Path, batch_id: str, resume: bool) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"batch_{batch_id}.jsonl"

    # Collect images
    images = sorted(
        p for p in images_dir.rglob("*")
        if p.suffix.lower() in IMAGE_EXTENSIONS
    )
    if not images:
        print(f"No images found in {images_dir}")
        sys.exit(1)

    # Resume: skip already annotated
    already_done = load_existing(out_file) if resume else set()
    pending = [img for img in images if str(img) not in already_done]

    print(f"\n=== AnimalMind Batch Annotator ===")
    print(f"  Folder   : {images_dir}")
    print(f"  Output   : {out_file}")
    print(f"  Total    : {len(images)} images")
    print(f"  Pending  : {len(pending)} images")
    print(f"  Controls : Enter number or type label | 's'=skip | 'q'=quit\n")

    annotated = 0
    skipped   = 0

    with out_file.open("a", encoding="utf-8") as fh:
        for idx, img_path in enumerate(pending, start=1):
            print(f"\n{'='*60}")
            print(f"  Image {idx}/{len(pending)}: {img_path.name}")
            print(f"  Path : {img_path}")
            try_show_image(img_path)

            # ── Species ────────────────────────────────────────────────
            species = print_menu("Species:", ["dog", "cat"])
            if species == "unknown":
                print("  Skipped.")
                skipped += 1
                continue

            # ── Breed (optional) ───────────────────────────────────────
            print(f"\n  Breed (optional, press Enter to skip):")
            breed_raw = input("  > ").strip()
            breed = breed_raw if breed_raw else None

            # ── Behaviour ──────────────────────────────────────────────
            behavior = print_menu("Behaviour:", VALID_BEHAVIORS)

            # ── Emotion (optional) ─────────────────────────────────────
            print("\n  Emotion (optional – 's' to skip):")
            emotion_raw = print_menu("Emotion:", VALID_EMOTIONS)
            emotion = None if emotion_raw == "unknown" else emotion_raw

            # ── Environment ────────────────────────────────────────────
            environment = print_menu("Environment:", VALID_ENVIRONMENTS)

            # ── Image quality ──────────────────────────────────────────
            quality = print_menu("Image quality:", ["high", "medium", "low"])

            # ── Confidence ────────────────────────────────────────────
            print("\n  Label confidence [0.6–1.0, press Enter for 0.8]:")
            conf_raw = input("  > ").strip()
            try:
                confidence = float(conf_raw) if conf_raw else 0.8
                confidence = max(0.0, min(1.0, confidence))
            except ValueError:
                confidence = 0.8

            # ── Notes (optional) ──────────────────────────────────────
            print("  Notes (optional, press Enter to skip):")
            notes_raw = input("  > ").strip()
            notes = notes_raw[:500] if notes_raw else None

            record = {
                "image_path":       str(img_path),
                "species":          species,
                "breed":            breed,
                "behavior":         behavior,
                "emotion":          emotion,
                "environment":      environment,
                "image_quality":    quality,
                "label_confidence": confidence,
                "source":           "annotator_capture",
                "notes":            notes,
            }

            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            fh.flush()
            annotated += 1
            print(f"  [SAVED] {img_path.name} → {behavior} / {emotion}")

    print(f"\n=== Done ===")
    print(f"  Annotated : {annotated}")
    print(f"  Skipped   : {skipped}")
    print(f"  Output    : {out_file}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AnimalMind manual behaviour annotation CLI"
    )
    parser.add_argument("--images",  type=Path, required=True,
                        help="Folder with images to annotate")
    parser.add_argument("--batch",   default="001",
                        help="Batch ID suffix for output file (default: 001)")
    parser.add_argument("--output",  type=Path, default=Path("data/annotations"),
                        help="Output folder for JSONL files")
    parser.add_argument("--resume",  action="store_true",
                        help="Skip already-annotated images in the same batch file")
    args = parser.parse_args()

    if not args.images.is_dir():
        sys.exit(f"Images folder not found: {args.images}")

    annotate(args.images, args.output, args.batch, args.resume)


if __name__ == "__main__":
    main()
