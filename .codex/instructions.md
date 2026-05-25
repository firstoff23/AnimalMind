---

# Instruções Permanentes — AnimalMind

## Plugins/Skills obrigatórios
Antes de qualquer tarefa, usa SEMPRE estes plugins:
- GitHub — para ler/escrever ficheiros, commits, branches e PRs
- Vercel — para verificar deploys, logs e variáveis de ambiente
- Supabase — para verificar tabelas, Storage e políticas RLS

## Workflow obrigatório em cada sessão
1. Usa o plugin GitHub para ler o estado atual do repositório
2. Usa o plugin Vercel para confirmar o estado do deploy
3. Nunca alteres ficheiros sem primeiro verificar o estado atual
4. Após cada alteração, corre sempre:
   - pnpm run check (TypeScript sem erros)
   - pnpm test (67+ testes a passar)
   - pnpm run build (build sem erros)
5. Faz sempre commit e push para main após cada feature

## Contexto do projeto
- Repositório: github.com/firstoff23/AnimalMind
- Deploy: animalmind.vercel.app
- Stack: React 19 + TypeScript + tRPC v11 + Supabase + Vercel
- Gestor de pacotes: pnpm (nunca usar npm ou yarn)
- Dark mode: slate-950, verde-esmeralda #10b981
- Testes: Vitest — manter sempre 67+ a passar
- Branch principal: main (deploy automático no Vercel)

## Supabase
- Tabelas: users, animals, classification_events, settings
- Storage bucket: audio-recordings (privado com RLS)
- Novas migrations: criar sempre em supabase-migrations/
- Nunca aplicar migrations diretamente — criar ficheiro SQL
  para o utilizador aplicar manualmente no Supabase SQL Editor

## Vercel
- Variáveis de ambiente necessárias:
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  FASTAPI_BACKEND_URL (backend FastAPI no Railway/Render)
  VITE_ANALYTICS_ENDPOINT (pode ficar vazio)
  VITE_ANALYTICS_WEBSITE_ID (pode ficar vazio)

## Backend FastAPI
- Localização: ml_backend/
- Endpoint principal: POST /classify
- Aceita: multipart/form-data com ficheiro de áudio
- Devolve: { state, confidence, emoji, model_used }
- Tem fallback scipy se YAMNet falhar
- Deploy: Railway (Root Directory: ml_backend)
- Variável no Vercel: FASTAPI_BACKEND_URL (sem /classify no final)

## Regras gerais
- Nunca fazer merge para main sem testes a passar
- Nunca expor SUPABASE_SERVICE_ROLE_KEY no frontend
- Sempre usar pnpm, nunca npm ou yarn
- Manter dark mode em todos os componentes novos
- Ficheiros JSON locais (notes.json, etc.) são temporários
  — migrar para Supabase quando possível

---
