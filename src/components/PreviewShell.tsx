import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Icon, type IconName } from "./Icon";
import { NewsWorkspace } from "./NewsWorkspace";
import { CourseWorkspace } from "./CourseWorkspace";
import { CalendarWorkspace } from "./CalendarWorkspace";
import { InstitutionWorkspace } from "./InstitutionWorkspace";
import { MediaWorkspace } from "./MediaWorkspace";
import { UsersWorkspace } from "./UsersWorkspace";
import type { SessionUser } from "../api/types";
import { roleLabels } from "../auth/types";
import { appConfig } from "../config";
import { StatusBanner } from "./StatusBanner";
import { createAdminHistory, sectionHash } from "../navigation.mjs";
import type { AdminHistory, AdminRoute, SectionKey } from "../navigation.mjs";

const sections: { id: SectionKey; label: string; icon: IconName; group: string }[] = [
  { id: "inicio", label: "Resumen", icon: "grid", group: "GENERAL" },
  { id: "noticias", label: "Noticias", icon: "news", group: "CONTENIDOS" },
  { id: "cursos", label: "Cursos y galería", icon: "courses", group: "CONTENIDOS" },
  { id: "calendario", label: "Calendario", icon: "calendar", group: "CONTENIDOS" },
  { id: "institucion", label: "Institución y contacto", icon: "school", group: "GESTIÓN" },
  { id: "medios", label: "Biblioteca de medios", icon: "media", group: "GESTIÓN" },
  { id: "usuarios", label: "Usuarios", icon: "users", group: "GESTIÓN" },
];

const copy: Record<SectionKey, { title: string; description: string }> = {
  inicio: { title: "Resumen", description: "Organizá la comunicación y los contenidos de EFP N°30." },
  noticias: { title: "Noticias", description: "Redactá publicaciones, guardá borradores y administrá su estado." },
  cursos: { title: "Cursos y galería", description: "Administrá la oferta y las fotografías públicas de cada curso." },
  calendario: { title: "Calendario", description: "Organizá las fechas y actividades institucionales." },
  institucion: { title: "Institución y contacto", description: "Mantené actualizados los datos que se muestran en el sitio." },
  medios: { title: "Biblioteca de medios", description: "Revisá imágenes y archivos antes de publicarlos." },
  usuarios: { title: "Usuarios administrativos", description: "Gestioná los accesos de administración según el rol asignado." },
};

function canAccess(route: AdminRoute, user: SessionUser) {
  return user.roles.includes("ADMIN") || !["institucion", "usuarios"].includes(route.section);
}

