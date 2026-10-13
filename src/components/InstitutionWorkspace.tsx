import { Icon } from "./Icon";
const fields = ["Nombre institucional", "Descripción", "Correo de contacto", "Teléfono", "Dirección"];
export function InstitutionWorkspace() {
  return <div className="institution-layout">
    <section className="panel institution-panel"><div className="institution-heading"><span className="workspace-card__icon workspace-card__icon--blue"><Icon name="school" /></span><div><p className="eyebrow">DATOS INSTITUCIONALES</p><h2>Información de la escuela</h2></div></div>
      <div className="institution-form">{fields.map((field) => <label key={field}>{field}<input disabled placeholder="Disponible al integrar la API" /></label>)}<label className="institution-wide">Presentación<textarea rows={4} disabled placeholder="El texto institucional se cargará desde el servidor." /></label></div>
      <div className="institution-actions"><span><Icon name="lock" size={15} /> Edición reservada al rol ADMIN</span><button className="button button--primary" disabled>Guardar cambios</button></div>
    </section>
    <aside className="institution-note"><Icon name="shield" size={21} /><p className="eyebrow">PERMISOS</p><h3>Acceso de administración</h3><p>La API debe comprobar ADMIN en cada escritura de institución y contacto. La interfaz también ocultará controles a EDITOR.</p></aside>
  </div>;
}
