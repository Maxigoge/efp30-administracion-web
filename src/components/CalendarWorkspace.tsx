import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import * as api from "../api/content";
import { ApiRequestError } from "../api/errors";
import type { EditorialStatus, EventAdmin, EventPublic } from "../api/types";
import { ApiError, errorText, isConflict, TextField } from "./ApiFeedback";
import { Icon } from "./Icon";

const TZ = "America/Argentina/Buenos_Aires" as const;
const stateFilters: { label: string; value?: EditorialStatus }[] = [{ label: "Todos" }, { label: "Borradores", value: "DRAFT" }, { label: "Publicados", value: "PUBLISHED" }, { label: "Archivados", value: "ARCHIVED" }];
const stateLabel: Record<EditorialStatus, string> = { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" };
type EventDraft = { slug: string; title: string; description: string; startsAt: string; endsAt: string; location: string; allDay: boolean };
function zonedNowParts(date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
function wallTime(date: Date, allDay: boolean) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = `${values.year}-${values.month}-${values.day}`;
  return allDay ? day : `${day}T${values.hour}:${values.minute}`;
}
function toOffsetIso(value: string) {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error("Completá una fecha y hora válida.");
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(naiveUtc));
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  const wallAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
  const offsetMinutes = Math.round((wallAsUtc - naiveUtc) / 60000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
  return `${datePart}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`;
}
function blankEvent(): EventDraft { const today = zonedNowParts(); return { slug: "", title: "", description: "", startsAt: `${today}T09:00`, endsAt: `${today}T10:00`, location: "", allDay: false }; }
function draftFrom(item: EventAdmin): EventDraft { return { slug: item.slug, title: item.title, description: item.description, startsAt: wallTime(new Date(item.startsAt), item.allDay), endsAt: wallTime(new Date(item.endsAt), item.allDay), location: item.location, allDay: item.allDay }; }
function monthIsoRange(month: string) { const first = `${month}-01T00:00`; const [year, monthNumber] = month.split("-").map(Number); const nextDate = new Date(Date.UTC(year, monthNumber, 1)); const nextMonth = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-01T00:00`; return { from: toOffsetIso(first), to: toOffsetIso(nextMonth) }; }
function dateKey(iso: string) { return wallTime(new Date(iso), true); }
function shiftDate(day: string, amount: number) { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarWorkspace() {
  const initialMonth = zonedNowParts().slice(0, 7);
  const [month, setMonth] = useState(initialMonth);
  const [status, setStatus] = useState<EditorialStatus | undefined>();
  const [items, setItems] = useState<EventAdmin[]>([]);
  const [publicItems, setPublicItems] = useState<EventPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EventAdmin | null>(null);
  const [check, setCheck] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const range = monthIsoRange(month);
      const [adminPage, publicPage] = await Promise.all([api.listEvents({ status }), api.listPublicEvents(range.from, range.to)]);
      setItems(adminPage.items); setPublicItems(publicPage.items);
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, [status, month]);
  useEffect(() => { void refresh(); }, [refresh]);
  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number); const firstDow = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay(); const leading = (firstDow + 6) % 7; const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return [...Array.from({ length: leading }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventPublic[]>();
    for (const event of publicItems) {
      const start = dateKey(event.startsAt); const end = dateKey(event.endsAt); const last = event.allDay ? shiftDate(end, -1) : end;
      for (let key = start, guard = 0; key <= last && guard < 32; key = shiftDate(key, 1), guard++) map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [publicItems]);

  async function save(draft: EventDraft, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("save"); setError(null); setConflict(false);
    try {
      const startsAt = toOffsetIso(draft.startsAt); const endsAt = toOffsetIso(draft.endsAt);
      if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error("La fecha de fin debe ser posterior al inicio. Para eventos de día completo, el fin es exclusivo.");
      const fields = { title: draft.title.trim(), description: draft.description.trim(), startsAt, endsAt, timezone: TZ, location: draft.location.trim(), allDay: draft.allDay };
      if (editing) await api.updateEvent(editing.id, { ...fields, version: editing.version });
      else await api.createEvent({ ...fields, slug: draft.slug.trim() });
      setEditing(null); setCreating(false); await refresh();
    } catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflict(true); }
    finally { setBusy(null); }
  }
  async function reloadLatest() { if (!editing) return; setBusy("reload"); try { setEditing(await api.getEvent(editing.id)); setConflict(false); } catch (cause) { setError(errorText(cause)); } finally { setBusy(null); } }
  async function changeState(item: EventAdmin, action: "publish" | "archive") {
    setBusy(item.id); setError(null); setCheck(null);
    try {
      const updated = action === "publish" ? await api.publishEvent(item.id, item.version) : await api.archiveEvent(item.id, item.version);
      await refresh();
      try { const publicEvent = await api.getPublicEvent(updated.slug); setCheck(`La ruta pública responde con “${publicEvent.title}”.`); }
      catch (cause) { if (action === "archive" && cause instanceof ApiRequestError && cause.failure.status === 404) setCheck(`La ruta pública devuelve 404 para “${updated.slug}”; el evento quedó retirado.`); else setError(`Se guardó, pero no se pudo consultar la ruta pública: ${errorText(cause)}`); }
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  function shiftMonth(direction: number) { const [year, mon] = month.split("-").map(Number); const date = new Date(Date.UTC(year, mon - 1 + direction, 1)); setMonth(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`); }

  return <div className="workspace-section">
    {error && <ApiError error={error} onRetry={conflict ? () => { void reloadLatest(); } : undefined} />}
    {check && <div className="success-notice" role="status"><Icon name="shield" size={17} />{check}</div>}
    <div className="calendar-layout">
      <section className="calendar-panel panel"><div className="calendar-heading"><div><p className="eyebrow">AGENDA INSTITUCIONAL · {TZ}</p><h2>Calendario publicado</h2></div><button className="button button--primary" onClick={() => { setCreating(true); setEditing(null); }}><Icon name="plus" size={17} /> Nuevo evento</button></div>
        <div className="calendar-month"><button onClick={() => shiftMonth(-1)} aria-label="Mes anterior">‹</button><strong>{new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: TZ }).format(new Date(`${month}-15T12:00:00Z`))}</strong><button onClick={() => shiftMonth(1)} aria-label="Mes siguiente">›</button></div>
        <div className="calendar-grid">{weekdayLabels.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{days.map((day, index) => { const key = day ? `${month}-${String(day).padStart(2, "0")}` : `blank-${index}`; const events = day ? eventsByDay.get(key) ?? [] : []; return <div className={`calendar-day${day ? " calendar-day--active" : " calendar-day--blank"}`} key={key}>{day && <><span>{day}</span>{events.slice(0, 2).map((event) => <small key={event.id} title={event.title}>{event.title}</small>)}</>}</div>; })}</div>
        <div className="calendar-empty"><Icon name="calendar" size={18} /><span>{loading ? "Actualizando agenda pública…" : `${publicItems.length} eventos publicados en este mes`}</span></div>
      </section>
      <aside className="calendar-side panel"><div className="records-heading"><div><p className="eyebrow">ADMINISTRACIÓN</p><h3>Estados editoriales</h3></div><button className="quiet-button" onClick={() => { void refresh(); }} disabled={loading}>Actualizar</button></div><div className="news-tabs">{stateFilters.map((filter) => <button key={filter.label} className={status === filter.value ? "news-tab news-tab--active" : "news-tab"} onClick={() => setStatus(filter.value)}>{filter.label}</button>)}</div><div className="calendar-admin-list">{loading ? "Consultando eventos…" : items.length === 0 ? "No hay eventos en este estado." : items.map((item) => <article className="calendar-admin-row" key={item.id}><span className={`status-tag status-tag--${item.status.toLowerCase()}`}>{stateLabel[item.status]}</span><strong>{item.title}</strong><small>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: item.allDay ? undefined : "short", timeZone: TZ }).format(new Date(item.startsAt))} · v{item.version}</small><div><button className="quiet-button" onClick={() => { setEditing(item); setCreating(false); }}>Editar</button>{item.status === "DRAFT" && <button className="quiet-button" disabled={busy === item.id} onClick={() => { void changeState(item, "publish"); }}>Publicar</button>}{item.status !== "ARCHIVED" && <button className="quiet-button danger-text" disabled={busy === item.id} onClick={() => { void changeState(item, "archive"); }}>Archivar</button>}</div></article>)}</div></aside>
    </div>
    {(creating || editing) && <EventEditor key={`${editing?.id ?? "new"}-${editing?.version ?? 0}`} item={editing} busy={busy === "save"} onSave={save} onCancel={() => { setCreating(false); setEditing(null); }} />}
  </div>;
}

