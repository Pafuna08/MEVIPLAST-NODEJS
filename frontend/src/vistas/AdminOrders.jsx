import React, { useState } from "react";
import { Field, PriorityBadge, StatusBadge, VariantFields, orderVariant } from "../comun/componentes.jsx";
import { Dialogo } from "../comun/Dialogo.jsx";
import { dateTimeFormat, number, safeProductName, sanitizePayload, sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS, clearInvalid, useObligatorios } from "../comun/validacion.js";

const OPEN_STATES = ["pendiente", "en_proceso"];
const FILTERS = [
  ["abiertas", "Abiertas"],
  ["pendiente", "Pendientes"],
  ["en_proceso", "En proceso"],
  ["finalizado", "Finalizadas"],
  ["cancelado", "Canceladas"],
  ["todas", "Todas"],
];

const matches = (order, filter) =>
  filter === "todas" || (filter === "abiertas" ? OPEN_STATES.includes(order.estado) : order.estado === filter);

function progressOf(order) {
  const goal = Number(order.cantidad) || 0;
  const produced = Number(order.cantidad_producida) || 0;
  return { goal, produced, percent: goal ? Math.round((produced * 100) / goal) : 0 };
}

const productLabel = (order) => (safeProductName(order.producto) || "Producto no válido") + orderVariant(order);

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormat.format(date) : "—";
}

function ProgressBar({ order }) {
  const { percent } = progressOf(order);
  return (
    <div className="performance-cell">
      <div className="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} aria-label={`Avance de la orden ${order.id}`}>
        <span style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <span>{percent}%</span>
    </div>
  );
}

// Vista del administrador (sugerencia del instructor): tabla compacta y el detalle con sus acciones en una ventana
export function AdminOrders({ orders, data, lines, onEditOrder, onAssignOrder, onCancel }) {
  const [filter, setFilter] = useState("abiertas");
  const [selectedId, setSelectedId] = useState(null);
  const visible = orders.filter((order) => matches(order, filter));
  const selected = orders.find((order) => order.id === selectedId);
  const filterLabel = FILTERS.find(([key]) => key === filter)[1].toLowerCase();
  return (
    <>
      <div className="order-filters" role="group" aria-label="Filtrar órdenes por estado">
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" className={`filter-chip${filter === key ? " active" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <span>{orders.filter((order) => matches(order, key)).length}</span>
          </button>
        ))}
      </div>
      <p className="orders-hint">Haz clic en una orden para ver su detalle, editarla, asignarle operario o cancelarla.</p>
      <div className="table-wrap">
        <table className="orders-table">
          <thead>
            <tr><th>Orden</th><th>Producto</th><th>Operario</th><th>Avance</th><th>Prioridad</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {visible.map((order) => {
              const { produced, goal } = progressOf(order);
              return (
                <tr key={order.id} className="clickable-row" onClick={() => setSelectedId(order.id)}>
                  <td>
                    <button className="link-button" type="button" aria-label={`Ver la orden #${order.id}`} onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(order.id);
                    }}>#{order.id}</button>
                  </td>
                  <td>{productLabel(order)}</td>
                  <td>{order.responsable_nombre ? sanitizeText(order.responsable_nombre) : <span className="muted-text">Sin asignar</span>}</td>
                  <td title={`${number(produced)} de ${number(goal)}`}><ProgressBar order={order} /></td>
                  <td><PriorityBadge order={order} /></td>
                  <td><StatusBadge status={order.estado} /></td>
                </tr>
              );
            })}
            {!visible.length && <tr><td colSpan={6}>{orders.length ? `No hay órdenes ${filterLabel}.` : "No hay órdenes."}</td></tr>}
          </tbody>
        </table>
      </div>
      {selected && (
        <OrderDetail
          order={selected}
          data={data}
          lines={lines}
          onClose={() => setSelectedId(null)}
          onEditOrder={onEditOrder}
          onAssignOrder={onAssignOrder}
          onCancel={(order) => {
            setSelectedId(null);
            onCancel(order);
          }}
        />
      )}
    </>
  );
}

