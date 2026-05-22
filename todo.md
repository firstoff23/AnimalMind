# AnimalMind — TODO

## Base de Dados & Backend
- [x] Schema: tabelas animals e classification_events no drizzle/schema.ts
- [x] Migração SQL aplicada via webdev_execute_sql
- [x] Seed: Bobi (Labrador 🐕) e Mimi (Persa 🐈) pré-carregados
- [x] Router tRPC: classify (POST simulado, 2s delay, 6 estados)
- [x] Router tRPC: animals (list, add, setActive, getStats)
- [x] Router tRPC: events (list paginado, filtros por estado/data, feedback)
- [x] Router tRPC: settings (get, update, exportCSV)

## Tema & Layout
- [x] index.css: dark mode slate-950, cor de acção #10b981
- [x] App.tsx: rotas e ThemeProvider dark por defeito
- [x] BottomNav: 5 ícones (Gravação, Perfil, Histórico, Dashboard, Definições)
- [x] Transições suaves entre páginas

## Página de Gravação
- [x] Botão circular w-40 h-40 com 3 estados (verde/vermelho pulse/amarelo)
- [x] Lógica de gravação simulada 3 segundos
- [x] ResultCard: emoji 6xl, nome PT, barra de confiança colorida, badge modelo, botões feedback
- [x] Histórico das últimas 5 classificações
- [x] Notificações push: pedir permissão, enviar para distress/hunger, anti-spam 10min

## Página de Perfil do Animal
- [x] Cards horizontais com scroll para seleccionar animal activo
- [x] Formulário: nome, espécie, raça, idade
- [x] Mini gráfico de distribuição de estados da semana

## Página de Histórico
- [x] Lista paginada de eventos
- [x] Filtro por estado emocional e por data
- [x] Empty state simpático

## Página de Dashboard
- [x] Gráfico de barras: distribuição dos 6 estados (Recharts)
- [x] Gráfico de linha: evolução da confiança média semanal (Recharts)
- [x] Card: estado dominante do dia e percentagem
- [x] Dados simulados Bobi e Mimi

## Página de Definições
- [x] Toggle notificações
- [x] Sensibilidade de alertas (baixa/média/alta)
- [x] Botão exportar CSV
- [x] Secção "Sobre" com versão 0.1.0

## Testes
- [x] Vitest: router classify
- [x] Vitest: router animals
- [x] Vitest: router events


## Integração Supabase
- [x] Configurar secrets: SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
- [x] Instalar @supabase/supabase-js
- [x] Criar schema no Supabase (tabelas: users, animals, classification_events, settings)
- [x] Actualizar server/db.ts para usar cliente Supabase com Service Role Key
- [x] Migrar dados demo (Bobi, Mimi) para Supabase
- [x] Testes de integração Supabase (4 testes a passar)
- [x] Todos os 14 testes Vitest a passar


## Autenticação Supabase Auth
- [x] Instalar @supabase/auth-helpers-react e @supabase/supabase-js
- [x] Criar AuthContext com useAuth() hook
- [x] Criar página de Login com email + password
- [x] Criar página de Registo com nome + email + password
- [x] Implementar protecção de rotas (ProtectedRoute component)
- [x] Adicionar header com email do utilizador e botão logout
- [x] Testar fluxo completo: registo → login → acesso protegido → logout
- [x] Vitest: testes de autenticação (3 testes a passar)


## Recuperação de Palavra-passe
- [x] Página /forgot-password com formulário de email
- [x] Página /reset-password com novo formulário de palavra-passe
- [x] Integração com Supabase Auth resetPasswordForEmail
- [x] Validação de token de reset
- [x] Testes Vitest (4 testes a passar)

## Verificação de Email
- [x] Verificação obrigatória após registo
- [x] Link de verificação no email
- [x] Página de confirmação de email (/verify-email)
- [x] Re-envio de link de verificação
- [x] AuthContext com isEmailVerified e resendVerificationEmail

## Perfil do Utilizador
- [x] Página /user-profile com formulário de edição
- [x] Campos: nome, email, estado da conta
- [x] Atualização de dados no Supabase
- [x] Sincronização com tabela users
- [x] Exibição de estado de verificação de email
- [x] Todos os 24 testes Vitest a passar
