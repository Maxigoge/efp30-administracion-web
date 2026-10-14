import type { AdminRole, SessionUser } from "../api/types";
export type { AdminRole, SessionUser };
export type AdminUser = SessionUser;
export const roleLabels: Record<AdminRole, string> = { ADMIN: "Administrador", EDITOR: "Editor" };
export function hasRole(user: SessionUser, role: AdminRole): boolean { return user.roles.includes(role); }
export function canManageAdministration(user: SessionUser): boolean { return hasRole(user, "ADMIN"); }