function OrderDetail({ order, data, lines, onClose, onEditOrder, onAssignOrder, onCancel }) {
  const [editing, setEditing] = useState(false);
  const [warning, check] = useObligatorios();
  const { goal, produced, percent } = progressOf(order);
  const canEdit = order.estado === "pendiente" && produced === 0;
  // CR-014: el administrador asigna el operario solo si ningún supervisor tomó la orden
  const canAssign = order.estado === "pendiente" && !order.responsable_id;
  // CR-013: el administrador solo cancela órdenes abiertas
  const canCancel = OPEN_STATES.includes(order.estado);
  return (
    <Dialogo onClose={onClose} labelledBy="order-detail-title" className="order-modal">
      <div className="order-modal-header">
        <div>
          <h3 id="order-detail-title">Orden #{order.id}</h3>
          <p>{productLabel(order)}</p>
        </div>
        <div className="order-modal-badges"><PriorityBadge order={order} /><StatusBadge status={order.estado} /></div>
      </div>
      {!editing ? (
        <>
          <dl className="confirm-summary order-summary">
            <dt>Meta</dt><dd>{number(goal)} unidades</dd>
            <dt>Producido</dt><dd>{number(produced)} unidades ({percent}%)<ProgressBar order={order} /></dd>
            <dt>Materia prima</dt><dd>{order.materia_prima_nombre ? sanitizeText(order.materia_prima_nombre) : "—"}</dd>
            <dt>Operario</dt><dd>{order.responsable_nombre ? sanitizeText(order.responsable_nombre) : "Sin asignar"}</dd>
            <dt>Supervisor</dt><dd>{order.supervisor_nombre ? sanitizeText(order.supervisor_nombre) : "Pendiente para los supervisores"}</dd>
            <dt>Creada</dt><dd>{formatDate(order.fecha_inicio)}</dd>
            {order.fecha_fin && <><dt>Cerrada</dt><dd>{formatDate(order.fecha_fin)}</dd></>}
            {order.observaciones && <><dt>Observaciones</dt><dd>{sanitizeText(order.observaciones)}</dd></>}
          </dl>
          {canAssign && (
            <form
              className="data-form"
              aria-label={`Asignar operario a la orden #${order.id}`}
              noValidate
              onInput={clearInvalid}
              onSubmit={(event) => {
                if (!check(event, ["responsable_id"], "asignar")) return;
                event.preventDefault();
                onAssignOrder(order.id, new FormData(event.currentTarget).get("responsable_id"));
              }}
            >
              <Field label="Asignar operario (si falta el supervisor)">
                <select name="responsable_id" defaultValue="">
                  <option value="" disabled>Selecciona un operario</option>
                  {(data.operators || []).map((operator) => <option key={operator.id} value={operator.id}>{sanitizeText(operator.nombre)}</option>)}
                </select>
              </Field>
              {warning.key === "asignar" && <p className="form-error" role="alert">{warning.text}</p>}
              <button className="primary-action" type="submit" disabled={!(data.operators || []).length}>Asignar operario</button>
            </form>
          )}
          {order.estado === "pendiente" && !canEdit && <p className="orders-hint">Ya tiene avance registrado: no se puede editar.</p>}
          <div className="confirm-actions">
            {canCancel && <button className="confirm-delete" type="button" onClick={() => onCancel(order)}>Cancelar orden</button>}
            {canEdit && <button className="confirm-edit" type="button" onClick={() => setEditing(true)}>Editar</button>}
            <button className="confirm-cancel" type="button" autoFocus onClick={onClose}>Cerrar</button>
          </div>
        </>
      ) : (
        <form
          className="data-form"
          aria-label={`Editar orden #${order.id}`}
          noValidate
          onInput={clearInvalid}
          onSubmit={async (event) => {
            if (!check(event, ["producto", ...VARIANT_FIELDS, "cantidad", "materia_prima_id"], "editar")) return;
            event.preventDefault();
            await onEditOrder(order.id, sanitizePayload(Object.fromEntries(new FormData(event.currentTarget))));
          }}
        >
          <Field label="Producto"><select name="producto" defaultValue={order.producto}>{lines.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
          <VariantFields idPrefix={`orden-${order.id}`} order={order} />
          <Field label="Meta"><input name="cantidad" type="number" defaultValue={order.cantidad} /></Field>
          <Field label="Materia prima"><select name="materia_prima_id" defaultValue={order.materia_prima_id || ""}><option value="" disabled>Selecciona la materia prima</option>{(data.materials || []).map((material) => <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>)}</select></Field>
          <Field label="Prioridad"><select name="prioridad" defaultValue={order.prioridad}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
          {warning.key === "editar" && <p className="form-error" role="alert">{warning.text}</p>}
          <div className="confirm-actions">
            <button className="confirm-cancel" type="button" onClick={() => setEditing(false)}>Volver al detalle</button>
            <button className="primary-action" type="submit">Guardar cambios</button>
          </div>
        </form>
      )}
    </Dialogo>
  );
}
