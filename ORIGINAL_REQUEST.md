# Original User Request

## Initial Request — 2026-06-04T21:25:58Z

Implement a comprehensive self-healing and learning system for the AnimalMind application. The system must intercept errors globally, store them in structured Supabase tables, automatically apply recovery strategies (for API, classification, camera, UI, auth, and routing failures), learn from repeat patterns to optimize recovery, and expose a diagnostic dashboard under Settings.

Working directory: C:\Users\Alexandre\Documents\AnimalMind

## Requirements

### R1. Global Error Capture & Database Storage
- Setup global handlers for `window.onerror`, `unhandledrejection`, React Error Boundaries, and tRPC/fetch interceptors.
- Create Supabase tables with RLS (users see their own data, admins see all):
  - `app_errors`: log route, user_id, session_id, module, error type/code/message, context JSON, frequency, and resolution status.
  - `app_healing_actions`: record automatic fixes attempted.
  - `app_health_state`: hold current module-level health statuses.

### R2. Central Healing Engine & Adaptive Learning
- Core logic to categorize errors, detect recurrences, and trigger fixes without entering infinite loops (using circuit breakers).
- Dynamically learn from error patterns: adapt retry backoffs, remember fallback methods that successfully resolved past errors, and suggest user actions when automated healing fails.

### R3. Recovery Strategies
- **API/Network:** Exponential backoff retry, orderly fallback, and circuit breaker.
- **Classification:** Adjust detection heuristics and display user guidance if low confidence repeats.
- **Camera:** Dynamic resolution fallback and clean recovery messages.
- **UI:** User-friendly fallback views with auto-recovery options.
- **Auth:** Silent session refresh and clear message triggers for re-authentication.

### R4. Settings Diagnostic UI
- A dedicated diagnostic section in the Settings page showing recent errors, auto-fixes applied, backend connectivity state, and a clear history button.

## Verification & Quality Guardrails
- **Build & Lint Checks:** Code must compile successfully with zero errors via `pnpm run check`.
- **Test Suite:** Ensure that all existing tests pass, and add unit tests to verify the healing engine and adaptive learning algorithms (`pnpm test`).
- **Production Build:** Validate the production build passes via `pnpm run build`.

## Acceptance Criteria

### Verification Criteria
- [ ] Script or unit tests verify that simulated API timeouts trigger exponential backoff and circuit breaker.
- [ ] Unit tests verify that the healing engine correctly registers error patterns in the local state or database, adjusting retry rates.
- [ ] TypeScript check (`pnpm run check`) completes with 0 errors.
- [ ] All vitest unit tests run and pass without failures.
- [ ] Production build (`pnpm run build`) finishes successfully.

## Follow-up — 2026-06-09T02:47:06Z

Verify and fix Android (Capacitor) network connectivity issues for the AnimalMind application.

Working directory: D:\AnimalMind
Integrity mode: development

## Requirements

### R1. Capacitor Server URL Configuration
- Ensure `capacitor.config.ts` includes `server.url` correctly configured to point to `https://animalmind.vercel.app` so that the app loads assets and pages from the web backend or acts as an SPC portal.

### R2. Network Security Config
- Create/modify `android/app/src/main/res/xml/network_security_config.xml` to allow cleartext or HTTPS connection to `animalmind.vercel.app` and subdomains.

### R3. AndroidManifest Configuration
- Ensure `AndroidManifest.xml` has `android.permission.INTERNET`.
- Ensure `<application>` tag contains `android:networkSecurityConfig="@xml/network_security_config"`.

### R4. Absolute tRPC and Supabase Client URLs
- Verify that `client/src/main.tsx` and Supabase client initialization use absolute URLs (e.g. `https://animalmind.vercel.app/api/trpc` and `https://yuzqxrmtbqlnalpjehno.supabase.co`) under Capacitor.

### R5. Logcat Verification
- Use `adb logcat` (running in debug mode) to check for and capture any remaining connectivity issues, exceptions, or errors under the tag `AnimalMind`, `Error`, or `Exception`.

## Acceptance Criteria

### Security & Connectivity
- [ ] `capacitor.config.ts` has `server.url` set to `https://animalmind.vercel.app`.
- [ ] `android/app/src/main/res/xml/network_security_config.xml` successfully permits connections to `animalmind.vercel.app`.
- [ ] `AndroidManifest.xml` has the INTERNET permission and references `@xml/network_security_config`.
- [ ] tRPC queries and mutations run without network exceptions in the Android app.
- [ ] Logcat output shows no active networking/CORS errors for `AnimalMind` or `animalmind.vercel.app`.
