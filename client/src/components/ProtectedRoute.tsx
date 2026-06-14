import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppShellSkeleton } from "@/components/AppShellSkeleton";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  [key: string]: any;
}

export function ProtectedRoute({
  component: Component,
  ...props
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component {...props} />;
}
