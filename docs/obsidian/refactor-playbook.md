# Manual de Refatoração e Boas Práticas (refactor-playbook.md)

Este documento orienta os programadores e agentes sobre como alterar a base de código do **Pawra** de forma segura, garantindo a tipagem forte do tRPC, a segurança do Supabase e a consistência visual.

---

## ⚡ Desenvolvimento de APIs e tRPC

Toda a comunicação de dados entre o frontend React e a base de dados deve utilizar o **tRPC**. Não crie endpoints REST ad-hoc no Express a menos que seja para payloads binários específicos (ex: upload bruto de ficheiros).

### Criar uma Nova Rota tRPC
1. **Defina a Rota e Inputs:** 
   Utilize sempre esquemas do `zod` para validar rigorosamente a estrutura e tipo de dados recebidos no servidor:
   ```typescript
   export const animalRouter = router({
     add: protectedProcedure
       .input(z.object({
         name: z.string().min(1),
         breed: z.string(),
         weight: z.number().positive(),
         age: z.number().int()
       }))
       .mutation(async ({ ctx, input }) => {
         // Lógica da base de dados usando Supabase JS SDK
       })
   });
   ```
2. **Procedimentos Protegidos vs Públicos:**
   * Use `protectedProcedure` para garantir que a rota exige autenticação ativa. O identificador do utilizador autenticado estará acessível em `ctx.user.id`.
   * Use `adminProcedure` para rotas de manutenção ou limpeza de histórico.
   * Evite utilizar `publicProcedure` para dados sensíveis.

---

## 🗄️ Alterações de Esquema do Banco de Dados

Toda e qualquer alteração na estrutura das tabelas deve ser feita via scripts de migração em `supabase/migrations/`.

1. **Idempotência:** Garanta que as migrações corram sem dar erro caso a tabela ou coluna já exista (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
2. **Reload do Cache do PostgREST:** O Supabase utiliza o PostgREST para traduzir requisições HTTP para SQL. Se o PostgREST não recarregar o cache de tabelas, as consultas do cliente falharão com erros do tipo `404 Not Found` para as tabelas modificadas.
   * **Regra:** Termine sempre os scripts de migração DDL com a seguinte instrução:
     ```sql
     NOTIFY pgrst, 'reload schema';
     ```

---

## 🎨 Conservação Estética e Design System

O Pawra é uma aplicação com estética premium (dark mode calibrado, micro-animações, layout assimétrico).

1. **Alterações Visuais Restritas:** 
   * Não modifique cores, espaçamentos globais, cantos arredondados, gradientes ou tipos de letra (fontes) nos ficheiros `.css` ou classes Tailwind, a menos que solicitado explicitamente pelo utilizador.
   * Se for necessário adicionar novos elementos interativos, herde os tokens de design existentes (como o pulse dinâmico do piloto automático ou as cores da marca).

2. **Gestos e Transições (Framer Motion):**
   * As animações de arrastamento e gestos (`Swipe to Classify` no histórico, etc.) devem utilizar física de mola (`type: "spring"`) e aceleração de hardware.
   * Ao refatorar componentes interativos, mantenha as tags do Framer Motion (`motion.div`) e as durações curtas de animação para garantir que a experiência permaneça fluida e sem atrasos percetíveis.

3. **Políticas de Acessibilidade (WCAG AA):**
   * Elementos dinâmicos com atualizações automáticas de estado (ex: piloto automático e gravação de som) devem conter a propriedade `aria-live="polite"`.
   * Todo o texto de erro deve ser acompanhado de um ícone visual correspondente.
