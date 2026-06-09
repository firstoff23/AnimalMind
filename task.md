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

## 4. Testes e Validação
- [x] Criar e executar testes unitários para a funcionalidade de alimentos em `server/foods.test.ts`
- [x] Executar check de tipos do TypeScript (`pnpm run check`)
- [x] Executar suite de testes unitários (`pnpm test`)
- [x] Executar build de produção (`pnpm run build`)
- [x] Efetuar Git commit e push das alterações