function EventEditor({ item, busy, onSave, onCancel }: { item: EventAdmin | null; busy: boolean; onSave: (draft: EventDraft, event: FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<EventDraft>(item ? draftFrom(item) : blankEvent());
  function field<K extends keyof EventDraft>(key: K, value: EventDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  return <form className="editor-panel" onSubmit={(event) => { void onSave(draft, event); }}><div className="editor-panel__heading"><div><p className="eyebrow">EVENTO · {TZ}</p><h2>{item ? "Editar evento" : "Crear borrador"}</h2><p>La zona y el offset se calculan para America/Argentina/Buenos_Aires. El fin de día completo es exclusivo.</p></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar"><Icon name="close" /></button></div>
    <div className="form-grid"><TextField label="Título"><input required maxLength={180} value={draft.title} onChange={(event) => field("title", event.target.value)} /></TextField><TextField label="Slug"><input required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" disabled={Boolean(item)} value={draft.slug} onChange={(event) => field("slug", event.target.value)} /></TextField><TextField label="Ubicación"><input required maxLength={240} value={draft.location} onChange={(event) => field("location", event.target.value)} /></TextField><label className="checkbox-field"><input type="checkbox" checked={draft.allDay} onChange={(event) => { const enabled = event.target.checked; setDraft((current) => ({ ...current, allDay: enabled, startsAt: enabled ? current.startsAt.slice(0, 10) : `${current.startsAt.slice(0, 10)}T00:00`, endsAt: enabled ? (current.endsAt.slice(0, 10) === current.startsAt.slice(0, 10) ? shiftDate(current.endsAt.slice(0, 10), 1) : current.endsAt.slice(0, 10)) : `${current.endsAt.slice(0, 10)}T00:00` })); }} /> Todo el día</label><TextField label={draft.allDay ? "Empieza (día local)" : "Empieza (hora local)"}><input required type={draft.allDay ? "date" : "datetime-local"} value={draft.startsAt} onChange={(event) => field("startsAt", event.target.value)} /></TextField><TextField label={draft.allDay ? "Termina (día exclusivo)" : "Termina (hora local)"}><input required type={draft.allDay ? "date" : "datetime-local"} value={draft.endsAt} onChange={(event) => field("endsAt", event.target.value)} /></TextField><TextField label="Descripción" wide><textarea required maxLength={20000} rows={7} value={draft.description} onChange={(event) => field("description", event.target.value)} /></TextField></div>
    <div className="editor-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancelar</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? "Guardando…" : item ? "Guardar cambios" : "Guardar borrador"}</button></div>
  </form>;
}
