# AnimalMind API Reference

Referencia dos procedimentos tRPC e das principais funcoes de persistencia usadas pelo servidor.

## Transporte

- Endpoint HTTP: `/api/trpc`
- Router raiz: `appRouter` em `server/routers.ts`
- Serializacao: `superjson`
- Autenticacao:
  - `publicProcedure`: aceita contexto anonimo; varias rotas usam `effectiveUserId` e caem para o utilizador demo quando nao ha sessao.
  - `protectedProcedure`: exige `ctx.user`.
  - `adminProcedure`: exige `ctx.user.role === "admin"`.

## Endpoints tRPC

| Procedimento | Tipo | Acesso | Input | Resultado |
| --- | --- | --- | --- | --- |
| `system.health` | query | publico | `{ timestamp: number }` | `{ ok: true }` |
| `system.notifyOwner` | mutation | admin | `{ title: string; content: string }` | `{ success: boolean }` |
| `auth.me` | query | publico | nenhum | Utilizador autenticado ou `null` |
| `auth.logout` | mutation | publico | nenhum | Limpa o cookie de sessao e devolve `{ success: true }` |
| `classify.run` | mutation | publico com demo fallback | `{ animalId?: number; audio?: string; audioMimeType?: string; posture?: string }` | Classificacao emocional, `eventId`, URL de audio, estado de crenca e postura |
| `animals.list` | query | publico com demo fallback | nenhum | Animais do utilizador efetivo |
| `animals.add` | mutation | publico com demo fallback | `{ name: string; species: "dog" \| "cat"; breed?: string; age?: number }` | Animal criado |
| `animals.setActive` | mutation | publico com demo fallback | `{ animalId: number }` | Marca animal ativo para o utilizador |
| `animals.getActive` | query | publico com demo fallback | nenhum | Animal ativo ou `null` |
| `animals.weeklyStats` | query | publico com demo fallback | `{ animalId?: number }` | Contagens semanais agregadas por estado |
| `animals.get` | query | publico com demo fallback | `{ animalId: number }` | Animal do utilizador; `NOT_FOUND` se nao existir ou nao pertencer ao utilizador |
| `animals.getBaseline` | query | publico com demo fallback | `{ animalId: number }` | Baseline comportamental recalculada ou baseline persistida |
| `animals.updateBaseline` | mutation | publico com demo fallback | `{ animalId: number; vocalizationThreshold?: number; normalStates?: string[]; alertSensitivity?: "low" \| "medium" \| "high" }` | Baseline atualizada |
| `animals.getBeliefState` | query | publico com demo fallback | `{ animalId: number }` | Estado de crenca mais recente |
| `animals.inviteShare` | mutation | publico com demo fallback | `{ animalId: number; email: string; permission: "read" \| "write" }` | Convite de partilha criado |
| `animals.listShares` | query | publico com demo fallback | `{ animalId: number }` | Partilhas existentes do animal |
| `animals.removeShare` | mutation | publico com demo fallback | `{ shareId: number; animalId: number }` | Revoga partilha do animal |
| `animals.getPendingInvitations` | query | publico com demo fallback | nenhum | Convites pendentes para o utilizador |
| `animals.respondToInvitation` | mutation | publico com demo fallback | `{ invitationId: number; action: "accept" \| "reject" }` | Aceita ou rejeita convite |
| `events.recent` | query | publico com demo fallback | `{ limit?: number }` | Eventos recentes normalizados para UI |
| `events.list` | query | publico com demo fallback | `{ page?: number; pageSize?: number; state?: string; dateFrom?: string; dateTo?: string; animalId?: number }` | Pagina de eventos e total |
| `events.feedback` | mutation | publico com demo fallback | `{ eventId: number; feedback: "correct" \| "incorrect" }` | Guarda feedback do evento |
| `events.exportData` | mutation | publico com demo fallback | `{ state?: string; dateFrom?: string; dateTo?: string; animalId?: number }` | Eventos exportaveis, filtros aplicados e timestamp |
| `events.exportCsv` | query | publico com demo fallback | nenhum | CSV simples do historico |
| `events.getNotes` | query | publico | `{ eventId: number }` | Notas do evento |
| `events.updateNotes` | mutation | publico | `{ eventId: number; notes: string }` | Atualiza notas do evento |
| `events.listForAnimal` | query | publico com demo fallback | `{ animalId: number; page?: number; pageSize?: number }` | Eventos paginados de um animal |
| `events.statsForAnimal` | query | publico com demo fallback | `{ animalId: number; days?: number }` | Estatisticas do animal no intervalo |
| `events.getVisualMetadata` | query | publico | `{ eventId: number }` | Postura e estado de crenca associados ao evento |
| `settings.get` | query | publico com demo fallback | nenhum | Preferencias de notificacoes e sensibilidade |
| `settings.update` | mutation | publico com demo fallback | `{ notificationsEnabled?: boolean; alertSensitivity?: "low" \| "medium" \| "high" }` | Preferencias atualizadas |
| `family.create` | mutation | autenticado | `{ name: string }` | Grupo familiar criado |
| `family.join` | mutation | autenticado | `{ code: string }` | Entrada num grupo familiar por codigo |
| `family.createInvite` | mutation | autenticado | `{ familyId?: number }` opcional | Convite familiar criado |
| `family.getMembers` | query | autenticado | nenhum | Membros das familias do utilizador |
| `family.shareAnimal` | mutation | autenticado | `{ animalId: number; familyId?: number }` | Partilha animal com familia |
| `family.getAnimals` | query | autenticado | nenhum | Animais acessiveis via familia |
| `family.getActivity` | query | autenticado | nenhum | Atividade familiar recente |
| `vet.getAnimals` | query | autenticado com role `vet` ou `admin` | `{ species?: string; state?: string; dateFrom?: string; dateTo?: string }` opcional | Animais partilhados com o veterinario |
| `vet.getReport` | query | autenticado com role `vet` ou `admin` | `{ animalId: number; days?: number }` | Relatorio clinico agregado |
| `vet.saveNotes` | mutation | autenticado com role `vet` ou `admin` | `{ animalId: number; notes: string }` | Guarda notas clinicas |
| `vet.shareReport` | mutation | autenticado; requer ownership do animal | `{ animalId: number; name: string; email: string; note?: string }` | Partilha relatorio com veterinario |

