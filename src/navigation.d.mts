export type SectionKey = "inicio" | "noticias" | "cursos" | "calendario" | "institucion" | "medios" | "usuarios";

export interface AdminRoute {
  section: SectionKey;
  path: string;
  hash: string;
  newsView?: "new" | "edit";
  newsId?: string;
  courseView?: "new" | "edit" | "gallery";
  courseId?: string;
}

export interface AdminHistory {
  readonly route: AdminRoute;
  navigate(hash: string, options?: { replace?: boolean }): boolean;
  replace(hash: string): AdminRoute;
  dispose(): void;
}

export function parseAdminHash(hash: string): AdminRoute;
export function sectionHash(section: SectionKey): string;
export function newsEditorHash(id?: string): string;
export function courseEditorHash(id?: string, view?: "edit" | "gallery"): string;
export function createAdminHistory(options?: {
  target?: Window;
  onRoute?: (route: AdminRoute) => void;
  canNavigate?: (current: AdminRoute, next: AdminRoute) => boolean;
}): AdminHistory;
