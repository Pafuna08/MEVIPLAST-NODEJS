import React, { useEffect, useRef, useState } from "react";
import { Dialogo } from "./Dialogo.jsx";
import { Field } from "./componentes.jsx";
import { productColors } from "./constantes.js";
import { sanitizePayload } from "./formato.js";
import { VARIANT_FIELDS, clearInvalid, useObligatorios } from "./validacion.js";

const POLYMER_MATERIALS = [
  ["PEBD", "Bobina o rollo de polietileno de baja densidad (PEBD)"],
  ["PEAD", "Bobina o rollo de polietileno de alta densidad (PEAD)"],
  ["PP", "Bobina o rollo de polipropileno (PP)"],
];

// Campos de una bobina nueva: el material y el color salen de listas fijas; la medida, en «ancho x largo» (RN-025)
export function MaterialFields({ idPrefix }) {
  return (
    <>
      <Field label="Material">
        <select name="tipo" defaultValue="">
          <option value="" disabled>Selecciona un material</option>
          {POLYMER_MATERIALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Medida (ancho x largo)">
        <input name="medida" list={`${idPrefix}-medidas`} />
        <datalist id={`${idPrefix}-medidas`}>
          {["6 x 8", "6 x 12", "8 x 12", "10 x 15", "15 x 20", "20 x 30", "30 x 40", "40 x 60", "50 x 70"].map((value) => <option key={value} value={value} />)}
        </datalist>
      </Field>
      <Field label="Calibre">
        <input name="calibre" list={`${idPrefix}-calibres`} />
        <datalist id={`${idPrefix}-calibres`}>
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
    </>
  );
}

export const MATERIAL_REQUIRED = ["tipo", ...VARIANT_FIELDS, "peso_rollo"];
export const MATERIAL_LIMITS = { medida: 80 };

// Ventana con un formulario para crear un dato desde la opción «+ Crear…» de un selector.
// Valida igual que los formularios del panel y muestra el error del servidor sin cerrarse.
function CreateDialog({ id, title, description, obligatorios, limites, onSave, onClose, children }) {
  const [warning, check] = useObligatorios();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dialogo onClose={onClose} labelledBy={`${id}-titulo`} className="create-modal">
      <div className="confirm-header">
        <div className="confirm-icon create-icon">+</div>
        <div>
          <h3 id={`${id}-titulo`}>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <form
        className="data-form"
        noValidate
        onInput={(event) => {
          clearInvalid(event);
          setError("");
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!check(event, obligatorios, id, limites)) return;
          const payload = sanitizePayload(Object.fromEntries(new FormData(event.currentTarget)));
          setSaving(true);
          setError("");
          try {
            await onSave(payload);
          } catch (cause) {
            setError(cause.message || "No se pudo guardar.");
            setSaving(false);
          }
        }}
      >
        {children}
        {(warning.text || error) && <p className="form-error" role="alert">{warning.text || error}</p>}
        <div className="confirm-actions">
          <button className="confirm-cancel" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-action" type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear"}</button>
        </div>
      </form>
    </Dialogo>
  );
}

// CR-020: solo el administrador crea una línea; queda elegida en el formulario de donde se abrió
export function NewLineDialog({ onCreate, onCreated, onClose }) {
  return (
    <CreateDialog
      id="nueva-linea"
      title="Crear nueva línea de producto"
      description="Úsala solo para un producto que MEVIPLAST empieza a fabricar. Las líneas no se borran. Su medida se registra en «ancho x largo»."
      obligatorios={["nombre"]}
      limites={{ nombre: 60 }}
      onSave={async ({ nombre }) => onCreated(await onCreate(nombre))}
      onClose={onClose}
    >
      <Field label="Nombre de la línea"><input name="nombre" autoFocus /></Field>
    </CreateDialog>
  );
}

// Bobina nueva con las mismas reglas de «Registrar material»; queda elegida en el formulario de donde se abrió
export function NewMaterialDialog({ onCreate, onCreated, onClose }) {
  return (
    <CreateDialog
      id="nuevo-material"
      title="Crear nuevo material"
      description="Registra una bobina que todavía no está en la lista. Su peso es la existencia inicial."
      obligatorios={MATERIAL_REQUIRED}
      limites={MATERIAL_LIMITS}
      onSave={async (payload) => onCreated(await onCreate(payload))}
      onClose={onClose}
    >
      <MaterialFields idPrefix="nuevo-material" />
    </CreateDialog>
  );
}

// Para selectores no controlados: tras el render que trae la opción nueva, la elige y avisa con «change»
// (así VariantFields cambia la medida según la línea)
export function useSelectAfterRender() {
  const pending = useRef(null);
  useEffect(() => {
    if (!pending.current) return;
    const { select, value } = pending.current;
    if (!select || !document.contains(select)) {
      pending.current = null;
      return;
    }
    if (![...select.options].some((option) => option.value === value)) return;
    pending.current = null;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    select.focus();
  });
  return (select, value) => {
    pending.current = { select, value: String(value) };
  };
}
