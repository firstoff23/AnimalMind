# Checklist de Implementação — Dicionário de Alimentos

## 1. Base de Dados
- [x] Criar ficheiro de migração `supabase-migrations/20260608_food_dictionary.sql`
- [x] Implementar a tabela `foods` com constrangimentos, RLS e políticas de acesso público/admin
- [x] Criar script de seed SQL populando pelo menos 30 alimentos detalhados em português

## 2. Camada de Dados & Backend
- [x] Adicionar interface `Food` em `shared/dbTypes.ts`
- [x] Adicionar helpers de base de dados em `server/db.ts` (`getFoods`, `getFoodById`, `searchFoods`)
- [x] Criar o router tRPC `server/routers/foods.ts`
- [x] Registar o router `foods` em `server/routers.ts`

## 3. Interface do Utilizador (Frontend)
- [x] Criar a página de pesquisa `/alimentos` em `client/src/pages/FoodSearchPage.tsx`
- [x] Adicionar atalho e aba "Alimentos" no `client/src/components/BottomNav.tsx`
- [x] Adicionar ligação "/alimentos" na `client/src/components/Sidebar.tsx`
- [x] Registar a rota `/alimentos` protegida no `client/src/App.tsx`
- [x] Adicionar atalho para alimentos na página principal do `client/src/pages/DashboardPage.tsx`

## Fase 2: Verificação de Build

- [x] Executar `pnpm run check` para validação TypeScript
- [x] Executar `pnpm test` para conformidade da suite de testes
- [x] Executar `pnpm run build` para build limpo

## Fase 3: Auditoria Visual (Chrome DevTools)

- [x] Screenshot `/dashboard` mobile + desktop
- [x] Screenshot `/perfil` mobile
- [x] Screenshot `/historico` mobile
- [x] Screenshot `/alimentos` mobile
- [x] Screenshot `/definicoes` mobile
- [x] Verificar que zero emojis são visíveis
- [x] Atualizar `walkthrough.md`
