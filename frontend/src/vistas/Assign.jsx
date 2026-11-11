import React from "react";
import { Field, FormPanel, Intro, VariantFields } from "../comun/componentes.jsx";
import { sanitizeText } from "../comun/formato.js";
import { VARIANT_FIELDS } from "../comun/validacion.js";

export function Assign({ data, lines, onSubmit, saving }) {
  return (
    <>
      <Intro title="Asignar tarea" description="Crea una orden y entrégala a un operario activo." />
      <FormPanel title="Nueva orden de producción" onSubmit={onSubmit} saving={saving} obligatorios={["producto", ...VARIANT_FIELDS, "cantidad", "responsable_id", "materia_prima_id", "prioridad"]}>
        <Field label="Producto"><select name="producto" defaultValue=""><option value="" disabled>Selecciona una línea</option>{lines.map((family) => <option key={family} value={family}>{family}</option>)}</select></Field>
        <VariantFields idPrefix="tarea-nueva" />
        <Field label="Meta"><input name="cantidad" type="number" /></Field>
        <Field label="Operario"><select name="responsable_id" defaultValue=""><option value="" disabled>Selecciona el operario</option>{data.operators.map((operator) => <option key={operator.id} value={operator.id}>{sanitizeText(operator.nombre)}</option>)}</select></Field>
        <Field label="Materia prima"><select name="materia_prima_id" defaultValue=""><option value="" disabled>Selecciona la materia prima</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>)}</select></Field>
        <Field label="Prioridad"><select name="prioridad" defaultValue=""><option value="" disabled>Selecciona la prioridad</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
      </FormPanel>
    </>
  );
}
