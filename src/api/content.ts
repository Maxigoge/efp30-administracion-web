import { apiGet, apiSend, apiUpload } from "./client";
import type {
  CarouselResponse, CourseAdmin, CourseCreateRequest, CoursePhotosResponse, CoursePhotosUpdateRequest,
  CourseUpdateRequest, EditorialStatus, EventAdmin, EventCreateRequest, EventPublic, EventUpdateRequest,
  FamilyAdmin, FamilyCreateRequest, FamilyUpdateRequest, InstitutionAdmin, InstitutionPublic,
  InstitutionUpdateRequest, MediaAdmin, MediaVisibility, Page,
} from "./types";

function params(values: Record<string, string | undefined>) {
  const query = new URLSearchParams({ page: "0", size: "100" });
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") query.set(key, value);
  return query.toString();
}

export const listCourses = (filter: { status?: EditorialStatus; q?: string; familyId?: string } = {}) => apiGet<Page<CourseAdmin>>(`/admin/cursos?${params(filter)}`);
export const createCourse = (body: CourseCreateRequest) => apiSend<CourseAdmin>("/admin/cursos", "POST", body);
export const getCourse = (id: string) => apiGet<CourseAdmin>(`/admin/cursos/${encodeURIComponent(id)}`);
export const updateCourse = (id: string, body: CourseUpdateRequest) => apiSend<CourseAdmin>(`/admin/cursos/${encodeURIComponent(id)}`, "PUT", body);
export const publishCourse = (id: string, version: number) => apiSend<CourseAdmin>(`/admin/cursos/${encodeURIComponent(id)}/publish`, "POST", { version });
export const archiveCourse = (id: string, version: number) => apiSend<CourseAdmin>(`/admin/cursos/${encodeURIComponent(id)}/archive`, "POST", { version });
export const getCoursePhotos = (id: string) => apiGet<CoursePhotosResponse>(`/admin/cursos/${encodeURIComponent(id)}/photos`);
export const replaceCoursePhotos = (id: string, body: CoursePhotosUpdateRequest) => apiSend<CoursePhotosResponse>(`/admin/cursos/${encodeURIComponent(id)}/photos`, "PUT", body);
export const getHomepageCarousel = () => apiGet<CarouselResponse>("/public/portada/carrusel");

export const listFamilies = () => apiGet<Page<FamilyAdmin>>(`/admin/familias?${params({})}`);
export const getFamily = (id: string) => apiGet<FamilyAdmin>(`/admin/familias/${encodeURIComponent(id)}`);
export const createFamily = (body: FamilyCreateRequest) => apiSend<FamilyAdmin>("/admin/familias", "POST", body);
export const updateFamily = (id: string, body: FamilyUpdateRequest) => apiSend<FamilyAdmin>(`/admin/familias/${encodeURIComponent(id)}`, "PUT", body);

export const listEvents = (filter: { status?: EditorialStatus; q?: string } = {}) => apiGet<Page<EventAdmin>>(`/admin/eventos?${params(filter)}`);
export const getEvent = (id: string) => apiGet<EventAdmin>(`/admin/eventos/${encodeURIComponent(id)}`);
export const createEvent = (body: EventCreateRequest) => apiSend<EventAdmin>("/admin/eventos", "POST", body);
export const updateEvent = (id: string, body: EventUpdateRequest) => apiSend<EventAdmin>(`/admin/eventos/${encodeURIComponent(id)}`, "PUT", body);
export const publishEvent = (id: string, version: number) => apiSend<EventAdmin>(`/admin/eventos/${encodeURIComponent(id)}/publish`, "POST", { version });
export const archiveEvent = (id: string, version: number) => apiSend<EventAdmin>(`/admin/eventos/${encodeURIComponent(id)}/archive`, "POST", { version });
export const getPublicEvent = (slug: string) => apiGet<EventPublic>(`/public/eventos/${encodeURIComponent(slug)}`);

export const getInstitution = () => apiGet<InstitutionAdmin>("/admin/institucion");
export const updateInstitution = (body: InstitutionUpdateRequest) => apiSend<InstitutionAdmin>("/admin/institucion", "PUT", body);
export const getPublicInstitution = () => apiGet<InstitutionPublic>("/public/institucion");

export const listMedia = (filter: { q?: string; visibility?: MediaVisibility } = {}) => apiGet<Page<MediaAdmin>>(`/admin/media?${params(filter)}`);
export const uploadMedia = (file: File, visibility: MediaVisibility) => {
  const form = new FormData(); form.append("file", file); form.append("visibility", visibility);
  return apiUpload<MediaAdmin>("/admin/media", form);
};
export const updateMedia = (id: string, body: { version: number; enabled: boolean; visibility: MediaVisibility }) => apiSend<MediaAdmin>(`/admin/media/${encodeURIComponent(id)}`, "PUT", body);
export const getMedia = (id: string) => apiGet<MediaAdmin>("/admin/media/" + encodeURIComponent(id));
export const listPublicEvents = (from: string, to: string) => {
  const query = new URLSearchParams({ from, to, page: "0", size: "100" });
  return apiGet<Page<EventPublic>>(`/public/eventos?${query.toString()}`);
};
