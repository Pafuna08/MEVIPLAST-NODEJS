import React, { useEffect, useState } from "react";
import { api } from "../comun/api.js";
import { DataTable, Field, Intro, Panel } from "../comun/componentes.jsx";
import { number, sanitizeText } from "../comun/formato.js";

const names = { LOGIN: "Inicio de sesión", RESTABLECER_PASSWORD: "Restablecer contraseña", CONSUMO_PRODUCCION: "Consumo en producción" };
const readable = (action) => {
  if (names[action]) return names[action];
  const text = String(action || "").toLowerCase().replace(/_/g, " ").replace(/\bproduccion\b/g, "producción");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const modules = {
  usuarios: "Usuarios", produccion: "Producción", plantillas_produccion: "Plantillas de producción", materia_prima: "Materias primas",
  inventario: "Inventario", ventas: "Ventas", auditoria: "Auditoría",
};
const moduleName = (table) => modules[table] || sanitizeText(String(table || "").replace(/_/g, " "));

// AAAA-MM-DD en la fecha local del navegador
function isoDate(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function initialFilters() {
  const today = new Date();
  return { desde: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), hasta: isoDate(today), usuario_id: "", accion: "", tabla: "", texto: "" };
}

// Bitácora de auditoría (RF-029, CR-016): el administrador elige qué buscar y el servidor filtra toda la
// tabla por páginas. Los inicios de sesión ya no están aquí: quedan en los archivos de accesos del servidor.
export function Audit({ token }) {
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState({ ...initialFilters(), pagina: 1 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    setError("");
    const params = new URLSearchParams(Object.entries(query).filter(([, value]) => String(value).trim() !== ""));
    api(`/api/reportes/auditoria?${params}`, token)
      .then((data) => current && setResult(data))
      .catch((cause) => current && setError(cause.message || "No se pudo consultar la auditoría."));
    return () => { current = false; };
  }, [query, token]);

  const change = (event) => setFilters((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const search = (event) => {
    event.preventDefault();
    if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
      setError("La fecha inicial no puede ser posterior a la final.");
      return;
    }
    setQuery({ ...filters, pagina: 1 });
  };
  const clear = () => {
    const empty = { desde: "", hasta: "", usuario_id: "", accion: "", tabla: "", texto: "" };
    setFilters(empty);
    setQuery({ ...empty, pagina: 1 });
  };
  const goTo = (page) => setQuery((previous) => ({ ...previous, pagina: page }));
  const options = result?.opciones || { acciones: [], tablas: [], usuarios: [] };
  const events = result?.registros || [];

  return (
    <>
      <Intro title="Auditoría" description="Acciones registradas en el sistema: quién hizo qué y cuándo. Elige qué buscar; por defecto se muestran los últimos 7 días." />
      <section className="panel form-panel">
        <header className="panel-header"><h3>Buscar en la auditoría</h3></header>
        <form className="data-form audit-filters" noValidate onSubmit={search}>
          <Field label="Desde"><input name="desde" type="date" value={filters.desde} max={filters.hasta || undefined} onChange={change} /></Field>
          <Field label="Hasta"><input name="hasta" type="date" value={filters.hasta} min={filters.desde || undefined} onChange={change} /></Field>
          <Field label="Usuario">
            <select name="usuario_id" value={filters.usuario_id} onChange={change}>
              <option value="">Todos</option>
              {options.usuarios.map((user) => <option key={user.id} value={user.id}>{sanitizeText(user.usuario)}</option>)}
            </select>
          </Field>
          <Field label="Acción">
            <select name="accion" value={filters.accion} onChange={change}>
              <option value="">Todas</option>
              {options.acciones.map((action) => <option key={action} value={action}>{readable(action)}</option>)}
            </select>
          </Field>
          <Field label="Módulo">
            <select name="tabla" value={filters.tabla} onChange={change}>
              <option value="">Todos</option>
              {options.tablas.map((table) => <option key={table} value={table}>{moduleName(table)}</option>)}
            </select>
          </Field>
          <Field label="Texto en el detalle"><input name="texto" maxLength={100} value={filters.texto} onChange={change} /></Field>
          <div className="audit-filter-actions">
            <button className="primary-action" type="submit">Buscar</button>
            <button className="primary-action secondary" type="button" onClick={clear}>Ver todo</button>
          </div>
        </form>
      </section>
      {error && <p className="empty" role="alert">{error}</p>}
      {!result && !error && <p className="empty" role="status">Cargando auditoría...</p>}
      {result && (
        <Panel title={`Eventos encontrados (${number(result.total)})`}>
          <DataTable columns={["Fecha", "Usuario", "Acción", "Módulo", "Detalle"]} rows={events.map((event) => ({
            key: event.id,
            cells: <><td>{event.fecha}</td><td>{sanitizeText(event.realizado_por || "Sistema")}</td><td>{readable(event.accion)}</td><td>{moduleName(event.tabla_afectada)}</td><td>{sanitizeText(event.detalle || "—")}</td></>,
          }))} />
          {!events.length && <p className="empty">Ningún evento coincide con la búsqueda.</p>}
          {result.paginas > 1 && (
            <nav className="audit-pages" aria-label="Páginas de la auditoría">
              <button className="primary-action secondary" type="button" disabled={result.pagina <= 1} onClick={() => goTo(result.pagina - 1)}>Anterior</button>
              <span>Página {result.pagina} de {result.paginas}</span>
              <button className="primary-action secondary" type="button" disabled={result.pagina >= result.paginas} onClick={() => goTo(result.pagina + 1)}>Siguiente</button>
            </nav>
          )}
        </Panel>
      )}
    </>
  );
}