export function PreviewShell({ user, onLogout }: { user: SessionUser; onLogout: () => Promise<void> }) {
  const [route, setRoute] = useState<AdminRoute>(() => ({ section: "inicio", path: "/inicio", hash: "#/inicio" }));
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dirtyRef = useRef(false);
  const blockedRef = useRef(false);
  const historyRef = useRef<AdminHistory | null>(null);

  const reportDirty = useCallback((dirty: boolean, blocked = false) => {
    dirtyRef.current = dirty;
    blockedRef.current = blocked;
    setHasUnsavedChanges(dirty);
  }, []);

  useEffect(() => {
    const history = createAdminHistory({
      onRoute: (next) => {
        if (!canAccess(next, user)) {
          historyRef.current?.replace("#/inicio");
          return;
        }
        setRoute(next);
        setMenuOpen(false);
      },
      canNavigate: (current, next) => {
        if (blockedRef.current) {
          window.alert("Esperá a que termine la operación actual antes de cambiar de sección.");
          return false;
        }
        const sameCourseEditor = Boolean(current.courseId && next.courseId && current.courseId === next.courseId);
        const sameNewsEditor = Boolean(current.newsId && next.newsId && current.newsId === next.newsId);
        if (!dirtyRef.current || sameCourseEditor || sameNewsEditor) return true;
        return window.confirm("Hay cambios sin guardar. Si continuás, se descartarán los cambios del editor.");
      },
    });
    historyRef.current = history;
    if (!canAccess(history.route, user)) history.replace("#/inicio");
    else setRoute(history.route);
    return () => {
      history.dispose();
      historyRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  const navigate = useCallback((hash: string, options?: { replace?: boolean }) => historyRef.current?.navigate(hash, options) ?? false, []);
  const handleRouteClick = useCallback((hash: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (navigate(hash)) setMenuOpen(false);
  }, [navigate]);

  const current = copy[route.section];
  const currentTitle = route.courseView === "gallery"
    ? current.title + " · Galería"
    : route.newsView || route.courseView
      ? current.title + " · Editor"
      : current.title;
  const visibleSections = sections.filter((section) => user.roles.includes("ADMIN") || !["institucion", "usuarios"].includes(section.id));
  const groups = [...new Set(visibleSections.map((section) => section.group))];

  async function closeSession() {
    if (blockedRef.current) {
      window.alert("Esperá a que termine la operación actual antes de cerrar la sesión.");
      return;
    }
    if (dirtyRef.current && !window.confirm("Hay cambios sin guardar. Si cerrás la sesión, se descartarán.")) return;
    historyRef.current?.replace("#/inicio");
    try { await onLogout(); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : "No se pudo cerrar la sesión."); }
  }

  return <div className="admin-preview">
    <aside className={"sidebar " + (menuOpen ? "sidebar--open" : "")}>
      <div className="brand"><div className="brand__seal">30</div><span><strong>EFP N°30</strong><small>ADMINISTRACIÓN</small></span><button className="sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><Icon name="close" /></button></div>
      <div className="sidebar__school">Escuela de Formación<br />Profesional N°30</div>
      <nav aria-label="Secciones de administración">{groups.map((group) => <div className="nav-group" key={group}><p>{group}</p>{visibleSections.filter((section) => section.group === group).map((section) => <a key={section.id} href={sectionHash(section.id)} className={"nav-link " + (route.section === section.id ? "nav-link--active" : "")} onClick={handleRouteClick(sectionHash(section.id))} aria-current={route.section === section.id ? "page" : undefined}><Icon name={section.icon} size={18} /><span>{section.label}</span></a>)}</div>)}</nav>
      <div className="sidebar__footer"><span className="avatar avatar--sidebar">{user.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{user.displayName}</strong><small>{user.roles.map((role) => roleLabels[role]).join(" · ")}</small></span></div>
    </aside>
    <div className="admin-main"><header className="topbar"><button className="menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button><div className="breadcrumbs"><span>Administración</span><Icon name="chevron" size={15} /><strong>{currentTitle}</strong></div><div className="topbar__right">{appConfig.dataMode === "mock" && import.meta.env.DEV && <span className="mock-mode-note" role="status">Datos de prueba</span>}<button className="logout-nav" onClick={() => { void closeSession(); }}>Salir <Icon name="logout" size={15} /></button></div></header>
      <main className="content"><StatusBanner />{logoutError && <div className="inline-error" role="alert">{logoutError}</div>}<div className="page-heading"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>{current.title}</h1><p>{current.description}</p></div></div>
      {route.section === "inicio" ? <DashboardPreview items={visibleSections.filter((section) => section.id !== "inicio")} onNavigate={(section) => { navigate(sectionHash(section)); }} /> : route.section === "noticias" ? <NewsWorkspace route={route} onNavigate={navigate} onDirtyChange={reportDirty} /> : route.section === "cursos" ? <CourseWorkspace route={route} onNavigate={navigate} onDirtyChange={reportDirty} /> : route.section === "calendario" ? <CalendarWorkspace onDirtyChange={reportDirty} /> : route.section === "institucion" ? <InstitutionWorkspace onDirtyChange={reportDirty} /> : route.section === "medios" ? <MediaWorkspace onDirtyChange={reportDirty} /> : <UsersWorkspace onDirtyChange={reportDirty} />}</main>
      <footer className="page-footer"><span>Escuela de Formación Profesional N°30</span><span>Administración</span></footer>
    </div>
    {menuOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
  </div>;
}

function DashboardPreview({ items, onNavigate }: { items: typeof sections; onNavigate: (section: SectionKey) => void }) {
  const details: Partial<Record<SectionKey, string>> = {
    noticias: "Borradores y publicaciones",
    cursos: "Cursos y fotografías",
    calendario: "Fechas y actividades",
    institucion: "Datos de la escuela y contacto",
    medios: "Imágenes y documentos",
    usuarios: "Accesos administrativos",
  };
  const tints: Partial<Record<SectionKey, string>> = { noticias: "blue", cursos: "green", calendario: "amber", institucion: "violet", medios: "violet", usuarios: "blue" };
  return <section className="dashboard-shortcuts">
    <div className="section-title"><div><h2>Accesos directos</h2><p>Elegí una sección para continuar.</p></div></div>
    <div className="workspace-grid">{items.map((item) => <WorkspaceCard key={item.id} item={item} detail={details[item.id] ?? item.label} tint={tints[item.id] ?? "blue"} onNavigate={onNavigate} />)}</div>
  </section>;
}

function WorkspaceCard({ item, detail, tint, onNavigate }: { item: (typeof sections)[number]; detail: string; tint: string; onNavigate: (section: SectionKey) => void }) {
  const hash = sectionHash(item.id);
  return <a className="workspace-card" href={hash} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(item.id);
  }}>
    <span className={"workspace-card__icon workspace-card__icon--" + tint}><Icon name={item.icon} size={20} /></span>
    <span className="workspace-card__copy"><strong>{item.label}</strong><small>{detail}</small></span>
    <Icon className="workspace-card__arrow" name="arrow" size={17} />
  </a>;
}
