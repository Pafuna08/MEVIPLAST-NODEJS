import React, { useState } from "react";
import { Field, FormPanel, Intro, OrderRow, Panel, VariantFields, orderVariant } from "../comun/componentes.jsx";
import { finishedProductFamilies } from "../comun/constantes.js";
import { number, safeProductName, sanitizePayload, sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS, clearInvalid, useObligatorios } from "../comun/validacion.js";
import { Dialogo } from "../comun/Dialogo.jsx";

export function Production({
  data,
  role,
  view,
  onSubmit,
  saving,
  onChangeStatus,
  onEditOrder,
  onAssignOrder,
  onSaveTemplate,
  onDeleteTemplate,
}) {
  const [editingOrder, setEditingOrder] = useState(null);
  const [inlineWarning, checkInline] = useObligatorios();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const orders = Array.isArray(data) ? data : data.orders;
  const canManage = role !== "operario";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const templates = (data.templates || []).filter((template) =>
    safeProductName(template.producto),
  );
  const selectedTemplate = templates.find(
    (template) => String(template.id) === selectedTemplateId,
  );
  const title = view === "tareas" ? "Mis tareas" : view === "historial" ? "Mi historial" : "Seguimiento de producción";
  return (
    <>
      <Intro
        title={isAdmin && view === "produccion" ? "Gestión de producción" : title}
        description={
          isAdmin && view === "produccion"
            ? "Crea órdenes, asígnalas a un supervisor o reutiliza una plantilla frecuente."
            : isSupervisor
              ? "Revisa las órdenes que te asignaron y elige al operario que las ejecutará."
              : canManage
                ? "Actualiza el estado de las órdenes asignadas."
                : "Solo se muestran tus tareas asignadas."
        }
      />
      {isAdmin && view === "produccion" && (
        <>
          <Panel title="Órdenes frecuentes">
            {templates.length ? (
              <div className="order-list">
                {templates.map((template) => (
                  <div className="order-row" key={template.id}>
                    <div>
                      <strong>{safeProductName(template.producto) || "Producto no válido"}{orderVariant(template)}</strong>
                      <span>
                        Meta habitual: {number(template.cantidad)}
                        {template.materia_prima_nombre
                          ? ` · ${sanitizeText(template.materia_prima_nombre)}`
                          : ""}
                      </span>
                    </div>
                    <button
                      className="text-action"
                      type="button"
                      onClick={() => setSelectedTemplateId(String(template.id))}
                    >
                      Usar plantilla
                    </button>
                    <button
                      className="text-action danger"
                      type="button"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">Aún no hay plantillas. Puedes crear una abajo.</p>
            )}
          </Panel>
          <FormPanel
            title="Nueva orden de producción"
            obligatorios={["producto", ...VARIANT_FIELDS, "cantidad", "materia_prima_id"]}
            onSubmit={(event) => {
              setSelectedTemplateId("");
              onSubmit(event);
            }}
            saving={saving}
          >
            <p className="form-hint form-hint-wide">La orden queda pendiente para los supervisores: el que la tome elige el operario. Si falta el supervisor, puedes asignar el operario desde la lista de órdenes.</p>
            {selectedTemplate && (
              <p className="form-hint form-hint-wide">
                Plantilla seleccionada: {safeProductName(selectedTemplate.producto) || "Producto no válido"}{orderVariant(selectedTemplate)}. Puedes ajustar sus datos antes de crear la orden.
              </p>
            )}
            <Field label="Producto">
              <select
                key={`producto-${selectedTemplateId}`}
                name="producto"
                defaultValue={safeProductName(selectedTemplate?.producto) || ""}
              >
                <option value="" disabled>Selecciona una línea</option>
                {finishedProductFamilies.map((family) => <option key={family} value={family}>{family}</option>)}
              </select>
            </Field>
            <VariantFields key={`variante-${selectedTemplateId}`} idPrefix="orden-nueva" order={selectedTemplate} />
            <Field label="Meta de producción">
              <input
                key={`cantidad-${selectedTemplateId}`}
                name="cantidad"
                type="number"
                defaultValue={selectedTemplate?.cantidad || ""}
              />
            </Field>
            <Field label="Materia prima">
              <select
                key={`materia-${selectedTemplateId}`}
                name="materia_prima_id"
                defaultValue={selectedTemplate?.materia_prima_id || ""}
              >
                <option value="" disabled>Selecciona la materia prima</option>
                {data.materials.map((material) => (
                  <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad">
              <select
                key={`prioridad-${selectedTemplateId}`}
                name="prioridad"
                defaultValue={selectedTemplate?.prioridad || "media"}
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
          </FormPanel>
          <FormPanel
            title="Guardar plantilla frecuente"
            obligatorios={["producto", ...VARIANT_FIELDS, "cantidad", "materia_prima_id"]}
            onSubmit={async (event) => {
              event.preventDefault();
              const payload = sanitizePayload(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
              const form = event.currentTarget;
              if (await onSaveTemplate(payload)) form.reset();
            }}
            saving={false}
          >
            <Field label="Producto">
              <select name="producto" defaultValue=""><option value="" disabled>Selecciona una línea</option>{finishedProductFamilies.map((family) => <option key={family} value={family}>{family}</option>)}</select>
            </Field>
            <VariantFields idPrefix="plantilla-nueva" />
            <Field label="Meta habitual">
              <input name="cantidad" type="number" />
            </Field>
            <Field label="Materia prima">
              <select name="materia_prima_id" defaultValue="">
                <option value="" disabled>Selecciona la materia prima</option>
                {data.materials.map((material) => (
                  <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad habitual">
              <select name="prioridad" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
          </FormPanel>
        </>
      )}
      <Panel title="Órdenes">
        {orders.map((order) => (
          <React.Fragment key={order.id}>
            <OrderRow
              order={order}
              canManage={canManage}
              onCancel={setCancelTarget}
              canEdit={["admin", "supervisor"].includes(role) && order.estado === "pendiente" && Number(order.cantidad_producida || 0) === 0}
              onEdit={setEditingOrder}
              editing={editingOrder?.id === order.id}
              aligned
            />
            {editingOrder?.id === order.id && (
              <form
                className="data-form order-edit"
                aria-label={`Editar orden #${order.id}`}
                noValidate
                onInput={clearInvalid}
                onSubmit={async (event) => {
                  if (!checkInline(event, ["producto", ...VARIANT_FIELDS, "cantidad", "materia_prima_id"], `editar-${order.id}`)) return;
                  event.preventDefault();
                  const payload = sanitizePayload(Object.fromEntries(new FormData(event.currentTarget)));
                  // Se cierra solo si se guardó; si falla, el formulario conserva lo escrito
                  if (await onEditOrder(order.id, payload)) setEditingOrder(null);
                }}
              >
                <Field label="Producto"><select name="producto" defaultValue={order.producto}>{finishedProductFamilies.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
                <VariantFields idPrefix={`orden-${order.id}`} order={order} />
                <Field label="Meta"><input name="cantidad" type="number" defaultValue={order.cantidad} /></Field>
                <Field label="Materia prima"><select name="materia_prima_id" defaultValue={order.materia_prima_id || ""}><option value="" disabled>Selecciona la materia prima</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>)}</select></Field>
                <Field label="Prioridad"><select name="prioridad" defaultValue={order.prioridad}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
                {inlineWarning.key === `editar-${order.id}` && <p className="form-error" role="alert">{inlineWarning.text}</p>}
                <button className="primary-action secondary" type="button" onClick={() => setEditingOrder(null)}>Descartar cambios</button>
                <button className="primary-action" type="submit">Guardar cambios</button>
              </form>
            )}
            {(isSupervisor || isAdmin) && !order.responsable_id && order.estado === "pendiente" && (
              <form
                className="data-form"
                noValidate
                onInput={clearInvalid}
                onSubmit={(event) => {
                  if (!checkInline(event, ["responsable_id"], `asignar-${order.id}`)) return;
                  event.preventDefault();
                  const responsableId = new FormData(event.currentTarget).get("responsable_id");
                  onAssignOrder(order.id, responsableId);
                }}
              >
                <Field label={isAdmin ? `Asignar operario a la orden #${order.id} (si falta el supervisor)` : `Asignar operario a la orden #${order.id}`}>
                  <select name="responsable_id" defaultValue="">
                    <option value="" disabled>Selecciona un operario</option>
                    {data.operators.map((operator) => (
                      <option key={operator.id} value={operator.id}>{sanitizeText(operator.nombre)}</option>
                    ))}
                  </select>
                </Field>
                {inlineWarning.key === `asignar-${order.id}` && <p className="form-error" role="alert">{inlineWarning.text}</p>}
                <button className="primary-action" type="submit" disabled={!data.operators.length}>
                  Asignar operario
                </button>
              </form>
            )}
          </React.Fragment>
        ))}
        {!orders.length && <p className="empty">No hay órdenes asignadas.</p>}
      </Panel>
      {cancelTarget && (
        <Dialogo onClose={() => setCancelTarget(null)} labelledBy="cancel-order-title">
            <div className="confirm-header">
              <div className="confirm-icon">!</div>
              <div>
                <h3 id="cancel-order-title">Cancelar orden #{cancelTarget.id}</h3>
                <p>
                  ¿Deseas cancelar la orden de <strong>{safeProductName(cancelTarget.producto) || "Producto no válido"}{orderVariant(cancelTarget)}</strong>?
                  <br />La orden se cierra y ya no admite avances. Lo producido hasta ahora queda en el inventario.
                </p>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" autoFocus onClick={() => setCancelTarget(null)}>No, volver</button>
              <button
                className="confirm-delete"
                type="button"
                onClick={() => {
                  onChangeStatus(cancelTarget.id, "cancelado");
                  setCancelTarget(null);
                }}
              >
                Sí, cancelar la orden
              </button>
            </div>
          </Dialogo>
      )}
    </>
  );
}
