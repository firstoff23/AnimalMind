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

## Follow-up — 2026-06-12T00:32:34Z

Implement Round 2 improvements for AnimalMind, including restoring the animal profile page, separating the voice recorder and camera, adding animal creation options (manual, microchip, OCR placeholder), and standardizing upload and error states globally.

Working directory: C:\Users\Alexandre\Documents\AnimalMind
Integrity mode: demo

## Requirements

### R1. Restoring Animal Profile to /perfil & User Profile to /definicoes
- Restore the `/perfil` route to point directly to `ProfilePage.tsx` (the dedicated Animal Profile screen). Remove the redirect to `/definicoes`.
- Put back the `PawPrint` ("Animais") navigation tab in `BottomNav.tsx` and `Sidebar.tsx` pointing to `/perfil`.
- Integrate editing/management of the active animal's profile (name, breed, weight, age, photoUrl) inside `ProfilePage.tsx` (e.g. via an "Editar" button and drawer).
- Remove all animal profile list selection and animal profile editing sections from `SettingsPage.tsx`.
- Retain the User Profile (Full Name, Email Address, Save Profile, Log Out) inside `SettingsPage.tsx`.
- Ensure `/user-profile` redirects to `/definicoes`.

### R2. Separate Voice Recorder and Camera (Entry screen: /capturar)
- Replace `/gravar` with `/capturar` (Capture) in the main navigation menus (`BottomNav.tsx` and `Sidebar.tsx`).
- `/capturar` is a single entry page showing two large cards: 🎙️ "Gravar Áudio" (which navigates to `/gravar`) and 📷 "Câmara" (which navigates to a new route `/camera`).
- The `/gravar` route must only contain the Voice Recorder (no camera features).
- The `/camera` route must only contain the Camera capture features.
- Request microphone / camera permissions only at the moment of use, not on page load.
- Voice Recorder page must display a timer and an audio level wave/bar indicator.
- Camera page must show a large live camera preview.
- Include a "Review" screen (hear/see, retry, confirm or delete) before saving or sending for both audio and camera.
- Expose clear upload lifecycle states: Idle → A enviar → A processar → Concluído / Erro.

### R3. Animal Profile Creation Options
- Integrate 3 options when adding a new animal:
  - **Opção A: Manual**: Existing drawer form.
  - **Opção B: Número de microchip**: Field to enter a 15-digit microchip number, validate length/format, and store it in the database.
  - **Opção C: Importar do Boletim (OCR)**: Display "Fotografar boletim" button, show placeholder/badge "Em breve". In the UI, show preview of the uploaded file, explicit "A processar OCR..." state, error fallback, and retry/manual fill options.

### R4. Standardized Upload States and Error Messages
- For all media upload zones (animal photo, bulletin image, audio):
  - **Idle**: Instructions, size limit (20MB), accepted formats.
  - **Uploading**: Progress bar with percentage.
  - **Processing**: Clear text (e.g., "A analisar...", "A transcrever...").
  - **Success**: Final preview, check indicator, and next step.
  - **Error**: specific errors with recovery actions:
    - Invalid type: "Formato não suportado. Usa JPG, PNG ou PDF."
    - Size limit exceeded: "Ficheiro demasiado grande. Máximo 20 MB."
    - Network error: "Ligação interrompida. Tentar novamente."
    - OCR/processing: "Não foi possível analisar o ficheiro. Tenta novamente ou preenche manualmente."
    - Permissions denied: specific error with a button to open settings.
- Implement accessibility features: `aria-live="polite"`, text + icons for errors, WCAG AA contrast.

## Acceptance Criteria

### Verification & Quality Guardrails
- [ ] TypeScript check (`pnpm run check`) completes with 0 errors.
- [ ] All unit tests (`pnpm test`) pass without failures.
- [ ] Production build (`pnpm run build`) finishes successfully.
- [ ] Walkthrough documentation updated in `walkthrough.md` with descriptions and references to screenshots.
- [ ] All code modifications committed and pushed to `main`.
