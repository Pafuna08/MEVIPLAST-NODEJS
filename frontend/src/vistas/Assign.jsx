import React, { useState } from "react";
import { Field, FormPanel, FormToggles, Intro, Panel, PriorityBadge, StatusBadge, VariantFields, orderVariant, useFormularioAbierto } from "../comun/componentes.jsx";
import { Dialogo } from "../comun/Dialogo.jsx";
import { dateTimeFormat, number, safeProductName, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { VARIANT_FIELDS } from "../comun/validacion.js";

const OPEN_STATES = ["pendiente", "en_proceso"];
const createdFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

const productLabel = (order) => (safeProductName(order.producto) || "Producto no válido") + orderVariant(order);

function formatDate(value, format = dateTimeFormat) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? format.format(date) : "—";
}

const workloadLabel = (count) => (count ? `${count} ${count === 1 ? "orden activa" : "órdenes activas"}` : "Disponible");

// Carga de cada operario: sus órdenes abiertas, para elegir a quién entregar la orden
export function operatorWorkload(orders, operators) {
  return Object.fromEntries(operators.map((operator) => [
    operator.id,
    orders.filter((order) => Number(order.responsable_id) === Number(operator.id) && OPEN_STATES.includes(order.estado)).length,
  ]));
}

// Asignar tareas (supervisor): arriba, las órdenes que esperan operario, entre ellas las que crea el
// administrador (quedan pendientes para los supervisores, CR-014); «+ Nueva orden» crea una orden propia.
export function Assign({ data, lines, onSubmit, saving, onAssignOrder }) {
  const [openForm, setOpenForm] = useFormularioAbierto("asignar");
  const [selectedId, setSelectedId] = useState(null);
  const orders = data.orders || [];
  const toAssign = orders.filter((order) => order.estado === "pendiente" && !order.responsable_id);
  const selected = toAssign.find((order) => order.id === selectedId);
  return (
    <>
      <Intro
        icon="asignar"
        title="Asignar tareas"
        description="Entrega a un operario las órdenes que creó el administrador o crea una orden nueva."
        action={(
          <FormToggles
            open={openForm}
            onToggle={setOpenForm}
            options={[{ key: "orden", label: "+ Nueva orden", closeLabel: "Cerrar formulario", main: true }]}
          />
        )}
      />
      {openForm === "orden" && (
        <FormPanel title="Nueva orden de producción" onSubmit={onSubmit} saving={saving} obligatorios={["producto", ...VARIANT_FIELDS, "cantidad", "responsable_id", "materia_prima_id", "prioridad"]}>
          <Field label="Producto"><select name="producto" defaultValue=""><option value="" disabled>Selecciona una línea</option>{lines.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
          <VariantFields idPrefix="tarea-nueva" />
          <Field label="Meta"><input name="cantidad" type="number" /></Field>
          <Field label="Operario"><select name="responsable_id" defaultValue=""><option value="" disabled>Selecciona el operario</option>{data.operators.map((operator) => <option key={operator.id} value={operator.id}>{sanitizeText(operator.nombre)}</option>)}</select></Field>
          <Field label="Materia prima"><select name="materia_prima_id" defaultValue=""><option value="" disabled>Selecciona la materia prima</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>)}</select></Field>
          <Field label="Prioridad"><select name="prioridad" defaultValue=""><option value="" disabled>Selecciona la prioridad</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
        </FormPanel>
      )}
      <Panel title={`Órdenes por asignar (${toAssign.length})`}>
        <p className="orders-hint">Las crea el administrador y quedan pendientes para los supervisores. Haz clic en una orden para ver su detalle y elegir el operario; al asignarla, la orden queda a tu cargo.</p>
        {toAssign.length > 0 && (
          <ul className="order-progress-list assign-list">
            {toAssign.map((order) => (
              <li key={order.id}>
                {/* Columnas fijas: orden | prioridad | acción */}
                <button className="order-progress-row assign-row" type="button" onClick={() => setSelectedId(order.id)}>
                  <span className="order-progress-info">
                    <strong>#{order.id} · {productLabel(order)}</strong>
                    <span>
                      Meta: {number(order.cantidad)} unidades
                      {" · "}{order.materia_prima_nombre ? sanitizeText(order.materia_prima_nombre) : "Sin materia prima"}
                      {" · "}Creada el {formatDate(order.fecha_inicio, createdFormat)}
                    </span>
                  </span>
                  <span className="order-cell"><PriorityBadge order={order} /></span>
                  <span className="order-cell"><span className="assign-cta"><Icono nombre="asignar" size={16} />Asignar</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!toAssign.length && <p className="empty">No hay órdenes por asignar. Cuando el administrador cree una, aparecerá aquí.</p>}
      </Panel>
      {selected && (
        <AssignDialog
          order={selected}
          operators={data.operators}
          workload={operatorWorkload(orders, data.operators)}
          onClose={() => setSelectedId(null)}
          onAssign={onAssignOrder}
        />
      )}
    </>
  );
}

// Detalle de la orden y elección del operario, con la carga de trabajo de cada uno (Asignar tareas y Seguimiento)
export function AssignDialog({ order, operators, workload, onClose, onAssign }) {
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dialogo onClose={onClose} labelledBy="assign-title" className="order-modal assign-modal">
      <div className="order-modal-header">
        <div>
          <h3 id="assign-title">Asignar la orden #{order.id}</h3>
          <p>{productLabel(order)}</p>
        </div>
        <div className="order-modal-badges"><PriorityBadge order={order} /><StatusBadge status={order.estado} /></div>
      </div>
      <dl className="confirm-summary order-summary">
        <dt>Meta</dt><dd>{number(order.cantidad)} unidades</dd>
        <dt>Materia prima</dt><dd>{order.materia_prima_nombre ? sanitizeText(order.materia_prima_nombre) : "—"}</dd>
        <dt>Supervisor</dt><dd>{order.supervisor_nombre ? sanitizeText(order.supervisor_nombre) : "Pendiente para los supervisores"}</dd>
        <dt>Creada</dt><dd>{formatDate(order.fecha_inicio)}</dd>
        {order.observaciones && <><dt>Observaciones</dt><dd>{sanitizeText(order.observaciones)}</dd></>}
      </dl>
      <form
        className="assign-form"
        aria-label={`Asignar operario a la orden #${order.id}`}
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (!chosen) {
            setError("Elige el operario que ejecutará la orden.");
            event.currentTarget.querySelector("input[name=responsable_id]")?.focus();
            return;
          }
          setSaving(true);
          // Si se asignó, el panel recarga la vista y la ventana se cierra sola
          const message = await onAssign(order.id, chosen);
          if (message) {
            setError(message);
            setSaving(false);
          }
        }}
      >
        <fieldset className="operator-options">
          <legend>Operario que ejecutará la orden</legend>
          {operators.map((operator) => {
            const count = workload[operator.id] || 0;
            const value = String(operator.id);
            return (
              <label key={operator.id} className={`operator-option${chosen === value ? " selected" : ""}`}>
                <input
                  type="radio"
                  name="responsable_id"
                  value={value}
                  checked={chosen === value}
                  onChange={() => {
                    setChosen(value);
                    setError("");
                  }}
                />
                <span className="operator-icon" aria-hidden="true"><Icono nombre="operarios" size={18} /></span>
                <span className="operator-option-name">
                  <strong>{sanitizeText(operator.nombre)}</strong>
                  <small>{sanitizeText(operator.usuario)}</small>
                </span>
                <span className={`status ${count ? "progress" : "success"}`}>{workloadLabel(count)}</span>
              </label>
            );
          })}
          {!operators.length && <p className="empty">No hay operarios activos.</p>}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="confirm-actions">
          <button className="confirm-cancel" type="button" onClick={onClose}>Cerrar</button>
          <button className="primary-action" type="submit" disabled={saving || !operators.length}>{saving ? "Asignando..." : "Asignar operario"}</button>
        </div>
      </form>
    </Dialogo>
  );
}
