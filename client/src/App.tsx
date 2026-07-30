import { AnimatePresence, motion } from "motion/react";
import Lenis from "lenis";
import { lazy, Suspense, useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import { useAppStore } from "@/store/appStore";
import { BottomNav } from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { MobileOnlyGate } from "./components/MobileOnlyGate";
import { OfflineActionsSyncer } from "./components/OfflineActionsSyncer";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { CookieBanner } from "./components/CookieBanner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MoodProvider } from "./contexts/MoodContext";
import { SelfHealingProvider } from "./contexts/SelfHealingContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import { useMLBackendSSE } from "./hooks/useMLBackendSSE";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { GlobalFallback } from "./components/GlobalFallback";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
const AnimalDetailPage = lazy(() => import("./pages/AnimalDetailPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const CameraPage = lazy(() => import("./pages/CameraPage"));
const CapturePortalPage = lazy(() => import("./pages/CapturePortalPage"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const FamilyDashboard = lazy(() => import("./pages/FamilyDashboard"));
const FoodSearchPage = lazy(() => import("./pages/FoodSearchPage"));
const FeedbackAuditPage = lazy(() => import("./pages/FeedbackAuditPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const HealthPage = lazy(() => import("./pages/HealthPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MindiPage = lazy(() => import("./pages/MindiPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const TermsOfUsePage = lazy(() => import("./pages/TermsOfUsePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RecordingPage = lazy(() => import("./pages/RecordingPage"));
const RefundPage = lazy(() => import("./pages/RefundPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const VerifyOtpPage = lazy(() => import("./pages/VerifyOtpPage"));
const VetDashboardPage = lazy(() => import("./pages/VetDashboardPage"));
const VetPage = lazy(() => import("./pages/VetPage"));
const VetPetDetailPage = lazy(() => import("./pages/VetPetDetailPage"));
const MonitorPage = lazy(() => import("./pages/MonitorPage"));
const SurveillancePage = lazy(() => import("./pages/SurveillancePage").then(m => ({ default: m.SurveillancePage })));

// ─── Route Prefetch Helper ───────────────────────────────────────────────────
// Call this on onMouseEnter / onFocus to pre-load a lazy page chunk before
// the user actually navigates. Uses the same dynamic import() as React.lazy,
// so the browser caches the module — no double-fetch.
// Usage: <Link onMouseEnter={prefetch(() => import('./pages/DashboardPage'))} />
// ─────────────────────────────────────────────────────────────────────────────
export function prefetch(factory: () => Promise<unknown>) {
  return () => {
    factory().catch(() => {
      /* ignore prefetch errors silently */
    });
  };
}

// Helper component to dry up Lazy + Suspense routes
function LazyRoute({
  component: LazyComponent,
  variant = "content",
  isProtected = false,
  ...props
}: {
  component: React.ComponentType<any>;
  variant?:
    | "dashboard"
    | "profile"
    | "history"
    | "detail"
    | "settings"
    | "comparison"
    | "health"
    | "family"
    | "vet"
    | "content"
    | "mindi";
  isProtected?: boolean;
  [key: string]: any;
}) {
  const content = (
    <Suspense fallback={<AppShellSkeleton variant={variant} />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  if (isProtected) {
    return <ProtectedRoute component={() => content} {...props} />;
  }

  return content;
}

function RealtimeNotificationsBridge({ enabled }: { enabled: boolean }) {
  useRealtimeNotifications(enabled);
  return null;
}

function PushNotificationsBridge({ enabled }: { enabled: boolean }) {
  const subscribeMutation = trpc.push.subscribe.useMutation();
  usePushNotifications(); // Native mobile push notifications

  useEffect(() => {
    if (enabled && !Capacitor.isNativePlatform()) {
      // Web push notifications fallback
      import("@/lib/pushSetup").then(({ subscribeUserToPush }) => {
        subscribeUserToPush(subscribeMutation.mutateAsync).catch((err) => {
          console.error(
            "[Push Setup] Failed to register web push subscription:",
            err,
          );
        });
      });
    }
  }, [enabled]);

  return null;
}

function MLBackendSSEBridge({ enabled }: { enabled: boolean }) {
  useMLBackendSSE({ enabled });
  return null;
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Query database user to check onboarding status
  const { data: dbUser, isLoading: dbUserLoading } = trpc.auth.me.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false },
  );

  const commandPaletteOpen = useAppStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore(
    (state) => state.setCommandPaletteOpen,
  );

  const isPublicRoute = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-otp",
    "/auth/callback",
    "/privacidade",
    "/termos",
    "/cookies",
  ].includes(location);

  if (isAuthenticated && dbUserLoading && !isPublicRoute) {
    return <AppShellSkeleton />;
  }

  if (
    isAuthenticated &&
    dbUser &&
    dbUser.onboardingCompleted === false &&
    !isPublicRoute
  ) {
    return <OnboardingFlow />;
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex relative",
        !isAuthenticated && "flex-col",
      )}
    >

      <RealtimeNotificationsBridge enabled={isAuthenticated} />
      <PushNotificationsBridge enabled={isAuthenticated} />
      <MLBackendSSEBridge enabled={isAuthenticated} />

      {/* Sidebar Desktop — only shown when authenticated */}
      {isAuthenticated && <Sidebar />}

      {/* Right container or single wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 relative",
          isAuthenticated ? "h-screen" : "min-h-screen",
        )}
      >
        {/* Header — only shown when authenticated */}
        {isAuthenticated && <Header />}

        {/* Page content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            isAuthenticated ? "pb-20 md:pb-0" : "",
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="min-h-full flex flex-col"
            >
              <Switch>
                {/* Public routes */}
                <Route path="/login">
                  <LazyRoute component={LoginPage} variant="settings" />
                </Route>
                <Route path="/register">
                  <LazyRoute component={RegisterPage} variant="settings" />
                </Route>
                <Route path="/forgot-password">
                  <LazyRoute
                    component={ForgotPasswordPage}
                    variant="settings"
                  />
                </Route>
                <Route path="/reset-password">
                  <LazyRoute component={ResetPasswordPage} variant="settings" />
                </Route>
                <Route path="/verify-email">
                  <LazyRoute component={VerifyEmailPage} variant="settings" />
                </Route>
                <Route path="/verify-otp">
                  <LazyRoute component={VerifyOtpPage} variant="settings" />
                </Route>
                <Route path="/auth/callback">
                  <LazyRoute component={AuthCallbackPage} variant="content" />
                </Route>
                <Route path="/monitor">
                  <LazyRoute component={MonitorPage} isProtected />
                </Route>
                <Route path="/vigilancia">
                  <LazyRoute component={SurveillancePage} isProtected />
                </Route>
      <Route path="/">
                  <LazyRoute component={LandingPage} variant="content" />
                </Route>
                <Route path="/privacidade">
                  <LazyRoute component={PrivacyPolicyPage} variant="content" />
                </Route>
                <Route path="/termos">
                  <LazyRoute component={TermsOfUsePage} variant="content" />
                </Route>
                <Route path="/cookies">
                  <LazyRoute component={CookiePolicyPage} variant="content" />
                </Route>
                <Route path="/reembolsos">
                  <LazyRoute component={RefundPage} variant="content" />
                </Route>

                {/* Protected routes */}
                <Route path="/gravar">
                  {(params) => (
                    <LazyRoute
                      component={RecordingPage}
                      variant="content"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/capturar">
                  {(params) => (
                    <LazyRoute
                      component={CapturePortalPage}
                      variant="content"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/camera">
                  {(params) => (
                    <LazyRoute
                      component={CameraPage}
                      variant="content"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/perfil">
                  {(params) => (
                    <LazyRoute
                      component={ProfilePage}
                      variant="profile"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/health">
                  {(params) => (
                    <LazyRoute
                      component={HealthPage}
                      variant="health"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/animal/:id">
                  {(params) => (
                    <LazyRoute
                      component={AnimalDetailPage}
                      variant="detail"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/historico">
                  {(params) => (
                    <LazyRoute
                      component={HistoryPage}
                      variant="history"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/dashboard">
                  {(params) => (
                    <LazyRoute
                      component={DashboardPage}
                      variant="dashboard"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/mindi">
                  {(params) => (
                    <LazyRoute
                      component={MindiPage}
                      variant="mindi"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/alimentos">
                  {(params) => (
                    <LazyRoute
                      component={FoodSearchPage}
                      variant="health"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/definicoes">
                  {(params) => (
                    <LazyRoute
                      component={SettingsPage}
                      variant="settings"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route
                  path="/user-profile"
                  component={() => <Redirect to="/definicoes" />}
                />
                <Route path="/veterinario">
                  {(params) => (
                    <LazyRoute
                      component={VetPage}
                      variant="vet"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/vet/animal/:id">
                  {(params) => (
                    <LazyRoute
                      component={VetPetDetailPage}
                      variant="detail"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/vet">
                  {(params) => (
                    <LazyRoute
                      component={VetDashboardPage}
                      variant="vet"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/family">
                  {(params) => (
                    <LazyRoute
                      component={FamilyDashboard}
                      variant="family"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/join/:code">
                  {(params) => (
                    <LazyRoute
                      component={FamilyDashboard}
                      variant="family"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/comparison">
                  {(params) => (
                    <LazyRoute
                      component={ComparisonPage}
                      variant="comparison"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>
                <Route path="/feedback-audit">
                  {(params) => (
                    <LazyRoute
                      component={FeedbackAuditPage}
                      variant="content"
                      isProtected
                      {...params}
                    />
                  )}
                </Route>

                {/* Not found */}
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </motion.div>
          </AnimatePresence>
        </main>

        {isAuthenticated && <OfflineActionsSyncer />}
        {isAuthenticated && <BottomNav />}

        <CookieBanner />

        {/* Global Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </div>
    </div>
  );
}

import { LanguageProvider } from "./hooks/useLanguage";

function App() {
  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <ErrorBoundary>
      <MobileOnlyGate>
        <AuthProvider>
          <SelfHealingProvider>
            <LanguageProvider>
              <ThemeProvider defaultTheme="dark">
                <TooltipProvider>
                  <Toaster
                    theme="dark"
                    position="bottom-center"
                    toastOptions={{
                      style: {
                        background: "oklch(0.12 0.012 264)",
                        border: "1px solid oklch(0.22 0.012 264)",
                        color: "oklch(0.97 0.003 264)",
                      },
                    }}
                  />
                  <MoodProvider>
                    <ReactErrorBoundary FallbackComponent={GlobalFallback}>
                      <Router />
                    </ReactErrorBoundary>
                  </MoodProvider>
                </TooltipProvider>
              </ThemeProvider>
            </LanguageProvider>
          </SelfHealingProvider>
        </AuthProvider>
      </MobileOnlyGate>
    </ErrorBoundary>
  );
}

export default App;
