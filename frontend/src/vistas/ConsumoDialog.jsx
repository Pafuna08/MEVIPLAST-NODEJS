import React, { useState } from "react";
import { Field, orderVariant } from "../comun/componentes.jsx";
import { Dialogo } from "../comun/Dialogo.jsx";
import { number, safeProductName, sanitizePayload, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { clearInvalid, useObligatorios } from "../comun/validacion.js";

// Kg con 2 decimales y hasta 100.000, igual que «Registrar movimiento» de Materias primas (DEF-022)
const LIMITES_KG = { cantidad: { integer: false, decimals: 2, maxValue: 100000 } };

// CR-026: el supervisor registra el consumo de materia prima de su orden desde Seguimiento (HU-008, RF-016),
// sin entrar a Materias primas. Es el mismo movimiento «Consumo en una orden»: primero los datos y después
// el resumen para confirmar, porque mueve el inventario y no se deshace desde el panel. Los errores se
// muestran en la ventana (el aviso flotante del panel queda detrás de ella).
export function ConsumoDialog({ order, material, onClose, onConfirm }) {
  const [warning, check] = useObligatorios();
  // Lo escrito se conserva al volver del resumen con «Revisar»
  const [datos, setDatos] = useState({ cantidad: "", observaciones: "" });
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const producto = (safeProductName(order.producto) || "Producto no válido") + orderVariant(order);
  const bobina = sanitizeText(material?.nombre || order.materia_prima_nombre || `#${order.materia_prima_id}`);
  const existencia = material ? `${number(material.cantidad)} ${sanitizeText(material.unidad || "kg")}` : "—";

  async function guardar() {
    setGuardando(true);
    setError("");
    const mensaje = await onConfirm({
      materia_prima_id: order.materia_prima_id,
      tipo: "consumo_produccion",
      produccion_id: order.id,
      cantidad: datos.cantidad,
      ...(datos.observaciones ? { observaciones: datos.observaciones } : {}),
    });
    // Si se guardó, el panel recarga la vista y la ventana se cierra sola
    if (mensaje) {
      setError(mensaje);
      setGuardando(false);
    }
  }

  return (
    <Dialogo onClose={onClose} labelledBy="consumo-title" className="order-modal consumo-modal">
      {!confirmando ? (
        <>
          <div className="confirm-header">
            <div className="confirm-icon consumo-icon"><Icono nombre="materia" size={22} /></div>
            <div>
              <h3 id="consumo-title">Registrar consumo de materia prima</h3>
              <p>Orden #{order.id} · {producto}</p>
            </div>
          </div>
          <dl className="confirm-summary order-summary">
            <dt>Bobina</dt><dd>{bobina}</dd>
            <dt>Existencia</dt><dd>{existencia}</dd>
          </dl>
          <form
            className="data-form consumo-form"
            aria-label={`Consumo de materia prima de la orden #${order.id}`}
            noValidate
            onInput={clearInvalid}
            onSubmit={(event) => {
              if (!check(event, ["cantidad"], "consumo", LIMITES_KG)) return;
              event.preventDefault();
              const escrito = sanitizePayload(Object.fromEntries(new FormData(event.currentTarget)));
              setDatos({ cantidad: escrito.cantidad, observaciones: escrito.observaciones || "" });
              setError("");
              setConfirmando(true);
            }}
          >
            <Field label="Cantidad (kg)"><input name="cantidad" type="number" defaultValue={datos.cantidad} autoFocus /></Field>
            <Field label="Observaciones"><input name="observaciones" maxLength={255} defaultValue={datos.observaciones} /></Field>
            {warning.key === "consumo" && <p className="form-error" role="alert">{warning.text}</p>}
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" onClick={onClose}>Cancelar</button>
              <button className="primary-action" type="submit">Registrar consumo</button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="confirm-header">
            <div className="confirm-icon"><Icono nombre="pregunta" size={22} /></div>
            <div>
              <h3 id="consumo-title">Confirmar movimiento de materia prima</h3>
              <p>Revisa los datos antes de guardar. Este registro mueve el inventario y no se puede deshacer desde el panel.</p>
            </div>
          </div>
          <dl className="confirm-summary">
            <dt>Bobina</dt><dd>{bobina}</dd>
            <dt>Movimiento</dt><dd>Consumo en una orden (orden #{order.id})</dd>
            <dt>Cantidad</dt><dd>{number(Number(datos.cantidad) || 0)} kg</dd>
            {datos.observaciones && <><dt>Observaciones</dt><dd>{sanitizeText(datos.observaciones)}</dd></>}
          </dl>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="confirm-actions">
            <button className="confirm-cancel" type="button" autoFocus disabled={guardando} onClick={() => setConfirmando(false)}>Revisar</button>
            <button className="confirm-delete" type="button" disabled={guardando} onClick={guardar}>{guardando ? "Guardando..." : "Sí, guardar"}</button>
          </div>
        </>
      )}
    </Dialogo>
  );
}
