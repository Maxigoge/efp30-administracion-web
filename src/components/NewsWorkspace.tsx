import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiRequestError } from "../api/errors";
import * as newsApi from "../api/news";
import type { EditorialStatus, NewsAdmin, NewsCreateRequest, NewsFields, NewsPublic } from "../api/types";
import { Icon } from "./Icon";

const filters: { label: string; value?: EditorialStatus }[] = [
  { label: "Todas" }, { label: "Borradores", value: "DRAFT" },
  { label: "Publicadas", value: "PUBLISHED" }, { label: "Archivadas", value: "ARCHIVED" },
];
const statusLabels: Record<EditorialStatus, string> = { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" };
type Draft = NewsFields & { slug: string };
const emptyDraft = (): Draft => ({ slug: "", title: "", summary: "", bodyMarkdown: "", category: "Institucional", featured: false, coverMediaId: null });
function toDraft(item: NewsAdmin): Draft { return { slug: item.slug, title: item.title, summary: item.summary, bodyMarkdown: item.bodyMarkdown, category: item.category, featured: item.featured, coverMediaId: item.coverMediaId ?? null }; }
const messageOf = (error: unknown) => error instanceof ApiRequestError ? error.failure.message : error instanceof Error ? error.message : "No se pudo completar la operación.";

export function NewsWorkspace() {
  const [status, setStatus] = useState<EditorialStatus | undefined>();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [items, setItems] = useState<NewsAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldIssues, setFieldIssues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<NewsAdmin | null>(null);
  const [creating, setCreating] = useState(false);
  const [publicCheck, setPublicCheck] = useState<{ text: string; item?: NewsPublic } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { const page = await newsApi.listNews({ status, q: submittedQuery }); setItems(page.items); }
    catch (cause) { setError(messageOf(cause)); }
    finally { setLoading(false); }
  }, [status, submittedQuery]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function save(input: Draft, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save"); setError(null); setFieldIssues({});
    try {
      if (editing) await newsApi.updateNews(editing.id, { ...input, version: editing.version });
      else await newsApi.createNewsDraft(input as NewsCreateRequest);
      setEditing(null); setCreating(false); await refresh();
    } catch (cause) {
      setError(messageOf(cause));
      if (cause instanceof ApiRequestError) setFieldIssues(Object.fromEntries(cause.failure.fields.map((field) => [field.field, field.message])));
    }
    finally { setBusy(null); }
  }
  async function runAction(item: NewsAdmin, action: "publish" | "archive") {
    setBusy(item.id); setError(null); setPublicCheck(null);
    try {
      const updated = action === "publish" ? await newsApi.publishNews(item.id, item.version) : await newsApi.archiveNews(item.id, item.version);
      await refresh();
      try {
        const visible = await newsApi.getPublicNews(updated.slug);
        setPublicCheck({ text: `La ruta pública de la API responde con la noticia “${visible.title}”.`, item: visible });
      } catch (cause) {
        if (action === "archive" && cause instanceof ApiRequestError && cause.failure.status === 404) setPublicCheck({ text: `La ruta pública de la API devuelve 404 para “${updated.slug}”; quedó retirada.` });
        else setError(`La operación se guardó, pero no se pudo comprobar la ruta pública: ${messageOf(cause)}`);
      }
    } catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(null); }
  }
  async function reloadLatest() {
    if (!editing) return;
    setBusy("reload");
    try { const latest = await newsApi.getNews(editing.id); setEditing(latest); }
    catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(null); }
  }

  return <div className="workspace-section">
    <div className="module-toolbar">
      <form className="module-search" onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(query); }}><Icon name="search" size={17} /><input type="search" placeholder="Buscar noticias" aria-label="Buscar noticias" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="quiet-button" type="submit">Buscar</button></form>
      <button className="button button--primary" onClick={() => { setCreating(true); setEditing(null); setError(null); }}><Icon name="plus" size={17} /> Nuevo borrador</button>
    </div>
    <div className="news-tabs" aria-label="Estado de noticias">{filters.map((filter) => <button key={filter.label} className={(status === filter.value ? "news-tab news-tab--active" : "news-tab")} onClick={() => setStatus(filter.value)}>{filter.label}</button>)}</div>
    {error && <div className="inline-error" role="alert"><span>{error}</span>{error.includes("version") || error.includes("cambió") ? <button onClick={() => { void reloadLatest(); }}>Recargar última versión</button> : null}</div>}
    {publicCheck && <div className="success-notice" role="status"><Icon name="shield" size={17} /><span>{publicCheck.text}</span></div>}
    {(creating || editing) && <NewsEditor key={`${editing?.id ?? "new"}-${editing?.version ?? 0}`} item={editing} busy={busy === "save"} fieldIssues={fieldIssues} onCancel={() => { setCreating(false); setEditing(null); }} onSave={save} />}
    <section className="records-panel">
      <div className="records-heading"><div><h2>Noticias</h2><p>{loading ? "Consultando la API…" : `${items.length} resultados`}</p></div><button className="quiet-button" onClick={() => { void refresh(); }} disabled={loading}><Icon name="arrow" size={15} /> Actualizar</button></div>
      {loading ? <p className="records-empty">Cargando contenido…</p> : items.length === 0 ? <p className="records-empty">No hay noticias para este filtro.</p> : <div className="records-list">{items.map((item) => <article className="record-row" key={item.id}>
        <div className="record-row__main"><span className={`status-tag status-tag--${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span><h3>{item.title}</h3><p>{item.summary}</p><small>/{item.slug} · v{item.version} · {item.category}</small></div>
        <div className="record-row__actions"><button className="quiet-button" onClick={() => { setEditing(item); setCreating(false); setError(null); }}>Editar</button>{item.status === "DRAFT" && <button className="button button--primary button--small" onClick={() => { void runAction(item, "publish"); }} disabled={busy === item.id}>Publicar</button>}{item.status !== "ARCHIVED" && <button className="quiet-button danger-text" onClick={() => { void runAction(item, "archive"); }} disabled={busy === item.id}>Archivar</button>}</div>
      </article>)}</div>}
    </section>
  </div>;
}

function NewsEditor({ item, busy, fieldIssues, onCancel, onSave }: { item: NewsAdmin | null; busy: boolean; fieldIssues: Record<string, string>; onCancel: () => void; onSave: (draft: Draft, event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>(item ? toDraft(item) : emptyDraft());
  const [issues, setIssues] = useState(fieldIssues);
  useEffect(() => setIssues(fieldIssues), [fieldIssues]);
  function field<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); setIssues((current) => ({ ...current, [key]: "" })); }
  return <form className="editor-panel" onSubmit={(event) => { void onSave(draft, event); }}>
    <div className="editor-panel__heading"><div><p className="eyebrow">{item ? "EDITAR CONTENIDO" : "NUEVO CONTENIDO"}</p><h2>{item ? "Editar noticia" : "Guardar borrador"}</h2><p>Los cambios se guardan con control de versión para no pisar el trabajo de otra persona.</p></div><button className="icon-button" type="button" aria-label="Cerrar editor" onClick={onCancel}><Icon name="close" /></button></div>
    <div className="form-grid"><Field label="Título" error={issues.title}><input required maxLength={180} value={draft.title} onChange={(event) => field("title", event.target.value)} /></Field><Field label="Slug" error={issues.slug}><input required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => field("slug", event.target.value)} disabled={Boolean(item)} /><small>Solo minúsculas, números y guiones.</small></Field>
      <Field label="Resumen" error={issues.summary} wide><textarea required maxLength={400} rows={3} value={draft.summary} onChange={(event) => field("summary", event.target.value)} /></Field><Field label="Categoría" error={issues.category}><input required maxLength={60} value={draft.category} onChange={(event) => field("category", event.target.value)} /></Field><Field label="Medio de portada (ID opcional)" error={issues.coverMediaId}><input value={draft.coverMediaId ?? ""} onChange={(event) => field("coverMediaId", event.target.value || null)} placeholder="UUID de un medio público" /></Field><Field label="Contenido Markdown" error={issues.bodyMarkdown} wide><textarea required maxLength={50000} rows={10} value={draft.bodyMarkdown} onChange={(event) => field("bodyMarkdown", event.target.value)} /></Field>
      <label className="checkbox-field"><input type="checkbox" checked={draft.featured} onChange={(event) => field("featured", event.target.checked)} /> Destacar en el sitio</label></div>
    <div className="editor-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancelar</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? "Guardando…" : item ? "Guardar cambios" : "Guardar borrador"}</button></div>
  </form>;
}
function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: ReactNode }) { return <label className={`form-field${wide ? " form-field--wide" : ""}`}>{label}{children}{error && <small className="field-error">{error}</small>}</label>; }
