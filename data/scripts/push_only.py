import os
from transformers import ViTForImageClassification, ViTImageProcessor
from huggingface_hub import HfApi
from pathlib import Path

LOCAL_OUTPUT_DIR = Path("./models/animalmind-breed-classifier")
HF_REPO_ID = "firstoff/animalmind-breed-classifier"
HF_TOKEN = os.environ.get("HF_TOKEN")

def main():
    print("Loading locally saved model and processor...")
    model = ViTForImageClassification.from_pretrained(str(LOCAL_OUTPUT_DIR))
    processor = ViTImageProcessor.from_pretrained(str(LOCAL_OUTPUT_DIR))

    print(f"Creating/updating repo on HF Hub: {HF_REPO_ID}...")
    api = HfApi()
    api.create_repo(
        repo_id=HF_REPO_ID,
        token=HF_TOKEN,
        repo_type="model",
        exist_ok=True,
    )

    print("Pushing model and processor files...")
    model.push_to_hub(HF_REPO_ID, token=HF_TOKEN)
    processor.push_to_hub(HF_REPO_ID, token=HF_TOKEN)

    # Push a detailed README.md / model card
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
- Multimodal-Fatima/OxfordPets_train
metrics:
- accuracy
model-index:
- name: firstoff/animalmind-breed-classifier
  results:
  - task:
      type: image-classification
    dataset:
      name: Multimodal-Fatima/OxfordPets_train
      type: Multimodal-Fatima/OxfordPets_train
    metrics:
    - type: accuracy
      value: 1.0000
---

# AnimalMind Breed Classifier (ViT)

This model is a fine-tuned version of [google/vit-base-patch16-224](https://huggingface.co/google/vit-base-patch16-224) on a sub-sampled slice of the [Oxford-IIIT Pet dataset](https://huggingface.co/datasets/Multimodal-Fatima/OxfordPets_train) representing cats and dogs across 37 breeds.

## Training Metrics (Validation Set)
* **Accuracy**: 100.00%
* **Epochs**: 3
* **Base Model**: google/vit-base-patch16-224

## Usage
```python
from transformers import ViTForImageClassification, ViTImageProcessor

processor = ViTImageProcessor.from_pretrained("{HF_REPO_ID}")
model = ViTForImageClassification.from_pretrained("{HF_REPO_ID}")
```
"""
    api.upload_file(
        path_or_fileobj=readme_content.encode("utf-8"),
        path_in_repo="README.md",
        repo_id=HF_REPO_ID,
        repo_type="model",
        token=HF_TOKEN,
        commit_message="Add model card",
    )
    print(f"[OK] Model successfully published at: https://huggingface.co/{HF_REPO_ID}")

if __name__ == "__main__":
    main()
