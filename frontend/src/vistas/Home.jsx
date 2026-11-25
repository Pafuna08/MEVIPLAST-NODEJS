import React from "react";
import { Panel, PriorityBadge, StatusBadge, orderVariant } from "../comun/componentes.jsx";
import { money, number, safeProductName, sanitizeText } from "../comun/formato.js";
import { BarList, Icono } from "../comun/iconos.jsx";

// Rediseño del Inicio: franja de bienvenida con lo urgente, tarjetas con ícono y color,
// avance de las órdenes en barras, «Requiere atención» y producción por línea.
export function Home({ data, role, navigate }) {
  const active = data.orders.filter((order) => ["pendiente", "en_proceso"].includes(order.estado));
  const produced = data.orders.reduce((sum, order) => sum + Number(order.cantidad_producida || 0), 0);
  // Unidades producidas por línea, de mayor a menor
  const producedByLine = Object.entries(
    data.orders.reduce((lines, order) => {
      const line = safeProductName(order.producto);
      const units = Number(order.cantidad_producida || 0);
      if (line && units > 0) lines[line] = (lines[line] || 0) + units;
      return lines;
    }, {}),
  ).sort(([, a], [, b]) => b - a);
  const salesCount = Number(data.sales?.resumen?.numero_ventas || 0);
  const salesTotal = Number(data.sales?.resumen?.total_vendido || 0);
  const pending = active.filter((order) => order.estado === "pendiente").length;
  const inProgress = active.length - pending;
  const activeDetail = `${pending} ${pending === 1 ? "pendiente" : "pendientes"} · ${inProgress} en proceso`;
  const completed = data.orders.filter((order) => order.estado === "finalizado").length;
  const soldOut = data.inventory.filter((item) => Number(item.cantidad) === 0).length;
  const lowStock = Array.isArray(data.lowStock) ? data.lowStock : [];
  const topLine = producedByLine[0];
  const stats = role === "operario"
    ? [
        { label: "Mis tareas activas", value: active.length, icon: "tareas", tone: "azul", detail: activeDetail, split: [pending, inProgress] },
        { label: "Unidades producidas", value: number(produced), icon: "produccion", tone: "verde", detail: topLine ? `Más en ${topLine[0]}: ${number(topLine[1])}` : "Todavía no hay producción registrada" },
        { label: "Completadas", value: completed, icon: "ok", tone: "morado", detail: "Órdenes finalizadas" },
        { label: "Meta pendiente", value: number(active.reduce((sum, order) => sum + Number(order.cantidad) - Number(order.cantidad_producida || 0), 0)), icon: "reloj", tone: "rojo", detail: "Unidades por producir en tus tareas activas" },
      ]
    : [
        { label: "Órdenes activas", value: active.length, icon: "ordenes", tone: "azul", detail: activeDetail, split: [pending, inProgress] },
        { label: "Unidades producidas", value: number(produced), icon: "produccion", tone: "verde", detail: topLine ? `En ${producedByLine.length} ${producedByLine.length === 1 ? "línea" : "líneas"}; lidera ${topLine[0]}` : "Todavía no hay producción registrada" },
        { label: "Inventario terminado", value: number(data.inventory.reduce((sum, item) => sum + Number(item.cantidad), 0)), icon: "inventario", tone: "morado",
          detail: `Unidades en ${data.inventory.filter((item) => Number(item.cantidad) > 0).length} variantes con existencias` },
        // CR-021: el supervisor no ve ventas; en su lugar, las órdenes finalizadas
        data.sales
          ? { label: "Ventas", value: money(salesTotal), icon: "ventas", tone: "rojo", detail: `${number(salesCount)} ${salesCount === 1 ? "venta registrada" : "ventas registradas"}${salesCount ? ` · promedio ${money(salesTotal / salesCount)}` : ""}` }
          : { label: "Completadas", value: completed, icon: "ok", tone: "rojo", detail: "Órdenes finalizadas" },
      ];
  // Accesos rápidos según el rol: solo llevan a vistas que ese rol ya tiene
  const actions = role === "operario"
    ? [["registrar", "Registrar producción", true], ["historial", "Mi historial", false]]
    : role === "supervisor"
      ? [["asignar", "Asignar tarea", true], ["reportes", "Ver reportes", false]]
      : [["produccion", "+ Nueva orden", false], ["ventas", "+ Registrar venta", false], ["reportes", "Ver reportes", true]];
  const today = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const summary = role === "operario"
    ? `Tienes ${active.length} ${active.length === 1 ? "tarea activa" : "tareas activas"}.`
    : `Hay ${pending} ${pending === 1 ? "orden pendiente" : "órdenes pendientes"}${lowStock.length ? ` y ${lowStock.length} ${lowStock.length === 1 ? "materia prima" : "materias primas"} en stock bajo` : ""}.`;
  return (
    <>
      <section className="home-hero" aria-label="Resumen del día">
        <div>
          <span className="home-hero-date">{today}</span>
          <h2>{role === "operario" ? "Mi jornada" : "Resumen operativo"}</h2>
          <p>{summary}</p>
        </div>
        <div className="home-hero-actions">
          {actions.map(([view, label, main]) => (
            <button key={view} className={main ? "hero-action main" : "hero-action"} type="button" onClick={() => navigate(view)}>{label}</button>
          ))}
        </div>
      </section>
      <section className="stats-grid">
        {stats.map((stat) => (
          <article className={`stat-card tono-${stat.tone}`} key={stat.label}>
            <div className="stat-head"><span>{stat.label}</span><i className="stat-icon" aria-hidden="true"><Icono nombre={stat.icon} /></i></div>
            <strong>{stat.value}</strong>
            {stat.split && active.length > 0 && (
              <span className="stat-split" role="img" aria-label={activeDetail}>
                <span className="split-pending" style={{ width: `${(stat.split[0] * 100) / active.length}%` }} />
                <span className="split-progress" style={{ width: `${(stat.split[1] * 100) / active.length}%` }} />
              </span>
            )}
            <small>{stat.detail}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <Panel title="Avance de órdenes" action={<button className="text-action" type="button" onClick={() => navigate(role === "operario" ? "historial" : "produccion")}>Ver todas</button>}>
          <ul className="order-progress-list">
            {data.orders.slice(0, 5).map((order) => {
              const goal = Number(order.cantidad) || 0;
              const done = Number(order.cantidad_producida) || 0;
              const progress = goal ? Math.min(Math.round((done * 100) / goal), 100) : 0;
              return (
                <li key={order.id}>
                  <div className="order-progress-info">
                    <strong>#{order.id} · {(safeProductName(order.producto) || "Producto no válido") + orderVariant(order)}</strong>
                    <span>{sanitizeText(order.responsable_nombre || "Sin asignar")} · {number(done)} / {number(goal)}</span>
                  </div>
                  <span className="order-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} aria-label={`Avance de la orden ${order.id}`}><span style={{ width: `${progress}%` }} /></span>
                  <span className="order-progress-badges"><PriorityBadge order={order} /><StatusBadge status={order.estado} /></span>
                </li>
              );
            })}
          </ul>
          {!data.orders.length && <p className="empty">Sin órdenes.</p>}
        </Panel>
        <Panel title="Requiere atención">
          <ul className="attention-list">
            {role !== "operario" && lowStock.length > 0 && (
              <li className="attention alert">
                <Icono nombre="alerta" />
                <div><strong>{lowStock.length === 1 ? "1 materia prima en stock bajo" : `${lowStock.length} materias primas en stock bajo`}</strong>
                  <span>{lowStock.slice(0, 2).map((item) => `${sanitizeText(item.nombre)}: ${number(item.cantidad)} de ${number(item.stock_minimo)} ${sanitizeText(item.unidad || "kg")}`).join(" · ")}</span></div>
              </li>
            )}
            {pending > 0 && (
              <li className="attention warning">
                <Icono nombre="reloj" />
                <div><strong>{pending} {pending === 1 ? "orden pendiente" : "órdenes pendientes"}</strong><span>{role === "operario" ? "Inícialas desde Mis tareas." : "Esperan supervisor u operario."}</span></div>
              </li>
            )}
            {role === "operario" ? (
              <li className="attention ok">
                <Icono nombre="ok" />
                <div><strong>{completed} {completed === 1 ? "orden completada" : "órdenes completadas"}</strong><span>Tu historial de producción.</span></div>
              </li>
            ) : (
              <li className={soldOut ? "attention alert" : "attention ok"}>
                <Icono nombre={soldOut ? "alerta" : "ok"} />
                <div><strong>{soldOut ? `${soldOut} ${soldOut === 1 ? "producto agotado" : "productos agotados"}` : "Sin productos agotados"}</strong><span>Inventario actual.</span></div>
              </li>
            )}
          </ul>
        </Panel>
      </div>
      {producedByLine.length > 0 && (
        <Panel title="Producción por línea" className="home-lines">
          <BarList label="Unidades producidas por línea" format={number} items={producedByLine.map(([line, units]) => ({ clave: line, etiqueta: line, valor: units }))} />
        </Panel>
      )}
    </>
  );
}
