# Arquitetura do Sistema (architecture.md)

Este documento descreve a topologia arquitetural, o modelo de dados e a infraestrutura do projeto **Pawra**.

---

## 🏛️ Topologia e Componentes

O Pawra está estruturado como uma aplicação de **três camadas principais**, projetada para ser resiliente a falhas de rede e offline-first:

1. **Frontend (React PWA):**
   * Interface construída com React 19, TypeScript, Tailwind CSS e Wouter para roteamento leve.
   * Utiliza **tRPC React Client** com `@tanstack/react-query` para consultas tipadas e cacheamento agressivo de dados em memória.
   * Suporta gravação local (Web Audio API), waveforms em tempo real (`LiveAudioMeter.tsx`) e armazenamento local para calibração de baselines.

2. **Gateway Node.js (Servidor tRPC + Express):**
   * Servidor intermédio escrito em Express que expõe uma API tRPC unificada sob a rota `/api/trpc`.
   * Valida a autenticação do utilizador via tokens/cookies do Supabase, gere o mapeamento das baselines comportamentais dos animais e processa a lógica de rate limiting.
   * Faz a ponte com a base de dados central e o backend de Machine Learning (ML).

3. **Backend de ML (Python FastAPI + YAMNet):**
   * Servidor autónomo escrito em Python com FastAPI localizable na pasta `ml_backend/`.
   * Executa a rota `/classify` para analisar ficheiros de som em formato áudio WAV de 16kHz mono.
   * Integra o modelo oficial de classificação **YAMNet** da Google via TensorFlow Hub para processamento acústico das vocalizações (cães e gatos).
   * Possui um algoritmo de fallback matemático (RMS, Zero Crossing Rate e FFT) caso as bibliotecas do TensorFlow não consigam carregar na máquina hospedeira.

---

## 💾 Modelo de Dados e Supabase

A base de dados é gerida pelo **Supabase PostgreSQL**. O esquema de dados é dividido em tabelas principais de utilizadores/animais e tabelas auxiliares para monitorização e diagnóstico de autocura.

### Tabelas Principais

* **`users`**: Registos dos tutores, credenciais de autenticação do Supabase Auth e papéis (roles).
* **`animals`**: Animais registados com informações de espécie (cão/gato), raça, peso, idade, baseline comportamental e URL da foto de perfil.
* **`classification_events`**: Histórico das vocalizações acústicas analisadas. Guarda referências ao áudio gravado, estado emocional inferido, grau de confiança do modelo e as notas de voz descritas pelo tutor.
* **`family_shares`**: Relações de co-tutoria que definem quais tutores têm acesso de leitura/escrita ao perfil de um animal.

### Tabelas de Autocura e Rate Limiting

* **`rate_limits`**:
  * Controla o número de chamadas de análise efetuadas por cada utilizador autenticado para proteção de custos da API.
  * Colunas: `id` (PK), `user_id` (FK), `endpoint` (text), `count` (int), `window_start` (timestamptz).
* **`app_errors`**:
  * Regista todas as exceções globais capturadas no frontend e backend.
  * Colunas: `id` (PK), `user_id` (FK), `session_id` (text), `route` (text), `module` (text), `error_type` (text), `message` (text), `context` (jsonb), `is_resolved` (boolean).
* **`app_healing_actions`**:
  * Ações automáticas executadas pelo motor de autocura local (ex: recargas de rotas, resets de tokens).
* **`app_health_state`**:
  * Estado de integridade periódica dos serviços principais (API, câmera, áudio, classificação).

---

## 🪣 Supabase Storage Buckets

Toda a persistência de ficheiros é organizada em quatro buckets no Supabase Storage:

| Nome do Bucket | Tipo de Acesso | Limite de Tamanho | Mime Types Permitidos |
|---|---|---|---|
| `pet-avatars` | Público (Leitura) | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `audio-analysis` | Privado | 50 MB | `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/aac`, `audio/ogg` |
| `video-analysis` | Privado | 200 MB | `video/mp4`, `video/quicktime`, `video/webm` |
| `audio-recordings` | Público | 20 MB | `audio/webm`, `audio/mp4`, `audio/wav` |

### Políticas de RLS de Armazenamento
Os buckets privados (`audio-analysis`, `video-analysis`) e o bucket `pet-avatars` têm políticas rigorosas de escrita para garantir que um utilizador apenas consegue enviar ou apagar ficheiros para a sua própria pasta pessoal (cujo nome de pasta coincide com o seu UUID no Supabase: `auth.uid()`).
