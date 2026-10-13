import { Icon } from "./Icon";

const states = ["Todos", "Borradores", "Publicados", "Archivados"];

export function NewsWorkspace() {
  return <div className="workspace-section">
    <div className="module-toolbar">
      <label className="module-search"><Icon name="search" size={17} /><input type="search" placeholder="Buscar noticias" disabled aria-label="Buscar noticias" /></label>
      <select disabled aria-label="Filtrar por estado"><option>Todos los estados</option></select>
      <button className="button button--primary" disabled><Icon name="plus" size={17} /> Nuevo borrador</button>
    </div>
    <div className="news-tabs" aria-label="Estado de noticias">
      {states.map((state, index) => <button key={state} className={index === 0 ? "news-tab news-tab--active" : "news-tab"} disabled>{state}<span>—</span></button>)}
    </div>
    <section className="news-empty">
      <div className="news-empty__art"><span /><Icon name="news" size={28} /></div>
      <p className="eyebrow">CONTENIDO EDITORIAL</p>
      <h2>Las noticias aparecerán acá</h2>
      <p>Con el contrato disponible vas a poder crear y editar borradores, publicar contenidos y archivarlos.</p>
      <div className="news-empty__flow"><span>Borrador</span><Icon name="arrow" size={15} /><span>Publicado</span><Icon name="arrow" size={15} /><span>Archivado</span></div>
    </section>
    <div className="workspace-footnote"><Icon name="lock" size={15} /> Sin fixtures de efp30-api · Los controles se habilitarán al integrar el contrato</div>
  </div>;
}
