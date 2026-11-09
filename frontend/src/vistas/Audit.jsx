import React, { useState } from "react";
import { DataTable, Intro, Panel } from "../comun/componentes.jsx";
import { sanitizeText } from "../comun/formato.js";

// Bitácora de auditoría (RF-029): últimos 500 eventos, solo administrador
export function Audit({ data }) {
  const [search, setSearch] = useState("");
  const names = { LOGIN: "Inicio de sesión", RESTABLECER_PASSWORD: "Restablecer contraseña", CONSUMO_PRODUCCION: "Consumo en producción" };
  const readable = (action) => {
    if (names[action]) return names[action];
    const text = String(action || "").toLowerCase().replace(/_/g, " ").replace(/\bproduccion\b/g, "producción");
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const term = search.trim().toLowerCase();
  const events = data.events.filter((event) => !term || [event.realizado_por, readable(event.accion), event.tabla_afectada, event.detalle, event.fecha]
    .some((value) => String(value || "").toLowerCase().includes(term)));
  return (
    <>
      <Intro title="Auditoría" description="Acciones registradas en el sistema: quién hizo qué y cuándo. Se muestran los últimos 500 eventos." />
      <Panel
        title={`Eventos (${events.length}${term ? ` de ${data.events.length}` : ""})`}
        action={<label className="panel-search">Buscar <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
      >
        <DataTable columns={["Fecha", "Usuario", "Acción", "Tabla", "Detalle"]} rows={events.map((event) => ({
          key: event.id,
          cells: <><td>{event.fecha}</td><td>{sanitizeText(event.realizado_por || "Sistema")}</td><td>{readable(event.accion)}</td><td>{sanitizeText(event.tabla_afectada)}</td><td>{sanitizeText(event.detalle || "—")}</td></>,
        }))} />
        {!events.length && <p className="empty">{term ? "Ningún evento coincide con la búsqueda." : "Todavía no hay eventos registrados."}</p>}
      </Panel>
    </>
  );
}
