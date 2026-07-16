# Resolução de Problemas (troubleshooting.md)

Este documento reúne soluções para problemas conhecidos e erros frequentes encontrados no desenvolvimento e execução do ecossistema **Pawra**.

---

## 🔌 Erros de Ligação com Supabase (Timeouts)

* **Sintoma:** Ao correr `pnpm run dev` ou scripts locais, ocorrem timeouts de rede persistentes (ex: `connect ETIMEDOUT`, `TCP Connection Refused`) ao tentar ligar ao Supabase.
* **Causa:** O Supabase depreciou rotas IPv4 diretas. As conexões padrão (`db.[ref].supabase.co`) exigem redes com suporte completo a IPv6. Redes locais domésticas ou corporativas limitadas a IPv4 sofrerão bloqueio.
* **Solução:**
  1. No ficheiro de configuração local (`.env.local`), altere a porta da base de dados e configure a ligação para passar pelo **Pooler IPv4 Dedicado** da sua região (ex: para a Europa Ocidental, use `aws-0-eu-west-1.pooler.supabase.com`).
  2. Modifique o formato do utilizador para `postgres.[project_ref]`.
  3. Desative a validação SSL estrita na ligação em `server/db.ts` ou scripts locais que usem `pg`:
     ```typescript
     const pool = new Pool({
       connectionString: process.env.DATABASE_URL,
       ssl: { rejectUnauthorized: false }
     });
     ```

---

## 🪣 Falhas de Permissão RLS em Storage (Schema `storage`)

* **Sintoma:** Ocorre o erro `permission denied for schema storage` ou `must be owner of relation objects` ao tentar correr migrações que alteram políticas RLS em tabelas nativas de armazenamento do Supabase (como `storage.objects`).
* **Causa:** O utilizador padrão `postgres` do seu projeto Supabase não é dono do schema `storage`. Apenas a role interna de administração do sistema pode alterar a tabela em si (como `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`).
* **Solução:**
  * O RLS na tabela `storage.objects` já vem ativo por padrão em todos os novos projetos Supabase. **Nunca** tente correr `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;` num script de migração.
  * Pode criar políticas RLS normalmente na tabela `storage.objects` (para as permissões de SELECT, INSERT, UPDATE, DELETE dos buckets) utilizando declarações simples de `CREATE POLICY` e especificando o bucket correspondente (ex: `USING (bucket_id = 'pet-avatars')`).

---

## 🧪 Falhas nos Testes E2E (Playwright)

* **Sintoma:** Os testes de gravação de som ou login falham consistentemente no pipeline local do Playwright.
* **Solução:**
  * Para testes que capturam som real ou camera, garanta que o Playwright tem as flags corretas no seu ficheiro de configuração (`playwright.config.ts`) para simular media sem pedir pop-ups de permissão física:
    ```typescript
    use: {
      launchOptions: {
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream'
        ]
      }
    }
    ```
  * Se o teste falhar devido a latência na criação ou carregamento dos dados simulados, verifique se a rota `/api/trpc/healing.logError` não está com loops infinitos do motor de autocura.

---

## 📦 Problemas de Resolução de Módulos (ESM / Node.js)

* **Sintoma:** Ocorre o erro `ERR_MODULE_NOT_FOUND` ou importações falham ao tentar correr ficheiros `.js` utilitários ou testes.
* **Causa:** O projeto utiliza `"type": "module"` no `package.json` (ES Modules nativo). Ficheiros JavaScript importados localmente necessitam de extensão explícita (ex: `import { helper } from "./helper.js"` em vez de `./helper`).
* **Solução:**
  * Ao importar ficheiros locais ou criar scripts na pasta `scripts/` ou `scratch/`, use sempre extensões completas (`.js`, `.cjs` ou `.mjs`) e certifique-se de que corre o Node.js a partir do caminho raiz correto onde as `node_modules` estão mapeadas.
