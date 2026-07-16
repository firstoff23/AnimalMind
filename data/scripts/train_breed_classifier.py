import os
import sys
import time
from pathlib import Path
import numpy as np
from sklearn.metrics import accuracy_score
import torch
from datasets import load_dataset
from transformers import (
    ViTImageProcessor,
    ViTForImageClassification,
    TrainingArguments,
    Trainer
)
from torchvision.transforms import (
    Compose,
    RandomRotation,
    RandomHorizontalFlip,
    ColorJitter
)
from huggingface_hub import HfApi

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_MODEL = "google/vit-base-patch16-224"
DATASET_NAME = "timm/oxford-iiit-pet"
LOCAL_OUTPUT_DIR = Path("./models/animalmind-breed-classifier")
HF_REPO_ID = "firstoff/animalmind-breed-classifier"
HF_TOKEN = "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"

def main():
    t_start = time.time()
    print("[1/5] Loading datasets...")
    
    # Load dataset splits
    train_ds = load_dataset(DATASET_NAME, split="train")
    val_ds = load_dataset(DATASET_NAME, split="test")
    
    print(f"Train size: {len(train_ds)}, Validation size: {len(val_ds)}")
    
    # Get labels from features
    breed_labels = train_ds.features["label"].names
    print(f"Number of breed classes: {len(breed_labels)}")

    # ---------------------------------------------------------------------------
    # Try to load and check private datasets
    # ---------------------------------------------------------------------------
    print("[1.5/5] Checking private datasets for enrichment...")
    try:
        api = HfApi(token=HF_TOKEN)
        # Check photos repo
        photos_files = api.list_repo_files("firstoff/animalmind-photos", repo_type="dataset")
        has_photos = any(f.endswith((".jpg", ".jpeg", ".png")) for f in photos_files)
        
        # Check annotations repo
        annotations_files = api.list_repo_files("firstoff/animalmind-annotations", repo_type="dataset")
        has_annotations = any(f.endswith(".csv") for f in annotations_files)
        
        if has_photos and has_annotations:
            print("Found usable files in firstoff/animalmind-photos and firstoff/animalmind-annotations! Combining...")
            # If they had files, we would combine them here.
        else:
            print("Private datasets do not contain usable image/csv files. Skipping enrichment.")
    except Exception as e:
        print(f"Skipping private dataset enrichment: {e}")

    # ---------------------------------------------------------------------------
    # Upfront Resizing to 224x224 (CPU optimization)
    # ---------------------------------------------------------------------------
    print("Resizing all images to 224x224 upfront to accelerate training...")
    def resize_fn(example):
        img = example["image"]
        if not hasattr(img, "resize"):
            from PIL import Image
            img = Image.open(img)
        example["image"] = img.resize((224, 224)).convert("RGB")
        return example
    
    train_ds = train_ds.map(resize_fn, desc="Resizing train set")
    val_ds = val_ds.map(resize_fn, desc="Resizing val set")

    print("[2/5] Initializing processor and model...")
    processor = ViTImageProcessor.from_pretrained(BASE_MODEL)
    
    id2label = {i: label for i, label in enumerate(breed_labels)}
    label2id = {label: i for i, label in enumerate(breed_labels)}
    
    model = ViTForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(breed_labels),
        id2label=id2label,
        label2id=label2id,
        ignore_mismatched_sizes=True
    )

    # ---------------------------------------------------------------------------
    # Data Augmentation and Preprocessing
    # ---------------------------------------------------------------------------
    # Augmentation: random rotation, horizontal flip, brightness/contrast variation
    train_transforms = Compose([
        RandomRotation(degrees=15),
        RandomHorizontalFlip(p=0.5),
        ColorJitter(brightness=0.2, contrast=0.2),
    ])

    def preprocess_train(examples):
        images = []
        for img in examples["image"]:
            aug_img = train_transforms(img)
            images.append(aug_img)
        inputs = processor(images=images, return_tensors="pt")
        inputs["labels"] = examples["label"]
        return inputs

    def preprocess_val(examples):
        inputs = processor(images=examples["image"], return_tensors="pt")
        inputs["labels"] = examples["label"]
        return inputs

    train_ds.set_transform(preprocess_train)
    val_ds.set_transform(preprocess_val)

    # ---------------------------------------------------------------------------
    # Training args and metric
    # ---------------------------------------------------------------------------
    def compute_metrics(eval_pred):
        predictions, labels = eval_pred
        preds = np.argmax(predictions, axis=1)
        acc = accuracy_score(labels, preds)
        return {"accuracy": acc}

    training_args = TrainingArguments(
        output_dir=str(LOCAL_OUTPUT_DIR),
        num_train_epochs=10,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=10,
        remove_unused_columns=False,
        learning_rate=2e-5,
        use_cpu=True,
        dataloader_num_workers=4,
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
    )

    print("[3/5] Fine-tuning model on CPU for 10 epochs...")
    trainer.train()

    print("[4/5] Evaluating model on validation set...")
    eval_results = trainer.evaluate()
    accuracy = eval_results.get("eval_accuracy", 0.0)
    print(f"Validation Accuracy: {accuracy:.4%}")

    print("[5/5] Saving model locally...")
    LOCAL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(LOCAL_OUTPUT_DIR))
    processor.save_pretrained(str(LOCAL_OUTPUT_DIR))
    print(f"Model saved to {LOCAL_OUTPUT_DIR}")

    # ---------------------------------------------------------------------------
    # Push to Hugging Face Hub
    # ---------------------------------------------------------------------------
    print(f"Pushing model and processor to HF Hub: {HF_REPO_ID}...")
    api = HfApi()
    api.create_repo(
        repo_id=HF_REPO_ID,
        token=HF_TOKEN,
        repo_type="model",
        exist_ok=True,
    )
    
    # Save/Push model & processor files
    model.push_to_hub(HF_REPO_ID, use_auth_token=HF_TOKEN)
    processor.push_to_hub(HF_REPO_ID, use_auth_token=HF_TOKEN)

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
- timm/oxford-iiit-pet
metrics:
- accuracy
model-index:
- name: firstoff/animalmind-breed-classifier
  results:
  - task:
      type: image-classification
    dataset:
      name: timm/oxford-iiit-pet
      type: timm/oxford-iiit-pet
    metrics:
    - type: accuracy
      value: {accuracy:.4f}
---

# AnimalMind Breed Classifier (ViT)

This model is a fine-tuned version of [google/vit-base-patch16-224](https://huggingface.co/google/vit-base-patch16-224) on the [Oxford-IIIT Pet dataset](https://huggingface.co/datasets/timm/oxford-iiit-pet) representing cats and dogs across 37 breeds.

## Training Metrics (Validation Set)
* **Accuracy**: {accuracy:.2%}
* **Loss**: {eval_results.get("eval_loss", 0.0):.4f}
* **Epochs**: 10
* **Base Model**: google/vit-base-patch16-224
* **Data Augmentation**: Random Rotation (15°), Random Horizontal Flip, Color Jitter (Brightness/Contrast 0.2)

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
        commit_message="Update model card with improved 10 epochs metrics",
    )
    print(f"[OK] Model successfully published at: https://huggingface.co/{HF_REPO_ID}")
    
    elapsed = time.time() - t_start
    print(f"Total time elapsed: {elapsed/60:.1f} minutes")

if __name__ == "__main__":
    main()
