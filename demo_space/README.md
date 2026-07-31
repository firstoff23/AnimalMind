---
title: PeloNaRoupa Demo
emoji: 🐾
colorFrom: green
colorTo: gray
sdk: gradio
python_version: 3.11
app_file: app.py
pinned: false
license: mit
---

# PeloNaRoupa 🐾 - Demo Pública

Esta é a demonstração pública do **PeloNaRoupa** (rebranded para **PeloNaRoupa**), uma aplicação inteligente para monitorização e análise do bem-estar dos teus animais de estimação.

Este Space utiliza a biblioteca **Gradio** para fornecer uma interface simples e moderna onde podes carregar uma imagem do teu cão ou gato para identificar a sua espécie e raça com base num classificador ViT dual-head ajustado.

## Como Usar
1. Carrega ou arrasta uma imagem do teu cão ou gato para o painel de upload.
2. Clica no botão **Analisar 🔍**.
3. Vê a espécie identificada (com o respetivo emoji), a raça e o nível de confiança.
4. Experimenta com as imagens de exemplo fornecidas no fundo se não tiveres nenhuma foto à mão.

## Ligação ao Backend
Esta demonstração está conectada à API oficial do PeloNaRoupa em produção no Hugging Face Spaces:
`POST https://firstoff-animalmind-backend.hf.space/classify-image`
