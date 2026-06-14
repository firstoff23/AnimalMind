export type UserRole =
  | "user"
  | "owner"
  | "vet"
  | "veterinarian"
  | "clinic_admin"
  | "admin";

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export type InsertUser = Partial<User> & { openId: string };

export interface AppError {
  id: number;
  userId: number | null;
  errorMessage: string;
  errorStack: string | null;
  errorCode: string | null;
  severity: "info" | "warning" | "error" | "critical";
  component: string;
  context: any | null;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface AppHealingAction {
  id: number;
  errorId: number | null;
  userId: number;
  actionType: string;
  actionDetails: string | null;
  status: "pending" | "running" | "success" | "failed";
  resultMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface AppHealthState {
  id: number;
  userId: number;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheckedAt: Date;
  latencyMs: number | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  servicesStatus: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SeverityType = "safe" | "caution" | "dangerous" | "toxic";

export interface Food {
  id: string;
  name: string;
  aliases: string[] | null;
  safeFor: string[] | null;
  dangerousFor: string[] | null;
  toxicFor: string[] | null;
  severity: SeverityType;
  reason: string;
  symptoms: string[] | null;
  whatToDo: string | null;
  sources: string[] | null;
  createdAt: Date | null;
}

export interface FoodResult extends Food {
  computedSeverity: SeverityType;
}
