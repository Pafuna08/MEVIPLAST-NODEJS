import React, { useState } from "react";
import { Field, FormPanel, FormToggles, Intro, OrderRow, Panel, VariantFields, orderVariant, useFormularioAbierto } from "../comun/componentes.jsx";
import { CREATE_OPTION } from "../comun/constantes.js";
import { NewLineDialog, NewMaterialDialog, useSelectAfterRender } from "../comun/CrearOpcion.jsx";
import { number, safeProductName, sanitizePayload, sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS, clearInvalid, useObligatorios } from "../comun/validacion.js";
import { Icono } from "../comun/iconos.jsx";
import { AdminOrders, CancelOrderDialog } from "./AdminOrders.jsx";
import { AssignDialog, operatorWorkload } from "./Assign.jsx";
import { ConsumoDialog } from "./ConsumoDialog.jsx";

export function Production({
  data,
  lines,
  role,
  view,
  onSubmit,
  saving,
  onChangeStatus,
  onEditOrder,
  onAssignOrder,
  onSaveTemplate,
  onDeleteTemplate,
  onCreateLine,
  onCreateMaterial,
  onConsume,
}) {
  const [editingOrder, setEditingOrder] = useState(null);
  // CR-026: orden de la que el supervisor registra el consumo de materia prima
  const [consumeTarget, setConsumeTarget] = useState(null);
  // Orden sin operario que el supervisor va a asignar
  const [assignTarget, setAssignTarget] = useState(null);
  // «+ Crear…» en la nueva orden: qué se crea y el selector que debe quedar con lo creado
  const [creating, setCreating] = useState(null);
  const selectAfterRender = useSelectAfterRender();
  function offerCreate(event, kind) {
    if (event.target.value !== CREATE_OPTION) return;
    // El selector vuelve a «Selecciona…» mientras la ventana está abierta (y la medida, a «ancho x largo»)
    event.target.value = "";
    event.target.dispatchEvent(new Event("change", { bubbles: true }));
    setCreating({ kind, select: event.target });
  }
  function finishCreate(value) {
    selectAfterRender(creating?.select, value);
    setCreating(null);
  }
  const [inlineWarning, checkInline] = useObligatorios();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  // Rediseño: los formularios de nueva orden y de plantilla se abren solo cuando se necesitan
  const [openForm, setOpenForm] = useFormularioAbierto("produccion");
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
              ? "Sigue tus órdenes, asigna el operario a las pendientes y registra el consumo de materia prima."
              : canManage
                ? "Actualiza el estado de las órdenes asignadas."
                : "Solo se muestran tus tareas asignadas."
        }
        icon={isSupervisor ? "seguimiento" : "produccion"}
        action={isAdmin && view === "produccion" ? (
          <FormToggles
            className="production-actions"
            open={openForm}
            onToggle={setOpenForm}
            options={[
              { key: "plantilla", label: "Guardar plantilla", closeLabel: "Cerrar plantilla" },
              { key: "orden", label: "+ Nueva orden", closeLabel: "Cerrar formulario", main: true },
            ]}
          />
        ) : undefined}
      />
      {isAdmin && view === "produccion" && (
        <>
          {openForm === "orden" && (
          <FormPanel
            title="Nueva orden de producción"
            obligatorios={["producto", ...VARIANT_FIELDS, "cantidad", "materia_prima_id", "prioridad"]}
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
                onChange={(event) => offerCreate(event, "line")}
              >
                <option value="" disabled>Selecciona una línea</option>
                {lines.map((family) => <option key={family} value={family}>{family}</option>)}
                <option value={CREATE_OPTION}>+ Crear nueva línea…</option>
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
                onChange={(event) => offerCreate(event, "material")}
              >
                <option value="" disabled>Selecciona la materia prima</option>
                {data.materials.map((material) => (
                  <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>
                ))}
                <option value={CREATE_OPTION}>+ Crear nuevo material…</option>
              </select>
            </Field>
            <Field label="Prioridad">
              <select
                key={`prioridad-${selectedTemplateId}`}
                name="prioridad"
                defaultValue={selectedTemplate?.prioridad || ""}
              >
                <option value="" disabled>Selecciona la prioridad</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
          </FormPanel>
          )}
          {openForm === "plantilla" && (
          <FormPanel
            title="Guardar plantilla frecuente"
            obligatorios={["producto", ...VARIANT_FIELDS, "cantidad", "materia_prima_id", "prioridad"]}
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
              <select name="producto" defaultValue=""><option value="" disabled>Selecciona una línea</option>{lines.map((family) => <option key={family} value={family}>{family}</option>)}</select>
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
              <select name="prioridad" defaultValue="">
                <option value="" disabled>Selecciona la prioridad</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
          </FormPanel>
          )}
        </>
      )}
      {isAdmin && view === "produccion" ? (
        <div className="production-layout">
          <Panel title="Órdenes">
            <AdminOrders orders={orders} data={data} lines={lines} onEditOrder={onEditOrder} onAssignOrder={onAssignOrder} onCancel={setCancelTarget} />
          </Panel>
          <Panel title="Órdenes frecuentes" className="template-panel">
            {templates.length ? (
              <div className="template-list">
                {templates.map((template) => (
                  <div className="template-item" key={template.id}>
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
                      onClick={() => {
                        setSelectedTemplateId(String(template.id));
                        setOpenForm("orden");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
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
              <p className="empty">Aún no hay plantillas. Créalas con «Guardar plantilla».</p>
            )}
          </Panel>
        </div>
      ) : <Panel title="Órdenes">
        {orders.map((order) => (
          <React.Fragment key={order.id}>
            <OrderRow
              order={order}
              canManage={canManage}
              onCancel={setCancelTarget}
              canEdit={["admin", "supervisor"].includes(role) && order.estado === "pendiente" && Number(order.cantidad_producida || 0) === 0}
              onEdit={setEditingOrder}
              editing={editingOrder?.id === order.id}
              onConsume={isSupervisor && onConsume ? setConsumeTarget : undefined}
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
                <Field label="Producto"><select name="producto" defaultValue={order.producto}>{lines.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
                <VariantFields idPrefix={`orden-${order.id}`} order={order} />
                <Field label="Meta"><input name="cantidad" type="number" defaultValue={order.cantidad} /></Field>
                <Field label="Materia prima"><select name="materia_prima_id" defaultValue={order.materia_prima_id || ""}><option value="" disabled>Selecciona la materia prima</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>)}</select></Field>
                <Field label="Prioridad"><select name="prioridad" defaultValue={order.prioridad}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
                {inlineWarning.key === `editar-${order.id}` && <p className="form-error" role="alert">{inlineWarning.text}</p>}
                <button className="primary-action secondary" type="button" onClick={() => setEditingOrder(null)}>Descartar cambios</button>
                <button className="primary-action" type="submit">Guardar cambios</button>
              </form>
            )}
            {/* Orden sin operario: la misma ventana de «Asignar tareas», con la carga de cada operario */}
            {isSupervisor && !order.responsable_id && order.estado === "pendiente" && (
              <div className="assign-hint">
                <span><Icono nombre="asignar" size={16} />La orden #{order.id} todavía no tiene operario.</span>
                <button className="text-action" type="button" onClick={() => setAssignTarget(order)}>Asignar operario</button>
              </div>
            )}
          </React.Fragment>
        ))}
        {!orders.length && <p className="empty">No hay órdenes asignadas.</p>}
      </Panel>}
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
      {assignTarget && (
        <AssignDialog
          order={assignTarget}
          operators={data.operators || []}
          workload={operatorWorkload(orders, data.operators || [])}
          onClose={() => setAssignTarget(null)}
          onAssign={onAssignOrder}
        />
      )}
      {consumeTarget && (
        <ConsumoDialog
          order={consumeTarget}
          material={(data.materials || []).find((material) => Number(material.id) === Number(consumeTarget.materia_prima_id))}
          onClose={() => setConsumeTarget(null)}
          onConfirm={onConsume}
        />
      )}
      {creating?.kind === "line" && <NewLineDialog onCreate={onCreateLine} onClose={() => setCreating(null)} onCreated={finishCreate} />}
      {creating?.kind === "material" && <NewMaterialDialog onCreate={onCreateMaterial} onClose={() => setCreating(null)} onCreated={(material) => finishCreate(material.id)} />}
    </>
  );
}
