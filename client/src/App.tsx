import { motion } from "framer-motion";
import Lenis from "lenis";
import { useEffect } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { CommandPalette } from "@/components/CommandPalette";
import { BackgroundGrid } from "@/components/ui/BackgroundGrid";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import { useAppStore } from "@/store/appStore";
import { BottomNav } from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { MobileOnlyGate } from "./components/MobileOnlyGate";
import { OfflineActionsSyncer } from "./components/OfflineActionsSyncer";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MoodProvider } from "./contexts/MoodContext";
import { SelfHealingProvider } from "./contexts/SelfHealingContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useRealtimeNotifications } from "./hooks/useRealtimeNotifications";
import AnimalDetailPage from "./pages/AnimalDetailPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CameraPage from "./pages/CameraPage";
import CapturePortalPage from "./pages/CapturePortalPage";
import ComparisonPage from "./pages/ComparisonPage";
import DashboardPage from "./pages/DashboardPage";
import FamilyDashboard from "./pages/FamilyDashboard";
import FoodSearchPage from "./pages/FoodSearchPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HealthPage from "./pages/HealthPage";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MindiPage from "./pages/MindiPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ProfilePage from "./pages/ProfilePage";
import RecordingPage from "./pages/RecordingPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VetDashboardPage from "./pages/VetDashboardPage";
import VetPage from "./pages/VetPage";
import VetPetDetailPage from "./pages/VetPetDetailPage";

function RealtimeNotificationsBridge({ enabled }: { enabled: boolean }) {
  useRealtimeNotifications(enabled);
  return null;
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const commandPaletteOpen = useAppStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore(
    (state) => state.setCommandPaletteOpen,
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex relative",
        !isAuthenticated && "flex-col",
      )}
    >
      {/* Background Grid */}
      {isAuthenticated && <BackgroundGrid />}

      <RealtimeNotificationsBridge enabled={isAuthenticated} />

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
          <motion.div
            key={location}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="min-h-full flex flex-col"
          >
            <Switch>
              {/* Public routes */}
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route path="/verify-email" component={VerifyEmailPage} />
              <Route path="/auth/callback" component={AuthCallbackPage} />

              {/* Public routes */}
              <Route path="/" component={LandingPage} />
              <Route path="/privacidade" component={PrivacyPolicyPage} />

              {/* Protected routes */}
              <Route
                path="/gravar"
                component={(props) => (
                  <ProtectedRoute component={RecordingPage} {...props} />
                )}
              />
              <Route
                path="/capturar"
                component={(props) => (
                  <ProtectedRoute component={CapturePortalPage} {...props} />
                )}
              />
              <Route
                path="/camera"
                component={(props) => (
                  <ProtectedRoute component={CameraPage} {...props} />
                )}
              />
              <Route
                path="/perfil"
                component={(props) => (
                  <ProtectedRoute component={ProfilePage} {...props} />
                )}
              />
              <Route
                path="/health"
                component={(props) => (
                  <ProtectedRoute component={HealthPage} {...props} />
                )}
              />
              <Route
                path="/animal/:id"
                component={(props) => (
                  <ProtectedRoute component={AnimalDetailPage} {...props} />
                )}
              />
              <Route
                path="/historico"
                component={(props) => (
                  <ProtectedRoute component={HistoryPage} {...props} />
                )}
              />
              <Route
                path="/dashboard"
                component={(props) => (
                  <ProtectedRoute component={DashboardPage} {...props} />
                )}
              />
              <Route
                path="/mindi"
                component={(props) => (
                  <ProtectedRoute component={MindiPage} {...props} />
                )}
              />
              <Route
                path="/alimentos"
                component={(props) => (
                  <ProtectedRoute component={FoodSearchPage} {...props} />
                )}
              />
              <Route
                path="/definicoes"
                component={(props) => (
                  <ProtectedRoute component={SettingsPage} {...props} />
                )}
              />
              <Route
                path="/user-profile"
                component={() => <Redirect to="/definicoes" />}
              />
              <Route
                path="/veterinario"
                component={(props) => (
                  <ProtectedRoute component={VetPage} {...props} />
                )}
              />
              <Route
                path="/vet/animal/:id"
                component={(props) => (
                  <ProtectedRoute component={VetPetDetailPage} {...props} />
                )}
              />
              <Route
                path="/vet"
                component={(props) => (
                  <ProtectedRoute component={VetDashboardPage} {...props} />
                )}
              />
              <Route
                path="/family"
                component={(props) => (
                  <ProtectedRoute component={FamilyDashboard} {...props} />
                )}
              />
              <Route
                path="/join/:code"
                component={(props) => (
                  <ProtectedRoute component={FamilyDashboard} {...props} />
                )}
              />
              <Route
                path="/comparison"
                component={(props) => (
                  <ProtectedRoute component={ComparisonPage} {...props} />
                )}
              />

              {/* Not found */}
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </motion.div>
        </main>

        {isAuthenticated && <OnboardingDialog />}
        {isAuthenticated && <OfflineActionsSyncer />}
        {isAuthenticated && <BottomNav />}

        {/* Global Command Palette */}
        {isAuthenticated && (
          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
          />
        )}
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
              <ThemeProvider defaultTheme="dark" switchable>
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
                    <Router />
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
