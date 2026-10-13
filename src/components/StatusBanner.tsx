import { Icon } from "./Icon";
export function StatusBanner() {
  return <div className="status-banner" role="status"><span className="status-banner__icon"><Icon name="shield" size={18} /></span><span><strong>Vista de desarrollo · solo lectura</strong><small>La API y sus fixtures compartidos todavía no están conectados. No se crean sesiones ni se guardan cambios.</small></span></div>;
}
