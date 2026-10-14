import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as api from "../api/content";
import { ApiRequestError } from "../api/errors";
import type { InstitutionAdmin, InstitutionUpdateRequest, SocialLink } from "../api/types";
import { ApiError, errorText, isConflict, TextField } from "./ApiFeedback";
import { Icon } from "./Icon";

type InstitutionDraft = Omit<InstitutionAdmin, "version">;
function draftFrom(value: InstitutionAdmin): InstitutionDraft { return { name: value.name, description: value.description, address: value.address, email: value.email, phones: [...value.phones], socialLinks: value.socialLinks.map((link) => ({ ...link })) }; }

export function InstitutionWorkspace() {
  const [institution, setInstitution] = useState<InstitutionAdmin | null>(null);
  const [draft, setDraft] = useState<InstitutionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initial, setInitial] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await api.getInstitution(); setInstitution(response); setDraft(draftFrom(response)); setInitial(false); }
    catch (cause) {
      if (cause instanceof ApiRequestError && cause.failure.status === 503 && cause.failure.code === "INSTITUTION_NOT_CONFIGURED") {
        const blank: InstitutionAdmin = { name: "", description: "", address: "", email: "", phones: [], socialLinks: [], version: 0 };
        setInstitution(blank); setDraft(draftFrom(blank)); setInitial(true); setError(null);
      } else setError(errorText(cause));
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!institution || !draft) return;
    setBusy(true); setError(null); setConflict(false); setSaved(false);
    let response: InstitutionAdmin;
    try {
      response = await api.updateInstitution({ ...draft, version: institution.version } satisfies InstitutionUpdateRequest);
    } catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflict(true); setBusy(false); return; }
    setInstitution(response); setDraft(draftFrom(response)); setInitial(false); setSaved(true);
    try {
      const publicCopy = await api.getPublicInstitution();
      if (publicCopy.name !== response.name || publicCopy.description !== response.description || publicCopy.address !== response.address || publicCopy.email !== response.email || JSON.stringify(publicCopy.phones) !== JSON.stringify(response.phones) || JSON.stringify(publicCopy.socialLinks) !== JSON.stringify(response.socialLinks)) setError("Se guardó en administración, pero la lectura pública todavía devuelve otros datos.");
    } catch (cause) { setError(`Se guardó la institución, pero no se pudo comprobar la ruta pública: ${errorText(cause)}`); }
    finally { setBusy(false); }
  }
  function patch<K extends keyof InstitutionDraft>(key: K, value: InstitutionDraft[K]) { setDraft((current) => current ? { ...current, [key]: value } : current); }
  function setPhone(index: number, value: string) { patch("phones", (draft?.phones ?? []).map((item, i) => i === index ? value : item)); }
  function setSocial(index: number, key: keyof SocialLink, value: string) { patch("socialLinks", (draft?.socialLinks ?? []).map((item, i) => i === index ? { ...item, [key]: value } : item)); }

  if (loading) return <div className="records-panel records-empty">Consultando datos institucionales…</div>;
  return <div className="workspace-section">
    {error && <ApiError error={error} onRetry={conflict ? () => { void refresh(); setConflict(false); } : undefined} />}
    {initial && <div className="success-notice institution-initial-note" role="status"><Icon name="shield" size={17} />Todavía no hay datos institucionales. La primera escritura usa la versión 0 del contrato.</div>}
    {saved && !error && <div className="success-notice" role="status"><Icon name="shield" size={17} />Los datos se guardaron y la ruta pública devuelve la misma institución.</div>}
    {!draft || !institution ? <section className="records-panel records-empty"><h2>No se pudieron cargar los datos</h2><p>El servicio requiere permiso ADMIN para la lectura de administración.</p><button className="button button--secondary" onClick={() => { void refresh(); }}>Reintentar</button></section> : <form className="editor-panel" onSubmit={(event) => { void submit(event); }} key={institution.version}>
      <div className="editor-panel__heading"><div><p className="eyebrow">SÓLO ADMIN</p><h2>Institución y contacto</h2><p>{initial ? "Completá los datos iniciales; sólo ADMIN puede guardarlos." : `Los permisos se vuelven a verificar en el backend. Versión ${institution.version}.`}</p></div><button type="button" className="quiet-button" onClick={() => { void refresh(); }}>Descartar y recargar</button></div>
      <div className="form-grid"><TextField label="Nombre"><input required maxLength={180} value={draft.name} onChange={(event) => patch("name", event.target.value)} /></TextField><TextField label="Email público"><input type="email" required maxLength={254} value={draft.email} onChange={(event) => patch("email", event.target.value)} /></TextField><TextField label="Dirección"><input maxLength={240} value={draft.address} onChange={(event) => patch("address", event.target.value)} /></TextField><TextField label="Descripción" wide><textarea maxLength={4000} rows={5} value={draft.description} onChange={(event) => patch("description", event.target.value)} /></TextField>
        <div className="form-field form-field--wide"><div className="repeat-heading"><span>Teléfonos</span><button type="button" className="quiet-button" disabled={draft.phones.length >= 10} onClick={() => patch("phones", [...draft.phones, ""])}>Agregar teléfono</button></div>{draft.phones.map((phone, index) => <div className="repeat-row" key={index}><input maxLength={40} value={phone} aria-label={`Teléfono ${index + 1}`} onChange={(event) => setPhone(index, event.target.value)} /><button type="button" className="quiet-button danger-text" onClick={() => patch("phones", draft.phones.filter((_, i) => i !== index))}>Quitar</button></div>)}</div>
        <div className="form-field form-field--wide"><div className="repeat-heading"><span>Redes sociales</span><button type="button" className="quiet-button" disabled={draft.socialLinks.length >= 20} onClick={() => patch("socialLinks", [...draft.socialLinks, { label: "", url: "https://" }])}>Agregar enlace</button></div>{draft.socialLinks.map((link, index) => <div className="repeat-row repeat-row--social" key={index}><input required maxLength={60} value={link.label} aria-label={`Etiqueta de red social ${index + 1}`} placeholder="Etiqueta" onChange={(event) => setSocial(index, "label", event.target.value)} /><input required type="url" pattern="https://.+" value={link.url} aria-label={`URL de red social ${index + 1}`} placeholder="https://…" onChange={(event) => setSocial(index, "url", event.target.value)} /><button type="button" className="quiet-button danger-text" onClick={() => patch("socialLinks", draft.socialLinks.filter((_, i) => i !== index))}>Quitar</button></div>)}</div>
      </div><div className="editor-actions"><button type="submit" className="button button--primary" disabled={busy}>{busy ? "Guardando…" : "Guardar institución"}</button></div>
    </form>}
  </div>;
}
