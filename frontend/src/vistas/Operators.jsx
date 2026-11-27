import React from "react";
import { Intro, Paginacion, ProgressBar, orderVariant, usePaginacion } from "../comun/componentes.jsx";
import { number, safeProductName, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";

// Rediseño: una tarjeta por operario con su carga de trabajo y el avance de cada orden activa
export function Operators({ data }) {
  const isOpen = (order) => ["pendiente", "en_proceso"].includes(order.estado);
  const paginas = usePaginacion(data.operators);
  return (
    <>
      <Intro icon="operarios" title="Operarios" description="Disponibilidad basada en órdenes activas." />
      <section className="operator-grid" aria-label="Equipo de producción">
        {paginas.visibles.map((operator) => {
          const open = data.orders.filter((order) => Number(order.responsable_id) === Number(operator.id) && isOpen(order));
          return (
            <article className="panel operator-card" key={operator.id}>
              <header className="operator-head">
                <span className="operator-icon" aria-hidden="true"><Icono nombre="operarios" size={22} /></span>
                <div>
                  <h3>{sanitizeText(operator.nombre)}</h3>
                  <span>{sanitizeText(operator.usuario)}</span>
                </div>
                <span className={`status ${open.length ? "progress" : "success"}`}>
                  {open.length ? `${open.length} ${open.length === 1 ? "orden activa" : "órdenes activas"}` : "Disponible"}
                </span>
              </header>
              {open.length ? (
                <ul className="operator-orders">
                  {open.map((order) => {
                    const goal = Number(order.cantidad) || 0;
                    const produced = Number(order.cantidad_producida) || 0;
                    return (
                      <li key={order.id}>
                        <span className="operator-order-name">#{order.id} · {(safeProductName(order.producto) || "Producto no válido") + orderVariant(order)}</span>
                        <span className="operator-order-units">{number(produced)} / {number(goal)}</span>
                        <ProgressBar value={goal ? Math.round((produced * 100) / goal) : 0} label={`Avance de la orden ${order.id}`} />
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="empty">Sin órdenes activas: se le puede asignar una tarea.</p>}
            </article>
          );
        })}
        {!data.operators.length && <p className="empty">No hay operarios activos.</p>}
      </section>
      <div className="paginado">
        <Paginacion control={paginas} etiqueta="Páginas de operarios" />
      </div>
    </>
  );
}
