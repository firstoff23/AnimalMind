#!/bin/bash
# ==============================================================================
# AnimalMind — GPU Training & Calibration Runner for ViT Dog Breed Classifier
# Target Accuracy: >= 90.0%
# ==============================================================================

set -e

echo "🐾 AnimalMind GPU Training Script Starting..."

# Check GPU availability
if command -v nvidia-smi &> /dev/null; then
    echo "✅ GPU Detected:"
    nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv
else
    echo "⚠️ WARNING: No NVIDIA GPU detected. Training may take significantly longer."
fi

# Clone repository if running in Colab/Kaggle root
if [ ! -d "ml_backend" ]; then
    echo "📥 Cloning AnimalMind repository..."
    git clone https://github.com/firstoff23/AnimalMind.git
    cd AnimalMind/ml_backend
else
    echo "📂 Local repository detected. Entering ml_backend..."
    cd ml_backend || cd .
fi

# Install dependencies
echo "📦 Installing training dependencies..."
pip install -q -r requirements_training.txt

# Export Hugging Face Access Token if set
if [ -n "$HF_TOKEN" ]; then
    echo "🔑 Hugging Face Token detected. Pushing model to HF Hub enabled."
fi

# Run 50 epochs training pipeline with Temperature Scaling calibration & ECE logging
echo "🚀 Launching 50-epoch ViT training pipeline..."
python -m training.train_dog_breeds \
    --epochs 50 \
    --batch-size 32 \
    --lr 3e-4 \
    --model-name google/vit-base-patch16-224 \
    --output-dir models/animalmind-breed-classifier \
    ${HF_TOKEN:+--push-to-hub firstoff/animalmind-breed-classifier}

echo "✅ Training, Calibration & Export Completed!"
