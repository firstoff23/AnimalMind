export const VETERINARY_ROLES = [
  "vet",
  "veterinarian",
  "clinic_admin",
  "admin",
] as const;

export function isVeterinaryRole(role: unknown): boolean {
  return (
    typeof role === "string" &&
    (VETERINARY_ROLES as readonly string[]).includes(role)
  );
}

export function getVeterinaryRoleLabel(role: unknown): string {
  if (role === "clinic_admin") return "Admin clínica";
  if (role === "admin") return "Admin";
  return "Veterinário";
}
