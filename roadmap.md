# AnimalMind 🐾 — Roadmap de Desenvolvimento

Este documento descreve as prioridades de desenvolvimento da aplicação AnimalMind, categorizadas por fases de maturidade do projeto.

---

## ⬜ Fases do Roadmap

### 📋 Prioridade 1 — MVP+
- [ ] **1. Gravação de áudio real para Supabase Storage**
  - Capturar o áudio real do microfone no browser.
  - Gravar ficheiros nos formatos `.webm` ou `.wav`.
  - Fazer o upload para o Supabase Storage e associar o URL ao evento.
  - Adicionar leitor de áudio no histórico para reproduzir os sons capturados.
- [ ] **2. Backend FastAPI real — YAMNet / Wav2Vec2**
  - Desenvolver/integrar um backend real com modelos de IA acústica.
  - Substituir o classificador simulado (delay de 2s com resultados aleatórios) por inferência de áudio real.

### 📋 Prioridade 2 — V1.0
- [ ] **3. Página de detalhe por animal**
  - Histórico de eventos completo e filtrado por animal de estimação.
  - Tendências emocionais e estatísticas avançadas individuais.
- [/] **4. Exportação de dados**
  - [x] Exportação de histórico de eventos em formato CSV.
  - [ ] Exportação de relatórios de saúde e comportamento em formato PDF.
- [ ] **5. Baseline por animal**
  - Perfil individual de comportamento e calibração de limites baseados nos hábitos de cada animal.

### 📋 Prioridade 3 — V2.0
- [ ] **6. Belief state POMDP**
  - Contextualização temporal dos sons para evitar falsos alertas (ex: um único latido isolado vs. latidos persistentes de sofrimento).
- [ ] **7. Análise de vídeo + postura (YOLOv8 keypoints)**
  - Reconhecimento visual complementar da linguagem corporal do animal.
- [ ] **8. Modo veterinário**
  - Geração e partilha de relatórios clínicos formatados para análise veterinária.
- [ ] **9. Multi-utilizador / Modo Família**
  - Co-tutoria para partilha de perfis de animais em tempo real.
- [ ] **10. Submissão às lojas**
  - Empacotamento do frontend (ex: Capacitor/PWA) e publicação na Google Play Store e Apple App Store.
