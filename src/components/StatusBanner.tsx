import { appConfig } from "../config";
import { Icon } from "./Icon";

export function StatusBanner() {
  if (appConfig.dataMode !== "mock") return null;
  return <div className="status-banner" role="status">
    <span className="status-banner__icon"><Icon name="shield" size={18} /></span>
    <span><strong>MOCK LOCAL · DATOS FICTICIOS</strong><small>Los cambios viven en memoria y se borran al reiniciar el mock. No se envían correos.</small></span>
  </div>;
}
