import React, { useState } from "react";
import { DataTable, Field, FormPanel, Intro, Panel } from "../comun/componentes.jsx";
import { packageSizes } from "../comun/constantes.js";
import { money, number, packagesLabel, sanitizeText } from "../comun/formato.js";

// «10 x 15 · calibre 2 · Transparente»; los registros anteriores a la variante no la tienen
function variantLabel(item) {
  if (!item.medida && !item.calibre && !item.color) return "Sin variante (registro anterior)";
  return `${sanitizeText(item.medida || "Sin medida")} · calibre ${sanitizeText(item.calibre || "—")} · ${sanitizeText(item.color || "Sin color")}`;
}

export function Sales({ data, lines, onSubmit, saving, onReceipt }) {
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const products = data.inventory.filter((item) => lines.includes(item.familia));
  const selectedProduct = products.find((item) => String(item.id) === selectedInventoryId && item.familia === selectedFamily);
  const availableProducts = products.filter((item) => Number(item.cantidad) > 0);
  const lineReferences = availableProducts.filter((item) => item.familia === selectedFamily);

  return (
    <>
      <Intro title="Ventas" description="Elige una línea y una variante disponible; las existencias se descuentan al registrar la venta." />
      <div className="product-family-grid">
        {lines.map((family) => {
          const variants = products.filter((item) => item.familia === family);
          const stock = variants.reduce((total, item) => total + Number(item.cantidad), 0);
          // Solo cuentan las referencias con unidades: son las que se pueden vender
          const withStock = variants.filter((item) => Number(item.cantidad) > 0).length;
          return (
            <button
              className={`product-family-card${selectedFamily === family ? " selected" : ""}`}
              key={family}
              type="button"
              onClick={() => {
                setSelectedFamily(family);
                setSelectedInventoryId("");
              }}
            >
              <span className="product-family-initial">{family.slice(0, 1)}</span>
              <strong>{family}</strong>
              <span>{withStock} {withStock === 1 ? "referencia disponible" : "referencias disponibles"}</span>
              <b>{number(stock)} unidades en stock</b>
              <span className="product-family-link">Ver existencias</span>
            </button>
          );
        })}
      </div>
      {selectedFamily && <Panel title={`Existencias de ${selectedFamily}`} className="reference-panel">
        {lineReferences.length ? (
          <div className="reference-list" role="group" aria-label={`Referencias de ${selectedFamily}`}>
            {lineReferences.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`reference-option${String(selectedProduct?.id) === String(item.id) ? " selected" : ""}`}
                aria-pressed={String(selectedProduct?.id) === String(item.id)}
                onClick={() => setSelectedInventoryId(String(item.id))}
              >
                <strong>{variantLabel(item)}</strong>
                <span>{number(item.cantidad)} unidades</span>
              </button>
            ))}
          </div>
        ) : <p className="empty">No hay referencias de esta línea con existencias.</p>}
      </Panel>}
      <FormPanel title="Nueva venta" onSubmit={onSubmit} saving={saving} obligatorios={["cliente", "inventario_id", "unidades_paquete", "cantidad_paquetes", "precio_paquete"]}>
        <Field label="Cliente"><input name="cliente" /></Field>
        <Field label="Línea de producto">
          <select value={selectedFamily} onChange={(event) => {
            setSelectedFamily(event.target.value);
            setSelectedInventoryId("");
          }}>
            <option value="" disabled>Selecciona una línea</option>
            {lines.map((family) => <option key={family} value={family}>{family}</option>)}
          </select>
        </Field>
        <Field label="Variante (medida / calibre / color)">
          <select name="inventario_id" value={selectedProduct?.id || ""} onChange={(event) => {
            const item = products.find((product) => String(product.id) === event.target.value);
            if (item) setSelectedFamily(item.familia);
            setSelectedInventoryId(event.target.value);
          }}>
            <option value="" disabled>{selectedFamily ? "Selecciona la variante" : "Primero elige la línea"}</option>
            {availableProducts.filter((item) => item.familia === selectedFamily).map((item) => (
              <option key={item.id} value={item.id}>{variantLabel(item)} · {number(item.cantidad)} unidades</option>
            ))}
          </select>
        </Field>
        {selectedProduct && <div className="product-variant-summary">
          <div><small>MEDIDA</small><span>{sanitizeText(selectedProduct.medida || "Sin especificar")}</span></div>
          <div><small>CALIBRE</small><span>{sanitizeText(selectedProduct.calibre || "Sin especificar")}</span></div>
          <div><small>COLOR</small><span>{sanitizeText(selectedProduct.color || "Sin especificar")}</span></div>
          <div><small>DISPONIBLE</small><span>{number(selectedProduct.cantidad)} unidades</span></div>
        </div>}
        <Field label="Unidades por paquete">
          <select name="unidades_paquete" defaultValue="">
            <option value="" disabled>Selecciona las unidades</option>
            {packageSizes.map((size) => <option key={size} value={size}>{size} unidades</option>)}
          </select>
        </Field>
        <Field label="Cantidad de paquetes"><input name="cantidad_paquetes" type="number" /></Field>
        <Field label="Precio por paquete"><input name="precio_paquete" type="number" /></Field>
      </FormPanel>
      <Panel title="Ventas registradas"><DataTable columns={["Cliente", "Producto", "Medida", "Calibre", "Color", "Presentación", "Unidades", "Total", "Comprobante"]} rows={data.sales.map((sale) => ({ key: sale.id, cells: <><td>{sanitizeText(sale.cliente)}</td><td>{sanitizeText(sale.familia || sale.producto)}</td><td>{sanitizeText(sale.medida || "—")}</td><td>{sanitizeText(sale.calibre || "—")}</td><td>{sanitizeText(sale.color || "—")}</td><td>{packagesLabel(sale)}</td><td>{number(sale.cantidad)}</td><td>{money(sale.total)}</td><td><button className="text-action" type="button" onClick={() => onReceipt(sale.id)}>Ver</button></td></> }))} /></Panel>
    </>
  );
}
