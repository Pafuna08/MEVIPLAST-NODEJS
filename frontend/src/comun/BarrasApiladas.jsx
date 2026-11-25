import React, { useState } from "react";
import { Dialogo } from "./Dialogo.jsx";
import { percentFormat, sanitizeText } from "./formato.js";

// MEVI-120: barras por partes. Cada barra se divide en colores según las referencias que la forman y un clic
// abre una ventana con la cantidad exacta y el porcentaje de cada una.
// Paleta categórica validada con la guía de visualización (orden fijo, nunca cíclico): pasa las pruebas de
// daltonismo y de separación entre vecinos; cuatro colores tienen poco contraste sobre blanco, por eso las
// cifras exactas siempre están a la vista en la ventana de detalle y en las tablas del reporte.
export const SERIES_COLORS = ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac", "#008a17", "#6a4ce2", "#ec4647"];
const OTHER_COLOR = "#9aa5b4";
const MAX_COLORED = 7;

const share = (value, total) => (total ? `${percentFormat.format((value * 100) / total)} %` : "—");

// Colores por barra (las referencias de una línea solo están en esa línea) o por entidad (la misma referencia
// puede estar en varias barras, por ejemplo en varios operarios, y debe tener el mismo color en todas)
function assignColors(items, colorBy) {
  if (colorBy === "entity") {
    const totals = new Map();
    for (const item of items) {
      for (const part of item.partes) totals.set(part.clave, { etiqueta: part.etiqueta, valor: (totals.get(part.clave)?.valor || 0) + part.valor });
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1].valor - a[1].valor);
    const colorOf = new Map(ranked.slice(0, MAX_COLORED).map(([clave], index) => [clave, SERIES_COLORS[index]]));
    const legend = ranked.slice(0, MAX_COLORED).map(([clave, { etiqueta }]) => ({ clave, etiqueta, color: colorOf.get(clave) }));
    if (ranked.length > MAX_COLORED) legend.push({ clave: "__otras", etiqueta: "Otras referencias", color: OTHER_COLOR });
    return { colorFor: (_item, part) => colorOf.get(part.clave) || OTHER_COLOR, legend };
  }
  return {
    colorFor: (item, part) => {
      const index = [...item.partes].sort((a, b) => b.valor - a.valor).findIndex((p) => p.clave === part.clave);
      return index < MAX_COLORED ? SERIES_COLORS[index] : OTHER_COLOR;
    },
    legend: null,
  };
}

// Segmentos de una barra: de mayor a menor; lo que no tiene color propio se junta en «Otras referencias»
function segmentsOf(item, colorFor) {
  const sorted = [...item.partes].filter((part) => part.valor > 0).sort((a, b) => b.valor - a.valor);
  const colored = [];
  let others = 0;
  for (const part of sorted) {
    const color = colorFor(item, part);
    if (color === OTHER_COLOR) others += part.valor;
    else colored.push({ ...part, color });
  }
  if (others > 0) colored.push({ clave: "__otras", etiqueta: "Otras referencias", valor: others, color: OTHER_COLOR });
  return colored;
}

function Segments({ segments, total, format, big = false }) {
  return (
    <span className={`stacked-fill${big ? " big" : ""}`}>
      {segments.map((segment) => (
        <span
          className="stacked-segment"
          key={segment.clave}
          style={{ flexGrow: segment.valor, backgroundColor: segment.color }}
          title={`${segment.etiqueta}: ${format(segment.valor)} (${share(segment.valor, total)})`}
        />
      ))}
    </span>
  );
}

// Agrupa filas «Línea · medida · calibre · color» por línea; cada variante es una parte de la barra de su línea
export function groupByLine(rows, nameOf, valueOf, extraOf) {
  const lines = new Map();
  for (const row of rows) {
    const name = nameOf(row);
    if (!name) continue;
    const [line, ...variant] = name.split(" · ");
    const value = Number(valueOf(row)) || 0;
    const entry = lines.get(line) || { clave: line, etiqueta: line, valor: 0, partes: [] };
    entry.valor += value;
    // Varias órdenes de la misma variante suman en una sola parte
    const part = entry.partes.find((item) => item.clave === name);
    if (part) part.valor += value;
    else entry.partes.push({ clave: name, etiqueta: variant.join(" · ") || "Sin variante", valor: value, ...(extraOf ? { extra: extraOf(row) } : {}) });
    lines.set(line, entry);
  }
  return [...lines.values()].sort((a, b) => b.valor - a.valor);
}

