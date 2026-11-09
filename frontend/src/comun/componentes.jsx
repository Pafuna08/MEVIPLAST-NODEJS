import React from "react";
import { productColors } from "./constantes.js";
import { number, safeProductName, sanitizeText } from "./formato.js";
import { clearInvalid, useObligatorios } from "./validacion.js";

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <header className="panel-header">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function DataTable({ columns, rows, empty = "No hay datos para mostrar." }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => <tr key={row.key ?? index}>{row.cells}</tr>)
          ) : (
            <tr><td colSpan={columns.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, children }) {
  return <label>{label}{children}</label>;
}

export function FormPanel({ title, onSubmit, children, saving, obligatorios = [], limites = {} }) {
  const [warning, check] = useObligatorios();
  return (
    <section className="panel form-panel">
      <header className="panel-header"><h3>{title}</h3></header>
      <form
        className="data-form"
        noValidate
        onInput={clearInvalid}
        onSubmit={(event) => {
          if (check(event, obligatorios, "form", limites)) onSubmit(event);
        }}
      >
        {children}
        {warning.text && <p className="form-error" role="alert">{warning.text}</p>}
        <button className="primary-action" type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </section>
  );
}

export function Intro({ title, description, action }) {
  return (
    <div className="page-intro">
      <div><h2>{title}</h2><p>{description}</p></div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const style = {
    finalizado: "success",
    en_proceso: "progress",
    cancelado: "alert",
  }[status] || "pending";
  return <span className={`status ${style}`}>{String(status || "").replace("_", " ")}</span>;
}

// Solo en órdenes abiertas: es lo que decide el orden de atención
export function PriorityBadge({ order }) {
  if (["finalizado", "cancelado"].includes(order.estado) || !order.prioridad) return null;
  return <span className={`status priority ${order.prioridad}`}>Prioridad {order.prioridad}</span>;
}

// Medida, calibre y color de la orden; las órdenes anteriores a la variante no la tienen
export function orderVariant(order) {
  if (!order.medida || !order.calibre || !order.color) return "";
  return ` · ${sanitizeText(order.medida)} · calibre ${sanitizeText(order.calibre)} · ${sanitizeText(order.color)}`;
}

export function VariantFields({ idPrefix, order }) {
  const suggestions = [
    ["medida", "Medida", ["6 x 8", "6 x 12", "8 x 12", "10 x 15", "15 x 20", "20 x 30", "30 x 40", "40 x 60", "50 x 70"]],
    ["calibre", "Calibre", ["0.80", "0.95", "1", "2", "3", "4", "5", "6", "8", "10"]],
  ];
  // RN-025: el color se elige de la lista fija; un color anterior fuera de la lista obliga a elegir uno válido
  const color = productColors.includes(order?.color) ? order.color : "";
  return [...suggestions.map(([name, label, values]) => (
    <Field key={name} label={label}>
      <input name={name} list={`${idPrefix}-${name}`} defaultValue={order?.[name] || ""} />
      <datalist id={`${idPrefix}-${name}`}>
        {values.map((value) => <option key={value} value={value} />)}
      </datalist>
    </Field>
  )), (
    <Field key="color" label="Color">
      <select name="color" defaultValue={color}>
        <option value="" disabled>Selecciona un color</option>
        {productColors.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </Field>
  )];
}

export function OrderRow({ order, canManage, onCancel, canEdit, onEdit, editing = false, aligned = false }) {
  const goal = Number(order.cantidad) || 0;
  const produced = Number(order.cantidad_producida) || 0;
  const progress = goal ? Math.round((produced * 100) / goal) : 0;
  const product = (safeProductName(order.producto) || "Producto no válido") + orderVariant(order);
  const info = (
    <div>
      <strong>#{order.id} · {product}</strong>
      <span>
        {order.responsable_nombre || "Sin asignar"}
        {order.supervisor_nombre ? ` · Supervisor: ${sanitizeText(order.supervisor_nombre)}` : ""}
        {" · "}{number(produced)}/{number(goal)} ({progress}%)
      </span>
    </div>
  );
  const editButton = canEdit && (
    <button className="primary-action secondary compact-action" type="button" aria-expanded={editing} onClick={() => onEdit(editing ? null : order)}>{editing ? "Cerrar" : "Editar"}</button>
  );
  // CR-013: administrador y supervisor solo cancelan órdenes abiertas; el estado lo mueven el operario y el avance
  const cancelButton = canManage && ["pendiente", "en_proceso"].includes(order.estado) && (
    <button className="primary-action compact-action" type="button" onClick={() => onCancel(order)}>Cancelar</button>
  );
  // En la lista de gestión cada elemento ocupa su columna aunque falte, para que las filas queden alineadas
  if (aligned) {
    return (
      <div className="order-row aligned">
        {info}
        <div className="order-cell"><PriorityBadge order={order} /></div>
        <div className="order-cell"><StatusBadge status={order.estado} /></div>
        <div className="order-cell">{editButton}</div>
        <div className="order-cell">{cancelButton}</div>
      </div>
    );
  }
  return (
    <div className="order-row">
      {info}
      <PriorityBadge order={order} />
      <StatusBadge status={order.estado} />
      {editButton}
      {cancelButton}
    </div>
  );
}
