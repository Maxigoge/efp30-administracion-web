import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiBlob } from "../api/client";
import * as api from "../api/content";
import { ApiError, errorText, isConflict } from "./ApiFeedback";
import { Icon } from "./Icon";
import type { MediaAdmin, MediaVisibility } from "../api/types";

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
function validate(file: File) {
  if (![...imageTypes, "application/pdf"].includes(file.type)) throw new Error("Formato no admitido. Elegí JPEG, PNG, WebP o PDF.");
  const limit = file.type === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size < 1 || file.size > limit) throw new Error(file.type === "application/pdf" ? "El PDF debe pesar como máximo 10 MiB." : "La imagen debe pesar como máximo 5 MiB.");
}

export function MediaWorkspace() {
  const [items, setItems] = useState<MediaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictedId, setConflictedId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<MediaVisibility>("PUBLIC");
  const [uploadCount, setUploadCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { const page = await api.listMedia(); setItems(page.items); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function upload(files: FileList | null, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!files?.length) return;
    setBusy("upload"); setError(null); setUploadCount(files.length);
    try {
      const uploaded: MediaAdmin[] = [];
      for (const file of Array.from(files)) { validate(file); uploaded.push(await api.uploadMedia(file, visibility)); }
      setItems((current) => [...uploaded, ...current]);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); setUploadCount(0); }
  }
  async function update(item: MediaAdmin, next: { enabled: boolean; visibility: MediaVisibility }) {
    setBusy(item.id); setError(null); setConflictedId(null);
    try { const updated = await api.updateMedia(item.id, { version: item.version, ...next }); setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry)); }
    catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflictedId(item.id); }
    finally { setBusy(null); }
  }
  async function reloadConflict() {
    await refresh(); setConflictedId(null);
  }
  async function download(item: MediaAdmin) {
    setBusy(item.id); setError(null);
    try {
      const blob = await apiBlob(`/admin/media/${encodeURIComponent(item.id)}/content`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.originalName; anchor.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }

  return <div className="workspace-section">
    {error && <ApiError error={error} onRetry={conflictedId ? () => { void reloadConflict(); } : undefined} />}
    <form className="upload-panel" onSubmit={(event) => { const input = event.currentTarget.elements.namedItem("files") as HTMLInputElement; void upload(input.files, event); }}>
      <div><p className="eyebrow">BIBLIOTECA COMPARTIDA</p><h2>Subir archivos</h2><p>La API vuelve a validar extensión, tipo real y tamaño del archivo.</p></div>
      <label className="form-field">Visibilidad<select value={visibility} onChange={(event) => setVisibility(event.target.value as MediaVisibility)}><option value="PUBLIC">Pública</option><option value="PRIVATE">Privada</option></select></label>
      <label className="button button--secondary upload-label"><Icon name="plus" size={17} /> Elegir archivos<input name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" required /></label>
      <button className="button button--primary" disabled={busy === "upload"}>{busy === "upload" ? `Subiendo ${uploadCount}…` : "Subir"}</button>
      <small>JPEG, PNG o WebP hasta 5 MiB. PDF hasta 10 MiB.</small>
    </form>
    <section className="records-panel"><div className="records-heading"><div><h2>Medios</h2><p>{loading ? "Consultando la API…" : `${items.length} archivos`}</p></div><button type="button" className="quiet-button" onClick={() => { void refresh(); }} disabled={loading}><Icon name="arrow" size={15} /> Actualizar</button></div>
      {loading ? <p className="records-empty">Cargando biblioteca…</p> : items.length === 0 ? <p className="records-empty">Todavía no hay archivos.</p> : <div className="media-grid">{items.map((item) => <article className="media-card" key={item.id}><div className="media-card__preview">{item.mimeType.startsWith("image/") && item.url ? <img src={item.url} alt="" /> : <Icon name={item.mimeType === "application/pdf" ? "file" : "media"} size={30} />}</div><div className="media-card__body"><strong title={item.originalName}>{item.originalName}</strong><small>{item.mimeType} · {formatSize(item.sizeBytes)}</small><span className={`status-tag ${item.visibility === "PUBLIC" ? "status-tag--published" : "status-tag--archived"}`}>{item.visibility === "PUBLIC" ? "Pública" : "Privada"} · {item.enabled ? "Habilitada" : "Deshabilitada"}</span><small>v{item.version}</small><div className="media-actions">{item.visibility === "PRIVATE" && <button className="quiet-button" type="button" disabled={busy === item.id} onClick={() => { void download(item); }}>Descargar</button>}<button className="quiet-button" type="button" disabled={busy === item.id} onClick={() => { void update(item, { visibility: item.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC", enabled: item.enabled }); }}>{item.visibility === "PUBLIC" ? "Hacer privada" : "Hacer pública"}</button><button className="quiet-button" type="button" disabled={busy === item.id} onClick={() => { void update(item, { visibility: item.visibility, enabled: !item.enabled }); }}>{item.enabled ? "Deshabilitar" : "Habilitar"}</button></div></div></article>)}</div>}
    </section>
  </div>;
}
function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KiB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