// items: [{ clave, etiqueta, valor, subtitulo?, partes: [{ clave, etiqueta, valor, extra?: { columna: texto } }] }]
export function StackedBarList({ items, format = (value) => value, label, unit = "Cantidad", colorBy = "bar", hint = true }) {
  const [selected, setSelected] = useState(null);
  const { colorFor, legend } = assignColors(items, colorBy);
  const maximum = Math.max(...items.map((item) => item.valor), 1);
  const current = items.find((item) => item.clave === selected);
  return (
    <>
      {hint && <p className="panel-note">Cada color es una referencia. Toca una barra para ver cuánto aporta cada una.</p>}
      <div className="bar-list stacked-list" role="list" aria-label={label}>
        {items.map((item) => (
          <div role="listitem" key={item.clave}>
            <button
              className="bar-row stacked-row"
              type="button"
              aria-label={`${item.etiqueta}: ${format(item.valor)}. Ver el detalle por referencia`}
              onClick={() => setSelected(item.clave)}
            >
              <span className="bar-label">{item.etiqueta}</span>
              <span className="bar-track stacked-track" aria-hidden="true">
                <span className="stacked-width" style={{ width: `${Math.max((item.valor * 100) / maximum, 2)}%` }}>
                  <Segments segments={segmentsOf(item, colorFor)} total={item.valor} format={format} />
                </span>
              </span>
              <strong className="bar-value">{format(item.valor)}</strong>
            </button>
          </div>
        ))}
      </div>
      {legend && legend.length > 1 && (
        <ul className="chart-legend" aria-label="Referencias">
          {legend.map((entry) => (
            <li key={entry.clave}><span className="legend-swatch" style={{ backgroundColor: entry.color }} aria-hidden="true" />{sanitizeText(entry.etiqueta)}</li>
          ))}
        </ul>
      )}
      {current && <BarDetailDialog item={current} colorFor={colorFor} format={format} unit={unit} onClose={() => setSelected(null)} />}
    </>
  );
}

// Detalle de una barra: la barra grande y cada referencia con su color, cantidad exacta y porcentaje del total
function BarDetailDialog({ item, colorFor, format, unit, onClose }) {
  const parts = [...item.partes].filter((part) => part.valor > 0).sort((a, b) => b.valor - a.valor);
  const extraColumns = Object.keys(parts[0]?.extra || {});
  return (
    <Dialogo onClose={onClose} labelledBy="detalle-barra-titulo" className="order-modal bar-detail-modal">
      <div className="order-modal-header">
        <div>
          <h3 id="detalle-barra-titulo">{sanitizeText(item.etiqueta)}</h3>
          <p>Total: <strong>{format(item.valor)}</strong>{item.subtitulo ? ` · ${item.subtitulo}` : ""} · {parts.length} {parts.length === 1 ? "referencia" : "referencias"}</p>
        </div>
      </div>
      <div className="bar-detail-bar" aria-hidden="true">
        <Segments segments={segmentsOf(item, colorFor)} total={item.valor} format={format} big />
      </div>
      <div className="table-wrap card-table bar-detail-table">
        <table>
          <thead>
            <tr><th>Referencia</th><th>{unit}</th><th>% del total</th>{extraColumns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.clave}>
                <td data-label="Referencia"><span className="legend-cell"><span className="legend-swatch" style={{ backgroundColor: colorFor(item, part) }} aria-hidden="true" />{sanitizeText(part.etiqueta)}</span></td>
                <td data-label={unit}><strong>{format(part.valor)}</strong></td>
                <td data-label="% del total">{share(part.valor, item.valor)}</td>
                {extraColumns.map((column) => <td key={column} data-label={column}>{part.extra?.[column] ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td data-label="Referencia"><strong>Total</strong></td><td data-label={unit}><strong>{format(item.valor)}</strong></td><td data-label="% del total">100 %</td>{extraColumns.map((column) => <td key={column} data-label={column}>{item.totalesExtra?.[column] ?? ""}</td>)}</tr>
          </tfoot>
        </table>
      </div>
      <div className="confirm-actions">
        <button className="confirm-cancel" type="button" autoFocus onClick={onClose}>Cerrar</button>
      </div>
    </Dialogo>
  );
}
