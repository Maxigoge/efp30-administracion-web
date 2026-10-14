import { apiGet, apiSend } from "./client";
import type { AdminUser, Page, ResetPasswordRequest, UserCreateRequest, UserUpdateRequest } from "./types";
const pageQuery = new URLSearchParams({ page: "0", size: "100" });
export const listUsers = () => apiGet<Page<AdminUser>>(`/admin/users?${pageQuery}`);
export const getUser = (id: string) => apiGet<AdminUser>(`/admin/users/${encodeURIComponent(id)}`);
export const createUser = (body: UserCreateRequest) => apiSend<AdminUser>("/admin/users", "POST", body);
export const updateUser = (id: string, body: UserUpdateRequest) => apiSend<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, "PUT", body);
export const resetUserPassword = (id: string, body: ResetPasswordRequest) => apiSend<void>(`/admin/users/${encodeURIComponent(id)}/password`, "POST", body);
