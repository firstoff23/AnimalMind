# Checklist de Implementação — UI/UX Global & Self-Healing AnimalMind

## 1. Self-Healing & Produção
- [x] Self-healing system com aprendizagem
- [x] VITE_HF_SPACE_URL corrigida em produção (firstoff-animalmind-backend.hf.space)
- [x] Deploy Vercel verificado e operacional
- [x] HF Space /health + /classify a funcionar
- [x] Diagnósticos mostram Healthy em produção

## 2. Design System & Tokens
- [x] Criar `client/src/styles/design-tokens.css` com variáveis do tema escuro, carregamento da fonte Satoshi, sombras e transições
- [x] Atualizar `client/src/index.css` para importar tokens, configurar variáveis `@theme inline`, definir Satoshi como fonte do corpo e ajustar fundos `.dark`

## 3. Componentes Base (`client/src/components/ui/`)
- [x] Atualizar `button.tsx` com variantes primary, ghost e destructive usando os tokens
- [x] Atualizar `card.tsx` para ter estilo escuro profundo, bordas subtis e glow verde suave ao hover
- [x] Atualizar `badge.tsx` mapeando estados de saúde para as cores correspondentes
- [x] Atualizar `avatar.tsx` introduzindo placeholder de pata SVG inline personalizado
- [x] Criar `empty-state.tsx` com pata SVG animada flutuante e CTA personalizado
- [x] Atualizar `skeleton.tsx` para usar animação de shimmer no tema escuro

## 4. Logo SVG
- [x] Criar `client/src/components/ui/Logo.tsx` com pata estilizada e ondas de áudio inline
- [x] Substituir emoji/texto por `Logo` no cabeçalho em `Header.tsx`
- [x] Substituir emoji de pata por `Logo` em `LandingPage.tsx`

## 5. Navegação Responsive (BottomNav & Sidebar)
- [x] Atualizar `BottomNav.tsx` para ter exatamente 4 tabs fixos e ocultar em ecrãs `md`
- [x] Criar `client/src/components/Sidebar.tsx` barra lateral colapsável com Logo no topo, links centrais e perfil no fundo
- [x] Integrar layout global responsive (BottomNav + Sidebar) em `client/src/App.tsx`

## 6. Verificação & Consolidação
- [x] Executar check do compilador TypeScript (`pnpm run check`)
- [x] Executar suite de testes unitários (`pnpm test` — garantir 83/83 testes)
- [x] Executar build de produção (`pnpm run build`)
- [x] Efetuar Git commit e push das alterações
