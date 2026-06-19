"""
AnimalMind — VLM Auto-Annotator
================================
Usa o modelo Salesforce/blip-image-captioning-base (leve, ~500 MB) para
gerar captions de imagens e mapear automaticamente para labels de
comportamento e emoção do schema AnimalMind.

Para cada imagem gera uma sugestão de anotação que o utilizador pode
aceitar, editar ou rejeitar antes de guardar.

Usage
-----
  # Auto-anotar pasta de imagens (modo sugestão — pede confirmação):
  python data/scripts/auto_annotate.py --images data/raw/my_photos/ --batch 003

  # Modo automático sem confirmação (cuidado: menor qualidade):
  python data/scripts/auto_annotate.py --images data/raw/my_photos/ --batch 003 --auto

  # Definir confiança máxima para sugestões automáticas:
  python data/scripts/auto_annotate.py --images data/raw/my_photos/ --batch 003 --auto --confidence 0.7

  # Usar GPU se disponível:
  python data/scripts/auto_annotate.py --images data/raw/my_photos/ --batch 003 --device cuda

Dependencies
------------
  pip install transformers Pillow torch
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Optional

# ── Label vocabularies ────────────────────────────────────────────────────────

BEHAVIOR_KEYWORDS: dict[str, list[str]] = {
    "playing":    ["play", "playing", "toy", "ball", "fetch", "fun", "game"],
    "resting":    ["rest", "resting", "lying", "lying down", "relaxing", "lounge"],
    "sleeping":   ["sleep", "sleeping", "asleep", "napping", "nap", "dozing"],
    "eating":     ["eat", "eating", "food", "bowl", "chew", "chewing", "snack"],
    "grooming":   ["groom", "grooming", "lick", "licking", "clean", "cleaning"],
    "alert":      ["alert", "watching", "staring", "look", "attention", "focus"],
    "running":    ["run", "running", "chase", "chasing", "sprint", "dash"],
    "jumping":    ["jump", "jumping", "leap", "leaping"],
    "barking":    ["bark", "barking", "howl", "howling"],
    "sitting":    ["sit", "sitting", "seated"],
    "standing":   ["stand", "standing", "upright"],
    "hiding":     ["hide", "hiding", "behind", "under", "shelter", "corner"],
    "exploring":  ["explore", "exploring", "sniff", "sniffing", "curious", "investigate"],
    "socialising":["social", "socialising", "together", "friend", "play with"],
    "begging":    ["beg", "begging", "want", "hoping"],
    "wagging_tail":["wag", "wagging", "tail"],
}

EMOTION_KEYWORDS: dict[str, list[str]] = {
    "relaxed":           ["relax", "calm", "peaceful", "serene", "content", "comfortable"],
    "excited":           ["excit", "happy", "joy", "energetic", "enthusiastic", "playful"],
    "playful":           ["play", "fun", "game", "frolic", "lively"],
    "curious":           ["curious", "interest", "explore", "inspect", "sniff", "watch"],
    "anxious":           ["anx", "nervous", "worry", "scared", "tense", "stress"],
    "fearful":           ["fear", "frightened", "afraid", "terrified", "panic", "flee"],
    "aggressive":        ["aggress", "growl", "snarl", "angry", "threaten", "attack"],
    "content":           ["content", "satisfied", "comfortable", "happy", "pleased"],
    "hungry":            ["hungry", "food", "eat", "bowl", "beg", "want food"],
    "sad":               ["sad", "depressed", "lonely", "unhappy", "dejected", "melanchol"],
    "distress":          ["distress", "pain", "hurt", "suffer", "cry", "whimper"],
    "attention_seeking": ["attention", "look at me", "stare", "demand", "want"],
}

ENVIRONMENT_KEYWORDS: dict[str, list[str]] = {
    "indoor_home":       ["home", "house", "room", "sofa", "couch", "bed", "carpet", "floor", "kitchen", "indoor"],
    "outdoor_garden":    ["garden", "yard", "grass", "lawn", "backyard", "outside"],
    "outdoor_park":      ["park", "field", "open", "nature", "trail", "forest", "wood"],
    "outdoor_street":    ["street", "road", "pavement", "sidewalk", "urban", "city"],
    "veterinary_clinic": ["vet", "clinic", "hospital", "table", "examination"],
    "car":               ["car", "vehicle", "seat", "window", "drive"],
    "shelter":           ["shelter", "cage", "kennel", "crate"],
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ── VLM helper ────────────────────────────────────────────────────────────────

class BLIPAnnotator:
    def __init__(self, device: str = "cpu"):
        try:
            from transformers import BlipProcessor, BlipForConditionalGeneration
            from PIL import Image
            import torch
        except ImportError:
            sys.exit("Run: pip install transformers Pillow torch")

        self.device = device
        model_id = "Salesforce/blip-image-captioning-base"
        print(f"[INFO] Loading VLM: {model_id} on {device} ...")
        t0 = time.time()
        self.processor = BlipProcessor.from_pretrained(model_id)
        self.model = BlipForConditionalGeneration.from_pretrained(
            model_id,
            torch_dtype=__import__("torch").float16 if device == "cuda" else __import__("torch").float32,
        ).to(device)
        print(f"[INFO] VLM loaded in {time.time()-t0:.1f}s")

    def caption(self, img_path: Path) -> str:
        from PIL import Image
        import torch
        img = Image.open(img_path).convert("RGB")
        inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=60)
        return self.processor.decode(out[0], skip_special_tokens=True)

    def caption_with_prompt(self, img_path: Path, prompt: str) -> str:
        from PIL import Image
        import torch
        img = Image.open(img_path).convert("RGB")
        inputs = self.processor(images=img, text=prompt, return_tensors="pt").to(self.device)
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=40)
        return self.processor.decode(out[0], skip_special_tokens=True)


# ── Mapping helpers ───────────────────────────────────────────────────────────

def match_label(text: str, keyword_map: dict[str, list[str]]) -> Optional[str]:
    """Return best matching label from keyword map, or None."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for label, keywords in keyword_map.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[label] = score
    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def detect_species(caption: str) -> str:
    caption_lower = caption.lower()
    dog_words = ["dog", "puppy", "pup", "canine", "retriever", "labrador",
                 "bulldog", "poodle", "terrier", "beagle", "pug", "shepherd"]
    cat_words = ["cat", "kitten", "kitty", "feline", "tabby", "siamese",
                 "persian", "calico", "tomcat"]
    dog_score = sum(1 for w in dog_words if w in caption_lower)
    cat_score = sum(1 for w in cat_words if w in caption_lower)
    if dog_score > cat_score:
        return "dog"
    if cat_score > dog_score:
        return "cat"
    return "unknown"


