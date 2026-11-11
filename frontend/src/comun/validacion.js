import { useState } from "react";
import { packageSizes, productColors } from "./constantes.js";

// Campos obligatorios: se revisan aquí, sin atributos de validación ni otras marcas en el HTML.
// El servidor vuelve a validar cada dato; esto solo evita enviar formularios incompletos.
export const VARIANT_FIELDS = ["medida", "calibre", "color"];

// Reglas de cada campo (largo según la columna en la base, números positivos y correo); el servidor las repite
const FIELD_RULES = {
  nombre: { max: 120 },
  // DEF-022: sin espacios; el servidor lo guarda en minúsculas
  usuario: {
    max: 50,
    pattern: /^[A-Za-z0-9._-]{3,50}$/,
    message: "El usuario solo admite letras sin tilde, números, punto, guion y guion bajo, sin espacios (3 a 50 caracteres).",
  },
  correo: { max: 254, email: true },
  password: { min: 6 },
  cliente: { max: 120 },
  // Formato de RN-025, igual que backend/src/utils/variantes.js
  medida: {
    max: 40,
    // «ancho x largo» o una talla de Cargadera (CR-019); el servidor revisa cuál corresponde a la línea
    pattern: /^(?:T(?:15|20|25|30)|\d{1,4}(?:[.,]\d{1,2})?\s*[xX×*]\s*\d{1,4}(?:[.,]\d{1,2})?\s*(?:cm|mm|m|in|pulg)?)$/i,
    numbersPositive: true,
    message: "La medida debe ser ancho x largo, por ejemplo 10 x 15 o 40 x 60 cm.",
  },
  calibre: {
    max: 40,
    pattern: /^\d{1,3}(?:[.,]\d{1,2})?$/,
    numbersPositive: true,
    message: "El calibre debe ser un número mayor que cero, por ejemplo 0.95 o 2.",
  },
  // RN-025: el color se elige de la lista fija (la misma del servidor)
  color: {
    oneOf: productColors,
    message: "Selecciona un color de la lista.",
  },
  detalle: { max: 200 },
  observaciones: { max: 255 },
  // DEF-022 y CR-018: los mismos topes del servidor (backend/src/utils/numeros.js). «cantidad» son unidades
  // enteras; el formulario de bobinas la cambia a kg con decimales
  cantidad: { positive: true, integer: true, maxValue: 1000000 },
  peso_rollo: { positive: true, decimals: 2, maxValue: 100000 },
  precio_paquete: { positive: true, decimals: 2, maxValue: 100000000, money: true },
  cantidad_paquetes: { positive: true, integer: true, maxValue: 1000 },
  unidades_paquete: { oneOf: packageSizes, message: "Elige 50, 100 o 500 unidades por paquete." },
};

function ruleError(field, rule) {
  const value = String(field.value ?? "").trim();
  if (!value) return "";
  const label = fieldLabel(field);
  if (rule.max && value.length > rule.max) return `«${label}» admite máximo ${rule.max} caracteres.`;
  if (rule.min && value.length < rule.min) return `«${label}» debe tener al menos ${rule.min} caracteres.`;
  if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `«${label}» no es un correo válido.`;
  // Los números de la medida y el calibre también deben ser mayores que cero (0 x 15 o 0 no son válidos)
  if (rule.oneOf && !rule.oneOf.includes(value)) return rule.message;
  if (rule.pattern && (!rule.pattern.test(value) || (rule.numbersPositive && (value.match(/\d+(?:[.,]\d+)?/g) || []).some((n) => Number(n.replace(",", ".")) <= 0)))) {
    return rule.message;
  }
  if (rule.positive) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return `«${label}» debe ser un número mayor que cero.`;
    if (rule.integer && !Number.isInteger(number)) return `«${label}» debe ser un número entero.`;
    if (rule.decimals !== undefined && Math.abs(number * 10 ** rule.decimals - Math.round(number * 10 ** rule.decimals)) > 1e-6) {
      return `«${label}» admite como máximo ${rule.decimals} decimales.`;
    }
    if (rule.maxValue && number > rule.maxValue) {
      return `«${label}» admite como máximo ${rule.money ? "$" : ""}${rule.maxValue.toLocaleString("es-CO")}.`;
    }
  }
  return "";
}

// Primer campo con un valor fuera de su regla; limits ajusta el largo en formularios puntuales
function invalidField(form, limits = {}) {
  for (const field of form.elements) {
    const rule = FIELD_RULES[field.name];
    if (!rule) continue;
    // limits ajusta la regla en un formulario puntual: un número cambia el largo y un objeto reemplaza partes de la regla
    const limit = limits[field.name];
    const message = ruleError(field, limit === undefined ? rule : typeof limit === "object" ? { ...rule, ...limit } : { ...rule, max: limit });
    if (message) return { field, message };
  }
  return null;
}

// Un campo numérico con texto que no es número («43e», «-») le llega vacío al formulario;
// se detecta aparte para no pedir «Completa el campo» cuando sí se escribió algo
function notANumberField(form) {
  for (const field of form.elements) {
    if (field.type === "number" && field.validity?.badInput) return field;
  }
  return null;
}

// Teclas que el navegador acepta en un campo numérico por la notación científica (4e3) o el signo
const NON_NUMERIC_KEYS = new Set(["e", "E", "+", "-"]);

export function blockNonNumericKeys(event) {
  if (event.target?.type === "number" && NON_NUMERIC_KEYS.has(event.key)) event.preventDefault();
}

export function blockNonNumericPaste(event) {
  const text = event.clipboardData?.getData("text") ?? "";
  if (event.target?.type === "number" && !/^\s*\d*(?:[.,]\d*)?\s*$/.test(text)) event.preventDefault();
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
    const notANumber = notANumberField(event.currentTarget);
    const missing = notANumber ? null : missingField(event.currentTarget, names);
    const invalid = notANumber
      ? { field: notANumber, message: `«${fieldLabel(notANumber)}» debe ser un número, sin letras ni signos.` }
      : missing
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
