import React, { useState } from "react";
import { DataTable, Field, FormPanel, Intro, Panel } from "../comun/componentes.jsx";
import { exitReasons, finishedProductFamilies, inventoryMovementLabels } from "../comun/constantes.js";
import { number, safeProductName, sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS } from "../comun/validacion.js";

export function Inventory({ data, onSubmit, saving }) {
  const [exitReason, setExitReason] = useState("");
  return (
    <>
      <Intro title="Inventario terminado" description="Registra variantes de las líneas de producto que fabrica MEVIPLAST." />
      <FormPanel title="Ingreso de inventario" onSubmit={onSubmit} saving={saving} obligatorios={["familia", ...VARIANT_FIELDS, "cantidad"]}>
        <Field label="Línea de producto"><select name="familia" defaultValue=""><option value="" disabled>Selecciona una línea</option>{finishedProductFamilies.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
        <Field label="Medida"><input name="medida" /></Field>
        <Field label="Calibre"><input name="calibre" /></Field>
        <Field label="Color"><input name="color" /></Field>
        <Field label="Unidades"><input name="cantidad" type="number" /></Field>
        <Field label="Ubicación"><input name="ubicacion" defaultValue="Bodega A" /></Field>
      </FormPanel>
      <FormPanel title="Registrar salida manual" onSubmit={onSubmit} saving={saving} obligatorios={["inventario_id", "cantidad", "motivo", ...(exitReason === "Otro" ? ["detalle"] : [])]}>
        <Field label="Producto"><select name="inventario_id">{data.items.filter((item) => safeProductName(item.producto)).map((item) => <option key={item.id} value={item.id}>{safeProductName(item.producto)} ({number(item.cantidad)})</option>)}</select></Field>
        <Field label="Cantidad"><input name="cantidad" type="number" /></Field>
        <Field label="Motivo">
          <select name="motivo" value={exitReason} onChange={(event) => setExitReason(event.target.value)}>
            <option value="" disabled>Selecciona el motivo</option>
            {exitReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
          </select>
        </Field>
        <Field label={exitReason === "Otro" ? "Detalle (obligatorio)" : "Detalle (opcional)"}><input name="detalle" /></Field>
      </FormPanel>
      <Panel title="Productos disponibles"><DataTable columns={["Línea", "Medida", "Calibre", "Color", "Unidades", "Ubicación"]} rows={data.items.map((item) => ({ key: item.id, cells: <><td>{sanitizeText(item.familia)}</td><td>{sanitizeText(item.medida || "—")}</td><td>{sanitizeText(item.calibre || "—")}</td><td>{sanitizeText(item.color || "—")}</td><td>{number(item.cantidad)}</td><td>{sanitizeText(item.ubicacion || "—")}</td></> }))} /></Panel>
      <Panel title="Movimientos recientes"><DataTable columns={["Fecha", "Producto", "Movimiento", "Cantidad", "Venta / orden", "Motivo / observación"]} rows={data.movements.map((movement) => ({
        key: movement.id,
        cells: <><td>{movement.fecha}</td><td>{safeProductName(movement.producto) || "Producto no válido"}</td><td>{inventoryMovementLabels[movement.tipo] || sanitizeText(movement.tipo)}</td><td>{number(movement.cantidad)}</td><td>{sanitizeText(movement.cliente_venta || (movement.orden_id ? `Orden #${movement.orden_id}` : "—"))}</td><td>{sanitizeText(movement.observaciones || "—")}</td></>,
      }))} /></Panel>
    </>
  );
}
