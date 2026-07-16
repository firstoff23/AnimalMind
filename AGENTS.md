# Antigravity Developer Agent Instructions (AGENTS.md)

Este documento define as regras fundamentais de desenvolvimento, arquitetura, segurança e fluxo de trabalho para agentes de Inteligência Artificial e programadores na base de código do **Pawra**.

---

## 📋 Regras de Desenvolvimento e Resiliência

### R1. Modificações de Texto em Massa (PowerShell / Windows)
* **Problema:** O operador padrão `-replace` no PowerShell é case-insensitive e deforma a capitalização original dos nomes de pacotes ou variáveis (ex: transformando `petsense` em `Pawra` no `package.json`).
* **Regra:** Em substituições automáticas de texto em massa utilizando scripts PowerShell, deve ser utilizado obrigatoriamente o operador **`-creplace`** (case-sensitive) para preservar exatamente a capitalização original dos termos substituídos.

### R2. Configuração do `vercel.json`
* **Problema:** A propriedade `"public": true` em `vercel.json` viola o esquema de validação do deploy da Vercel e quebra o deploy em produção.
* **Regra:** O ficheiro `vercel.json` não deve conter a propriedade `"public": true` ou quaisquer outros atributos adicionais não suportados pelo esquema padrão do Vercel.

### R3. Conectividade Supabase & Depreciação de IPv6
* **Problema:** As rotas diretas do Supabase (`db.[ref].supabase.co`) são apenas IPv6. Ambientes locais sem suporte IPv6 integrado sofrem timeouts imediatos de conexão (portas 5432/6543).
* **Regra:** Para ligações locais à base de dados, utilize sempre o pooler IPv4 dedicado (ex: `aws-0-eu-west-1.pooler.supabase.com`), configure a porta `6543` (modo de transação) ou `5432` (modo de sessão), use o formato de utilizador `postgres.[ref]` e desative a verificação rígida de certificados SSL se necessário via `{ ssl: { rejectUnauthorized: false } }`.

### R4. Permissões de RLS em Tabelas do Schema `storage`
* **Problema:** O utilizador `postgres` padrão no Supabase não é o proprietário do schema `storage`. Tentar executar `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;` via migrações SQL falha devido a falta de privilégios.
* **Regra:** Não tente ativar ou alterar o RLS diretamente na tabela `storage.objects` através de scripts de migração aplicados pelo utilizador `postgres`. Em vez disso, declare apenas as políticas de acesso (`CREATE POLICY`) específicas de leitura/escrita para os buckets necessários, já que o RLS nas tabelas do schema `storage` já se encontra ativo por padrão.

### R5. Configuração e uso do Supabase MCP
* **Problema:** O pacote NPM `@supabase/mcp` não existe no registo central e causa erros de 404 ao inicializar.
* **Regra:** 
  - Se for utilizar a integração de servidor de MCP remoto oficial, declare-a no ficheiro de configuração como tipo `http` apontando para `https://mcp.supabase.com/mcp` para que o cliente use o fluxo OAuth integrado.
  - Se pretender executar localmente através de `npx`, utilize o nome de pacote correto: `@supabase/mcp-server-supabase`.

---

## 🛠️ Padrões e Integridade de Código

1. **Localização de Migrações SQL:**
   * Coloque os ficheiros SQL sempre na pasta `supabase/migrations/`.
   * Toda a migração que altere o esquema do banco de dados deve conter a notificação de recarregamento do PostgREST no final:
     ```sql
     NOTIFY pgrst, 'reload schema';
     ```

2. **Segurança de APIs e tRPC:**
   * Valide todos os payloads recebidos nas rotas tRPC usando esquemas `zod` rigorosos.
   * Não envie segredos ou tokens sensíveis em logs ou no payload público.

3. **Integridade Estética e Visual:**
   * Não modifique estilos CSS, temas escuros/claros ou cores da interface do usuário a menos que expressamente solicitado pelo utilizador. Foque sempre na lógica de negócio e na correção funcional.
