import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  const [editorDraft, setEditorDraft] = useState<CourseDraft>(emptyCourse());
  const [editorTab, setEditorTab] = useState<"details" | "gallery">("details");
  const [galleryCourseId, setGalleryCourseId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<CoursePhotosResponse | null>(null);
  const [galleryDraft, setGalleryDraft] = useState<CoursePhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const galleryRequestId = useRef(0);
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
  const courseDirty = editing
    ? !sameCourseDraft(editorDraft, courseDraft(editing))
    : creating && !sameCourseDraft(editorDraft, emptyCourse());
  const galleryDirty = Boolean(gallery && gallery.courseId === editing?.id && !samePhotoList(galleryDraft, gallery.photos));

  function resetGallery() {
    galleryRequestId.current += 1;
    setGalleryCourseId(null);
    setGallery(null);
    setGalleryDraft([]);
    setGalleryLoading(false);
  }

  function mayLeaveEditor() {
    if (busy === "course-save" || busy === "gallery-save" || busy === "upload") {
      setError("Esperá a que termine la operación actual antes de cambiar de curso.");
      return false;
    }
    if (!courseDirty && !galleryDirty) return true;
    return window.confirm("Hay cambios sin guardar. Si continuás, se descartarán para abrir otro curso.");
  }

  async function loadGallery(course: CourseAdmin, baseline: CourseAdmin, draftAtOpen: CourseDraft, hadCourseChanges: boolean) {
    const requestId = ++galleryRequestId.current;
    setGalleryCourseId(course.id);
    setGallery(null);
    setGalleryDraft([]);
    setGalleryLoading(true);
    setError(null);
    setConflictTarget(null);
    try {
      const snapshot = await readConsistentCourseSnapshot(course.id, true);
      if (requestId !== galleryRequestId.current || !snapshot.gallery) return;

      const neededMediaIds = [...new Set([
        ...snapshot.gallery.photos.map((photo) => photo.mediaId),
        draftAtOpen.coverMediaId,
      ].filter(Boolean))];
      const missingMediaIds = neededMediaIds.filter((id) => !mediaById.has(id));
      const mediaResults = await Promise.allSettled(missingMediaIds.map((id) => api.getMedia(id)));
      if (requestId !== galleryRequestId.current) return;
      const loadedMedia = mediaResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (loadedMedia.length) {
        setMedia((current) => [
          ...loadedMedia,
          ...current.filter((entry) => !loadedMedia.some((loaded) => loaded.id === entry.id)),
        ]);
      }
      const serverChangedCourse = !sameCourseDraft(courseDraft(baseline), courseDraft(snapshot.course));
      if (serverChangedCourse && hadCourseChanges) {
        setError("Otra persona modificó los datos de este curso. Tus cambios locales siguen disponibles; recargá la versión antes de guardar el curso.");
        setConflictTarget("course");
      } else {
        setEditing(snapshot.course);
        if (serverChangedCourse) setEditorDraft(courseDraft(snapshot.course));
        else setEditorDraft(draftAtOpen);
      }
      setGallery(snapshot.gallery);
      setGalleryDraft(snapshot.gallery.photos);
    } catch (cause) {
      if (requestId === galleryRequestId.current) setError(errorText(cause));
    } finally {
      if (requestId === galleryRequestId.current) setGalleryLoading(false);
    }
  }

  async function openCourseEditor(course: CourseAdmin, target: "details" | "gallery") {
    if (editing?.id === course.id) {
      if (target === "gallery" && editorTab === "gallery") {
        setEditorTab("details");
        return;
      }
      setEditorTab(target);
      if (target === "gallery" && (galleryCourseId !== course.id || (!gallery && !galleryLoading))) {
        await loadGallery(course, editing, editorDraft, courseDirty);
      }
      return;
    }

    if (!mayLeaveEditor()) return;
    const initialDraft = courseDraft(course);
    setEditing(course);
    setCreating(false);
    setEditorDraft(initialDraft);
    setEditorTab(target);
    resetGallery();
    setError(null);
    setConflictTarget(null);
    if (target === "gallery") await loadGallery(course, course, initialDraft, false);
  }

  function openNewCourse() {
    if (!mayLeaveEditor()) return;
    setEditing(null);
    setCreating(true);
    setEditorDraft(emptyCourse());
    setEditorTab("details");
    resetGallery();
    setError(null);
    setConflictTarget(null);
  }

  function closeEditor() {
    if (!mayLeaveEditor()) return;
    setEditing(null);
    setCreating(false);
    setEditorDraft(emptyCourse());
    setEditorTab("details");
    resetGallery();
    setError(null);
    setConflictTarget(null);
  }

  function selectEditorTab(next: "details" | "gallery") {
    if (next === "details") {
      setEditorTab("details");
      return;
    }
    if (!editing) return;
    setEditorTab("gallery");
    if (galleryCourseId !== editing.id || (!gallery && !galleryLoading)) {
      void loadGallery(editing, editing, editorDraft, courseDirty);
    }
  }

  function retryGallery() {
    if (editing) void loadGallery(editing, editing, editorDraft, courseDirty);
  }
  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("course-save");
    setError(null);
    setConflictTarget(null);
    let saved: CourseAdmin;
    try {
      const requirements = editorDraft.requirements.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (requirements.length > 50 || requirements.some((requirement) => requirement.length > 240)) {
        throw new Error("Los cursos admiten hasta 50 requisitos de 240 caracteres cada uno.");
      }
      const durationHours = editorDraft.durationHours ? Number(editorDraft.durationHours) : null;
      if (durationHours !== null && (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 10000)) {
        throw new Error("La duración debe ser un número entero de 1 a 10.000 horas.");
      }
      const fields = {
        title: editorDraft.title.trim(),
        familyId: editorDraft.familyId,
        summary: editorDraft.summary.trim(),
        bodyMarkdown: editorDraft.bodyMarkdown.trim(),
        requirements,
        durationHours,
        modality: editorDraft.modality,
        enrollmentStatus: editorDraft.enrollmentStatus,
        coverMediaId: editorDraft.coverMediaId || null,
      };
      saved = editing
        ? await api.updateCourse(editing.id, { ...fields, version: editing.version })
        : await api.createCourse({ ...fields, slug: editorDraft.slug.trim() });
    } catch (cause) {
      setError(errorText(cause));
      if (isConflict(cause)) setConflictTarget("course");
      setBusy(null);
      return;
    }

    setEditing(saved);
    setCreating(false);
    setEditorDraft(courseDraft(saved));
    setGallery((current) => current?.courseId === saved.id ? { ...current, version: saved.version } : current);
    setError(null);
    try {
      await Promise.all([refreshCourses(), refreshCarousel()]);
    } catch (cause) {
      setError("El curso se guardó, pero no se pudo actualizar la lista o el carrusel. " + errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function reloadEditor() {
    if (!editing) return;
    if ((courseDirty || galleryDirty) && !window.confirm("Recargar descarta los cambios locales del curso y de su galería. ¿Querés continuar?")) return;
    setBusy("reload-course");
    try {
      const snapshot = await readConsistentCourseSnapshot(editing.id, galleryCourseId === editing.id);
      setEditing(snapshot.course);
      setEditorDraft(courseDraft(snapshot.course));
      setGallery(snapshot.gallery);
      setGalleryDraft(snapshot.gallery?.photos ?? []);
      setError(null);
      setConflictTarget(null);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function changeState(course: CourseAdmin, action: "publish" | "archive") {
    setBusy(course.id);
    setError(null);
    try {
      const updated = action === "publish"
        ? await api.publishCourse(course.id, course.version)
        : await api.archiveCourse(course.id, course.version);
      await refreshCourses();
      await refreshCarousel();
      if (editing?.id === updated.id) {
        setEditing(updated);
        setGallery((current) => current?.courseId === updated.id ? { ...current, version: updated.version } : current);
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!editing || galleryCourseId !== editing.id || !files?.length) return;
    setBusy("upload");
    setError(null);
    try {
      const selectedFiles = Array.from(files);
      selectedFiles.forEach(validateImage);
      let position = galleryDraft.reduce((highest, photo) => Math.max(highest, photo.position), -1) + 1;
      for (const file of selectedFiles) {
        const uploaded = await api.uploadMedia(file, "PUBLIC");
        if (!uploaded.mimeType.startsWith("image/") || uploaded.visibility !== "PUBLIC" || !uploaded.enabled) {
          throw new Error("La API no devolvió una imagen pública habilitada.");
        }
        const photo: CoursePhoto = { id: null, mediaId: uploaded.id, alt: "", position: position++, enabled: true, showOnHomepage: false };
        setGalleryDraft((current) => [...current, photo]);
        setMedia((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)]);
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function saveGallery() {
    if (!editing || galleryCourseId !== editing.id || !gallery) return;
    const preserveCourseConflict = conflictTarget === "course";
    setBusy("gallery-save");
    if (!preserveCourseConflict) setError(null);
    try {
      if (galleryDraft.some((photo) => !photo.alt.trim())) {
        throw new Error("Completá el texto alternativo de cada fotografía antes de guardar.");
      }
      const positions = galleryDraft.map((photo) => photo.position);
      if (positions.some((position) => !Number.isInteger(position) || position < 0) || new Set(positions).size !== positions.length) {
        throw new Error("El orden debe usar números enteros únicos desde 0.");
      }
      const saved = await api.replaceCoursePhotos(editing.id, {
        version: gallery.version,
        photos: galleryDraft.map((photo) => ({ ...photo })),
      });
      setGallery(saved);
      setGalleryDraft(saved.photos);
      if (!preserveCourseConflict) {
        setEditing((current) => current?.id === saved.courseId ? { ...current, version: saved.version } : current);
        setConflictTarget(null);
      }
      try {
        await Promise.all([refreshCourses(), refreshCarousel()]);
      } catch (cause) {
        setError("La galería se guardó, pero no se pudo actualizar la lista o el carrusel. " + errorText(cause));
      }
    } catch (cause) {
      setError(errorText(cause));
      if (isConflict(cause)) setConflictTarget("gallery");
    } finally {
      setBusy(null);
    }
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
    {error && <ApiError error={error} onRetry={conflictTarget === "gallery" || conflictTarget === "course" ? () => { void reloadEditor(); } : conflictTarget === "family" ? () => { void reloadFamily(); } : undefined} />}
    {tab === "families" ? <section className="records-panel"><div className="records-heading"><div><h2>Familias profesionales</h2><p>{families.length} familias</p></div></div>
      <form className="inline-create" onSubmit={editingFamily ? saveFamily : addFamily}><TextField label="Nombre"><input required maxLength={120} value={familyDraft.name} onChange={(event) => setFamilyDraft((current) => ({ ...current, name: event.target.value }))} /></TextField>{!editingFamily && <TextField label="Slug"><input required maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={familyDraft.slug} onChange={(event) => setFamilyDraft((current) => ({ ...current, slug: event.target.value }))} /></TextField>}<button className="button button--primary" disabled={busy === "family"}>{editingFamily ? "Guardar" : "Crear familia"}</button>{editingFamily && <button type="button" className="quiet-button" onClick={() => setEditingFamily(null)}>Cancelar</button>}</form>
      <div className="records-list">{families.map((family) => <article className="record-row" key={family.id}><div className="record-row__main"><span className={`status-tag ${family.active ? "status-tag--published" : "status-tag--archived"}`}>{family.active ? "Activa" : "Inactiva"}</span><h3>{family.name}</h3><small>/{family.slug} · v{family.version}</small></div><div className="record-row__actions"><button className="quiet-button" onClick={() => { setEditingFamily(family); setFamilyDraft({ slug: family.slug, name: family.name }); }}>Editar</button><button className="quiet-button" disabled={busy === family.id} onClick={() => { void toggleFamily(family); }}>{family.active ? "Desactivar" : "Activar"}</button></div></article>)}</div>
    </section> : <>
      <div className="module-toolbar"><label className="module-search"><Icon name="search" size={17} /><input type="search" placeholder="Buscar cursos" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void refreshCourses(); }} /></label><button className="button button--primary" onClick={openNewCourse}><Icon name="plus" size={17} /> Nuevo curso</button></div>
      <div className="news-tabs">{statuses.map((item) => <button key={item.label} className={status === item.value ? "news-tab news-tab--active" : "news-tab"} onClick={() => setStatus(item.value)}>{item.label}</button>)}</div>
      {loading ? <div className="records-panel records-empty">Consultando cursos…</div> : courses.length === 0 ? <div className="records-panel records-empty">No hay cursos para este filtro.</div> : <section className="records-panel"><div className="records-heading"><div><h2>Oferta formativa</h2><p>{courses.length} resultados</p></div></div><div className="records-list">{courses.map((course) => <article className="record-row" key={course.id}><div className="record-row__main"><span className={`status-tag status-tag--${course.status.toLowerCase()}`}>{statusLabel[course.status]}</span><h3>{course.title}</h3><p>{course.summary}</p><small>{families.find((family) => family.id === course.familyId)?.name ?? "Familia no disponible"} · {course.modality} · v{course.version}</small></div><div className="record-row__actions"><button className="quiet-button" onClick={() => { void openCourseEditor(course, "details"); }}>Editar</button><button className="quiet-button" onClick={() => { void openCourseEditor(course, "gallery"); }}>Galería</button>{course.status === "DRAFT" && <button className="button button--primary button--small" onClick={() => { void changeState(course, "publish"); }} disabled={busy === course.id || editing?.id === course.id}>Publicar</button>}{course.status !== "ARCHIVED" && <button className="quiet-button danger-text" onClick={() => { void changeState(course, "archive"); }} disabled={busy === course.id || editing?.id === course.id}>Archivar</button>}</div></article>)}</div></section>}
      {(creating || editing) && <CourseEditor
        item={editing}
        draft={editorDraft}
        onDraftChange={setEditorDraft}
        families={families}
        media={media.filter((entry) => entry.mimeType.startsWith("image/") && entry.visibility === "PUBLIC" && entry.enabled)}
        activeTab={editorTab}
        onTabChange={selectEditorTab}
        busy={busy === "course-save"}
        courseDirty={courseDirty}
        courseBlocked={conflictTarget === "course"}
        onSave={saveCourse}
        onCancel={closeEditor}
        gallery={gallery}
        galleryLoading={galleryLoading}
        galleryLoaded={Boolean(gallery && gallery.courseId === editing?.id)}
        onRetryGallery={retryGallery}
        gallerySaving={busy === "gallery-save"}
        uploading={busy === "upload"}
        galleryPhotos={galleryDraft}
        allMedia={mediaById}
        carousel={carousel}
        onFileChange={uploadPhotos}
        onGalleryChange={setGalleryDraft}
        onSaveGallery={saveGallery}
        onSelectCover={(coverMediaId) => setEditorDraft((current) => ({ ...current, coverMediaId }))}
      />}    </>}
  </div>;
}


function sameCourseDraft(left: CourseDraft, right: CourseDraft) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function samePhotoList(left: CoursePhoto[], right: CoursePhoto[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function readConsistentCourseSnapshot(courseId: string, includeGallery: boolean) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const course = await api.getCourse(courseId);
    const gallery = includeGallery ? await api.getCoursePhotos(courseId) : null;
    if (!gallery || gallery.version === course.version) return { course, gallery };
  }
  throw new Error("El curso siguió cambiando mientras se consultaba. Esperá un momento y volvé a cargarlo.");
}

function validateImage(file: File) {
  const supported = ["image/jpeg", "image/png", "image/webp"];
  if (!supported.includes(file.type)) throw new Error("La galería admite JPEG, PNG y WebP.");
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("Cada imagen debe pesar como máximo 5 MiB.");
}

function CourseEditor({
  item,
  draft,
  onDraftChange,
  families,
  media,
  activeTab,
  onTabChange,
  busy,
  courseDirty,
  courseBlocked,
  onSave,
  onCancel,
  gallery,
  galleryLoading,
  galleryLoaded,
  onRetryGallery,
  gallerySaving,
  uploading,
  galleryPhotos,
  allMedia,
  carousel,
  onFileChange,
  onGalleryChange,
  onSaveGallery,
  onSelectCover,
}: {
  item: CourseAdmin | null;
  draft: CourseDraft;
  onDraftChange: (draft: CourseDraft | ((current: CourseDraft) => CourseDraft)) => void;
  families: FamilyAdmin[];
  media: MediaAdmin[];
  activeTab: "details" | "gallery";
  onTabChange: (tab: "details" | "gallery") => void;
  busy: boolean;
  courseDirty: boolean;
  courseBlocked: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
  gallery: CoursePhotosResponse | null;
  galleryLoading: boolean;
  galleryLoaded: boolean;
  onRetryGallery: () => void;
  gallerySaving: boolean;
  uploading: boolean;
  galleryPhotos: CoursePhoto[];
  allMedia: Map<string, MediaAdmin>;
  carousel: CarouselItem[];
  onFileChange: (files: FileList | null) => void;
  onGalleryChange: (photos: CoursePhoto[]) => void;
  onSaveGallery: () => Promise<void>;
  onSelectCover: (coverMediaId: string) => void;
}) {
  const field = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => {
    onDraftChange((current) => ({ ...current, [key]: value }));
  };
  const familyOptions = families.filter((family) => family.active);
  const handleTabClick = () => onTabChange(activeTab === "gallery" ? "details" : "gallery");

  return <section className="editor-panel course-editor">
    <div className="editor-panel__heading">
      <div>
        <p className="eyebrow">CURSO · v{item?.version ?? 0}</p>
        <h2>{item ? "Editar curso" : "Nuevo curso borrador"}</h2>
        <p>Los datos y las fotografías se editan en un solo panel. La imagen de la tarjeta y el carrusel se eligen por separado.</p>
      </div>
      <button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar editor"><Icon name="close" /></button>
    </div>
    <div className="course-editor__tabs" role="tablist" aria-label="Secciones del curso">
      <button type="button" role="tab" aria-selected={activeTab === "details"} className={activeTab === "details" ? "course-editor__tab course-editor__tab--active" : "course-editor__tab"} onClick={() => onTabChange("details")}>Datos del curso</button>
      {item && <button type="button" role="tab" aria-selected={activeTab === "gallery"} className={activeTab === "gallery" ? "course-editor__tab course-editor__tab--active" : "course-editor__tab"} onClick={handleTabClick}>Fotos y galería</button>}
    </div>

    {activeTab === "details" && <form onSubmit={(event) => { void onSave(event); }}>
      <fieldset className="course-editor__fields" disabled={busy}>
        <div className="form-grid">
          <TextField label="Título"><input required maxLength={180} value={draft.title} onChange={(event) => field("title", event.target.value)} /></TextField>
          <TextField label="Slug"><input required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" disabled={Boolean(item)} value={draft.slug} onChange={(event) => field("slug", event.target.value)} /></TextField>
          <TextField label="Familia"><select required value={draft.familyId} onChange={(event) => field("familyId", event.target.value)}><option value="">Elegí una familia</option>{familyOptions.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select></TextField>
          <TextField label="Duración en horas"><input type="number" min="1" max="10000" value={draft.durationHours} onChange={(event) => field("durationHours", event.target.value)} /></TextField>
          <TextField label="Resumen" wide><textarea required maxLength={400} rows={3} value={draft.summary} onChange={(event) => field("summary", event.target.value)} /></TextField>
          <TextField label="Modalidad"><select value={draft.modality} onChange={(event) => field("modality", event.target.value as Modality)}><option value="PRESENTIAL">Presencial</option><option value="ONLINE">Virtual</option><option value="HYBRID">Híbrida</option></select></TextField>
          <TextField label="Inscripción"><select value={draft.enrollmentStatus} onChange={(event) => field("enrollmentStatus", event.target.value as EnrollmentStatus)}><option value="CONSULTATION">Consultar</option><option value="OPEN">Abierta</option><option value="CLOSED">Cerrada</option></select></TextField>
          <TextField label="Requisitos (uno por línea)" wide><textarea rows={4} maxLength={12000} value={draft.requirements} onChange={(event) => field("requirements", event.target.value)} /></TextField>
          <TextField label="Descripción Markdown" wide><textarea required rows={8} maxLength={50000} value={draft.bodyMarkdown} onChange={(event) => field("bodyMarkdown", event.target.value)} /></TextField>
          <CardCoverPicker items={media} selectedId={draft.coverMediaId} onChange={(coverMediaId) => field("coverMediaId", coverMediaId)} />
        </div>
      </fieldset>
      <div className="editor-actions">
        <button type="button" className="quiet-button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="button button--primary" disabled={busy || courseBlocked}>
          {courseBlocked ? "Recargá la versión para guardar" : busy ? "Guardando…" : item ? "Guardar cambios" : "Guardar borrador"}
        </button>
      </div>
    </form>}

    {item && activeTab === "gallery" && <>
      {courseDirty && <p className="course-editor__pending-note" role="status">Hay cambios sin guardar en los datos del curso. La imagen de tarjeta se persiste con “Guardar cambios” en Datos, aparte de “Guardar galería”.</p>}
      <GalleryEditor
      course={item}
      version={gallery?.version ?? item.version}
      photos={galleryPhotos}
      coverMediaId={draft.coverMediaId}
      media={allMedia}
      carousel={carousel}
      loading={galleryLoading}
      loaded={galleryLoaded}
      onRetry={onRetryGallery}
      saving={gallerySaving}
      uploading={uploading}
      onFileChange={onFileChange}
      onChange={onGalleryChange}
      onSave={onSaveGallery}
      onSelectCover={onSelectCover}
    />
    </>}
  </section>;
}

function CardCoverPicker({ items, selectedId, onChange }: { items: MediaAdmin[]; selectedId: string; onChange: (id: string) => void }) {
  const selected = items.find((item) => item.id === selectedId);
  return <fieldset className="course-cover-picker form-field--wide">
    <legend>Imagen de tarjeta del curso</legend>
    <p>Esta imagen se muestra en la tarjeta del curso. Elegirla no la agrega al carrusel de inicio.</p>
    <div className="course-cover-picker__preview">
      {selected?.url
        ? <img src={selected.url} alt="" />
        : selectedId
          ? <span>La portada está configurada, pero este archivo no aparece entre los medios cargados.</span>
          : <span>Falta elegir una imagen para la tarjeta del curso.</span>}
    </div>
    <div className="course-cover-picker__options">
      <label className={selectedId ? "course-cover-option" : "course-cover-option course-cover-option--selected"}>
        <input type="radio" name="course-card-cover" checked={!selectedId} onChange={() => onChange("")} />
        <span className="course-cover-option__image course-cover-option__image--empty"><Icon name="media" size={22} /></span>
        <strong>Sin imagen</strong>
      </label>
      {items.length === 0 && <p className="course-cover-picker__empty">No hay imágenes públicas habilitadas en la biblioteca.</p>}
      {items.map((item) => <label key={item.id} className={selectedId === item.id ? "course-cover-option course-cover-option--selected" : "course-cover-option"}>
        <input type="radio" name="course-card-cover" checked={selectedId === item.id} onChange={() => onChange(item.id)} />
        <span className="course-cover-option__image">{item.url ? <img src={item.url} alt="" /> : <Icon name="media" size={22} />}</span>
        <strong title={item.originalName}>{item.originalName}</strong>
        <small>{selectedId === item.id ? "Seleccionada" : "Elegir como imagen de tarjeta"}</small>
      </label>)}
    </div>
  </fieldset>;
}

function GalleryEditor({
  course,
  version,
  photos,
  coverMediaId,
  media,
  carousel,
  loading,
  loaded,
  onRetry,
  saving,
  uploading,
  onFileChange,
  onChange,
  onSave,
  onSelectCover,
}: {
  course: CourseAdmin;
  version: number;
  photos: CoursePhoto[];
  coverMediaId: string;
  media: Map<string, MediaAdmin>;
  carousel: CarouselItem[];
  loading: boolean;
  loaded: boolean;
  onRetry: () => void;
  saving: boolean;
  uploading: boolean;
  onFileChange: (files: FileList | null) => void;
  onChange: (photos: CoursePhoto[]) => void;
  onSave: () => Promise<void>;
  onSelectCover: (coverMediaId: string) => void;
}) {
  const combinedPreview: CarouselItem[] = [
    ...carousel.filter((item) => item.courseId !== course.id),
    ...(course.status === "PUBLISHED" ? photos.flatMap((photo) => {
      const asset = media.get(photo.mediaId);
      if (!photo.enabled || !photo.showOnHomepage || !asset?.enabled || asset.visibility !== "PUBLIC" || !asset.mimeType.startsWith("image/") || !asset.url) return [];
      return [{ id: photo.id ?? "pending-" + photo.mediaId, courseId: course.id, courseSlug: course.slug, courseTitle: course.title, mediaId: photo.mediaId, imageUrl: asset.url, alt: photo.alt, position: photo.position }];
    }) : []),
  ].sort((left, right) => left.position - right.position || left.courseId.localeCompare(right.courseId) || left.id.localeCompare(right.id));
  const orderedPhotos = photos.map((photo, index) => ({ photo, index }))
    .sort((left, right) => left.photo.position - right.photo.position || left.index - right.index);
  const selectedCover = coverMediaId ? media.get(coverMediaId) : null;
  const selectedCoverIsPublic = Boolean(selectedCover?.enabled && selectedCover.visibility === "PUBLIC" && selectedCover.mimeType.startsWith("image/") && selectedCover.url);

  return <section className="gallery-editor gallery-editor--connected">
    <div className="gallery-editor__heading">
      <div>
        <p className="eyebrow">GALERÍA DE {course.title.toLocaleUpperCase()}</p>
        <h2>Fotos y carrusel</h2>
        <p>“Imagen de tarjeta” es independiente de “Mostrar en carrusel de inicio”. Sólo las fotos públicas seleccionadas de cursos publicados aparecen en el carrusel.</p>
      </div>
      <label className="button button--primary upload-label">
        <Icon name="plus" size={17} />{uploading ? "Subiendo…" : "Subir fotos"}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || loading || !loaded} onChange={(event) => { onFileChange(event.target.files); event.currentTarget.value = ""; }} />
      </label>
    </div>
    {loading ? <p className="records-empty">Cargando galería…</p> : !loaded ? <div className="records-empty"><p>No se pudo cargar la galería.</p><button type="button" className="button button--secondary" onClick={onRetry}>Reintentar</button></div> : <>
      <div className="course-cover-current">
        <div>
          <strong>Imagen de tarjeta del curso</strong>
          <small>Se guarda con los datos del curso y no cambia la selección del carrusel.</small>
        </div>
        {selectedCoverIsPublic && selectedCover?.url
          ? <img src={selectedCover.url} alt="" />
          : coverMediaId
            ? <span>La portada actual no está disponible como imagen pública.</span>
            : <span>Sin imagen. Elegí una foto como imagen de tarjeta.</span>}
      </div>
      <div className="gallery-connected-grid">
        <div className="photo-list">
          {photos.length === 0 ? <p className="records-empty">Subí una o varias fotografías para agregarlas a este curso.</p> : orderedPhotos.map(({ photo, index }) => {
            const asset = media.get(photo.mediaId);
            const coverSelectable = Boolean(asset?.url && asset.enabled && asset.visibility === "PUBLIC" && asset.mimeType.startsWith("image/"));
            return <article className="photo-row" key={photo.id ?? photo.mediaId + "-" + index}>
              <div className="photo-row__thumb">{asset?.url ? <img src={asset.url} alt="" /> : <Icon name="media" size={24} />}</div>
              <div className="photo-row__details">
                <strong>{asset?.originalName ?? "Imagen"}</strong>
                <label>Texto alternativo<input minLength={1} maxLength={240} value={photo.alt} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, alt: event.target.value } : entry))} /></label>
                <label className={coverMediaId === photo.mediaId ? "photo-cover-choice photo-cover-choice--selected" : "photo-cover-choice"}>
                  <input type="radio" name={"course-gallery-cover-" + course.id} checked={coverMediaId === photo.mediaId} disabled={!coverSelectable} onChange={() => onSelectCover(photo.mediaId)} />
                  Usar como imagen de la tarjeta del curso
                  {!coverSelectable && <small>Medio no disponible para uso público</small>}
                </label>
                <div className="photo-toggles">
                  <label><input type="checkbox" checked={photo.enabled} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, enabled: event.target.checked } : entry))} /> Habilitada</label>
                  <label><input type="checkbox" checked={photo.showOnHomepage} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, showOnHomepage: event.target.checked } : entry))} /> Mostrar en carrusel de inicio</label>
                  <label>Orden<input type="number" min="0" step="1" value={photo.position} onChange={(event) => onChange(photos.map((entry, i) => i === index ? { ...entry, position: Number(event.target.value) } : entry))} /></label>
                  <button type="button" className="quiet-button danger-text" onClick={() => onChange(photos.filter((_, i) => i !== index))}>Quitar</button>
                </div>
              </div>
            </article>;
          })}
        </div>
        <aside className="carousel-preview">
          <div className="carousel-preview__top">
            <div><strong>Vista previa combinada</strong><small>Selección local + fotos públicas de otros cursos</small></div>
            <span className="preview-count">{combinedPreview.length}</span>
          </div>
          {combinedPreview.length === 0
            ? <div className="carousel-preview__empty"><span className="carousel-preview__frame"><Icon name="media" size={26} /></span><strong>Este curso no aporta fotos al carrusel</strong><small>Se requiere curso publicado, imagen pública habilitada y selección en el carrusel.</small></div>
            : <div className="carousel-preview__items">{combinedPreview.map((item) => <figure key={item.id}><img src={item.imageUrl} alt={item.alt} /><figcaption>{item.courseTitle} · {item.alt}</figcaption></figure>)}</div>}
        </aside>
      </div>
      <div className="editor-actions">
        <span className="gallery-version">{photos.length} fotos · versión {version}</span>
        <button type="button" className="button button--primary" disabled={saving || loading || !loaded} onClick={() => { void onSave(); }}>{saving ? "Guardando…" : "Guardar galería"}</button>
      </div>
    </>}
  </section>;
}