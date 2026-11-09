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
  return (
    <>
      <Intro title="Registrar producción" description="El avance se suma a la orden e ingresa al inventario terminado." />
      <FormPanel title="Nuevo registro" onSubmit={onSubmit} saving={saving} obligatorios={["id", "cantidad"]}>
        <Field label="Orden"><select name="id" defaultValue={chosenOrder}>{activeOrders.map((order) => <option key={order.id} value={order.id}>#{order.id} · {safeProductName(order.producto) || "Producto no válido"}{orderVariant(order)} (pendiente {number(Number(order.cantidad) - Number(order.cantidad_producida || 0))})</option>)}</select></Field>
        <Field label="Cantidad producida"><input name="cantidad" type="number" /></Field>
        <Field label="Observaciones"><textarea name="observaciones" rows="3" /></Field>
        {!activeOrders.length && <p className="empty">No hay órdenes pendientes para registrar producción.</p>}
      </FormPanel>
    </>
  );
}
