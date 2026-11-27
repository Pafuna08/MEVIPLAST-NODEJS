import React, { useState } from "react";
import { DataTable, Field, FormPanel, FormToggles, Intro, Panel, StatCard, orderVariant, useFormularioAbierto } from "../comun/componentes.jsx";
import { CREATE_OPTION, movementTypeNames } from "../comun/constantes.js";
import { MATERIAL_LIMITS, MATERIAL_REQUIRED, MaterialFields, NewMaterialDialog } from "../comun/CrearOpcion.jsx";
import { money, number, safeProductName, sanitizeText } from "../comun/formato.js";

export function Materials({ data, role, onSubmit, saving, onCreateMaterial }) {
  const canCreate = role === "admin";
  // Mismos permisos que la API (materiaPrima.controller · registrarMovimiento). CR-026: el supervisor
  // también registra consumos, pero desde Seguimiento; a esta vista solo llegan administrador y almacenista
  const canManageStock = ["admin", "almacenista"].includes(role);
  const canConsume = role === "admin";
  const movementTypes = [
    ...(canManageStock ? [["compra", "Compra"], ["ajuste_entrada", "Ajuste de entrada"], ["ajuste_salida", "Ajuste de salida"]] : []),
    ...(canConsume ? [["consumo_produccion", "Consumo en una orden"]] : []),
  ];
  const [materialId, setMaterialId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  // Rediseño: los formularios se abren con los botones del encabezado
  const [openForm, setOpenForm] = useFormularioAbierto("materia");
  const canMove = movementTypes.length > 0 && data.materials.length > 0;
  const lowStock = (item) => Number(item.cantidad) <= Number(item.stock_minimo);
  const totalKg = data.materials.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  const lowCount = data.materials.filter(lowStock).length;
  const selectedMaterialId = materialId;
  // Solo las órdenes activas que usan la bobina elegida admiten consumo (RN-016)
  const consumableOrders = (data.orders || []).filter((order) =>
    String(order.materia_prima_id) === selectedMaterialId && ["pendiente", "en_proceso"].includes(order.estado));
  // Etiqueta corta (PEBD · 10 x 15 · calibre 2 · Transparente); el nombre completo solo si faltan especificaciones
  const materialLabel = (item) => (item.medida
    ? [item.tipo, item.medida, item.calibre && `calibre ${item.calibre}`, item.color]
    : [item.nombre]).filter(Boolean).map((parte) => sanitizeText(parte)).join(" · ");
  return (
    <>
      <Intro
        icon="materia"
        title="Materias primas"
        description="Registra bobinas, compras, ajustes y consumos, y consulta existencias por material, tamaño del rollo, calibre y color."
        action={(canMove || canCreate) && (
          <FormToggles
            open={openForm}
            onToggle={setOpenForm}
            options={[
              ...(canCreate ? [{ key: "material", label: "+ Registrar material", closeLabel: "Cerrar material" }] : []),
              ...(canMove ? [{ key: "movimiento", label: "+ Registrar movimiento", closeLabel: "Cerrar movimiento", main: true }] : []),
            ]}
          />
        )}
      />
      <section className="stats-grid stats-grid-3">
        <StatCard label="Bobinas registradas" value={number(data.materials.length)} icon="materia" tone="azul" detail="Materiales por tamaño del rollo, calibre y color" />
        <StatCard label="Kilos en existencia" value={number(totalKg)} icon="inventario" tone="verde" detail="Suma de todas las bobinas" />
        <StatCard label="En stock bajo" value={number(lowCount)} icon="alerta" tone="rojo" detail={lowCount ? "En el mínimo o por debajo" : "Todas sobre su mínimo"} warning={lowCount > 0} />
      </section>
      {canMove && openForm === "movimiento" && <FormPanel title="Registrar movimiento" onSubmit={onSubmit} saving={saving} obligatorios={["materia_prima_id", "tipo", "produccion_id", "cantidad"]} limites={{ cantidad: { integer: false, decimals: 2, maxValue: 100000 } }}>
        <Field label="Materia prima">
          <select name="materia_prima_id" value={selectedMaterialId} onChange={(event) => {
            // «+ Crear nuevo material…» abre la ventana; el selector conserva lo que tenía
            if (event.target.value === CREATE_OPTION) setCreatingMaterial(true);
            else setMaterialId(event.target.value);
          }}>
            <option value="" disabled>Selecciona la materia prima</option>
            {data.materials.map((item) => <option key={item.id} value={item.id}>{materialLabel(item)} ({number(item.cantidad)} {sanitizeText(item.unidad)})</option>)}
            {canCreate && <option value={CREATE_OPTION}>+ Crear nuevo material…</option>}
          </select>
        </Field>
        <Field label="Movimiento">
          <select name="tipo" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
            <option value="" disabled>Selecciona el movimiento</option>
            {movementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {movementType === "consumo_produccion" && <Field label="Orden que usa esta bobina">
          <select key={`orden-${selectedMaterialId}`} name="produccion_id" defaultValue="">
            <option value="" disabled>{consumableOrders.length ? "Selecciona la orden" : "No hay órdenes activas que usen esta bobina"}</option>
            {consumableOrders.map((order) => <option key={order.id} value={order.id}>#{order.id} · {safeProductName(order.producto) || "Producto no válido"}{orderVariant(order)} ({order.estado === "en_proceso" ? "en proceso" : order.estado})</option>)}
          </select>
        </Field>}
        <Field label="Cantidad (kg)"><input name="cantidad" type="number" /></Field>
        {movementType === "compra" && <>
          <Field label="Costo total (opcional)"><input name="costo" type="number" placeholder="Pesos" /></Field>
          <Field label="N.º de factura (opcional)"><input name="factura" maxLength={40} /></Field>
        </>}
        <Field label="Observaciones"><input name="observaciones" /></Field>
      </FormPanel>}
      {canCreate && openForm === "material" && <FormPanel title="Registrar material" onSubmit={onSubmit} saving={saving} obligatorios={MATERIAL_REQUIRED} limites={MATERIAL_LIMITS}>
        <MaterialFields idPrefix="materia" />
      </FormPanel>}
      {creatingMaterial && <NewMaterialDialog
        onCreate={onCreateMaterial}
        onClose={() => setCreatingMaterial(false)}
        onCreated={(material) => {
          setCreatingMaterial(false);
          setMaterialId(String(material.id));
        }}
      />}
      <Panel title="Materiales registrados"><DataTable columns={["Material", "Tamaño del rollo", "Calibre", "Color", "Peso del rollo", "Existencia"]} rows={data.materials.map((item) => ({
        key: item.id,
        cells: <><td>{sanitizeText(item.nombre)}</td><td>{sanitizeText(item.medida || "—")}</td><td>{sanitizeText(item.calibre || "—")}</td><td>{sanitizeText(item.color || "—")}</td><td>{item.peso_rollo === null || item.peso_rollo === undefined ? "—" : `${number(item.peso_rollo)} kg`}</td><td><span className="stock-cell">{number(item.cantidad)} {sanitizeText(item.unidad)}{lowStock(item) && <span className="status alert">Stock bajo</span>}</span></td></>,
      }))} /></Panel>
      {data.movements.length > 0 && <Panel title="Movimientos recientes"><DataTable columns={["Fecha", "Material", "Movimiento", "Cantidad", "Costo", "Factura", "Registrado por"]} rows={data.movements.map((movement) => ({
        key: movement.id,
        cells: <><td>{movement.fecha}</td><td>{sanitizeText(movement.materia_prima)}</td><td><span className={`movement-chip movement-${sanitizeText(movement.tipo)}`}>{movementTypeNames[movement.tipo] || sanitizeText(movement.tipo)}</span></td><td>{number(movement.cantidad)}</td><td>{movement.costo === null || movement.costo === undefined ? "—" : money(movement.costo)}</td><td>{sanitizeText(movement.factura || "—")}</td><td>{sanitizeText(movement.registrado_por || "Sistema")}</td></>,
      }))} /></Panel>}
    </>
  );
}
