# Handoff Report: Security, Configuration, and Codebase Quality Audit

## 1. Observation
1. **Unified Health Router lack of application-level authorization**:
   - File: `server/routers/health.ts`, lines 13-17:
     ```typescript
     getVaccines: protectedProcedure
       .input(z.object({ animalId: z.number() }))
       .query(async ({ input }) => {
         return getVaccines(input.animalId);
       }),
     ```
   - File: `server/db.ts`, lines 13-23:
     ```typescript
     export function getSupabase() {
       if (!_supabase) {
         const url = process.env.SUPABASE_URL;
         const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
         if (!url || !key) {
           throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY");
         }
         _supabase = createClient<any>(url, key);
       }
       return _supabase;
     }
     ```
2. **Offline Local ML Model Load Bug**:
   - File: `client/src/lib/localClassifier.ts`, lines 20-25:
     ```typescript
     try {
       model = await tf.loadGraphModel("https://tfhub.dev/google/tfjs-model/yamnet/1/default/1", { fromTFHub: true });
     } catch (err) {
       console.warn("Could not load YAMNet from TFHub, falling back to local heuristic classifier:", err);
       return getLocalMockClassification();
     }
     ```
3. **Veterinarian Access Verification Gap**:
   - File: `server/db.ts`, lines 944-1005:
     - `verifyAnimalOwner` only inspects owner ID, `family_shares` table, and `userHasFamilyAnimalAccess`. It does not query `vet_shares` or `vet_pet_access`.
4. **Android Development Connectivity Limitations**:
   - File: `client/src/main.tsx`, lines 29-33:
     ```typescript
     const trpcUrl = import.meta.env.VITE_TRPC_URL ?? (
       Capacitor.isNativePlatform()
         ? "https://animalmind.vercel.app/api/trpc"
         : "/api/trpc"
     );
     ```
   - File: `android/app/src/main/res/xml/network_security_config.xml`:
     - Cleartext exceptions exist only for specific remote domains. No local testing loopbacks (such as `10.0.2.2` or local development network IPs) are listed.
5. **CORS Restrictions**:
   - File: `server/index.ts`, lines 12-18:
     ```typescript
     app.use((req, res, next) => {
       const allowedOrigins = [
         "https://animalmind.vercel.app",
         "http://localhost:3000",
         "http://localhost:5173",
         "https://localhost"
       ];
     ```
6. **Test Warning / Mocking Gap**:
   - Command: `pnpm test` (vitest run) successfully passes all 88 test cases.
   - During testing, the following console output is observed:
     ```
     [Classify] Failed to upload audio: Error: [vitest] No "updateEventAudio" export is defined on the "./db" mock. Did you forget to return it from "vi.mock"?
     ```
   - File: `server/animalmind.test.ts`, lines 9-113 does not export `updateEventAudio` inside the `vi.mock("./db")` block.

---

## 2. Logic Chain
1. **Unified Health Router Access Vulnerability**:
   - Since `getSupabase()` uses the `SUPABASE_SERVICE_ROLE_KEY` to connect, all backend database requests run with administrative privileges that bypass Row Level Security (RLS) policies.
   - The procedures defined in `server/routers/health.ts` query `getVaccines` and `getHealthRecords` without checking whether the calling user is authorized to view or edit details for the supplied `animalId`.
   - Therefore, any logged-in user can access or write to any pet's health or vaccination record by simply providing its `animalId`.
2. **Offline ML Classification Failure**:
   - The browser fallback classifier `runLocalYAMNet` is designed to run locally when the app is offline.
   - However, `runLocalYAMNet` tries to download the TF.js graph model files from a remote URL (`https://tfhub.dev`) dynamically at runtime.
   - Because the browser is offline, the remote fetch will always fail, causing the execution to enter the catch block and call `getLocalMockClassification()`.
   - Thus, offline classification is not performing machine learning, but rather returning randomized mock states.
3. **Veterinarian Access Gap**:
   - Veterinarians are granted access via tables like `vet_shares`.
   - However, standard procedures in the API check user credentials by invoking `verifyAnimalOwner`, which does not inspect `vet_shares`.
   - Vets are therefore blocked from accessing standard pet routers (like `animals.getVaccinations`) and must use custom, dashboard-specific endpoints.
4. **Android/Capacitor CORS & Dev Restrictions**:
   - When running on a native platform, the trpc endpoint defaults to `https://animalmind.vercel.app/api/trpc`.
   - Developers testing local builds on an emulator must override `VITE_TRPC_URL` to point to a local API.
   - If pointing to a local API, Android's `network_security_config.xml` blocks the cleartext HTTP connection.
   - Furthermore, if the client uses `http://localhost` or a custom scheme like `capacitor://localhost`, the server CORS handler rejects the origin because it is not whitelisted.

---

## 3. Caveats
- Production environment variables (such as the actual `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_URL`) were not inspected since this is a local analysis.
- Live testing on an Android emulator was not performed.
- Assumptions are made that the custom schemes used by the WebView on iOS/Android match the standard defaults of Capacitor.

---

## 4. Conclusion
The codebase is highly type-safe (`tsc --noEmit` is clean) and structurally robust, but exposes a serious authorization vulnerability in `server/routers/health.ts` where the new health and vaccine records are entirely unprotected. In addition, the local ML classification feature is structurally flawed as it requires an active internet connection to download the YAMNet model when offline, causing a silent fallback to randomized mock values.

---

## 5. Verification Method
1. **Run the build verification**:
   ```powershell
   pnpm check
   ```
2. **Run the unit test suite**:
   ```powershell
   pnpm test
   ```
   Inspect the vitest console logs to verify the warning regarding the missing `updateEventAudio` mock export.
3. **Review file configurations**:
   - Inspect `server/routers/health.ts` to confirm the absence of authorization checks.
   - Inspect `client/src/lib/localClassifier.ts` to confirm the remote URL fetch.
