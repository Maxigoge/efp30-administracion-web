import { useState, type FormEvent } from "react";
import { ApiRequestError } from "../api/errors";
import { appConfig } from "../config";
import { useAuth } from "../auth/AuthProvider";
import { Icon } from "./Icon";
import { StatusBanner } from "./StatusBanner";

export function LoginPanel() {
  const { signIn, restoreError, retryRestore } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signIn(email, password);
    } catch (error) {
      setMessage(error instanceof ApiRequestError ? error.failure.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  function chooseMockAccount(value: string) {
    setEmail(value);
    setPassword("");
    setMessage(null);
  }

  return <section className="login-card" aria-labelledby="login-title">
    <div className="login-card__mark"><Icon name="lock" size={21} /></div>
    <p className="eyebrow">ÁREA DE GESTIÓN</p>
    <h1 id="login-title">Ingresá a tu cuenta</h1>
    <p className="login-card__intro">Usá tus credenciales institucionales para administrar los contenidos de la escuela.</p>
    {restoreError && <div className="inline-error" role="alert"><span>{restoreError}</span><button type="button" onClick={retryRestore}>Reintentar</button></div>}
    <form onSubmit={submit}>
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@institución.edu.ar" required disabled={busy} />
      <label htmlFor="password">Contraseña</label>
      <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" required minLength={1} disabled={busy} />
      <button className="button button--primary button--wide" type="submit" disabled={busy}>{busy ? "Conectando…" : "Iniciar sesión"} <Icon name="arrow" size={17} /></button>
    </form>
    {message && <p className="login-notice" role="alert">{message}</p>}
    {appConfig.dataMode === "mock" && <div className="mock-login">
      <strong>Cuentas ficticias del mock</strong>
      <span>El servidor compartido acepta cualquier contraseña no vacía para estas cuentas.</span>
      <div><button type="button" onClick={() => chooseMockAccount("admin@efp30.test")}>Completar ADMIN</button><button type="button" onClick={() => chooseMockAccount("editora@efp30.test")}>Completar EDITOR</button></div>
    </div>}
  </section>;
}

export function LoginPage() {
  return <main className="login-page">
    <div className="login-brand"><div className="brand__seal">30</div><div><strong>EFP N°30</strong><small>ESCUELA DE FORMACIÓN PROFESIONAL</small></div></div>
    <div className="login-layout">
      <div className="login-aside"><span className="login-aside__orb" /><p className="eyebrow">ESCUELA PÚBLICA · FORMACIÓN PARA EL TRABAJO</p><h2>Una comunidad<br />que <em>aprende haciendo.</em></h2><p className="login-aside__description">Administrá noticias, cursos y la información institucional de EFP N°30.</p><div className="login-aside__foot"><Icon name="school" size={18} /> Administración institucional</div></div>
      <LoginPanel />
    </div>
    <div className="login-status"><StatusBanner /></div>
    <footer className="login-footer"><span>© EFP N°30 · Escuela de Formación Profesional</span><span>Acceso administrativo</span></footer>
  </main>;
}
