import { Icon } from "./Icon";
import { roleLabels, type AdminRole } from "../auth/types";

const roles: AdminRole[] = ["ADMIN", "EDITOR"];

export function UsersWorkspace() {
  return <div className="users-workspace">
    <div className="users-toolbar"><div className="users-counter"><span className="users-counter__icon"><Icon name="users" /></span><div><strong>Usuarios administrativos</strong><small>Las cuentas se consultarán desde el servidor.</small></div></div><button className="button button--primary" disabled><Icon name="plus" size={17} /> Invitar usuario</button></div>
    <section className="users-panel panel">
      <div className="users-table-head"><span>PERSONA</span><span>ROL</span><span>ESTADO</span><span>ACCIONES</span></div>
      <div className="users-empty"><span className="users-empty__icon"><Icon name="users" size={23} /></span><h2>Los usuarios aparecerán acá</h2><p>No hay datos administrativos disponibles en esta vista.</p></div>
      <div className="users-roles"><strong>Roles del sistema</strong><div>{roles.map((role) => <span className={"role-chip role-chip--" + role.toLowerCase()} key={role}><i />{roleLabels[role]}</span>)}</div></div>
    </section>
    <div className="users-permission"><Icon name="shield" size={17} /><span>Solo ADMIN puede administrar cuentas y asignar roles. El backend debe validar cada permiso.</span></div>
    <div className="workspace-footnote"><Icon name="lock" size={15} /> No se simulan invitaciones ni se envían correos.</div>
  </div>;
}
