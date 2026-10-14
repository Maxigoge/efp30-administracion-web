import { apiGet, apiSend } from "./client";
import type { EditorialStatus, NewsAdmin, NewsCreateRequest, NewsPublic, NewsUpdateRequest, Page } from "./types";

export interface NewsListFilters { status?: EditorialStatus; q?: string; }
const query = (filters: NewsListFilters) => {
  const params = new URLSearchParams({ page: "0", size: "100" });
  if (filters.status) params.set("status", filters.status);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  return params.toString();
};
export const listNews = (filters: NewsListFilters = {}) => apiGet<Page<NewsAdmin>>(`/admin/noticias?${query(filters)}`);
export const getNews = (id: string) => apiGet<NewsAdmin>(`/admin/noticias/${encodeURIComponent(id)}`);
export const createNewsDraft = (input: NewsCreateRequest) => apiSend<NewsAdmin>("/admin/noticias", "POST", input);
export const updateNews = (id: string, input: NewsUpdateRequest) => apiSend<NewsAdmin>(`/admin/noticias/${encodeURIComponent(id)}`, "PUT", input);
export const publishNews = (id: string, version: number) => apiSend<NewsAdmin>(`/admin/noticias/${encodeURIComponent(id)}/publish`, "POST", { version });
export const archiveNews = (id: string, version: number) => apiSend<NewsAdmin>(`/admin/noticias/${encodeURIComponent(id)}/archive`, "POST", { version });
export const getPublicNews = (slug: string) => apiGet<NewsPublic>(`/public/noticias/${encodeURIComponent(slug)}`);
