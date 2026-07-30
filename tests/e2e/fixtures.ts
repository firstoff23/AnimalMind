import {
  test as base,
  expect,
  type Page,
  type Request,
} from "@playwright/test";

export const mockUserEmail = "tutor.e2e@example.test";
export const mockUserPassword = "password-e2e";

const timestamp = "2026-06-01T12:00:00.000Z";

const supabaseUser = {
  id: "e2e-supabase-user",
  aud: "authenticated",
  role: "authenticated",
  email: mockUserEmail,
  email_confirmed_at: timestamp,
  confirmed_at: timestamp,
  phone: "",
  app_metadata: {
    provider: "email",
    providers: ["email"],
  },
  user_metadata: {
    full_name: "Tutor E2E",
  },
  identities: [],
  created_at: timestamp,
  updated_at: timestamp,
};

const appUser = {
  id: 1,
  openId: supabaseUser.id,
  name: "Tutor E2E",
  email: mockUserEmail,
  loginMethod: "email",
  role: "owner",
  createdAt: timestamp,
  updatedAt: timestamp,
  lastSignedIn: timestamp,
};

const mockAnimal = {
  id: 1,
  userId: 1,
  name: "Bobi",
  species: "dog",
  breed: "Serra da Estrela",
  age: 4,
  dateOfBirth: "2022-04-12",
  sex: "male",
  color: "Dourado",
  coat: "medium",
  photoUrl: null,
  microchipNumber: "900115000111222",
  height: "45 cm",
  tail: "long",
  specialMarkings: "Mancha clara no peito",
  isActive: true,
  isShared: false,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const mockEvent = {
  id: 101,
  userId: 1,
  animalId: mockAnimal.id,
  animalName: mockAnimal.name,
  animalSpecies: mockAnimal.species,
  state: "relaxed",
  confidence: 0.92,
  emoji: "⚪",
  modelUsed: "yamnet-e2e",
  model_used: "yamnet-e2e",
  cached: false,
  feedback: null,
  audioUrl: null,
  createdAt: timestamp,
  created_at: timestamp,
  notes: "Registo E2E",
  posture: "standing",
};

const mockEvents = [mockEvent];

const mockBaseline = {
  animalId: mockAnimal.id,
  vocalizationThreshold: 10,
  normalStates: ["relaxed", "attention"],
  alertSensitivity: "medium",
  stateDistribution: {
    distress: 0,
    attention: 0.2,
    excitement: 0.1,
    hunger: 0,
    alert: 0,
    relaxed: 0.7,
  },
  sampleSize: 10,
  updatedAt: timestamp,
};

const mockStats = {
  totalCount: mockEvents.length,
  avgConfidence: 0.92,
  stateDistribution: {
    distress: 0,
    attention: 0,
    excitement: 0,
    hunger: 0,
    alert: 0,
    relaxed: 1,
  },
  dailyActivity: [
    {
      date: "2026-06-01",
      distress: 0,
      attention: 0,
      excitement: 0,
      hunger: 0,
      alert: 0,
      relaxed: 1,
      count: 1,
      avgConfidence: 0.92,
    },
  ],
};

const mockBeliefState = {
  relaxed: 0.84,
  excitement: 0.05,
  distress: 0.02,
  hunger: 0.03,
  alert: 0.02,
  attention: 0.04,
  updatedAt: timestamp,
};

function supabaseSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  return {
    access_token: "e2e-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "e2e-refresh-token",
    user: supabaseUser,
  };
}

