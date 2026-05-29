import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Lenis from "lenis";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BottomNav } from "./components/BottomNav";
import { Header } from "./components/Header";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { ProtectedRoute } from "./components/ProtectedRoute";
import RecordingPage from "./pages/RecordingPage";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import UserProfilePage from "./pages/UserProfilePage";
import AnimalDetailPage from "./pages/AnimalDetailPage";
import VetPage from "./pages/VetPage";
import VetDashboard from "./pages/VetDashboard";
import FamilyDashboard from "./pages/FamilyDashboard";
import HealthPage from "./pages/HealthPage";
import ComparisonPage from "./pages/ComparisonPage";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — only shown when authenticated */}
      {isAuthenticated && <Header />}

      {/* Page content — padded for bottom nav when authenticated */}
      <main className={`flex-1 overflow-y-auto ${isAuthenticated ? "pb-20" : ""}`}>
        <Switch>
          {/* Public routes */}
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/verify-email" component={VerifyEmailPage} />
          <Route path="/auth/callback" component={AuthCallbackPage} />

          {/* Protected routes */}
          <Route path="/" component={(props) => <ProtectedRoute component={RecordingPage} {...props} />} />
          <Route path="/perfil" component={(props) => <ProtectedRoute component={ProfilePage} {...props} />} />
          <Route path="/health" component={(props) => <ProtectedRoute component={HealthPage} {...props} />} />
          <Route path="/animal/:id" component={(props) => <ProtectedRoute component={AnimalDetailPage} {...props} />} />
          <Route path="/historico" component={(props) => <ProtectedRoute component={HistoryPage} {...props} />} />
          <Route path="/dashboard" component={(props) => <ProtectedRoute component={DashboardPage} {...props} />} />
          <Route path="/definicoes" component={(props) => <ProtectedRoute component={SettingsPage} {...props} />} />
          <Route path="/user-profile" component={(props) => <ProtectedRoute component={UserProfilePage} {...props} />} />
          <Route path="/veterinario" component={(props) => <ProtectedRoute component={VetPage} {...props} />} />
          <Route path="/vet" component={(props) => <ProtectedRoute component={VetDashboard} {...props} />} />
          <Route path="/family" component={(props) => <ProtectedRoute component={FamilyDashboard} {...props} />} />
          <Route path="/join/:code" component={(props) => <ProtectedRoute component={FamilyDashboard} {...props} />} />
          <Route path="/comparison" component={(props) => <ProtectedRoute component={ComparisonPage} {...props} />} />

          {/* Not found */}
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {isAuthenticated && <OnboardingDialog />}

      {/* Bottom nav — only shown when authenticated */}
      {isAuthenticated && <BottomNav />}
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
      <AuthProvider>
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
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
