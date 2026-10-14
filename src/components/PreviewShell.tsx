import { useState } from "react";
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
type SectionKey = "inicio" | "noticias" | "cursos" | "calendario" | "institucion" | "medios" | "usuarios";
const sections: { id: SectionKey; label: string; icon: IconName; group: string }[] = [
  { id: "inicio", label: "Resumen", icon: "grid", group: "GENERAL" },
  { id: "noticias", label: "Noticias", icon: "news", group: "CONTENIDOS" },
  { id: "cursos", label: "Cursos y galería", icon: "courses", group: "CONTENIDOS" },
  { id: "calendario", label: "Calendario", icon: "calendar", group: "CONTENIDOS" },
  { id: "institucion", label: "Institución y contacto", icon: "school", group: "GESTIÓN" },
  { id: "medios", label: "Biblioteca de medios", icon: "media", group: "GESTIÓN" },
  { id: "usuarios", label: "Usuarios", icon: "users", group: "GESTIÓN" },
];
const copy: Record<SectionKey, { title: string; description: string; icon: IconName }> = {
  inicio: { title: "Resumen", description: "Un lugar para organizar la comunicación y los contenidos de EFP N°30.", icon: "grid" },
  noticias: { title: "Noticias", description: "Redactá publicaciones, guardá borradores y administrá su estado.", icon: "news" },
  cursos: { title: "Cursos y galería", description: "Administrá la oferta y las fotografías públicas de cada curso.", icon: "courses" },
  calendario: { title: "Calendario", description: "Organizá las fechas y actividades institucionales.", icon: "calendar" },
  institucion: { title: "Institución y contacto", description: "Mantené actualizados los datos que se muestran en el sitio.", icon: "school" },
  medios: { title: "Biblioteca de medios", description: "Revisá imágenes y archivos antes de publicarlos.", icon: "media" },
  usuarios: { title: "Usuarios administrativos", description: "Gestioná los accesos de administración según el rol asignado.", icon: "users" },
};
export function PreviewShell({ user, onLogout }: { user: SessionUser; onLogout: () => Promise<void> }) {
  const [active, setActive] = useState<SectionKey>("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  async function closeSession() { try { await onLogout(); } catch (error) { setLogoutError(error instanceof Error ? error.message : "No se pudo cerrar la sesión."); } }
  const current = copy[active];
  const visibleSections = sections.filter((section) => user.roles.includes("ADMIN") || !["institucion", "usuarios"].includes(section.id));
  const groups = [...new Set(visibleSections.map((section) => section.group))];
  return <div className="admin-preview">
    <aside className={"sidebar " + (menuOpen ? "sidebar--open" : "")}>
      <div className="brand"><div className="brand__seal">30</div><span><strong>EFP N°30</strong><small>ADMINISTRACIÓN</small></span><button className="sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><Icon name="close" /></button></div>
      <div className="sidebar__school">Escuela de Formación<br />Profesional N°30</div>
      <nav aria-label="Secciones de administración">{groups.map((group) => <div className="nav-group" key={group}><p>{group}</p>{visibleSections.filter((section) => section.group === group).map((section) => <button key={section.id} className={"nav-link " + (active === section.id ? "nav-link--active" : "")} onClick={() => { setActive(section.id); setMenuOpen(false); }} aria-current={active === section.id ? "page" : undefined}><Icon name={section.icon} size={18} /><span>{section.label}</span></button>)}</div>)}</nav>
      <div className="sidebar__footer"><span className="avatar avatar--sidebar">{user.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{user.displayName}</strong><small>{user.roles.map((role) => roleLabels[role]).join(" · ")}</small></span><Icon name="shield" size={17} /></div>
    </aside>
    <div className="admin-main"><header className="topbar"><button className="menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button><div className="breadcrumbs"><span>Administración</span><Icon name="chevron" size={15} /><strong>{current.title}</strong></div><div className="topbar__right"><span className="mode-pill"><i />{appConfig.dataMode === "mock" ? "Mock local" : "API real"}</span><button className="logout-nav" onClick={() => { void closeSession(); }}>Salir <Icon name="logout" size={15} /></button></div></header>
      <main className="content"><StatusBanner />{logoutError && <div className="inline-error" role="alert">{logoutError}</div>}<div className="page-heading"><div><p className="eyebrow">PANEL DE ADMINISTRACIÓN</p><h1>{current.title}</h1><p>{current.description}</p></div>{active !== "inicio" && <button className="button button--primary" disabled title="Acción todavía no habilitada"><Icon name="plus" size={17} /> Nuevo</button>}</div>
      {active === "inicio" ? <DashboardPreview onNavigate={setActive} /> : active === "noticias" ? <NewsWorkspace /> : active === "cursos" ? <CourseWorkspace /> : active === "calendario" ? <CalendarWorkspace /> : active === "institucion" ? <InstitutionWorkspace /> : active === "medios" ? <MediaWorkspace /> : <UsersWorkspace />}</main>
      <footer className="page-footer"><span>Escuela de Formación Profesional N°30</span><span>Administración <b>·</b> Desarrollo</span></footer>
    </div>
    {menuOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
  </div>;
}
function DashboardPreview({ onNavigate }: { onNavigate: (section: SectionKey) => void }) {
  return <>
    <div className="welcome-card"><div><span className="welcome-card__tag"><span /> ENTORNO DE DESARROLLO</span><h2>La gestión de la escuela,<br /><em>en un solo lugar.</em></h2><p>Administrá los contenidos de EFP N°30 desde una sesión segura del servidor.</p></div><div className="welcome-card__art" aria-hidden="true"><div className="art-sun" /><div className="art-book"><span /><span /><span /></div><div className="art-plant"><i /><i /><b /></div><div className="art-caption">APRENDER · CRECER · COMPARTIR</div></div></div>
    <div className="section-title"><div><h2>Espacios de trabajo</h2><p>Elegí un área para explorar su estructura.</p></div><span className="section-title__hint"><Icon name="lock" size={15} /> Acciones desactivadas</span></div>
    <div className="workspace-grid"><WorkspaceCard title="Noticias" detail="Borradores y publicaciones" icon="news" tint="blue" onClick={() => onNavigate("noticias")} /><WorkspaceCard title="Cursos y galería" detail="Oferta formativa y portada" icon="courses" tint="green" onClick={() => onNavigate("cursos")} /><WorkspaceCard title="Calendario" detail="Fechas institucionales" icon="calendar" tint="amber" onClick={() => onNavigate("calendario")} /><WorkspaceCard title="Biblioteca de medios" detail="Imágenes y documentos" icon="media" tint="violet" onClick={() => onNavigate("medios")} /></div>
    <div className="lower-grid"><section className="panel"><div className="panel__heading"><div><span className="panel__icon"><Icon name="clock" /></span><div><h3>Actividad reciente</h3><p>Últimos movimientos editoriales</p></div></div><button className="quiet-button" disabled>Ver actividad <Icon name="chevron" size={15} /></button></div><div className="empty-activity"><span className="empty-activity__icon"><Icon name="file" size={20} /></span><strong>La actividad aparecerá aquí</strong><span>Al conectar la API vas a ver las publicaciones y sus cambios.</span></div></section><aside className="panel tip-panel"><span className="tip-panel__icon"><Icon name="shield" size={20} /></span><p className="eyebrow">ACCESO SEGURO</p><h3>Tu trabajo, protegido</h3><p>Los roles ADMIN y EDITOR tendrán permisos definidos por el servidor. Los cambios se protegerán frente a versiones simultáneas.</p><div className="tip-panel__footer"><Icon name="lock" size={15} /> Sesiones de servidor y CSRF</div></aside></div>
  </>;
}
function WorkspaceCard({ title, detail, icon, tint, onClick }: { title: string; detail: string; icon: IconName; tint: string; onClick: () => void }) {
  return <button className="workspace-card" onClick={onClick}><span className={"workspace-card__icon workspace-card__icon--" + tint}><Icon name={icon} size={20} /></span><span className="workspace-card__copy"><strong>{title}</strong><small>{detail}</small></span><Icon className="workspace-card__arrow" name="arrow" size={17} /></button>;
}