async function parseRequestInput(request: Request) {
  if (request.method() === "GET") {
    const input = new URL(request.url()).searchParams.get("input");
    if (!input) return null;

    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  }

  const body = request.postData();
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function getInputAt(parsedInput: unknown, index: number) {
  if (!parsedInput || typeof parsedInput !== "object") return undefined;
  const inputRecord = parsedInput as Record<string, any>;
  return (
    inputRecord[String(index)]?.json ??
    inputRecord[String(index)] ??
    inputRecord.json
  );
}

function trpcData(data: unknown) {
  return {
    result: {
      data: {
        json: data,
      },
    },
  };
}

function eventsPage() {
  return {
    events: mockEvents,
    total: mockEvents.length,
  };
}

function procedureData(procedure: string, input: any) {
  switch (procedure) {
    case "auth.me":
      return appUser;
    case "auth.logout":
    case "auth.deleteAccount":
    case "auth.mfa.verify":
    case "auth.mfa.disable":
      return { success: true };
    case "auth.mfa.status":
      return { enabled: false };
    case "auth.mfa.setup":
      return { secret: "JBSWY3DPEHPK3PXP", otpAuthUri: "otpauth://totp/AnimalMind?secret=JBSWY3DPEHPK3PXP&issuer=AnimalMind" };
    case "animals.list":
      return [mockAnimal];
    case "animals.get":
      return mockAnimal;
    case "animals.getActive":
      return mockAnimal;
    case "animals.weeklyStats":
      return mockEvents;
    case "animals.getBaseline":
      return mockBaseline;
    case "animals.getBeliefState":
      return mockBeliefState;
    case "trends.getWeeklyTrend":
      return {
        trend: "stable",
        percentageChange: 0,
        dailyScores: [{ date: "01/06", score: 92 }],
        message: "Bobi manteve um padrão estável nesta semana.",
      };
    case "trends.getPatterns":
      return {
        patterns: ["Maior relaxamento após rotina consistente"],
      };
    case "animals.getPendingInvitations":
    case "animals.listShares":
    case "family.getMembers":
    case "family.getAnimals":
    case "family.getActivity":
    case "health.getVaccines":
    case "health.getHealthRecords":
    case "health.getVaccinations":
    case "health.getDewormings":
    case "health.getDiagnosticTests":
    case "health.getOtherTreatments":
    case "health.getLicensing":
      return [];
    case "events.recent":
      return mockEvents;
    case "events.list":
    case "events.listForAnimal":
      return eventsPage();
    case "events.exportData":
      return {
        events: mockEvents,
        filters: input ?? {},
        generatedAt: timestamp,
      };
    case "events.exportCsv":
      return {
        csv: "id,state,confidence,created_at\n101,relaxed,0.92,2026-06-01T12:00:00.000Z",
      };
    case "events.statsForAnimal":
      return mockStats;
    case "events.getVisualMetadata":
      return {
        posture: "standing",
        beliefState: mockBeliefState,
      };
    case "events.feedback":
    case "events.updateNotes":
    case "settings.update":
    case "animals.updateBaseline":
      return { success: true };
    case "events.getNotes":
      return { notes: mockEvent.notes };
    case "settings.get":
      return {
        notificationsEnabled: true,
        alertSensitivity: "medium",
      };
    case "classify.run":
    case "classify.saveVisionEvent":
      return {
        state: "relaxed",
        confidence: 0.92,
        emoji: "⚪",
        model_used: procedure === "classify.saveVisionEvent" ? "vision-v1" : "yamnet-e2e",
        cached: false,
        eventId: mockEvent.id,
        posture: input?.posture ?? "standing",
        species: procedure === "classify.saveVisionEvent" ? "dog" : undefined,
        breed: procedure === "classify.saveVisionEvent" ? "Serra da Estrela" : undefined,
      };
    case "classify.detectPosture":
      return {
        posture: "standing",
        confidence: 0.88,
      };
    case "classify.detectSpecies":
      return {
        species: "dog",
        confidence: 0.93,
      };
    default:
      return null;
  }
}

async function mockSupabase(page: Page) {
  await page.route("https://test.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }

    if (
      url.pathname.includes("/auth/v1/token") ||
      url.pathname.includes("/auth/v1/verify")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(supabaseSession()),
      });
      return;
    }

    if (url.pathname.includes("/auth/v1/user")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: supabaseUser }),
      });
      return;
    }

    if (url.pathname.includes("/auth/v1/logout")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
}

