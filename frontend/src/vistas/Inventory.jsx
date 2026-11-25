import React, { useState } from "react";
import { DataTable, Field, FormPanel, FormToggles, Intro, Panel, StatCard, VariantFields, useFormularioAbierto } from "../comun/componentes.jsx";
import { exitReasons, inventoryMovementLabels } from "../comun/constantes.js";
import { number, safeProductName, sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS } from "../comun/validacion.js";

// Rediseño: indicadores del inventario, formularios que se abren con los botones del encabezado
// y etiquetas de color en el estado de cada producto y en cada movimiento
export function Inventory({ data, lines, onSubmit, saving }) {
  const [exitReason, setExitReason] = useState("");
  const [openForm, setOpenForm] = useFormularioAbierto("inventario");
  const units = data.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  const withStock = data.items.filter((item) => Number(item.cantidad) > 0).length;
  const soldOut = data.items.length - withStock;
  return (
    <>
      <Intro
        icon="inventario"
        title="Inventario terminado"
        description="Registra variantes de las líneas de producto que fabrica MEVIPLAST."
        action={(
          <FormToggles
            open={openForm}
            onToggle={setOpenForm}
            options={[
              { key: "salida", label: "Registrar salida", closeLabel: "Cerrar salida" },
              { key: "ingreso", label: "+ Ingreso de inventario", closeLabel: "Cerrar ingreso", main: true },
            ]}
          />
        )}
      />
      <section className="stats-grid stats-grid-3">
        <StatCard label="Unidades en existencia" value={number(units)} icon="inventario" tone="morado" detail={`En ${number(data.items.length)} ${data.items.length === 1 ? "referencia" : "referencias"}`} />
        <StatCard label="Referencias con existencias" value={number(withStock)} icon="ok" tone="verde" detail="Disponibles para la venta" />
        <StatCard label="Agotadas" value={number(soldOut)} icon="alerta" tone="rojo" detail={soldOut ? "Referencias en cero" : "Ninguna referencia agotada"} warning={soldOut > 0} />
      </section>
      {openForm === "ingreso" && (
        <FormPanel title="Ingreso de inventario" onSubmit={onSubmit} saving={saving} obligatorios={["familia", ...VARIANT_FIELDS, "cantidad"]}>
          <Field label="Línea de producto"><select name="familia" defaultValue=""><option value="" disabled>Selecciona una línea</option>{lines.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
          <VariantFields idPrefix="inventario" />
          <Field label="Unidades"><input name="cantidad" type="number" /></Field>
        </FormPanel>
      )}
      {openForm === "salida" && (
        <FormPanel title="Registrar salida manual" onSubmit={onSubmit} saving={saving} obligatorios={["inventario_id", "cantidad", "motivo", ...(exitReason === "Otro" ? ["detalle"] : [])]}>
          <Field label="Producto"><select name="inventario_id" defaultValue=""><option value="" disabled>Selecciona el producto</option>{data.items.filter((item) => safeProductName(item.producto)).map((item) => <option key={item.id} value={item.id}>{safeProductName(item.producto)} ({number(item.cantidad)})</option>)}</select></Field>
          <Field label="Cantidad"><input name="cantidad" type="number" /></Field>
          <Field label="Motivo">
            <select name="motivo" value={exitReason} onChange={(event) => setExitReason(event.target.value)}>
              <option value="" disabled>Selecciona el motivo</option>
              {exitReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
            </select>
          </Field>
          <Field label={exitReason === "Otro" ? "Detalle (obligatorio)" : "Detalle (opcional)"}><input name="detalle" /></Field>
        </FormPanel>
      )}
      <Panel title="Productos disponibles"><DataTable columns={["Línea", "Medida", "Calibre", "Color", "Unidades"]} rows={data.items.map((item) => ({ key: item.id, cells: <><td><strong className="cell-strong">{sanitizeText(item.familia)}</strong></td><td>{sanitizeText(item.medida || "—")}</td><td>{sanitizeText(item.calibre || "—")}</td><td>{sanitizeText(item.color || "—")}</td><td><span className="stock-cell">{number(item.cantidad)}{Number(item.cantidad) === 0 && <span className="status alert">Agotado</span>}</span></td></> }))} /></Panel>
      <Panel title="Movimientos recientes"><DataTable columns={["Fecha", "Producto", "Movimiento", "Cantidad", "Venta / orden", "Motivo / observación"]} rows={data.movements.map((movement) => ({
        key: movement.id,
        cells: <><td>{movement.fecha}</td><td>{safeProductName(movement.producto) || "Producto no válido"}</td><td><span className={`movement-chip movement-${sanitizeText(movement.tipo)}`}>{inventoryMovementLabels[movement.tipo] || sanitizeText(movement.tipo)}</span></td><td>{number(movement.cantidad)}</td><td>{sanitizeText(movement.cliente_venta || (movement.orden_id ? `Orden #${movement.orden_id}` : "—"))}</td><td>{sanitizeText(movement.observaciones || "—")}</td></>,
      }))} /></Panel>
    </>
  );
}
