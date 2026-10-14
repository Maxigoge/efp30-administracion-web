/* Derived from contracts/openapi-v1.yaml, source commit 86682e93ab108f2484a75aa73f4888ecc72555b7. */
export type UUID = string;
export type DateTimeWithOffset = string;
export type EditorialStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AdminRole = "ADMIN" | "EDITOR";
export type Modality = "PRESENTIAL" | "ONLINE" | "HYBRID";
export type EnrollmentStatus = "CONSULTATION" | "OPEN" | "CLOSED";
export type MediaVisibility = "PUBLIC" | "PRIVATE";
export interface FieldError { field: string; message: string; }
export interface Problem {
  type: string; title: string; status: number; detail: string; instance: string;
  code: string; fieldErrors: FieldError[];
}
export interface Page<T> { items: T[]; page: number; size: number; totalItems: number; totalPages: number; }
export interface VersionRequest { version: number; }

export interface NewsFields {
  title: string; summary: string; bodyMarkdown: string; category: string;
  featured: boolean; coverMediaId?: UUID | null;
}
export interface NewsAdmin extends NewsFields {
  id: UUID; slug: string; status: EditorialStatus; publishedAt: DateTimeWithOffset | null;
  createdAt: DateTimeWithOffset; updatedAt: DateTimeWithOffset; version: number;
}
export interface NewsCreateRequest extends NewsFields { slug: string; }
export interface NewsUpdateRequest extends NewsFields { version: number; }
export interface NewsPublic extends Omit<NewsFields, "coverMediaId"> {
  id: UUID; slug: string; coverUrl: string | null; publishedAt: DateTimeWithOffset;
}
export interface NewsPublicSummary {
  id: UUID; slug: string; title: string; summary: string; coverUrl: string | null;
  category: string; featured: boolean; publishedAt: DateTimeWithOffset;
}

export interface FamilyPublic { id: UUID; slug: string; name: string; }
export interface FamilyAdmin extends FamilyPublic { active: boolean; version: number; }
export interface FamilyCreateRequest { slug: string; name: string; }
export interface FamilyUpdateRequest { version: number; name: string; active: boolean; }

export interface FamilyRef { id: UUID; slug: string; name: string; }
export interface CourseFields {
  title: string; familyId: UUID; summary: string; bodyMarkdown: string;
  requirements: string[]; durationHours?: number | null; modality: Modality;
  enrollmentStatus: EnrollmentStatus; coverMediaId?: UUID | null;
}
export interface CourseAdmin extends CourseFields {
  id: UUID; slug: string; status: EditorialStatus; publishedAt: DateTimeWithOffset | null;
  createdAt: DateTimeWithOffset; updatedAt: DateTimeWithOffset; version: number;
}
export interface CourseCreateRequest extends CourseFields { slug: string; }
export interface CourseUpdateRequest extends CourseFields { version: number; }
export interface CoursePhotoPublic { id: UUID; imageUrl: string; alt: string; position: number; }
export interface CoursePublic extends Omit<CourseFields, "familyId" | "coverMediaId"> {
  id: UUID; slug: string; family: FamilyRef; coverUrl: string | null; photos: CoursePhotoPublic[];
}
export interface CourseSummary {
  id: UUID; slug: string; title: string; family: FamilyRef; summary: string;
  durationHours: number | null; modality: Modality; enrollmentStatus: EnrollmentStatus; coverUrl: string | null;
}
export interface CoursePhoto {
  id: UUID | null; mediaId: UUID; alt: string; position: number;
  enabled: boolean; showOnHomepage: boolean;
}
export interface CoursePhotosResponse { courseId: UUID; version: number; photos: CoursePhoto[]; }
export interface CoursePhotosUpdateRequest { version: number; photos: CoursePhoto[]; }

export interface EventFields {
  title: string; description: string; startsAt: DateTimeWithOffset; endsAt: DateTimeWithOffset;
  timezone: "America/Argentina/Buenos_Aires"; location: string; allDay: boolean;
}
export interface EventAdmin extends EventFields {
  id: UUID; slug: string; status: EditorialStatus; publishedAt: DateTimeWithOffset | null;
  createdAt: DateTimeWithOffset; updatedAt: DateTimeWithOffset; version: number;
}
export interface EventCreateRequest extends EventFields { slug: string; }
export interface EventUpdateRequest extends EventFields { version: number; }
export interface EventPublic extends Omit<EventFields, "timezone"> {
  id: UUID; slug: string; timezone: string;
}

export interface SocialLink { label: string; url: string; }
export interface InstitutionFields {
  name: string; description: string; address: string; email: string;
  phones: string[]; socialLinks: SocialLink[];
}
export interface InstitutionPublic extends InstitutionFields {}
export interface InstitutionAdmin extends InstitutionFields { version: number; }
export interface InstitutionUpdateRequest extends InstitutionFields { version: number; }

export interface CarouselItem {
  id: UUID; courseId: UUID; courseSlug: string; courseTitle: string;
  mediaId: UUID; imageUrl: string; alt: string; position: number;
}
export interface CarouselResponse { items: CarouselItem[]; }
export interface MediaAdmin {
  id: UUID; originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number; visibility: MediaVisibility; enabled: boolean; url: string | null; version: number;
}
export interface MediaUpdateRequest { version: number; enabled: boolean; visibility: MediaVisibility; }

export interface CsrfToken { token: string; headerName: "X-CSRF-TOKEN"; }
export interface LoginRequest { email: string; password: string; }
export interface SessionUser { id: UUID; displayName: string; email: string; roles: AdminRole[]; }
export interface SessionResponse { user: SessionUser; }
export interface AdminUser extends SessionUser {
  enabled: boolean; createdAt: DateTimeWithOffset; version: number;
}
export interface UserCreateRequest {
  displayName: string; email: string; password: string; roles: AdminRole[];
}
export interface UserUpdateRequest {
  version: number; displayName: string; roles: AdminRole[]; enabled: boolean;
}
export interface ChangePasswordRequest { currentPassword: string; newPassword: string; }
export interface ResetPasswordRequest { version: number; newPassword: string; }
