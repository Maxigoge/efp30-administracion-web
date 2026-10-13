import { Icon } from "./Icon";
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export function CalendarWorkspace() {
  return <div className="calendar-layout">
    <section className="calendar-panel panel">
      <div className="calendar-heading"><div><p className="eyebrow">AGENDA INSTITUCIONAL</p><h2>Calendario</h2></div><button className="button button--primary" disabled><Icon name="plus" size={17} /> Nuevo evento</button></div>
      <div className="calendar-month"><button disabled aria-label="Mes anterior">‹</button><strong>Calendario institucional</strong><button disabled aria-label="Mes siguiente">›</button></div>
      <div className="calendar-grid">{weekdays.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: 35 }, (_, index) => <span className="calendar-day" key={index} aria-hidden="true" />)}</div>
      <div className="calendar-empty"><Icon name="calendar" size={18} /><span>Las fechas se mostrarán al conectar el calendario oficial.</span></div>
    </section>
    <aside className="calendar-side panel"><span className="panel__icon"><Icon name="clock" /></span><p className="eyebrow">PRÓXIMAS FECHAS</p><h3>Tu agenda, al día</h3><p>Los eventos y sus estados se cargarán desde efp30-api.</p><div className="workspace-footnote"><Icon name="lock" size={15} /> Sin eventos de ejemplo</div></aside>
  </div>;
}
