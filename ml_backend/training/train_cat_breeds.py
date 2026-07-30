"""
AnimalMind — ViT Cat Breed Classifier Training & Temperature Scaling Pipeline
================================================================================
Target Accuracy: > 94%

Usage:
  python -m training.train_cat_breeds --batch-size 32 --epochs 30
  python -m training.train_cat_breeds --dry-run
  python -m training.train_cat_breeds --push-to-hub firstoff/animalmind-cat-classifier
"""

import argparse
import copy
import json
import os
import pathlib
import sys
import time
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

CAT_BREEDS_12 = [
    "Abyssinian", "Bengal", "Birman", "Bombay", "British Shorthair",
    "Egyptian Mau", "Maine Coon", "Persian", "Ragdoll", "Russian Blue",
    "Siamese", "Sphynx"
]
ID2LABEL_CAT = {i: b for i, b in enumerate(CAT_BREEDS_12)}
LABEL2ID_CAT = {b: i for i, b in enumerate(CAT_BREEDS_12)}


class ModelWithTemperature(nn.Module):
    """
    A decorator box around a classification model to calibrate its probabilities
    using Temperature Scaling.
    """

    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, input):
        logits = self.model(input)
        if hasattr(logits, "logits"):
            logits = logits.logits
        return self.scale_logits(logits)

    def scale_logits(self, logits):
        temperature = self.temperature.unsqueeze(1).expand(logits.size(0), logits.size(1))
        return logits / temperature

    def set_temperature(self, valid_loader, device="cpu"):
        self.to(device)
        nll_criterion = nn.CrossEntropyLoss().to(device)
        optimizer = torch.optim.LBFGS([self.temperature], lr=0.01, max_iter=50)

        logits_list = []
        labels_list = []
        with torch.no_grad():
            for images, targets in valid_loader:
                images = images.to(device)
                logits = self.model(images)
                if hasattr(logits, "logits"):
                    logits = logits.logits
                logits_list.append(logits)
                labels_list.append(targets.to(device))

        logits = torch.cat(logits_list, dim=0)
        labels = torch.cat(labels_list, dim=0)

        def eval():
            optimizer.zero_grad()
            loss = nll_criterion(self.scale_logits(logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval)
        print(f"[CatTraining] Optimal Cat Temperature T = {self.temperature.item():.4f}")
        return self.temperature.item()


class CatDataset(Dataset):
    """Carrega as 12 raças de gatos do dataset Oxford-IIIT."""
    def __init__(self, data_path, transform=None):
        from PIL import Image
        import pathlib
        self.data_path = pathlib.Path(data_path)
        self.transform = transform
        self.images = []
        self.labels = []
        
        if not self.data_path.exists():
            return

        # Oxford-IIIT tem ficheiros na mesma pasta com o formato: "Nome_da_Raca_123.jpg"
        # Vamos extrair o nome da raça e mapear.
        for img_file in self.data_path.glob("*.jpg"):
            name = img_file.stem
            # rsplit separa pelo último '_', isolando a raça (ex: "British_Shorthair")
            breed_str = name.rsplit("_", 1)[0].replace("_", " ")
            if breed_str in LABEL2ID_CAT:
                self.images.append(img_file)
                self.labels.append(LABEL2ID_CAT[breed_str])
                
    def __len__(self):
        return len(self.images)
        
    def __getitem__(self, idx):
        from PIL import Image
        img_path = self.images[idx]
        # Retorna logo PIL para evitar erros na pipeline de Transforms
        image = Image.open(img_path).convert("RGB")
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label


class SyntheticCatDataset(Dataset):
    """Synthetic dataset for dry-run testing fallback."""

    def __init__(self, num_samples: int = 120, transform=None):
        self.num_samples = num_samples
        self.transform = transform

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        image = torch.randn(3, 224, 224)
        target = idx % len(CAT_BREEDS_12)
        if self.transform:
            image = self.transform(image)
        return image, target


def compute_ece(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
    """Calculates Expected Calibration Error (ECE)."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = predictions == labels

    ece = 0.0
    for i in range(n_bins):
        in_bin = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i+1])
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(accuracy_in_bin - avg_confidence_in_bin) * prop_in_bin
    return float(ece)


def main():
    parser = argparse.ArgumentParser(description="AnimalMind Cat Breed ViT Classifier Training")
    parser.add_argument("--model-name", type=str, default="google/vit-base-patch16-224")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--output-dir", type=str, default="models/animalmind-cat-classifier")
    parser.add_argument("--dry-run", action="store_true", help="Run 1-epoch dry-run test")
    parser.add_argument("--push-to-hub", type=str, default=None, help="HF Hub repo ID")
    args = parser.parse_args()

    print(f"[CatTraining] Starting Cat Breed Fine-Tuning ({args.model_name})...")
    print(f"Cat Breeds: {len(CAT_BREEDS_12)} classes -> {CAT_BREEDS_12}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Compute Device: {device}")

    from transformers import AutoImageProcessor, AutoModelForImageClassification
    image_processor = AutoImageProcessor.from_pretrained(args.model_name)
    base_model = AutoModelForImageClassification.from_pretrained(
        args.model_name,
        num_labels=len(CAT_BREEDS_12),
        id2label=ID2LABEL_CAT,
        label2id=LABEL2ID_CAT,
        ignore_mismatched_sizes=True
    )
    base_model.config.num_labels = len(CAT_BREEDS_12)
    base_model.config.id2label = ID2LABEL_CAT
    base_model.config.label2id = LABEL2ID_CAT

    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomRotation(15),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Caminho absoluto usando o diretório atual do script
    base_dir = pathlib.Path(__file__).resolve().parent.parent
    dataset_path = base_dir / "data" / "oxford-iiit-pet" / "images"
    
    if not dataset_path.exists():
        print(f"[CatTraining] A transferir Oxford-IIIT Pet Dataset para {dataset_path.parent}...")
        dataset_path.parent.mkdir(parents=True, exist_ok=True)
        tar_path = dataset_path.parent / "images.tar.gz"
        
        import urllib.request
        import tarfile
        urllib.request.urlretrieve("https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz", tar_path)
        
        print("[CatTraining] A extrair ficheiros...")
        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(path=dataset_path.parent)
        print("[CatTraining] Download concluído.")

    dataset = CatDataset(data_path=dataset_path, transform=train_transforms)
    
    # Dataset verification
    print(f"[CatTraining] Total dataset size: {len(dataset)}")
    if len(dataset) > 0:
        print("[CatTraining] Dataset carregado. Primeiros 5 ficheiros:")
        for i in range(min(5, len(dataset))):
            print(f" - Ficheiro: {dataset.images[i].name} | Raça mapeada: {CAT_BREEDS_12[dataset.labels[i]]}")


    class_counts = {}
    for i in range(len(dataset)):
        lbl = dataset[i][1]
        class_counts[lbl] = class_counts.get(lbl, 0) + 1
    print(f"[CatTraining] Class sample distribution: {class_counts}")

    # Sanity check with Logistic Regression
    print("[CatTraining] Running Sanity Check (Logistic Regression)...")
    try:
        from sklearn.linear_model import LogisticRegression
        sample_images, sample_labels = [], []
        # Use a small random subset (e.g., 50 samples) for the check
        indices = np.random.choice(len(dataset), min(50, len(dataset)), replace=False)
        sanity_ds = torch.utils.data.Subset(dataset, indices.tolist())
        sanity_loader = DataLoader(sanity_ds, batch_size=16)
        
        with torch.no_grad():
            for imgs, lbls in sanity_loader:
                sample_images.append(imgs.view(imgs.size(0), -1).numpy())
                sample_labels.append(lbls.numpy())
                
        X_sanity = np.concatenate(sample_images, axis=0)
        y_sanity = np.concatenate(sample_labels, axis=0)
        
        clf = LogisticRegression(max_iter=100)
        clf.fit(X_sanity, y_sanity)
        score = clf.score(X_sanity, y_sanity)
        print(f"[CatTraining] Sanity Check Logistic Regression Accuracy on {len(X_sanity)} samples: {score*100:.2f}%")
        if score < 0.2:
            print("[CatTraining] WARNING: Sanity check accuracy is very low! Model might struggle to learn.")
    except Exception as e:
        print(f"[CatTraining] Sanity check failed (possibly missing sklearn): {e}")

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = torch.utils.data.random_split(dataset, [train_size, val_size])

    val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    image_processor.save_pretrained(output_dir)

    print("[CatTraining] Setting up HF Trainer...")
    from transformers import TrainingArguments, Trainer

    def collate_fn(examples):
        pixel_values = torch.stack([example[0] for example in examples])
        labels = torch.tensor([example[1] for example in examples])
        return {"pixel_values": pixel_values, "labels": labels}

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.lr,
        eval_strategy="epoch" if not args.dry_run else "no",
        save_strategy="epoch" if not args.dry_run else "no",
        logging_steps=10,
        load_best_model_at_end=not args.dry_run,
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=base_model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=collate_fn,
    )

    if not args.dry_run:
        print("[CatTraining] Starting actual training loop...")
        trainer.train()
    else:
        print("[CatTraining] Dry run - skipping actual Trainer.train() (1 epoch limit in args means we could train, but user specified skip in dry-run, actually we should train 1 step to test pipeline).")
        # Let's train for 1 step if dry-run just to test gradients
        trainer.args.max_steps = 2
        trainer.train()


    # Temperature Scaling
    calibrator = ModelWithTemperature(base_model)
    calibrated_T = calibrator.set_temperature(val_loader, device=device.type)

    # Calculate validation metrics
    base_model.eval()
    all_probs, all_labels = [], []
    with torch.no_grad():
        for images, targets in val_loader:
            images = images.to(device)
            logits = base_model(images).logits / calibrated_T
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
            all_probs.append(probs)
            all_labels.append(targets.numpy())

    all_probs = np.concatenate(all_probs, axis=0)
    all_labels = np.concatenate(all_labels, axis=0)
    preds = np.argmax(all_probs, axis=1)
    acc = float(np.mean(preds == all_labels))
    ece = compute_ece(all_probs, all_labels)

    print(f"[CatTraining] Finished: Val Accuracy = {acc*100:.2f}%, T = {calibrated_T:.4f}, ECE = {ece:.4f}")

    # Save temperature state
    torch.save({"temperature": calibrated_T}, "models/cat_temperature.pt")

    metrics_file = pathlib.Path("training/cat_training_metrics.json")
    metrics_file.parent.mkdir(parents=True, exist_ok=True)
    metrics_data = {
        "model_name": args.model_name,
        "epochs_trained": args.epochs,
        "num_classes": len(CAT_BREEDS_12),
        "val_accuracy": acc,
        "calibrated_temperature": float(calibrated_T),
        "ece": float(ece)
    }
    metrics_file.write_text(json.dumps(metrics_data, indent=2), encoding="utf-8")
    print(f"[CatTraining] Metrics recorded in {metrics_file}")

    if args.push_to_hub and os.getenv("HF_TOKEN"):
        print(f"[CatTraining] Pushing model to HF Hub: {args.push_to_hub}...")
        try:
            base_model.push_to_hub(args.push_to_hub, token=os.getenv("HF_TOKEN"))
            image_processor.push_to_hub(args.push_to_hub, token=os.getenv("HF_TOKEN"))
            print("[CatTraining] Pushed successfully!")
        except Exception as push_err:
            print(f"[CatTraining] Warning during push_to_hub: {push_err}")


if __name__ == "__main__":
    main()