## Fluxos Principais

### `classify.run`

1. Recebe audio base64 opcional e postura opcional.
2. Se `FASTAPI_BACKEND_URL` estiver configurado, envia o ficheiro para `/classify`.
3. Se a chamada falhar ou devolver um estado invalido, usa classificacao aleatoria de fallback.
4. Resolve o utilizador efetivo, valida ownership do animal e persiste o evento.
5. Quando ha audio, envia o ficheiro para Supabase Storage e associa a URL ao evento.
6. Atualiza o estado de crenca, recalcula a baseline comportamental e guarda a postura.

### `events.list` e exports

As listagens e exportacoes aceitam filtros por estado, intervalo de datas e animal. A camada de dados aplica os filtros com queries Supabase encadeadas e ordenacao decrescente por `created_at`.

### `vet.*`

As rotas veterinarias usam `protectedProcedure` e validam explicitamente a role `vet` ou `admin`, exceto `vet.shareReport`, que e acionada pelo tutor/proprietario para conceder acesso a um veterinario externo.

## Funcoes de `server/db.ts`

### Utilizadores e sessao

| Funcao | Responsabilidade |
| --- | --- |
| `upsertUser(user)` | Cria ou atualiza utilizador a partir dos dados de autenticacao. |
| `getUserByOpenId(openId)` | Procura utilizador pelo identificador externo. |
| `getUserByEmail(email)` | Procura utilizador por email normalizado. |
| `getDemoUserId()` | Obtem o utilizador demo usado por rotas publicas sem sessao. |
| `getOrCreateDemoUserId(userId)` | Garante que existe um registo demo associado. |

### Animais

| Funcao | Responsabilidade |
| --- | --- |
| `getAnimalsByUser(userId)` | Lista animais pertencentes ao utilizador. |
| `addAnimal(data)` | Cria animal e associa-o ao utilizador. |
| `setActiveAnimal(animalId, userId)` | Atualiza o animal ativo do utilizador. |
| `getActiveAnimal(userId)` | Devolve o animal ativo. |
| `getAnimalById(animalId, userId)` | Obtem animal apenas se pertencer ao utilizador. |
| `verifyAnimalOwner(animalId, userId, allowWrite?)` | Valida ownership ou permissao de acesso/edicao. |
| `getAnimalShares(animalId)` | Lista partilhas de um animal. |
| `removeAnimalShare(ownerId, shareId)` | Remove partilha criada pelo proprietario. |

### Eventos, historico e feedback

