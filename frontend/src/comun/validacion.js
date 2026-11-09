import { useState } from "react";

// Campos obligatorios: se revisan aquí, sin atributos de validación ni otras marcas en el HTML.
// El servidor vuelve a validar cada dato; esto solo evita enviar formularios incompletos.
export const VARIANT_FIELDS = ["medida", "calibre", "color"];

// Reglas de cada campo (largo según la columna en la base, números positivos y correo); el servidor las repite
const FIELD_RULES = {
  nombre: { max: 120 },
  usuario: { max: 50 },
  correo: { max: 254, email: true },
  password: { min: 6 },
  cliente: { max: 120 },
  medida: { max: 40 },
  calibre: { max: 40 },
  color: { max: 80 },
  ubicacion: { max: 80 },
  detalle: { max: 200 },
  observaciones: { max: 255 },
  cantidad: { positive: true },
  peso_rollo: { positive: true },
  precio_paquete: { positive: true },
  cantidad_paquetes: { positive: true, integer: true },
  unidades_paquete: { positive: true, integer: true, maxValue: 500 },
};

function ruleError(field, rule) {
  const value = String(field.value ?? "").trim();
  if (!value) return "";
  const label = fieldLabel(field);
  if (rule.max && value.length > rule.max) return `«${label}» admite máximo ${rule.max} caracteres.`;
  if (rule.min && value.length < rule.min) return `«${label}» debe tener al menos ${rule.min} caracteres.`;
  if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `«${label}» no es un correo válido.`;
  if (rule.positive) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return `«${label}» debe ser un número mayor que cero.`;
    if (rule.integer && !Number.isInteger(number)) return `«${label}» debe ser un número entero.`;
    if (rule.maxValue && number > rule.maxValue) return `«${label}» admite como máximo ${rule.maxValue}.`;
  }
  return "";
}

// Primer campo con un valor fuera de su regla; limits ajusta el largo en formularios puntuales
function invalidField(form, limits = {}) {
  for (const field of form.elements) {
    const rule = FIELD_RULES[field.name];
    if (!rule) continue;
    const message = ruleError(field, limits[field.name] ? { ...rule, max: limits[field.name] } : rule);
    if (message) return { field, message };
  }
  return null;
}

function missingField(form, names) {
  for (const name of names) {
    const field = form.elements.namedItem(name);
    if (field && !String(field.value ?? "").trim()) return field;
  }
  return null;
}

function fieldLabel(field) {
  // «Detalle (obligatorio)» → «Detalle»
  const text = field.closest("label")?.firstChild?.textContent?.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return text || "obligatorio";
}

// Devuelve el aviso vigente y la función que revisa el formulario al enviarlo
export function useObligatorios() {
  const [warning, setWarning] = useState({ key: null, text: "" });
  function check(event, names, key = "form", limits = {}) {
    const missing = missingField(event.currentTarget, names);
    const invalid = missing
      ? { field: missing, message: `Completa el campo «${fieldLabel(missing)}».` }
      : invalidField(event.currentTarget, limits);
    if (!invalid) {
      setWarning({ key: null, text: "" });
      return true;
    }
    event.preventDefault();
    setWarning({ key, text: invalid.message });
    invalid.field.classList.add("field-invalid");
    invalid.field.focus();
    return false;
  }
  return [warning, check];
}

export function clearInvalid(event) {
  event.target.classList?.remove("field-invalid");
}
