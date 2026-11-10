import React, { useState } from "react";
import { Field, FormPanel, Intro, orderVariant } from "../comun/componentes.jsx";
import { ADVANCE_ORDER_KEY } from "../comun/constantes.js";
import { number, safeProductName } from "../comun/formato.js";

export function Advance({ data, onSubmit, saving }) {
  const activeOrders = data.filter((order) => !["finalizado", "cancelado"].includes(order.estado));
  // Si se llegó desde «Registrar avance» en Mis tareas, esa orden queda elegida (una sola vez)
  const [chosenOrder] = useState(() => {
    try {
      const id = sessionStorage.getItem(ADVANCE_ORDER_KEY);
      sessionStorage.removeItem(ADVANCE_ORDER_KEY);
      return activeOrders.some((order) => String(order.id) === id) ? id : undefined;
    } catch {
      return undefined;
    }
  });
  // Etiqueta de la orden: «#4 · Troquel riñón · 12 x 18 · calibre 2 · Transparente (pendiente 420)»
  const orderLabel = (order) => `#${order.id} · ${safeProductName(order.producto) || "Producto no válido"}${orderVariant(order)} (pendiente ${number(Number(order.cantidad) - Number(order.cantidad_producida || 0))})`;
  const fixedOrder = activeOrders.find((order) => String(order.id) === chosenOrder);
  return (
    <>
      <Intro title="Registrar producción" description="El avance se suma a la orden e ingresa al inventario terminado." />
      <FormPanel title="Nuevo registro" onSubmit={onSubmit} saving={saving} obligatorios={["id", "cantidad"]}>
        {fixedOrder ? (
          // Llegó desde «Registrar avance» en Mis tareas: la orden queda fija para no registrar en otra por error
          <Field label="Orden (elegida en Mis tareas)">
            <input type="text" value={orderLabel(fixedOrder)} readOnly className="fixed-field" />
            <input type="hidden" name="id" value={fixedOrder.id} />
          </Field>
        ) : (
          <Field label="Orden"><select name="id" defaultValue=""><option value="" disabled>Selecciona la orden</option>{activeOrders.map((order) => <option key={order.id} value={order.id}>{orderLabel(order)}</option>)}</select></Field>
        )}
        <Field label="Cantidad producida"><input name="cantidad" type="number" /></Field>
        <Field label="Observaciones"><textarea name="observaciones" rows="3" /></Field>
        {fixedOrder && <p className="form-hint form-hint-wide">Para registrar en otra orden, vuelve a Mis tareas y pulsa «Registrar avance» en esa orden.</p>}
        {!activeOrders.length && <p className="empty">No hay órdenes pendientes para registrar producción.</p>}
      </FormPanel>
    </>
  );
}
