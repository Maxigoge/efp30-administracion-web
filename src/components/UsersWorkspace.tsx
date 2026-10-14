import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as usersApi from "../api/users";
import type { AdminRole, AdminUser, UserCreateRequest, UserUpdateRequest } from "../api/types";
import { ApiError, errorText, isConflict, TextField } from "./ApiFeedback";
import { Icon } from "./Icon";
import { roleLabels } from "../auth/types";

const allRoles: AdminRole[] = ["ADMIN", "EDITOR"];
type UserDraft = { displayName: string; email: string; password: string; roles: AdminRole[]; enabled: boolean };
function fromUser(user: AdminUser): UserDraft { return { displayName: user.displayName, email: user.email, password: "", roles: [...user.roles], enabled: user.enabled }; }
const blankUser = (): UserDraft => ({ displayName: "", email: "", password: "", roles: ["EDITOR"], enabled: true });

export function UsersWorkspace({ onDirtyChange }: { onDirtyChange: (dirty: boolean, blocked?: boolean) => void }) {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { const page = await usersApi.listUsers(); setItems(page.items); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function saveUser(draft: UserDraft, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("save"); setError(null); setConflictId(null);
    if (!draft.roles.length) { setError("Elegí al menos un rol."); setBusy(null); return; }
    try {
      if (editing) await usersApi.updateUser(editing.id, { version: editing.version, displayName: draft.displayName.trim(), roles: draft.roles, enabled: draft.enabled } satisfies UserUpdateRequest);
      else await usersApi.createUser({ displayName: draft.displayName.trim(), email: draft.email.trim(), password: draft.password, roles: draft.roles } satisfies UserCreateRequest);
      setEditing(null); setCreating(false); await refresh();
    } catch (cause) { setError(errorText(cause)); if (isConflict(cause) && editing) setConflictId(editing.id); }
    finally { setBusy(null); }
  }
  async function reloadLatest() {
    if (!conflictId) return;
    setBusy("reload");
    try {
      const latest = await usersApi.getUser(conflictId);
      if (editing?.id === latest.id) setEditing(latest);
      if (resetting?.id === latest.id) setResetting(latest);
      setConflictId(null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(null); }
  }
  async function resetPassword(user: AdminUser, password: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(user.id); setError(null); setConflictId(null);
    try { await usersApi.resetUserPassword(user.id, { version: user.version, newPassword: password }); setResetting(null); await refresh(); }
    catch (cause) { setError(errorText(cause)); if (isConflict(cause)) setConflictId(user.id); }
    finally { setBusy(null); }
  }

  return <div className="users-workspace">
    {error && <ApiError error={error} onRetry={conflictId ? () => { void reloadLatest(); } : undefined} />}
    <div className="users-toolbar"><div className="users-counter"><span className="users-counter__icon"><Icon name="users" /></span><div><strong>Usuarios administrativos</strong><small>{loading ? "Consultando la API…" : `${items.length} cuentas · ADMIN / EDITOR`}</small></div></div><button className="button button--primary" onClick={() => { setCreating(true); setEditing(null); setError(null); }}><Icon name="plus" size={17} /> Crear usuario</button></div>
    {(creating || editing) && <UserEditor key={`${editing?.id ?? "new"}-${editing?.version ?? 0}`} item={editing} busy={busy === "save"} onSave={saveUser} onCancel={() => { setCreating(false); setEditing(null); }} onDirtyChange={onDirtyChange} />}
    {resetting && <PasswordReset key={`${resetting.id}-${resetting.version}`} user={resetting} busy={busy === resetting.id} onSave={(password, event) => resetPassword(resetting, password, event)} onCancel={() => setResetting(null)} onDirtyChange={onDirtyChange} />}
    <section className="users-panel panel">
      <div className="users-table-head"><span>PERSONA</span><span>ROL</span><span>ESTADO</span><span>ACCIONES</span></div>
      {loading ? <div className="users-empty"><p>Consultando usuarios…</p></div> : items.length === 0 ? <div className="users-empty"><span className="users-empty__icon"><Icon name="users" size={23} /></span><h2>No hay cuentas administrativas</h2><p>El primer administrador debe ser configurado por el backend.</p></div> : <div className="users-list">{items.map((user) => <article className="users-row" key={user.id}><div className="users-person"><span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>{user.email} · creado {new Date(user.createdAt).toLocaleDateString("es-AR")}</small></div></div><div className="users-role-list">{user.roles.map((role) => <span className={`role-chip role-chip--${role.toLowerCase()}`} key={role}><i />{roleLabels[role]}</span>)}</div><span className={`status-tag ${user.enabled ? "status-tag--published" : "status-tag--archived"}`}>{user.enabled ? "Habilitado" : "Deshabilitado"}</span><div className="users-row__actions"><button className="quiet-button" onClick={() => { setEditing(user); setCreating(false); }}>Editar</button><button className="quiet-button" onClick={() => { setResetting(user); setCreating(false); setEditing(null); }}>Restablecer clave</button></div></article>)}</div>}
      <div className="users-roles"><strong>Roles del sistema</strong><div>{allRoles.map((role) => <span className={`role-chip role-chip--${role.toLowerCase()}`} key={role}><i />{roleLabels[role]}</span>)}</div></div>
    </section>
    <div className="users-permission"><Icon name="shield" size={17} /><span>Solo ADMIN puede administrar cuentas y asignar roles. El backend verifica cada operación y bloquea retirar el último ADMIN habilitado.</span></div>
    <div className="workspace-footnote"><Icon name="lock" size={15} /> No se envían emails. Las contraseñas sólo se transmiten al API y nunca se guardan en el navegador.</div>
  </div>;
}

function UserEditor({ item, busy, onSave, onCancel, onDirtyChange }: { item: AdminUser | null; busy: boolean; onSave: (draft: UserDraft, event: FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void; onDirtyChange: (dirty: boolean, blocked?: boolean) => void }) {
  const baseline = item ? fromUser(item) : blankUser();
  const baselineJson = JSON.stringify(baseline);
  const [draft, setDraft] = useState<UserDraft>(baseline);
  const dirty = JSON.stringify(draft) !== baselineJson;
  useEffect(() => {
    onDirtyChange(dirty || busy, busy);
    return () => onDirtyChange(false, false);
  }, [dirty, busy, onDirtyChange]);
  function toggle(role: AdminRole) { setDraft((current) => ({ ...current, roles: current.roles.includes(role) ? current.roles.filter((value) => value !== role) : [...current.roles, role] })); }
  return <form className="editor-panel" onSubmit={(event) => { void onSave(draft, event); }}><div className="editor-panel__heading"><div><p className="eyebrow">CUENTA ADMINISTRATIVA · v{item?.version ?? 0}</p><h2>{item ? "Editar usuario" : "Crear usuario"}</h2><p>La sesión del usuario se invalida cuando cambia su cuenta.</p></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Cerrar"><Icon name="close" /></button></div>
    <div className="form-grid"><TextField label="Nombre"><input required maxLength={120} value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} /></TextField><TextField label="Email"><input required type="email" maxLength={254} disabled={Boolean(item)} value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></TextField>{!item && <TextField label="Contraseña inicial (12–128 caracteres)"><input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} /></TextField>}<fieldset className="role-field"><legend>Roles</legend>{allRoles.map((role) => <label key={role}><input type="checkbox" checked={draft.roles.includes(role)} onChange={() => toggle(role)} /> {roleLabels[role]}</label>)}</fieldset>{item && <label className="checkbox-field"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /> Cuenta habilitada</label>}{!item && <p className="form-help form-field--wide">La contraseña inicial no se manda por correo. Acordá su entrega fuera de esta aplicación.</p>}</div>
    <div className="editor-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy}>{busy ? "Guardando…" : item ? "Guardar cambios" : "Crear cuenta"}</button></div>
  </form>;
}
function PasswordReset({ user, busy, onSave, onCancel, onDirtyChange }: { user: AdminUser; busy: boolean; onSave: (password: string, event: FormEvent<HTMLFormElement>) => Promise<void>; onCancel: () => void; onDirtyChange: (dirty: boolean, blocked?: boolean) => void }) {
  const [password, setPassword] = useState("");
  useEffect(() => {
    onDirtyChange(Boolean(password) || busy, busy);
    return () => onDirtyChange(false, false);
  }, [password, busy, onDirtyChange]);
  return <form className="editor-panel" onSubmit={(event) => { void onSave(password, event); }}><div className="editor-panel__heading"><div><p className="eyebrow">RESTABLECER CONTRASEÑA · v{user.version}</p><h2>{user.displayName}</h2><p>El servidor invalidará las sesiones existentes. No se enviará correo.</p></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Cerrar"><Icon name="close" /></button></div><div className="form-grid"><TextField label="Nueva contraseña (12–128 caracteres)"><input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></TextField></div><div className="editor-actions"><button type="button" className="quiet-button" onClick={onCancel}>Cancelar</button><button className="button button--primary" disabled={busy}>{busy ? "Restableciendo…" : "Restablecer contraseña"}</button></div></form>;
}
