import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import * as api from "../api/content";
import type { CarouselItem, CourseAdmin, CoursePhoto, CoursePhotosResponse, EditorialStatus, FamilyAdmin, MediaAdmin, Modality, EnrollmentStatus } from "../api/types";
import { ApiError, errorText, isConflict, TextField } from "./ApiFeedback";
import { Icon } from "./Icon";

const statuses: { label: string; value?: EditorialStatus }[] = [{ label: "Todos" }, { label: "Borradores", value: "DRAFT" }, { label: "Publicados", value: "PUBLISHED" }, { label: "Archivados", value: "ARCHIVED" }];
const statusLabel: Record<EditorialStatus, string> = { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" };
type CourseDraft = { slug: string; title: string; familyId: string; summary: string; bodyMarkdown: string; requirements: string; durationHours: string; modality: Modality; enrollmentStatus: EnrollmentStatus; coverMediaId: string };
const emptyCourse = (): CourseDraft => ({ slug: "", title: "", familyId: "", summary: "", bodyMarkdown: "", requirements: "", durationHours: "", modality: "PRESENTIAL", enrollmentStatus: "CONSULTATION", coverMediaId: "" });
function courseDraft(course: CourseAdmin): CourseDraft { return { slug: course.slug, title: course.title, familyId: course.familyId, summary: course.summary, bodyMarkdown: course.bodyMarkdown, requirements: course.requirements.join("\n"), durationHours: course.durationHours == null ? "" : String(course.durationHours), modality: course.modality, enrollmentStatus: course.enrollmentStatus, coverMediaId: course.coverMediaId ?? "" }; }

export function CourseWorkspace() {
  const [tab, setTab] = useState<"courses" | "families">("courses");
  const [status, setStatus] = useState<EditorialStatus | undefined>();
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<CourseAdmin[]>([]);
  const [families, setFamilies] = useState<FamilyAdmin[]>([]);
  const [media, setMedia] = useState<MediaAdmin[]>([]);
  const [carousel, setCarousel] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictTarget, setConflictTarget] = useState<"course" | "gallery" | "family" | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CourseAdmin | null>(null);
  const [selected, setSelected] = useState<CourseAdmin | null>(null);
  const [gallery, setGallery] = useState<CoursePhotosResponse | null>(null);
  const [galleryDraft, setGalleryDraft] = useState<CoursePhoto[]>([]);
  const [familyDraft, setFamilyDraft] = useState<{ slug: string; name: string }>({ slug: "", name: "" });
  const [editingFamily, setEditingFamily] = useState<FamilyAdmin | null>(null);

  const refreshCourses = useCallback(async () => {
    const page = await api.listCourses({ status, q: query }); setCourses(page.items);
  }, [status, query]);
  const refreshFamilies = useCallback(async () => { const page = await api.listFamilies(); setFamilies(page.items); }, []);
  const refreshMedia = useCallback(async () => { const page = await api.listMedia(); setMedia(page.items); }, []);
  const refreshCarousel = useCallback(async () => { const response = await api.getHomepageCarousel(); setCarousel(response.items); }, []);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { await Promise.all([refreshCourses(), refreshFamilies(), refreshMedia(), refreshCarousel()]); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, [refreshCourses, refreshFamilies, refreshMedia, refreshCarousel]);
  useEffect(() => { void refresh(); }, [refresh]);

  const mediaById = useMemo(() => new Map(media.map((item) => [item.id, item])), [media]);
  async function openGallery(course: CourseAdmin) {
    setSelected(course); setGallery(null); setGalleryDraft([]); setError(null); setBusy("gallery");
    try { const response = await api.getCoursePhotos(course.id); setGallery(response); setGalleryDraft(response.photos); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function saveCourse(draft: CourseDraft, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("course-save"); setError(null);
    try {
      const requirements = draft.requirements.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (requirements.length > 50 || requirements.some((requirement) => requirement.length > 240)) throw new Error("Los cursos admiten hasta 50 requisitos de 240 caracteres cada uno.");
      const durationHours = draft.durationHours ? Number(draft.durationHours) : null;
      if (durationHours !== null && (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 10000)) throw new Error("La duración debe ser un número entero de 1 a 10.000 horas.");
      const fields = { title: draft.title.trim(), familyId: draft.familyId, summary: draft.summary.trim(), bodyMarkdown: draft.bodyMarkdown.trim(), requirements, durationHours, modality: draft.modality, enrollmentStatus: draft.enrollmentStatus, coverMediaId: draft.coverMediaId || null };
      const saved = editing ? await api.updateCourse(editing.id, { ...fields, version: editing.version }) : await api.createCourse({ ...fields, slug: draft.slug.trim() });
      if (selected?.id === saved.id) setSelected(saved);
      setEditing(null); setCreating(false); await refreshCourses(); await refreshCarousel();
    } catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflictTarget("course"); }
    finally { setBusy(null); }
  }  async function reloadCourse() { if (!editing) return; setBusy("reload-course"); try { setEditing(await api.getCourse(editing.id)); } catch (cause) { setError(errorText(cause)); } finally { setBusy(null); } }
  async function changeState(course: CourseAdmin, action: "publish" | "archive") {
    setBusy(course.id); setError(null);
    try { const updated = action === "publish" ? await api.publishCourse(course.id, course.version) : await api.archiveCourse(course.id, course.version); if (selected?.id === updated.id) setSelected(updated); await refreshCourses(); await refreshCarousel(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function uploadPhotos(files: FileList | null) {
    if (!selected || !files?.length) return;
    setBusy("upload"); setError(null);
    try {
      const selectedFiles = Array.from(files); selectedFiles.forEach(validateImage);
      let position = galleryDraft.length;
      for (const file of selectedFiles) {
        const uploaded = await api.uploadMedia(file, "PUBLIC");
        if (!uploaded.mimeType.startsWith("image/") || uploaded.visibility !== "PUBLIC" || !uploaded.enabled) throw new Error("La API no devolvió una imagen pública habilitada.");
        const photo: CoursePhoto = { id: null, mediaId: uploaded.id, alt: "", position: position++, enabled: true, showOnHomepage: false };
        setGalleryDraft((current) => [...current, photo]);
        setMedia((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
      }
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function saveGallery() {
    if (!selected || !gallery) return;
    setBusy("gallery-save"); setError(null);
    try {
      if (galleryDraft.some((photo) => !photo.alt.trim())) throw new Error("Completá el texto alternativo de cada fotografía antes de guardar.");
      const saved = await api.replaceCoursePhotos(selected.id, { version: gallery.version, photos: galleryDraft.map((photo, index) => ({ ...photo, position: Number.isFinite(photo.position) ? photo.position : index })) });
      setGallery(saved); setGalleryDraft(saved.photos); await refreshCourses(); await refreshCarousel();
    } catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflictTarget("gallery"); }
    finally { setBusy(null); }
  }
  async function reloadGallery() {
    if (!selected) return;
    setBusy("gallery");
    try { const latest = await api.getCoursePhotos(selected.id); setGallery(latest); setGalleryDraft(latest.photos); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function addFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("family"); setError(null);
    try { await api.createFamily({ slug: familyDraft.slug.trim(), name: familyDraft.name.trim() }); setFamilyDraft({ slug: "", name: "" }); await refreshFamilies(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function saveFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingFamily) return; setBusy("family"); setError(null);
    try { await api.updateFamily(editingFamily.id, { version: editingFamily.version, name: familyDraft.name.trim(), active: editingFamily.active }); setEditingFamily(null); await refreshFamilies(); }
    catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflictTarget("family"); }
    finally { setBusy(null); }
  }
  async function reloadFamily() {
    if (!editingFamily) { await refreshFamilies(); setConflictTarget(null); return; }
    setBusy("reload-family");
    try { const latest = await api.getFamily(editingFamily.id); setEditingFamily(latest); setFamilyDraft({ slug: latest.slug, name: latest.name }); setConflictTarget(null); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function toggleFamily(family: FamilyAdmin) {
    setBusy(family.id); setError(null);
    try { await api.updateFamily(family.id, { version: family.version, name: family.name, active: !family.active }); await refreshFamilies(); }
    catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflictTarget("family"); }
    finally { setBusy(null); }
  }
  return <div className="workspace-section">
    <div className="workspace-tabs"><button className={tab === "courses" ? "workspace-tab workspace-tab--active" : "workspace-tab"} onClick={() => setTab("courses")}>Cursos</button><button className={tab === "families" ? "workspace-tab workspace-tab--active" : "workspace-tab"} onClick={() => setTab("families")}>Familias</button><button className="quiet-button workspace-refresh" onClick={() => { void refresh(); }} disabled={loading}><Icon name="arrow" size={15} /> Actualizar</button></div>
    {error && <ApiError error={error} onRetry={conflictTarget === "gallery" ? () => { void reloadGallery(); } : conflictTarget === "course" ? () => { void reloadCourse(); } : conflictTarget === "family" ? () => { void reloadFamily(); } : undefined} />}
    {tab === "families" ? <section className="records-panel"><div className="records-heading"><div><h2>Familias profesionales</h2><p>{families.length} familias</p></div></div>
      <form className="inline-create" onSubmit={editingFamily ? saveFamily : addFamily}><TextField label="Nombre"><input required maxLength={120} value={familyDraft.name} onChange={(event) => setFamilyDraft((current) => ({ ...current, name: event.target.value }))} /></TextField>{!editingFamily && <TextField label="Slug"><input required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={familyDraft.slug} onChange={(event) => setFamilyDraft((current) => ({ ...current, slug: event.target.value }))} /></TextField>}<button className="button button--primary" disabled={busy === "family"}>{editingFamily ? "Guardar" : "Crear familia"}</button>{editingFamily && <button type="button" className="quiet-button" onClick={() => setEditingFamily(null)}>Cancelar</button>}</form>
      <div className="records-list">{families.map((family) => <article className="record-row" key={family.id}><div className="record-row__main"><span className={`status-tag ${family.active ? "status-tag--published" : "status-tag--archived"}`}>{family.active ? "Activa" : "Inactiva"}</span><h3>{family.name}</h3><small>/{family.slug} · v{family.version}</small></div><div className="record-row__actions"><button className="quiet-button" onClick={() => { setEditingFamily(family); setFamilyDraft({ slug: family.slug, name: family.name }); }}>Editar</button><button className="quiet-button" disabled={busy === family.id} onClick={() => { void toggleFamily(family); }}>{family.active ? "Desactivar" : "Activar"}</button></div></article>)}</div>
    </section> : <>
      <div className="module-toolbar"><label className="module-search"><Icon name="search" size={17} /><input type="search" placeholder="Buscar cursos" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void refreshCourses(); }} /></label><button className="button button--primary" onClick={() => { setCreating(true); setEditing(null); }}><Icon name="plus" size={17} /> Nuevo curso</button></div>
      <div className="news-tabs">{statuses.map((item) => <button key={item.label} className={status === item.value ? "news-tab news-tab--active" : "news-tab"} onClick={() => setStatus(item.value)}>{item.label}</button>)}</div>
      {loading ? <div className="records-panel records-empty">Consultando cursos…</div> : courses.length === 0 ? <div className="records-panel records-empty">No hay cursos para este filtro.</div> : <section className="records-panel"><div className="records-heading"><div><h2>Oferta formativa</h2><p>{courses.length} resultados</p></div></div><div className="records-list">{courses.map((course) => <article className="record-row" key={course.id}><div className="record-row__main"><span className={`status-tag status-tag--${course.status.toLowerCase()}`}>{statusLabel[course.status]}</span><h3>{course.title}</h3><p>{course.summary}</p><small>{families.find((family) => family.id === course.familyId)?.name ?? "Familia no disponible"} · {course.modality} · v{course.version}</small></div><div className="record-row__actions"><button className="quiet-button" onClick={() => { setEditing(course); setCreating(false); }}>Editar</button><button className="quiet-button" onClick={() => { void openGallery(course); }}>Galería</button>{course.status === "DRAFT" && <button className="button button--primary button--small" onClick={() => { void changeState(course, "publish"); }} disabled={busy === course.id}>Publicar</button>}{course.status !== "ARCHIVED" && <button className="quiet-button danger-text" onClick={() => { void changeState(course, "archive"); }} disabled={busy === course.id}>Archivar</button>}</div></article>)}</div></section>}
      {(creating || editing) && <CourseEditor key={`${editing?.id ?? "new"}-${editing?.version ?? 0}`} item={editing} families={families} media={media.filter((entry) => entry.mimeType.startsWith("image/") && entry.visibility === "PUBLIC" && entry.enabled)} busy={busy === "course-save"} onSave={saveCourse} onCancel={() => { setCreating(false); setEditing(null); }} />}
      {selected && <GalleryEditor course={selected} version={gallery?.version ?? 0} photos={galleryDraft} media={mediaById} carousel={carousel} loading={busy === "gallery"} saving={busy === "gallery-save"} uploading={busy === "upload"} onFileChange={uploadPhotos} onChange={setGalleryDraft} onSave={saveGallery} />}
    </>}
  </div>;
}

function validateImage(file: File) {
  const supported = ["image/jpeg", "image/png", "image/webp"];
  if (!supported.includes(file.type)) throw new Error("La galería admite JPEG, PNG y WebP.");
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("Cada imagen debe pesar como máximo 5 MiB.");
}

function CourseEditor({ item, families, media, busy, onSave, onCancel }: { item: CourseAdmin | null; families: FamilyAdmin[]; media: MediaAdmin[]; busy: boolean; onSave: (draft: CourseDraft, event: FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<CourseDraft>(item ? courseDraft(item) : emptyCourse());
  const field = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const familyOptions = families.filter((family) => family.active);
  return <form className="editor-panel" onSubmit={(event) => { void onSave(draft, event); }}><div className="editor-panel__heading"><div><p className="eyebrow">CURSO</p><h2>{item ? "Editar curso" : "Nuevo curso borrador"}</h2><p>La portada de tarjeta se selecciona aquí; es independiente del carrusel.</p></div><button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar"><Icon name="close" /></button></div>
    <div className="form-grid"><TextField label="Título"><input required maxLength={180} value={draft.title} onChange={(event) => field("title", event.target.value)} /></TextField><TextField label="Slug"><input required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" disabled={Boolean(item)} value={draft.slug} onChange={(event) => field("slug", event.target.value)} /></TextField><TextField label="Familia"><select required value={draft.familyId} onChange={(event) => field("familyId", event.target.value)}><option value="">Elegí una familia</option>{familyOptions.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select></TextField><TextField label="Duración en horas"><input type="number" min="1" max="10000" value={draft.durationHours} onChange={(event) => field("durationHours", event.target.value)} /></TextField><TextField label="Resumen" wide><textarea required maxLength={400} rows={3} value={draft.summary} onChange={(event) => field("summary", event.target.value)} /></TextField><TextField label="Modalidad"><select value={draft.modality} onChange={(event) => field("modality", event.target.value as Modality)}><option value="PRESENTIAL">Presencial</option><option value="ONLINE">Virtual</option><option value="HYBRID">Híbrida</option></select></TextField><TextField label="Inscripción"><select value={draft.enrollmentStatus} onChange={(event) => field("enrollmentStatus", event.target.value as EnrollmentStatus)}><option value="CONSULTATION">Consultar</option><option value="OPEN">Abierta</option><option value="CLOSED">Cerrada</option></select></TextField><TextField label="Requisitos (uno por línea)" wide><textarea rows={4} maxLength={12000} value={draft.requirements} onChange={(event) => field("requirements", event.target.value)} /></TextField><TextField label="Descripción Markdown" wide><textarea required rows={8} maxLength={50000} value={draft.bodyMarkdown} onChange={(event) => field("bodyMarkdown", event.target.value)} /></TextField><TextField label="Portada de la tarjeta (independiente del carrusel)" wide><select value={draft.coverMediaId} onChange={(event) => field("coverMediaId", event.target.value)}><option value="">Sin portada</option>{media.map((entry) => <option key={entry.id} value={entry.id}>{entry.originalName}</option>)}</select></TextField></div>
    <div className="editor-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancelar</button><button type="submit" className="button button--primary" disabled={busy}>{busy ? "Guardando…" : item ? "Guardar cambios" : "Guardar borrador"}</button></div>
  </form>;
}

function GalleryEditor({ course, version, photos, media, carousel, loading, saving, uploading, onFileChange, onChange, onSave }: { course: CourseAdmin; version: number; photos: CoursePhoto[]; media: Map<string, MediaAdmin>; carousel: CarouselItem[]; loading: boolean; saving: boolean; uploading: boolean; onFileChange: (files: FileList | null) => void; onChange: (photos: CoursePhoto[]) => void; onSave: () => void }) {
  const combinedPreview: CarouselItem[] = [
    ...carousel.filter((item) => item.courseId !== course.id),
    ...(course.status === "PUBLISHED" ? photos.flatMap((photo) => {
      const asset = media.get(photo.mediaId);
      if (!photo.enabled || !photo.showOnHomepage || !asset?.enabled || asset.visibility !== "PUBLIC" || !asset.mimeType.startsWith("image/") || !asset.url) return [];
      return [{ id: photo.id ?? `pending-${photo.mediaId}`, courseId: course.id, courseSlug: course.slug, courseTitle: course.title, mediaId: photo.mediaId, imageUrl: asset.url, alt: photo.alt, position: photo.position }];
    }) : []),
  ].sort((left, right) => left.position - right.position || left.courseId.localeCompare(right.courseId) || left.id.localeCompare(right.id));
  return <section className="gallery-editor gallery-editor--connected"><div className="gallery-editor__heading"><div><p className="eyebrow">GALERÍA DE {course.title.toLocaleUpperCase()}</p><h2>Fotografías y carrusel</h2><p>La portada de tarjeta usa el campo independiente del curso. El carrusel se confirma desde la ruta pública.</p></div><label className="button button--primary upload-label"><Icon name="plus" size={17} />{uploading ? "Subiendo…" : "Subir fotos"}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || loading} onChange={(event) => { onFileChange(event.target.files); event.currentTarget.value = ""; }} /></label></div>
    {loading ? <p className="records-empty">Cargando galería…</p> : <div className="gallery-connected-grid"><div className="photo-list">{photos.length === 0 ? <p className="records-empty">Subí una o varias fotografías para agregarlas a este curso.</p> : photos.map((photo, index) => { const asset = media.get(photo.mediaId); return <article className="photo-row" key={photo.id ?? `${photo.mediaId}-${index}`}><div className="photo-row__thumb">{asset?.url ? <img src={asset.url} alt="" /> : <Icon name="media" size={24} />}</div><div className="photo-row__details"><strong>{asset?.originalName ?? "Imagen"}</strong><label>Texto alternativo<input required minLength={1} maxLength={240} value={photo.alt} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, alt: event.target.value } : entry))} /></label><div className="photo-toggles"><label><input type="checkbox" checked={photo.enabled} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, enabled: event.target.checked } : entry))} /> Habilitada</label><label><input type="checkbox" checked={photo.showOnHomepage} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, showOnHomepage: event.target.checked } : entry))} /> Mostrar en portada</label><label>Orden<input type="number" min="0" value={photo.position} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, position: Number(event.target.value) } : entry))} /></label><button type="button" className="quiet-button danger-text" onClick={() => onChange(photos.filter((_, i) => i !== index))}>Quitar</button></div></div></article>; })}</div>
      <aside className="carousel-preview"><div className="carousel-preview__top"><div><div><strong>Vista previa combinada</strong><small>Selección local + fotos públicas de otros cursos</small></div></div><span className="preview-count">{combinedPreview.length}</span></div>{combinedPreview.length === 0 ? <div className="carousel-preview__empty"><span className="carousel-preview__frame"><Icon name="media" size={26} /></span><strong>Este curso no aporta fotos al carrusel</strong><small>Verificá curso publicado, imagen pública habilitada y selección.</small></div> : <div className="carousel-preview__items">{combinedPreview.map((item) => <figure key={item.id}><img src={item.imageUrl} alt={item.alt} /><figcaption>{item.courseTitle} · {item.alt}</figcaption></figure>)}</div>}</aside></div>}
    <div className="editor-actions"><span className="gallery-version">{photos.length} fotos · versión {version}</span><button type="button" className="button button--primary" disabled={saving || loading} onClick={onSave}>{saving ? "Guardando…" : "Guardar galería"}</button></div>
  </section>;
}
