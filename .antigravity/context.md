# Contexto do Projeto: AnimalMind 🐾

Estou a desenvolver uma aplicação web chamada **AnimalMind** para monitorizar 
e traduzir o estado emocional de animais de estimação (cães e gatos) a partir 
de vocalizações acústicas, usando IA simulada e análise de áudio real.

## Stack Técnica
- Frontend: React 19, TypeScript, Tailwind CSS, shadcn/ui
- Routing: Wouter | Animações: Framer Motion | Gráficos: Recharts
- Backend: Node.js + Express + tRPC v11 (End-to-End Type Safety)
- Base de dados: Supabase (PostgreSQL) + Auth completa
- Notas locais: server/notes.json via tRPC
- Testes: Vitest — 40/40 a passar
- Deploy: Vercel (auto-deploy na branch main)
- Repositório: GitHub (firstoff23/AnimalMind)
- Gestor de pacotes: pnpm

## Tabelas Supabase
- users: id, open_id, name, email, login_method, role, created_at
- animals: id, user_id, name, species, breed, age, is_active
- classification_events: id, user_id, animal_id, state, confidence, 
  emoji, model_used, cached, feedback, created_at
- settings: id, user_id, notifications_enabled, alert_sensitivity

## O que já está implementado ✅
- Design system dark mode (slate-950, verde-esmeralda #10b981)
- 8 páginas: Login, Registo, Gravação, Perfil, Histórico, 
  Dashboard, Definições, Perfil do Utilizador
- Bottom navigation bar com 5 ícones
- Autenticação completa Supabase Auth (login, registo, 
  verificação email, recuperação de palavra-passe)
- Gravação real de áudio (Web Audio API, 3 segundos)
- LiveAudioMeter.tsx — ondas sonoras em tempo real
- ConfidenceRing.tsx — anel SVG animado com % e cor dinâmica
- Auto Classify (modo Shazam) — loop de 3s contínuo, 
  ativado por long press (>700ms) ou banner toggle
- Voice-to-Text para notas — Web Speech API pt-PT
- Swipe to Classify — Framer Motion, deslizar histórico 
  esquerda/direita para feedback correto/incorreto
- Long Press no histórico (550ms) — abre dialog com 
  notas completas e metadados JSON brutos
- Dashboard com gráficos Recharts (barras + linhas)
- Notificações push com anti-spam (distress/hunger)
- Proteção de rotas + useAuth() hook + AuthContext
- tRPC v11 para comunicação tipo-segura cliente-servidor
- 40/40 testes Vitest a passar
- 0 erros TypeScript (tsc --noEmit limpo)
- Build de produção sem avisos (pnpm run build)
- Deploy Vercel funcional (animalmind.vercel.app)

## O que falta implementar ⬜

### Prioridade 1 — MVP+
1. Gravação de áudio real para Supabase Storage 
   (guardar ficheiros .webm/.wav)
2. Backend FastAPI real — YAMNet/Wav2Vec2 
   (substituir simulação de 2s por modelo real)

### Prioridade 2 — V1.0
3. Página de detalhe por animal — histórico completo, 
   tendências e estatísticas individuais
4. Exportação de dados — CSV / PDF
5. Baseline por animal — perfil individual de comportamento

### Prioridade 3 — V2.0
6. Belief state POMDP — contexto temporal para evitar 
   falsos alertas
7. Análise de vídeo + postura — YOLOv8 keypoints
8. Modo veterinário — relatórios clínicos
9. Multi-utilizador / modo família
10. Submissão às lojas (Play Store / App Store)

Este ficheiro será usado automaticamente pelo Gemini Code 
Assist para ter sempre o contexto completo do projeto 
AnimalMind em todas as sugestões de código.