def build_suggestion(caption: str, behavior_caption: str = "", emotion_caption: str = "") -> dict:
    combined = f"{caption} {behavior_caption} {emotion_caption}"
    species     = detect_species(combined)
    behavior    = match_label(combined, BEHAVIOR_KEYWORDS) or "unknown"
    emotion     = match_label(combined, EMOTION_KEYWORDS)
    environment = match_label(combined, ENVIRONMENT_KEYWORDS) or "unknown"
    return {
        "species":     species,
        "behavior":    behavior,
        "emotion":     emotion,
        "environment": environment,
    }


# ── Main loop ─────────────────────────────────────────────────────────────────

def auto_annotate(
    images_dir: Path,
    output_dir: Path,
    batch_id: str,
    auto_mode: bool,
    confidence: float,
    device: str,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"batch_{batch_id}.jsonl"

    images = sorted(p for p in images_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS)
    if not images:
        sys.exit(f"No images found in {images_dir}")

    annotator = BLIPAnnotator(device=device)

    saved   = 0
    skipped = 0

    print(f"\n=== AnimalMind VLM Auto-Annotator ===")
    print(f"  Images  : {len(images)}")
    print(f"  Output  : {out_file}")
    print(f"  Mode    : {'auto (no confirmation)' if auto_mode else 'suggestion (confirm each)'}")
    print(f"  Confidence: {confidence}")
    print()

    with out_file.open("a", encoding="utf-8") as fh:
        for idx, img_path in enumerate(images, 1):
            print(f"[{idx}/{len(images)}] {img_path.name}")

            t0 = time.time()
            # 1) Free-form caption
            caption = annotator.caption(img_path)
            # 2) Behaviour-prompted caption
            behavior_cap = annotator.caption_with_prompt(
                img_path, "a photo of a pet that is"
            )
            elapsed = time.time() - t0

            suggestion = build_suggestion(caption, behavior_cap)
            print(f"  Caption      : {caption}")
            print(f"  Behavior cap : {behavior_cap}")
            print(f"  Suggestion   : species={suggestion['species']} | "
                  f"behavior={suggestion['behavior']} | "
                  f"emotion={suggestion['emotion']} | "
                  f"env={suggestion['environment']}  ({elapsed:.1f}s)")

            # ── Auto mode: accept suggestion directly ──────────────────
            if auto_mode:
                if suggestion["species"] == "unknown":
                    print("  [SKIP] Species unknown — skipping.")
                    skipped += 1
                    continue
                record = {
                    "image_path":       str(img_path),
                    "species":          suggestion["species"],
                    "breed":            None,
                    "behavior":         suggestion["behavior"],
                    "emotion":          suggestion["emotion"],
                    "environment":      suggestion["environment"],
                    "image_quality":    "medium",
                    "label_confidence": confidence,
                    "source":           "annotator_capture",
                    "notes":            f"VLM caption: {caption}",
                }
            else:
                # ── Interactive mode: confirm / override each field ────
                print("\n  Accept suggestion? [Enter=yes | 'e'=edit | 's'=skip | 'q'=quit]")
                choice = input("  > ").strip().lower()
                if choice == "q":
                    sys.exit(0)
                if choice == "s":
                    print("  Skipped.")
                    skipped += 1
                    continue

                if choice == "e":
                    # Override species
                    sp = input(f"  Species [{suggestion['species']}]: ").strip()
                    if sp:
                        suggestion["species"] = sp
                    # Override behavior
                    bv = input(f"  Behavior [{suggestion['behavior']}]: ").strip()
                    if bv:
                        suggestion["behavior"] = bv
                    # Override emotion
                    em = input(f"  Emotion [{suggestion['emotion']}]: ").strip()
                    if em:
                        suggestion["emotion"] = em
                    # Override environment
                    ev = input(f"  Environment [{suggestion['environment']}]: ").strip()
                    if ev:
                        suggestion["environment"] = ev

                breed_raw = input("  Breed (optional, Enter to skip): ").strip()
                qual_raw  = input("  Quality [high/medium/low, Enter=medium]: ").strip()
                notes_raw = input("  Notes (optional, Enter to skip): ").strip()
                conf_raw  = input(f"  Confidence [Enter={confidence}]: ").strip()

                record = {
                    "image_path":       str(img_path),
                    "species":          suggestion["species"],
                    "breed":            breed_raw or None,
                    "behavior":         suggestion["behavior"],
                    "emotion":          suggestion["emotion"],
                    "environment":      suggestion["environment"],
                    "image_quality":    qual_raw if qual_raw in ("high", "medium", "low") else "medium",
                    "label_confidence": float(conf_raw) if conf_raw else confidence,
                    "source":           "annotator_capture",
                    "notes":            notes_raw[:500] if notes_raw else f"VLM: {caption}",
                }

            if record["species"] == "unknown":
                print("  [SKIP] Species still unknown — skipping.")
                skipped += 1
                continue

            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
            fh.flush()
            saved += 1
            print(f"  [SAVED]\n")

    print(f"\n=== Done ===")
    print(f"  Saved   : {saved}")
    print(f"  Skipped : {skipped}")
    print(f"  Output  : {out_file}")
    print(f"\nValidate with:")
    print(f"  python data/scripts/build_animalmind_dataset.py validate --input {out_file}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AnimalMind VLM auto-annotation using BLIP"
    )
    parser.add_argument("--images",     type=Path, required=True)
    parser.add_argument("--batch",      default="001")
    parser.add_argument("--output",     type=Path, default=Path("data/annotations"))
    parser.add_argument("--auto",       action="store_true",
                        help="Accept all suggestions without confirmation")
    parser.add_argument("--confidence", type=float, default=0.7,
                        help="label_confidence to assign in auto mode (default: 0.7)")
    parser.add_argument("--device",     default="cpu",
                        help="Torch device: 'cpu' or 'cuda' (default: cpu)")
    args = parser.parse_args()

    if not args.images.is_dir():
        sys.exit(f"Images folder not found: {args.images}")

    auto_annotate(
        images_dir = args.images,
        output_dir = args.output,
        batch_id   = args.batch,
        auto_mode  = args.auto,
        confidence = args.confidence,
        device     = args.device,
    )


if __name__ == "__main__":
    main()
