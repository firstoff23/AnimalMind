"""Push the already-trained local breed classifier to Hugging Face Hub."""
import os
import json
from pathlib import Path
from huggingface_hub import HfApi

LOCAL_MODEL_DIR = Path("./models/animalmind-breed-classifier")
HF_REPO_ID = "firstoff/animalmind-breed-classifier"
HF_TOKEN = os.environ.get("HF_TOKEN")

# Read trainer state for accurate metrics
trainer_state_path = LOCAL_MODEL_DIR / "checkpoint-75" / "trainer_state.json"
accuracy = 0.0
eval_loss = 0.0
if trainer_state_path.exists():
    state = json.loads(trainer_state_path.read_text())
    for entry in reversed(state.get("log_history", [])):
        if "eval_accuracy" in entry:
            accuracy = entry["eval_accuracy"]
            eval_loss = entry.get("eval_loss", 0.0)
            break

print(f"Best eval accuracy: {accuracy:.2%}, eval_loss: {eval_loss:.4f}")

api = HfApi(token=HF_TOKEN)

# Create / ensure repo exists
api.create_repo(
    repo_id=HF_REPO_ID,
    token=HF_TOKEN,
    repo_type="model",
    exist_ok=True,
)

# Upload model files
print("Uploading model files to Hugging Face Hub...")
api.upload_folder(
    folder_path=str(LOCAL_MODEL_DIR),
    repo_id=HF_REPO_ID,
    repo_type="model",
    token=HF_TOKEN,
    ignore_patterns=["checkpoint-*", "optimizer.pt", "rng_state.pth", "scheduler.pt"],
    commit_message="Upload improved ViT breed classifier (3 epochs, augmentation)",
)

# Push updated model card
readme_content = f"""---
license: mit
library_name: transformers
tags:
- vision
- image-classification
- vit
- animalmind
- breeds
datasets:
- timm/oxford-iiit-pet
metrics:
- accuracy
model-index:
- name: firstoff/animalmind-breed-classifier
  results:
  - task:
      type: image-classification
    dataset:
      name: Oxford-IIIT Pet Dataset
      type: timm/oxford-iiit-pet
    metrics:
    - type: accuracy
      value: {accuracy:.4f}
---

# AnimalMind Breed Classifier (ViT)

Fine-tuned [google/vit-base-patch16-224](https://huggingface.co/google/vit-base-patch16-224) on the [Oxford-IIIT Pet dataset](https://huggingface.co/datasets/timm/oxford-iiit-pet) — 37 breeds of cats and dogs.

## Training Details
| Parameter | Value |
|---|---|
| Base Model | google/vit-base-patch16-224|
| Dataset | timm/oxford-iiit-pet |
| Train Split | ~3,680 images |
| Epochs | 3 |
| Learning Rate | 2e-5 |
| Batch Size | 16 |
| Data Augmentation | Random Rotation 15°, Horizontal Flip, Color Jitter |

## Validation Metrics
| Metric | Value |
|---|---|
| **Accuracy** | **{accuracy:.2%}** |
| Loss | {eval_loss:.4f} |

## Usage

```python
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image

processor = ViTImageProcessor.from_pretrained("firstoff/animalmind-breed-classifier")
model = ViTForImageClassification.from_pretrained("firstoff/animalmind-breed-classifier")

image = Image.open("pet.jpg").convert("RGB")
inputs = processor(images=image, return_tensors="pt")
outputs = model(**inputs)
breed_idx = outputs.logits.argmax(-1).item()
breed = model.config.id2label[breed_idx]
print(f"Predicted breed: {{breed}}")
```

## Labels
37 breeds: abyssinian, american bulldog, american pit bull terrier, basset hound, beagle, bengal, birman, bombay, boxer, british shorthair, chihuahua, egyptian mau, english cocker spaniel, english setter, german shorthaired, great pyrenees, havanese, japanese chin, keeshond, leonberger, maine coon, miniature pinscher, newfoundland, persian, pomeranian, pug, ragdoll, russian blue, saint bernard, samoyed, scottish terrier, shiba inu, siamese, sphynx, staffordshire bull terrier, wheaten terrier, yorkshire terrier
"""

api.upload_file(
    path_or_fileobj=readme_content.encode("utf-8"),
    path_in_repo="README.md",
    repo_id=HF_REPO_ID,
    repo_type="model",
    token=HF_TOKEN,
    commit_message="Update model card with training metrics",
)

print(f"\n[OK] Model published at: https://huggingface.co/{HF_REPO_ID}")
