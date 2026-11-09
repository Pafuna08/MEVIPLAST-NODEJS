import React, { useEffect, useState } from "react";
import { api } from "../comun/api.js";
import { DataTable, Intro, OrderRow, Panel } from "../comun/componentes.jsx";
import { historyPeriods } from "../comun/constantes.js";
import { number, safeProductName, sanitizeText, shortDate } from "../comun/formato.js";

// Mi historial (operario): avances registrados por periodo y órdenes cerradas
export function History({ orders, token }) {
  const [period, setPeriod] = useState("mensual");
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setRecords(null);
    setError("");
    api(`/api/produccion/mis-registros?periodo=${period}`, token)
      .then((result) => current && setRecords(result))
      .catch((cause) => current && setError(cause.message || "No se pudieron cargar tus registros."));
    return () => { current = false; };
  }, [period, token]);
  const closed = orders.filter((order) => ["finalizado", "cancelado"].includes(order.estado));
  const finished = closed.filter((order) => order.estado === "finalizado").length;
  const periodName = historyPeriods.find(([value]) => value === period)[1];
  const periodLabel = periodName.toLowerCase();
  return (
    <>
      <Intro title="Mi historial" description="Lo que has producido, por periodo, y tus órdenes cerradas." />
      <div className="report-periods history-periods" role="group" aria-label="Periodo">
        {historyPeriods.map(([value, label]) => (
          <button key={value} type="button" className={`report-period-button ${period === value ? "active" : ""}`} aria-pressed={period === value} onClick={() => setPeriod(value)}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="empty" role="alert">{error}</p>}
      {!records && !error && <p className="empty" role="status">Cargando información...</p>}
      {records && (
        <>
          <section className="stats-grid">
            <article className="stat-card"><div className="stat-head"><span>Unidades producidas</span></div><strong>{number(records.resumen.unidades)}</strong><small>{periodName} · {records.desde === records.hastaInclusivo ? shortDate(records.desde, true) : `${shortDate(records.desde)} al ${shortDate(records.hastaInclusivo)}`}</small></article>
            <article className="stat-card"><div className="stat-head"><span>Registros de avance</span></div><strong>{number(records.resumen.registros)}</strong><small>En {records.resumen.ordenes} {records.resumen.ordenes === 1 ? "orden" : "órdenes"}</small></article>
            <article className="stat-card"><div className="stat-head"><span>Órdenes finalizadas</span></div><strong>{finished}</strong><small>Desde que tienes tareas asignadas</small></article>
          </section>
          <Panel title="Mis registros de producción">
            <DataTable
              columns={["Fecha", "Orden", "Producto", "Cantidad", "Observación"]}
              empty={`No registraste producción ${periodLabel}.`}
              rows={records.detalle.map((item) => ({
                key: item.id,
                cells: <><td>{item.fecha}</td><td>{item.orden_id ? `#${item.orden_id}` : "—"}</td><td>{safeProductName(item.producto) || "Producto no válido"}</td><td>{number(item.cantidad)}</td><td>{sanitizeText(item.observaciones || "—")}</td></>,
              }))}
            />
          </Panel>
        </>
      )}
      <Panel title={`Órdenes cerradas (${closed.length})`}>
        {closed.map((order) => <OrderRow key={order.id} order={order} canManage={false} />)}
        {!closed.length && <p className="empty">Todavía no tienes órdenes finalizadas o canceladas.</p>}
      </Panel>
    </>
  );
}
