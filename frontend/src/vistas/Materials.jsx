import React, { useState } from "react";
import { DataTable, Field, FormPanel, Intro, Panel, orderVariant } from "../comun/componentes.jsx";
import { productColors } from "../comun/constantes.js";
import { number, safeProductName, sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS } from "../comun/validacion.js";

export function Materials({ data, role, onSubmit, saving }) {
  const canCreate = role === "admin";
  // Mismos permisos que la API (materiaPrima.controller · registrarMovimiento)
  const canManageStock = ["admin", "almacenista"].includes(role);
  const canConsume = ["admin", "supervisor"].includes(role);
  const movementTypes = [
    ...(canManageStock ? [["compra", "Compra"], ["ajuste_entrada", "Ajuste de entrada"], ["ajuste_salida", "Ajuste de salida"]] : []),
    ...(canConsume ? [["consumo_produccion", "Consumo en una orden"]] : []),
  ];
  const [materialId, setMaterialId] = useState("");
  const [movementType, setMovementType] = useState(movementTypes[0]?.[0] || "");
  const selectedMaterialId = materialId || String(data.materials[0]?.id || "");
  // Solo las órdenes activas que usan la bobina elegida admiten consumo (RN-016)
  const consumableOrders = (data.orders || []).filter((order) =>
    String(order.materia_prima_id) === selectedMaterialId && ["pendiente", "en_proceso"].includes(order.estado));
  // Etiqueta corta (PEBD · 10 x 15 · calibre 2 · Transparente); el nombre completo solo si faltan especificaciones
  const materialLabel = (item) => (item.medida
    ? [item.tipo, item.medida, item.calibre && `calibre ${item.calibre}`, item.color]
    : [item.nombre]).filter(Boolean).map((parte) => sanitizeText(parte)).join(" · ");
  const polymerMaterials = [
    ["PEBD", "Bobina o rollo de polietileno de baja densidad (PEBD)"],
    ["PEAD", "Bobina o rollo de polietileno de alta densidad (PEAD)"],
    ["PP", "Bobina o rollo de polipropileno (PP)"],
  ];
  return (
    <>
      <Intro title="Materias primas" description="Registra bobinas, compras, ajustes y consumos, y consulta existencias por material, medida, calibre y color." />
      {movementTypes.length > 0 && data.materials.length > 0 && <FormPanel title="Registrar movimiento" onSubmit={onSubmit} saving={saving} obligatorios={["materia_prima_id", "tipo", "produccion_id", "cantidad"]} limites={{ cantidad: { integer: false, decimals: 2, maxValue: 100000 } }}>
        <Field label="Materia prima">
          <select name="materia_prima_id" value={selectedMaterialId} onChange={(event) => setMaterialId(event.target.value)}>
            {data.materials.map((item) => <option key={item.id} value={item.id}>{materialLabel(item)} ({number(item.cantidad)} {sanitizeText(item.unidad)})</option>)}
          </select>
        </Field>
        <Field label="Movimiento">
          <select name="tipo" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
            {movementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {movementType === "consumo_produccion" && <Field label="Orden que usa esta bobina">
          <select name="produccion_id">
            {consumableOrders.map((order) => <option key={order.id} value={order.id}>#{order.id} · {safeProductName(order.producto) || "Producto no válido"}{orderVariant(order)} ({order.estado === "en_proceso" ? "en proceso" : order.estado})</option>)}
            {!consumableOrders.length && <option value="">No hay órdenes activas que usen esta bobina</option>}
          </select>
        </Field>}
        <Field label="Cantidad (kg)"><input name="cantidad" type="number" /></Field>
        <Field label="Observaciones"><input name="observaciones" /></Field>
      </FormPanel>}
      {canCreate && <FormPanel title="Registrar material" onSubmit={onSubmit} saving={saving} obligatorios={["tipo", ...VARIANT_FIELDS, "peso_rollo"]} limites={{ medida: 80 }}>
        <Field label="Material">
          <select name="tipo" defaultValue="">
            <option value="" disabled>Selecciona un material</option>
            {polymerMaterials.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Medida (ancho x largo)">
          <input name="medida" list="materia-medidas" />
          <datalist id="materia-medidas">
            {["6 x 8", "6 x 12", "8 x 12", "10 x 15", "15 x 20", "20 x 30", "30 x 40", "40 x 60", "50 x 70"].map((value) => <option key={value} value={value} />)}
          </datalist>
        </Field>
        <Field label="Calibre">
          <input name="calibre" list="materia-calibres" />
          <datalist id="materia-calibres">
            {["0.80", "0.95", "1", "2", "3", "4", "5", "6", "8", "10"].map((value) => <option key={value} value={value} />)}
          </datalist>
        </Field>
        <Field label="Color">
          <select name="color" defaultValue="">
            <option value="" disabled>Selecciona un color</option>
            {productColors.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Peso del rollo (kg)">
          <input name="peso_rollo" type="number" />
        </Field>
      </FormPanel>}
      <Panel title="Materiales registrados"><DataTable columns={["Material", "Medida", "Calibre", "Color", "Peso del rollo", "Existencia"]} rows={data.materials.map((item) => ({
        key: item.id,
        cells: <><td>{sanitizeText(item.nombre)}</td><td>{sanitizeText(item.medida || "—")}</td><td>{sanitizeText(item.calibre || "—")}</td><td>{sanitizeText(item.color || "—")}</td><td>{item.peso_rollo === null || item.peso_rollo === undefined ? "—" : `${number(item.peso_rollo)} kg`}</td><td>{number(item.cantidad)} {sanitizeText(item.unidad)}</td></>,
      }))} /></Panel>
      {data.movements.length > 0 && <Panel title="Movimientos recientes"><DataTable columns={["Fecha", "Material", "Movimiento", "Cantidad", "Registrado por"]} rows={data.movements.map((movement) => ({
        key: movement.id,
        cells: <><td>{movement.fecha}</td><td>{sanitizeText(movement.materia_prima)}</td><td>{sanitizeText(movement.tipo)}</td><td>{number(movement.cantidad)}</td><td>{sanitizeText(movement.registrado_por || "Sistema")}</td></>,
      }))} /></Panel>}
    </>
  );
}
