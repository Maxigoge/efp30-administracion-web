import { useState, type FormEvent } from "react";
import { appConfig, apiReadiness } from "../config";
import { getAuthGateway, IntegrationUnavailableError } from "../auth/gateway";
import { Icon } from "./Icon";
export function LoginPanel() {
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = (appConfig.dataMode === "mock" && apiReadiness.sharedFixturesImported) || (appConfig.dataMode === "real" && apiReadiness.contractImported && apiReadiness.csrfStrategyConfigured);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      const gateway = getAuthGateway();
      await gateway.login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      setNotice("La sesión se inicia desde el servidor cuando el adaptador del contrato esté conectado.");
    } catch (error) {
      setNotice(error instanceof IntegrationUnavailableError ? error.message : "No se pudo iniciar sesión.");
    } finally { setBusy(false); }
  }
  return <section className="login-card" aria-labelledby="login-title">
    <div className="login-card__mark"><Icon name="lock" size={21} /></div><p className="eyebrow">Área de gestión</p>
    <h1 id="login-title">Ingresá a tu cuenta</h1><p className="login-card__intro">Usá tus credenciales institucionales para administrar los contenidos de la escuela.</p>
    <form onSubmit={submit}><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="username" placeholder="nombre@efp30.edu.ar" required disabled={!ready || busy} /><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required disabled={!ready || busy} /><button className="button button--primary button--wide" type="submit" disabled={!ready || busy}>{busy ? "Conectando…" : "Iniciar sesión"} <Icon name="arrow" size={17} /></button></form>
    {notice && <p className="login-notice" role="status">{notice}</p>}
    <div className="login-card__security"><Icon name="shield" size={17} /><span>Sesiones de servidor · Protección CSRF del contrato</span></div>
    <button className="text-button" type="button" onClick={() => setNotice("La restauración se habilitará junto con el endpoint de sesión de efp30-api.")}>¿Olvidaste tu contraseña?</button>
  </section>;
}
