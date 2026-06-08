# Checklist de Implementação — Dicionário de Alimentos

## 1. Base de Dados
- [ ] Criar ficheiro de migração `supabase-migrations/20260608_food_dictionary.sql`
- [ ] Implementar a tabela `foods` com constrangimentos, RLS e políticas de acesso público/admin
- [ ] Criar script de seed SQL populando pelo menos 30 alimentos detalhados em português

## 2. Camada de Dados & Backend
- [ ] Adicionar interface `Food` em `shared/dbTypes.ts`
- [ ] Adicionar helpers de base de dados em `server/db.ts` (`getFoods`, `getFoodById`, `searchFoods`)
- [ ] Criar o router tRPC `server/routers/foods.ts`
- [ ] Registar o router `foods` em `server/routers.ts`

## 3. Interface do Utilizador (Frontend)
- [ ] Criar a página de pesquisa `/alimentos` em `client/src/pages/FoodSearchPage.tsx`
- [ ] Adicionar atalho e aba "Alimentos" no `client/src/components/BottomNav.tsx`
- [ ] Adicionar ligação "/alimentos" na `client/src/components/Sidebar.tsx`
- [ ] Registar a rota `/alimentos` protegida no `client/src/App.tsx`
- [ ] Adicionar atalho para alimentos na página principal do `client/src/pages/DashboardPage.tsx`

## 4. Testes e Validação
- [ ] Criar e executar testes unitários para a funcionalidade de alimentos em `server/foods.test.ts`
- [ ] Executar check de tipos do TypeScript (`pnpm run check`)
- [ ] Executar suite de testes unitários (`pnpm test`)
- [ ] Executar build de produção (`pnpm run build`)
- [ ] Efetuar Git commit e push das alterações
