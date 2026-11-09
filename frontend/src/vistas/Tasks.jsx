import React from "react";
import { Intro, Panel, PriorityBadge, StatusBadge, orderVariant } from "../comun/componentes.jsx";
import { ADVANCE_ORDER_KEY } from "../comun/constantes.js";
import { number, safeProductName } from "../comun/formato.js";

// Mis tareas (operario): solo lo pendiente, con su avance y las acciones del día
export function Tasks({ orders, onChangeStatus, navigate }) {
  const open = orders.filter((order) => ["pendiente", "en_proceso"].includes(order.estado));
  return (
    <>
      <Intro title="Mis tareas" description="Tus órdenes abiertas, primero las de mayor prioridad." />
      <Panel title={`Tareas abiertas (${open.length})`}>
        {open.map((order) => {
          const goal = Number(order.cantidad) || 0;
          const produced = Number(order.cantidad_producida) || 0;
          const progress = goal ? Math.min(100, Math.round((produced * 100) / goal)) : 0;
          return (
            <div className="task-row" key={order.id}>
              <div className="task-info">
                <strong>#{order.id} · {(safeProductName(order.producto) || "Producto no válido") + orderVariant(order)}</strong>
                <span className="task-badges"><PriorityBadge order={order} /><StatusBadge status={order.estado} /></span>
              </div>
              <div className="task-progress">
                <div className="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} aria-label={`Avance de la orden ${order.id}`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <small>{number(produced)} de {number(goal)} ({progress}%) · faltan {number(Math.max(goal - produced, 0))}</small>
              </div>
              <div className="task-actions">
                {order.estado === "pendiente" && (
                  <button className="primary-action secondary" type="button" onClick={() => onChangeStatus(order.id, "en_proceso")}>Iniciar</button>
                )}
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(ADVANCE_ORDER_KEY, String(order.id));
                    } catch {
                      // sin almacenamiento, el formulario abre con la primera orden
                    }
                    navigate("registrar");
                  }}
                >
                  Registrar avance
                </button>
              </div>
            </div>
          );
        })}
        {!open.length && <p className="empty">No tienes tareas abiertas. Lo que ya terminaste está en «Mi historial».</p>}
      </Panel>
    </>
  );
}
