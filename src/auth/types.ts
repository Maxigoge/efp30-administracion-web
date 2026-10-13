export type AdminRole = "ADMIN" | "EDITOR";
export interface AdminUser { id: string; displayName: string; email: string; role: AdminRole; }
export interface AuthGateway {
  restoreSession(): Promise<AdminUser | null>;
  login(email: string, password: string): Promise<AdminUser>;
  logout(): Promise<void>;
  csrfHeaders(): Promise<HeadersInit>;
}
export const roleLabels: Record<AdminRole, string> = { ADMIN: "Administrador", EDITOR: "Editor" };
export function canManageAdministration(user: AdminUser): boolean { return user.role === "ADMIN"; }
