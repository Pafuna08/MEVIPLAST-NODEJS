import React, { useState } from "react";
import { DataTable, Field, FormPanel, Intro, Panel } from "../comun/componentes.jsx";
import { finishedProductFamilies } from "../comun/constantes.js";
import { money, number, packagesLabel, sanitizeText } from "../comun/formato.js";

export function Sales({ data, onSubmit, saving, onReceipt }) {
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [selectedFamily, setSelectedFamily] = useState(finishedProductFamilies[0]);
  const products = data.inventory.filter((item) => finishedProductFamilies.includes(item.familia));
  const selectedProduct =
    products.find((item) => String(item.id) === selectedInventoryId && item.familia === selectedFamily) ||
    products.find((item) => item.familia === selectedFamily && Number(item.cantidad) > 0);
  const availableProducts = products.filter((item) => Number(item.cantidad) > 0);

  return (
    <>
      <Intro title="Ventas" description="Elige una línea y una variante disponible; las existencias se descuentan al registrar la venta." />
      <div className="product-family-grid">
        {finishedProductFamilies.map((family) => {
          const variants = products.filter((item) => item.familia === family);
          const stock = variants.reduce((total, item) => total + Number(item.cantidad), 0);
          return (
            <button
              className={`product-family-card${selectedFamily === family ? " selected" : ""}`}
              key={family}
              type="button"
              onClick={() => {
                setSelectedFamily(family);
                const firstAvailable = variants.find((item) => Number(item.cantidad) > 0);
                if (firstAvailable) setSelectedInventoryId(String(firstAvailable.id));
              }}
            >
              <span className="product-family-initial">{family.slice(0, 1)}</span>
              <strong>{family}</strong>
              <span>{variants.length} {variants.length === 1 ? "referencia disponible" : "referencias disponibles"}</span>
              <b>{number(stock)} unidades en stock</b>
              <span className="product-family-link">Ver existencias</span>
            </button>
          );
        })}
      </div>
      <FormPanel title="Nueva venta" onSubmit={onSubmit} saving={saving} obligatorios={["cliente", "inventario_id", "unidades_paquete", "cantidad_paquetes", "precio_paquete"]}>
        <Field label="Cliente"><input name="cliente" /></Field>
        <Field label="Línea de producto">
          <select value={selectedFamily} onChange={(event) => {
            const family = event.target.value;
            setSelectedFamily(family);
            const firstAvailable = products.find((item) => item.familia === family && Number(item.cantidad) > 0);
            setSelectedInventoryId(firstAvailable ? String(firstAvailable.id) : "");
          }}>
            {finishedProductFamilies.map((family) => <option key={family} value={family}>{family}</option>)}
          </select>
        </Field>
        <Field label="Variante (medida / calibre / color)">
          <select name="inventario_id" value={selectedProduct?.id || ""} onChange={(event) => {
            const item = products.find((product) => String(product.id) === event.target.value);
            if (item) setSelectedFamily(item.familia);
            setSelectedInventoryId(event.target.value);
          }}>
            {availableProducts.filter((item) => item.familia === selectedFamily).map((item) => (
              <option key={item.id} value={item.id}>{item.medida || "Sin medida"} · calibre {item.calibre || "Sin especificar"} · {item.color || "Sin especificar"} · {number(item.cantidad)} unidades</option>
            ))}
            {!availableProducts.some((item) => item.familia === selectedFamily) && <option value="" disabled>No hay variantes con existencias</option>}
          </select>
        </Field>
        {selectedProduct && <div className="product-variant-summary">
          <div><small>MEDIDA</small><span>{sanitizeText(selectedProduct.medida || "Sin especificar")}</span></div>
          <div><small>CALIBRE</small><span>{sanitizeText(selectedProduct.calibre || "Sin especificar")}</span></div>
          <div><small>COLOR</small><span>{sanitizeText(selectedProduct.color || "Sin especificar")}</span></div>
          <div><small>DISPONIBLE</small><span>{number(selectedProduct.cantidad)} unidades</span></div>
        </div>}
        <Field label="Unidades por paquete (máximo 500)"><input name="unidades_paquete" type="number" defaultValue="50" /></Field>
        <Field label="Cantidad de paquetes"><input name="cantidad_paquetes" type="number" /></Field>
        <Field label="Precio por paquete"><input name="precio_paquete" type="number" /></Field>
      </FormPanel>
      <Panel title="Ventas registradas"><DataTable columns={["Cliente", "Producto", "Medida", "Calibre", "Color", "Presentación", "Unidades", "Total", "Comprobante"]} rows={data.sales.map((sale) => ({ key: sale.id, cells: <><td>{sanitizeText(sale.cliente)}</td><td>{sanitizeText(sale.familia || sale.producto)}</td><td>{sanitizeText(sale.medida || "—")}</td><td>{sanitizeText(sale.calibre || "—")}</td><td>{sanitizeText(sale.color || "—")}</td><td>{packagesLabel(sale)}</td><td>{number(sale.cantidad)}</td><td>{money(sale.total)}</td><td><button className="text-action" type="button" onClick={() => onReceipt(sale.id)}>Ver</button></td></> }))} /></Panel>
    </>
  );
}