| Funcao | Responsabilidade |
| --- | --- |
| `insertEvent(data)` | Persiste classificacao emocional de um animal. |
| `getRecentEvents(userId, limit)` | Lista eventos recentes para dashboard. |
| `getEventsPaginated(...)` | Lista eventos paginados com filtros. |
| `updateEventFeedback(eventId, userId, feedback)` | Guarda feedback de classificacao. |
| `getAllEventsForExport(userId, filters?)` | Obtem historico completo para exportacao. |
| `getWeeklyStats(userId, animalId?)` | Agrega eventos por estado no periodo semanal. |
| `getEventsForAnimalPaginated(animalId, userId, page, pageSize)` | Lista historico de um animal especifico. |
| `getStatsForAnimal(animalId, userId, days)` | Agrega estatisticas por animal num intervalo de dias. |

### Notas, audio e metadata visual

| Funcao | Responsabilidade |
| --- | --- |
| `getEventNotes(eventId)` | Le notas livres do evento. |
| `updateEventNotes(eventId, noteText)` | Atualiza notas livres. |
| `getEventAudio(eventId)` | Obtem URL de audio associada ao evento. |
| `updateEventAudio(eventId, audioUrl)` | Associa URL de audio ao evento. |
| `uploadAudioToSupabase(fileName, buffer, mimeType)` | Envia audio para o bucket `audio-recordings`. |
| `getEventPosture(eventId)` | Le postura associada ao evento. |
| `savePostureForEvent(eventId, posture)` | Guarda postura associada ao evento. |

### Baseline e estado de crenca

| Funcao | Responsabilidade |
| --- | --- |
| `getAnimalBaseline(animalId)` | Le baseline comportamental persistida ou devolve defaults. |
| `updateAnimalBaseline(animalId, patch)` | Atualiza thresholds e estados normais. |
| `buildBehaviorBaselineFromEvents(events)` | Calcula baseline a partir do historico. |
| `recalculateAnimalBehaviorBaseline(animalId, userId?)` | Recalcula e persiste baseline do animal. |
| `getEventBeliefState(eventId)` | Obtem estado de crenca guardado num evento. |
| `getLatestBeliefState(animalId)` | Obtem ou inicializa estado de crenca atual. |
| `updateBeliefStateForAnimal(animalId, state, confidence, eventId)` | Atualiza distribuicao de probabilidades apos nova classificacao. |

### Preferencias

| Funcao | Responsabilidade |
| --- | --- |
| `getSettings(userId)` | Le preferencias do utilizador. |
| `upsertSettings(userId, settings)` | Cria ou atualiza preferencias. |

### Partilhas, familia e veterinario

| Funcao | Responsabilidade |
| --- | --- |
| `createShareInvitation(ownerId, animalId, email, permission)` | Cria convite de co-tutor. |
| `getPendingInvitations(userId)` | Lista convites pendentes para o utilizador. |
| `respondToInvitation(userId, invitationId, action)` | Aceita ou rejeita convite. |
| `getSharedAnimalsForUser(userId)` | Lista animais partilhados diretamente com o utilizador. |
| `shareReportWithVet(animalId, payload)` | Regista acesso veterinario por email. |
| `getVetSharedAnimals(vetUserId, email, filters)` | Lista animais partilhados com veterinario. |
| `getVetReportData(vetUserId, email, animalId, days)` | Monta dados clinicos para relatorio veterinario. |
| `getVetClinicalNotes(vetUserId, animalId)` | Le notas clinicas do veterinario. |
| `saveVetClinicalNotes(vetUserId, animalId, notes)` | Guarda notas clinicas do veterinario. |
| `createFamilyGroup(userId, name)` | Cria grupo familiar. |
| `getFamilyMembersForUser(userId)` | Lista membros de familias do utilizador. |
| `createFamilyInviteForUser(userId, familyId?)` | Cria convite familiar. |
| `joinFamilyByInviteCode(userId, code)` | Entra numa familia por codigo. |
| `shareAnimalWithFamily(userId, animalId, familyId?)` | Partilha animal com familia. |
| `getFamilyAnimalsForUser(userId)` | Lista animais acessiveis por familia. |
| `getFamilyActivityForUser(userId)` | Lista atividade familiar recente. |

## Erros Relevantes

- `UNAUTHORIZED`: nao ha utilizador autenticado e nao existe fallback demo.
- `FORBIDDEN`: role insuficiente para endpoints admin/vet.
- `NOT_FOUND`: recurso inexistente ou fora do escopo do utilizador.

## Ficheiros Fonte

- `server/routers.ts`
- `server/routers/family.ts`
- `server/routers/vet.ts`
- `server/_core/systemRouter.ts`
- `server/db.ts`
