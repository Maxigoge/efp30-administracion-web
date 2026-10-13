import { useState } from "react";
import { LoginPanel } from "./components/LoginPanel";
import { PreviewShell } from "./components/PreviewShell";
import { StatusBanner } from "./components/StatusBanner";
import { Icon } from "./components/Icon";
export default function App() {
  const [showPreview, setShowPreview] = useState(true);
  if (showPreview) return <PreviewShell onLogin={() => setShowPreview(false)} />;
  return <main className="login-page">
    <div className="login-brand"><div className="brand__seal">30</div><div><strong>EFP N°30</strong><small>ESCUELA DE FORMACIÓN PROFESIONAL</small></div></div>
    <div className="login-layout"><div className="login-aside"><span className="login-aside__orb" /><p className="eyebrow">ESCUELA PÚBLICA · FORMACIÓN PARA EL TRABAJO</p><h2>Una comunidad<br />que <em>aprende haciendo.</em></h2><p className="login-aside__description">Administrá noticias, cursos y la información institucional de EFP N°30.</p><div className="login-aside__foot"><Icon name="school" size={18} /> Administración institucional</div></div><LoginPanel /></div>
    <div className="login-status"><StatusBanner /></div>
    <footer className="login-footer"><span>© EFP N°30 · Escuela de Formación Profesional</span><button className="text-button" onClick={() => setShowPreview(true)}>Explorar vista previa <Icon name="arrow" size={15} /></button></footer>
  </main>;
}
