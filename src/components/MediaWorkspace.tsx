import { Icon } from "./Icon";
export function MediaWorkspace() {
  return <div className="media-workspace">
    <div className="module-toolbar"><label className="module-search"><Icon name="search" size={17} /><input type="search" placeholder="Buscar archivos" disabled aria-label="Buscar archivos" /></label><select disabled aria-label="Filtrar archivos"><option>Todos los tipos</option></select><button className="button button--primary" disabled><Icon name="plus" size={17} /> Subir archivo</button></div>
    <section className="media-drop panel"><span className="media-drop__icon"><Icon name="media" size={25} /></span><h2>Biblioteca de medios</h2><p>Las fotografías y los documentos se cargarán y validarán según los límites del contrato.</p><button className="button button--primary" disabled>Elegir archivos</button><small>Tipos admitidos y tamaño máximo: pendientes de efp30-api.</small></section>
    <div className="workspace-footnote"><Icon name="lock" size={15} /> La validación del archivo y del permiso se realiza también en backend.</div>
  </div>;
}
