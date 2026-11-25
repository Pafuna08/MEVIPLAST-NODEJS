import React, { useState } from "react";
import { Panel, PriorityBadge, ProgressBar, StatusBadge, orderVariant } from "../comun/componentes.jsx";
import { money, number, safeProductName, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { StackedBarList, groupByLine } from "../comun/BarrasApiladas.jsx";
import { CancelOrderDialog, OrderDetail } from "./AdminOrders.jsx";

// Rediseño del Inicio: franja de bienvenida con lo urgente, tarjetas con ícono y color,
// avance de las órdenes en barras, «Requiere atención» y producción por línea.
export function Home({ data, role, navigate, lines = [], onEditOrder, onAssignOrder, onChangeStatus }) {
  // Clic en una orden de «Avance de órdenes»: su detalle en una ventana, como en Producción.
  // El administrador la gestiona ahí mismo (editar, asignar, cancelar); los demás roles solo la consultan.
  const [selectedId, setSelectedId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const selected = data.orders.find((order) => order.id === selectedId);
  const active = data.orders.filter((order) => ["pendiente", "en_proceso"].includes(order.estado));
  const produced = data.orders.reduce((sum, order) => sum + Number(order.cantidad_producida || 0), 0);
  // Unidades producidas por línea, de mayor a menor; cada barra se divide por variante (MEVI-120)
  const lineItems = groupByLine(
    data.orders.filter((order) => safeProductName(order.producto) && Number(order.cantidad_producida || 0) > 0),
    (order) => safeProductName(order.producto) + orderVariant(order),
    (order) => order.cantidad_producida,
  );
  const producedByLine = lineItems.map((item) => [item.etiqueta, item.valor]);
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
      ? [["asignar", "Asignar tareas", true], ["reportes", "Ver reportes", false]]
      : [["produccion", "+ Nueva orden", false], ["ventas", "+ Registrar venta", false], ["reportes", "Ver reportes", true]];
  const summary = role === "operario"
    ? `Tienes ${active.length} ${active.length === 1 ? "tarea activa" : "tareas activas"}.`
    : `Hay ${pending} ${pending === 1 ? "orden pendiente" : "órdenes pendientes"}${lowStock.length ? ` y ${lowStock.length} ${lowStock.length === 1 ? "materia prima" : "materias primas"} en stock bajo` : ""}.`;
  return (
    <>
      <section className="home-hero" aria-label="Resumen del día">
        <div>
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
          <p className="orders-hint">Haz clic en una orden para ver su detalle{role === "admin" ? ", editarla, asignarle operario o cancelarla" : ""}.</p>
          <ul className="order-progress-list">
            {data.orders.slice(0, 5).map((order) => {
              const goal = Number(order.cantidad) || 0;
              const done = Number(order.cantidad_producida) || 0;
              const progress = goal ? Math.min(Math.round((done * 100) / goal), 100) : 0;
              return (
                <li key={order.id}>
                  {/* Columnas fijas: producto | avance | prioridad | estado, para que todo quede alineado */}
                  <button className="order-progress-row" type="button" onClick={() => setSelectedId(order.id)}>
                    <span className="order-progress-info">
                      <strong>#{order.id} · {(safeProductName(order.producto) || "Producto no válido") + orderVariant(order)}</strong>
                      <span>{sanitizeText(order.responsable_nombre || "Sin asignar")} · {number(done)} / {number(goal)}</span>
                    </span>
                    <span className="order-cell"><ProgressBar value={progress} label={`Avance de la orden ${order.id}`} /></span>
                    <span className="order-cell"><PriorityBadge order={order} /></span>
                    <span className="order-cell"><StatusBadge status={order.estado} /></span>
                  </button>
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
                <div><strong>{pending} {pending === 1 ? "orden pendiente" : "órdenes pendientes"}</strong><span>{role === "operario" ? "Inícialas desde Mis tareas." : role === "supervisor" ? "Las que no tienen operario están en «Asignar tareas»." : "Esperan supervisor u operario."}</span></div>
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
          <StackedBarList label="Unidades producidas por línea" format={number} unit="Unidades" items={lineItems} />
        </Panel>
      )}
      {selected && (
        <OrderDetail
          order={selected}
          data={data}
          lines={lines}
          readOnly={role !== "admin"}
          onClose={() => setSelectedId(null)}
          onEditOrder={onEditOrder}
          onAssignOrder={onAssignOrder}
          onCancel={(order) => {
            setSelectedId(null);
            setCancelTarget(order);
          }}
        />
      )}
      {cancelTarget && (
        <CancelOrderDialog
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            onChangeStatus(cancelTarget.id, "cancelado");
            setCancelTarget(null);
          }}
        />
      )}
    </>
  );
}
