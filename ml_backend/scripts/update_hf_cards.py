import os
from huggingface_hub import HfApi, ModelCard, ModelCardData

def update_model_card(repo_id, task, dataset_name, tags, accuracy, ece, temperature):
    card_data = ModelCardData(
        language="pt",
        license="mit",
        tags=tags + ["animalmind", "biology", "pawra"],
        datasets=[dataset_name],
        metrics=["accuracy", "ece"],
        library_name="transformers"
    )

    if task == "Image Classification (Dogs)":
        desc = "Modelo fine-tuned para o ecossistema Pawra (AnimalMind) para identificar raças de cães."
        pipeline_task = "image-classification"
        usage_example = f"""```python
from transformers import pipeline

classifier = pipeline("{pipeline_task}", model="{repo_id}")
result = classifier("https://upload.wikimedia.org/wikipedia/commons/4/43/Cute_dog.jpg")
print(result)
```"""
    elif task == "Image Classification (Cats)":
        desc = "Modelo fine-tuned para o ecossistema Pawra (AnimalMind) para identificar raças de gatos."
        pipeline_task = "image-classification"
        usage_example = f"""```python
from transformers import pipeline

classifier = pipeline("{pipeline_task}", model="{repo_id}")
result = classifier("https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg")
print(result)
```"""
    else:
        desc = "Modelo fine-tuned para o ecossistema Pawra (AnimalMind) para classificar vocalizações de animais (latidos, miados, etc.)."
        pipeline_task = "audio-classification"
        usage_example = f"""```python
from transformers import pipeline

classifier = pipeline("{pipeline_task}", model="{repo_id}")
result = classifier("bark.wav")
print(result)
```"""

    tags_yaml = "\n".join([f"- {t}" for t in tags + ["animalmind", "biology", "pawra"]])
    datasets_yaml = "\n".join([f"- {d.strip()}" for d in dataset_name.split(",")])

    content = f"""---
language: pt
license: mit
tags:
{tags_yaml}
datasets:
{datasets_yaml}
metrics:
- accuracy
- ece
library_name: transformers
---
# {repo_id.split('/')[-1]}

{desc}

## 🚀 Desempenho

| Métrica | Valor |
|---------|-------|
| **Acurácia** | {accuracy} |
| **ECE** | {ece} |
| **Temperatura (T)** | {temperature} |

## 📦 Dataset

Este modelo foi treinado no dataset: **{dataset_name}**.

## 💻 Como Usar

{usage_example}

## ⚠️ Limitações
- Apenas reconhece as raças/vocalizações presentes no dataset de treino.
- Não substitui avaliação veterinária profissional.
- Os resultados são estimativas, não diagnósticos médicos.

## 🔗 Links
- [Pawra - App](https://animalmind.vercel.app)
"""
    
    card = ModelCard(content)
    
    print(f"Pushing Model Card to {repo_id}...")
    try:
        card.push_to_hub(repo_id)
        print(f"Successfully updated Model Card for {repo_id}")
    except Exception as e:
        print(f"Failed to update {repo_id}: {e}")

if __name__ == "__main__":
    # Dog Model
    update_model_card(
        repo_id="firstoff/animalmind-breed-classifier",
        task="Image Classification (Dogs)",
        dataset_name="stanford_dogs",
        tags=["image-classification", "vit", "pytorch"],
        accuracy="91.40%",
        ece="2.69%",
        temperature="1.7221"
    )

    # Cat Model
    update_model_card(
        repo_id="firstoff/animalmind-cat-classifier",
        task="Image Classification (Cats)",
        dataset_name="oxford-iiit-pet",
        tags=["image-classification", "vit", "pytorch"],
        accuracy="Em treino",
        ece="-",
        temperature="-"
    )

    # Audio Model
    update_model_card(
        repo_id="firstoff/animalmind-audio-classifier",
        task="Audio Classification",
        dataset_name="esc50, audioset",
        tags=["audio-classification", "wav2vec2", "pytorch"],
        accuracy="92.10%",
        ece="2.75%",
        temperature="1.5028"
    )
