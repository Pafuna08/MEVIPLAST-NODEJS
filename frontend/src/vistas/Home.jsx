import React from "react";
import { Intro, OrderRow, Panel } from "../comun/componentes.jsx";
import { money, number, safeProductName } from "../comun/formato.js";

export function Home({ data, role, navigate }) {
  const active = data.orders.filter((order) => ["pendiente", "en_proceso"].includes(order.estado));
  const produced = data.orders.reduce((sum, order) => sum + Number(order.cantidad_producida || 0), 0);
  // Unidades producidas por línea, de mayor a menor, para que la tarjeta diga qué se produjo
  const producedByLine = Object.entries(
    data.orders.reduce((lines, order) => {
      const line = safeProductName(order.producto);
      const units = Number(order.cantidad_producida || 0);
      if (line && units > 0) lines[line] = (lines[line] || 0) + units;
      return lines;
    }, {}),
  ).sort(([, a], [, b]) => b - a);
  // Tabla corta: línea a la izquierda y unidades alineadas a la derecha
  const producedDetail = producedByLine.length ? (
    <span className="stat-lines">
      {producedByLine.slice(0, 3).map(([line, units]) => (
        <React.Fragment key={line}><span>{line}</span><span className="stat-units">{number(units)}</span></React.Fragment>
      ))}
      {producedByLine.length > 3 && (
        <span className="stat-more">y {producedByLine.length - 3} {producedByLine.length === 4 ? "línea" : "líneas"} más</span>
      )}
    </span>
  ) : "Todavía no hay producción registrada";
  const salesCount = Number(data.sales?.resumen?.numero_ventas || 0);
  const pending = active.filter((order) => order.estado === "pendiente").length;
  const activeDetail = `${pending} ${pending === 1 ? "pendiente" : "pendientes"} · ${active.length - pending} en proceso`;
  const stats = role === "operario"
    ? [
        ["Mis tareas activas", active.length, "TA", activeDetail],
        ["Unidades producidas", number(produced), "UN", producedDetail],
        ["Completadas", data.orders.filter((order) => order.estado === "finalizado").length, "OK", "Órdenes finalizadas"],
        ["Meta pendiente", number(active.reduce((sum, order) => sum + Number(order.cantidad) - Number(order.cantidad_producida || 0), 0)), "PE", "Unidades por producir en tus tareas activas"],
      ]
    : [
        ["Órdenes activas", active.length, "OP", activeDetail],
        ["Unidades producidas", number(produced), "UN", producedDetail],
        ["Inventario terminado", number(data.inventory.reduce((sum, item) => sum + Number(item.cantidad), 0)), "INV",
          `Unidades en ${data.inventory.filter((item) => Number(item.cantidad) > 0).length} variantes con existencias`],
        // CR-021: el supervisor no ve ventas; en su lugar, las órdenes finalizadas
        data.sales
          ? ["Ventas", money(data.sales.resumen.total_vendido), "$", `${number(salesCount)} ${salesCount === 1 ? "venta registrada" : "ventas registradas"}`]
          : ["Completadas", data.orders.filter((order) => order.estado === "finalizado").length, "OK", "Órdenes finalizadas"],
      ];
  const completed = data.orders.filter((order) => order.estado === "finalizado").length;
  const soldOut = data.inventory.filter((item) => Number(item.cantidad) === 0).length;
  const destination = role === "operario" ? "registrar" : role === "supervisor" ? "asignar" : "reportes";
  return (
    <>
      <Intro
        title={role === "operario" ? "Mi jornada" : "Resumen operativo"}
        description="Información actualizada directamente desde el sistema."
        action={<button className="primary-action" type="button" onClick={() => navigate(destination)}>{role === "operario" ? "Registrar producción" : role === "supervisor" ? "Asignar tarea" : "Ver reportes"}</button>}
      />
      <section className="stats-grid">
        {stats.map(([label, value, code, detail]) => <article className="stat-card" key={label}><div className="stat-head"><span>{label}</span><i className="stat-icon" aria-hidden="true">{code}</i></div><strong>{value}</strong><small>{detail}</small></article>)}
      </section>
      <div className="dashboard-grid">
        <Panel title="Órdenes recientes" action={<button className="text-action" type="button" onClick={() => navigate(role === "operario" ? "historial" : "produccion")}>Ver todas</button>}>
          {data.orders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} canManage={false} />)}
          {!data.orders.length && <p className="empty">Sin órdenes.</p>}
        </Panel>
        <Panel title="Estado">
          <ul className="activity-list">
            <li><strong>{active.length} {active.length === 1 ? "orden activa" : "órdenes activas"}</strong><span>Revisa el seguimiento para actualizar.</span></li>
            {role === "operario" ? (
              <li><strong>{completed} {completed === 1 ? "orden completada" : "órdenes completadas"}</strong><span>Tu historial de producción.</span></li>
            ) : (
              <li><strong>{soldOut} {soldOut === 1 ? "producto agotado" : "productos agotados"}</strong><span>Inventario actual.</span></li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}
