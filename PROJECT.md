# Project: AnimalMind Self-Healing and Learning System

## Architecture
- **Frontend**: Vite + React, using tRPC hooks (`trpc.useQuery`, `trpc.useMutation`) to interact with the backend, and standard error interceptors.
- **Backend**: Express + tRPC. Connects to Supabase PostgreSQL database using Supabase JS SDK (with Service Role Key for backend bypass or authenticated keys).
- **Database**: Supabase PostgreSQL. Tables with Row Level Security (RLS) configured to allow users to read/write their own logs, and admins to access all logs.

## Code Layout
- `client/src/pages/SettingsPage.tsx` - Settings & Diagnostics dashboard UI
- `client/src/components/ErrorBoundary.tsx` - React Error Boundary
- `client/src/_core/` - Core client helpers and interceptors
- `server/routers/system.ts` or `server/routers/healing.ts` - tRPC Router for Self-Healing
- `server/routers.ts` - Main tRPC router registration
- `server/db.ts` - Database operations mapping to Supabase
- `supabase-migrations/` - Database SQL migrations

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Database & API Setup | Create Supabase migrations for tables; expose tRPC routes for CRUD operations. | None | IN_PROGRESS (Worker ID: 50337803-d97b-4364-ab28-205a04ba9887) |
| 2 | M2: Global Error Capture & Engine | Intercept errors globally on client and backend; build Central Healing Engine. | M1 | PLANNED |
| 3 | M3: Recovery & Learning | Implement backoff, fallbacks, heuristics, and adaptive learning strategies. | M2 | PLANNED |
| 4 | M4: Settings Diagnostics UI | Add diagnostics dashboard to Settings page. | M1 | PLANNED |
| 5 | M5: E2E Verification & Hardening | Verify all requirements pass; add adversarial tests (Tier 5). | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Supabase Table Schemas

#### `app_errors`
- `id` (bigint, primary key, generated always as identity)
- `user_id` (bigint, references public.users(id) on delete cascade)
- `session_id` (text, not null)
- `route` (text, not null)
- `module` (text, not null)
- `error_type` (text, not null)
- `error_code` (text)
- `message` (text, not null)
- `context` (jsonb, default '{}')
- `frequency` (int, default 1)
- `status` (text, default 'unresolved') -- unresolved, resolving, resolved, failed
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

#### `app_healing_actions`
- `id` (bigint, primary key, generated always as identity)
- `error_id` (bigint, references public.app_errors(id) on delete cascade)
- `strategy` (text, not null)
- `attempt_number` (int, not null)
- `status` (text, default 'attempted') -- attempted, succeeded, failed
- `details` (jsonb, default '{}')
- `created_at` (timestamptz, default now())

#### `app_health_state`
- `id` (bigint, primary key, generated always as identity)
- `user_id` (bigint, references public.users(id) on delete cascade)
- `module` (text, not null) -- api, classification, camera, ui, auth, routing
- `status` (text, default 'healthy') -- healthy, degraded, down
- `last_checked` (timestamptz, default now())
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- UNIQUE (user_id, module)

### tRPC Router: `healing`
- `logError`: Mutation to record/increment an error.
- `getRecentErrors`: Query to retrieve error logs.
- `getHealingHistory`: Query to fetch attempted auto-fixes.
- `getHealthState`: Query to get current health state.
- `clearHistory`: Mutation to reset/clear error log and healing actions for the user.
