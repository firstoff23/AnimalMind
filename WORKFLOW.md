# 🔄 Workflow de Desenvolvimento — AnimalMind

## Ferramentas e onde vivem

| Ferramenta | Plataforma | Uso |
|------------|------------|-----|
| **Antigravity** | PC | Alterações de código complexas, features novas |
| **Codex** | PC | Alterações de código, refactoring |
| **Manus** | Telemóvel | Features rápidas, fixes, no movimento |
| **GitHub** | Cloud | Fonte única da verdade — todo o código vive aqui |
| **Vercel** | Cloud | Deploy automático a cada push para `main` |

---

## Fluxo de trabalho

```
Manus / Antigravity / Codex
         │
         │ git push → main
         ▼
   github.com/firstoff23/AnimalMind
         │
         │ webhook automático
         ▼
   animalmind.vercel.app (produção)
```

### ✅ Regras simples

1. **Antes de começar:** `git pull` para ter o código mais recente
2. **Ao terminar:** `git add . && git commit -m "descrição" && git push`
3. **O Vercel faz o deploy automaticamente** após cada push para `main`
4. **Nunca commites:** `node_modules/`, `dist/`, `.env`, `.vercel/`

---

## Antigravity (PC)

```bash
# Localização do clone local
C:\Users\Alexandre\.gemini\antigravity\scratch\AnimalMindFix

# Antes de trabalhar
git pull

# Depois de trabalhar
git add .
git commit -m "feat: descrição da alteração"
git push
```

## Manus (Telemóvel)

No Manus, garantir que o projeto está ligado ao repositório:
- **GitHub:** `firstoff23/AnimalMind`
- **Branch:** `main`

O Manus deve fazer `pull` antes de iniciar e `push` ao terminar.

---

## Variáveis de Ambiente (Supabase)

Estão configuradas no Vercel e são injetadas automaticamente na compilação.  
**Não precisas de um ficheiro `.env` no repo.**

| Variável | Onde está |
|----------|-----------|
| `VITE_SUPABASE_URL` | Vercel → Settings → Environment Variables |
| `VITE_SUPABASE_ANON_KEY` | Vercel → Settings → Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel → Settings → Environment Variables |

Para desenvolvimento local, pede as keys ao Vercel:
```bash
npx vercel env pull .env.local
```

---

## Links úteis

- **App em produção:** https://animalmind.vercel.app
- **Repositório:** https://github.com/firstoff23/AnimalMind
- **Dashboard Vercel:** https://vercel.com/firstoff23s-projects/animalmind
- **Supabase:** https://supabase.com/dashboard/project/yuzqxrmtbqlnalpjehno
