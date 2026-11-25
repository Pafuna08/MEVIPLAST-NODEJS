import React, { useEffect, useRef, useState } from "react";
import { lineSizes, productColors } from "./constantes.js";
import { number, safeProductName, sanitizeText } from "./formato.js";
import { clearInvalid, useObligatorios } from "./validacion.js";
import { Icono } from "./iconos.jsx";

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
            rows.map((row, index) => <tr key={row.key ?? index} className={row.className} onClick={row.onClick}>{row.cells}</tr>)
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

export function Intro({ title, description, action, icon }) {
  return (
    <div className="page-intro">
      <div className="page-intro-text">
        {icon && <span className="page-icon"><Icono nombre={icon} size={24} /></span>}
        <div><h2>{title}</h2><p>{description}</p></div>
      </div>
      {action}
    </div>
  );
}

// Barra de avance con su porcentaje (órdenes de producción)
export function ProgressBar({ value, label }) {
  const width = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <span className="progress-meter">
      <span className="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={width} aria-label={label}>
        <span style={{ width: `${width}%` }} />
      </span>
      <b>{width}%</b>
    </span>
  );
}

// Tarjeta de indicador con ícono y color (Inicio, historial, usuarios, materias primas, inventario)
export function StatCard({ label, value, detail, icon = "ordenes", tone = "azul", warning = false, children }) {
  return (
    <article className={`stat-card tono-${tone}`}>
      <div className="stat-head"><span>{label}</span><i className="stat-icon" aria-hidden="true"><Icono nombre={icon} /></i></div>
      <strong>{value}</strong>
      {children}
      {detail && <small className={warning ? "warning" : undefined}>{detail}</small>}
    </article>
  );
}

// Qué formulario de la vista está abierto. Se guarda en la sesión del navegador porque, al guardar,
// el panel recarga los datos y vuelve a montar la vista: así el formulario sigue abierto para el siguiente registro
export function useFormularioAbierto(vista) {
  const clave = `meviplastFormulario:${vista}`;
  const [abierto, setAbierto] = useState(() => {
    try {
      return sessionStorage.getItem(clave) || null;
    } catch {
      return null;
    }
  });
  function cambiar(valor) {
    setAbierto(valor);
    try {
      if (valor) sessionStorage.setItem(clave, valor);
      else sessionStorage.removeItem(clave);
    } catch {
      // sin almacenamiento de sesión: el formulario se cierra al recargar
    }
  }
  return [abierto, cambiar];
}

// Botones del encabezado que abren o cierran un formulario (uno a la vez)
export function FormToggles({ options, open, onToggle, className = "" }) {
  return (
    <div className={`form-toggles ${className}`.trim()}>
      {options.map(({ key, label, closeLabel, main }) => (
        <button key={key} className={main ? "primary-action" : "primary-action secondary"} type="button" aria-expanded={open === key} onClick={() => onToggle(open === key ? null : key)}>
          {open === key ? closeLabel : label}
        </button>
      ))}
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
  // CR-019: la medida depende de la línea elegida en el mismo formulario (producto o familia):
  // Cargadera elige una talla; las demás escriben «ancho x largo»
  const marca = useRef(null);
  const [linea, setLinea] = useState(order?.producto || "");
  useEffect(() => {
    const formulario = marca.current?.closest("form");
    const selector = formulario?.querySelector('select[name="producto"], select[name="familia"]');
    if (!selector) return undefined;
    const actualizar = () => setLinea(selector.value);
    // Tras un «reset» el valor cambia sin evento «change»
    const tras = () => setTimeout(actualizar, 0);
    actualizar();
    selector.addEventListener("change", actualizar);
    formulario.addEventListener("reset", tras);
    return () => {
      selector.removeEventListener("change", actualizar);
      formulario.removeEventListener("reset", tras);
    };
  }, []);
  const tallas = lineSizes[linea];
  const suggestions = [
    ["calibre", "Calibre", ["0.80", "0.95", "1", "2", "3", "4", "5", "6", "8", "10"]],
  ];
  const medida = tallas ? (
    <Field key="medida-talla" label="Medida (talla)">
      <select name="medida" defaultValue={tallas.includes(order?.medida) ? order.medida : ""}>
        <option value="" disabled>Selecciona la talla</option>
        {tallas.map((talla) => <option key={talla} value={talla}>{talla}</option>)}
      </select>
    </Field>
  ) : (
    <Field key="medida" label="Medida">
      <input name="medida" list={`${idPrefix}-medida`} defaultValue={order?.medida && !lineSizes[order?.producto] ? order.medida : ""} />
      <datalist id={`${idPrefix}-medida`}>
        {["6 x 8", "6 x 12", "8 x 12", "10 x 15", "15 x 20", "20 x 30", "30 x 40", "40 x 60", "50 x 70"].map((value) => <option key={value} value={value} />)}
      </datalist>
    </Field>
  );
  // RN-025: el color se elige de la lista fija; un color anterior fuera de la lista obliga a elegir uno válido
  const color = productColors.includes(order?.color) ? order.color : "";
  return [<span key="marca" ref={marca} hidden />, medida, ...suggestions.map(([name, label, values]) => (
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
      <div className={canManage ? "order-row aligned" : "order-row aligned read-only"}>
        {info}
        <div className="order-cell"><ProgressBar value={progress} label={`Avance de la orden ${order.id}`} /></div>
        <div className="order-cell"><PriorityBadge order={order} /></div>
        <div className="order-cell"><StatusBadge status={order.estado} /></div>
        {canManage && <div className="order-cell">{editButton}</div>}
        {canManage && <div className="order-cell">{cancelButton}</div>}
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