async function mockTrpc(page: Page) {
  await page.route("**/api/trpc/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const encodedPath = url.pathname.split("/api/trpc/")[1] ?? "";
    const procedures = decodeURIComponent(encodedPath)
      .split(",")
      .map((procedure) => procedure.trim())
      .filter(Boolean);

    if (procedures.length === 0) {
      await route.fallback();
      return;
    }

    const parsedInput = await parseRequestInput(request);
    const isBatch =
      url.searchParams.get("batch") === "1" || procedures.length > 1;
    const payload = procedures.map((procedure, index) =>
      trpcData(procedureData(procedure, getInputAt(parsedInput, index))),
    );

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(isBatch ? payload : payload[0]),
    });
  });
}

async function installBrowserMocks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("animalmind-onboarding-seen", "true");
    localStorage.setItem("pawra-onboarding-seen", "true");
    localStorage.setItem("theme", "dark");
    localStorage.setItem("cookie_consent", "all");
    indexedDB.deleteDatabase("animalmind-offline-queue");
    indexedDB.deleteDatabase("animalmind-offline-queue-meta");

    // Disable WebGL in E2E to prevent headless crashes of Three.js / Canvas
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: any[]) {
      if (type === "webgl" || type === "experimental-webgl") {
        return null;
      }
      return (originalGetContext as any).apply(this, [type, ...args]);
    };

    class MockWebSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      binaryType: BinaryType = "blob";
      extensions = "";
      onclose: ((event: CloseEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;
      protocol = "";
      readyState = MockWebSocket.OPEN;
      url: string;

      constructor(url: string | URL) {
        super();
        this.url = String(url);
        window.setTimeout(() => {
          const event = new Event("open");
          this.dispatchEvent(event);
          this.onopen?.(event);
        }, 0);
      }

      close() {
        this.readyState = MockWebSocket.CLOSED;
        const event = new CloseEvent("close");
        this.dispatchEvent(event);
        this.onclose?.(event);
      }

      send() {}
    }

    Object.defineProperty(window, "WebSocket", {
      configurable: true,
      value: MockWebSocket,
    });

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: class MockNotification {
        static permission = "granted";
        static requestPermission = async () => "granted";
        title: string;
        options?: NotificationOptions;

        constructor(title: string, options?: NotificationOptions) {
          this.title = title;
          this.options = options;
        }

        close() {}
      },
    });

    class MockMediaRecorder extends EventTarget {
      static isTypeSupported = () => true;
      mimeType: string;
      state: RecordingState = "inactive";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;

      constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
        super();
        this.mimeType = options?.mimeType ?? "audio/webm";
      }

      start() {
        this.state = "recording";
        this.emitData();
      }

      stop() {
        if (this.state === "inactive") return;
        this.emitData();
        this.state = "inactive";
        const event = new Event("stop");
        this.dispatchEvent(event);
        this.onstop?.(event);
      }

      pause() {
        this.state = "paused";
      }

      resume() {
        this.state = "recording";
      }

      requestData() {
        this.emitData();
      }

      private emitData() {
        const event = new Event("dataavailable") as BlobEvent;
        Object.defineProperty(event, "data", {
          value: new Blob(["animalmind-e2e-audio"], { type: this.mimeType }),
        });
        this.dispatchEvent(event);
        this.ondataavailable?.(event);
      }
    }

    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: MockMediaRecorder,
    });
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on("pageerror", (err) => {
      console.error("[PAGE ERROR]", err.message, err.stack);
    });
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning" || type === "log") {
        console.log(`[BROWSER ${type.toUpperCase()} LOG] ${msg.text()}`);
      }
    });
    await installBrowserMocks(page);
    await mockSupabase(page);
    await mockTrpc(page);
    await use(page);
  },
});

export async function loginAsMockUser(page: Page) {
  await page.goto("/login");
  await page.locator("#login-email").fill(mockUserEmail);
  await page.locator("#login-password").fill(mockUserPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export { expect };
