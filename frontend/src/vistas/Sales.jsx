import React, { useRef, useState } from "react";
import { DataTable, Field, Intro, Panel } from "../comun/componentes.jsx";
import { packageSizes } from "../comun/constantes.js";
import { money, number, packagesLabel, safeProductName, sanitizeText } from "../comun/formato.js";
import { clearInvalid } from "../comun/validacion.js";

// Mismos topes que el servidor (CR-018, CR-022)
const MAX_PACKAGES = 1000;
const MAX_SALE = 100000000;
const MAX_ITEMS = 20;
const EMPTY_LINE = { inventoryId: "", packageSize: "", packages: "", price: "" };

// «10 x 15 · calibre 2 · Transparente»; los registros anteriores a la variante no la tienen
function variantLabel(item) {
  if (!item.medida && !item.calibre && !item.color) return "Sin variante (registro anterior)";
  return `${sanitizeText(item.medida || "Sin medida")} · calibre ${sanitizeText(item.calibre || "—")} · ${sanitizeText(item.color || "Sin color")}`;
}

const thousands = (value) => Number(value).toLocaleString("es-CO");

// Resumen de los productos de una venta registrada: «Adhesivo PP · 10 x 15 … y 2 más»
function itemsSummary(sale) {
  const items = sale.items || [];
  if (!items.length) return sanitizeText(sale.producto || "—");
  const first = safeProductName(items[0].producto) || "Producto no válido";
  return items.length === 1 ? first : `${first} y ${items.length - 1} ${items.length === 2 ? "producto más" : "productos más"}`;
}

export function Sales({ data, lines, onSubmitSale, saving, onReceipt }) {
  const [selectedFamily, setSelectedFamily] = useState("");
  const [line, setLine] = useState(EMPTY_LINE);
  const [cart, setCart] = useState([]);
  const [warning, setWarning] = useState("");
  const fields = useRef({});
  const products = data.inventory.filter((item) => lines.includes(item.familia));
  const availableProducts = products.filter((item) => Number(item.cantidad) > 0);
  const lineReferences = availableProducts.filter((item) => item.familia === selectedFamily);
  const selectedProduct = products.find((item) => String(item.id) === line.inventoryId);
  const cartTotal = cart.reduce((sum, item) => sum + item.packages * item.price, 0);

  function fail(message, field) {
    setWarning(message);
    const element = fields.current[field];
    if (element) {
      element.classList.add("field-invalid");
      element.focus();
    }
    return null;
  }

  // Revisa el producto que se está escribiendo; devuelve la línea lista para el carrito o null
  function readLine() {
    const product = selectedProduct;
    if (!product) return fail(selectedFamily ? "Elige la variante del producto." : "Elige la línea y la variante del producto.", selectedFamily ? "variant" : "family");
    const packageSize = Number(line.packageSize);
    if (!packageSizes.map(Number).includes(packageSize)) return fail("Elige las unidades por paquete.", "packageSize");
    const packages = Number(line.packages);
    if (!Number.isInteger(packages) || packages < 1 || packages > MAX_PACKAGES) {
      return fail(`La cantidad de paquetes debe ser un número entero entre 1 y ${thousands(MAX_PACKAGES)}.`, "packages");
    }
    const price = Number(line.price);
    if (!Number.isFinite(price) || price <= 0 || price > MAX_SALE || Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
      return fail(`El precio por paquete debe ser mayor que cero, con hasta 2 decimales y hasta $${thousands(MAX_SALE)}.`, "price");
    }
    if (cart.some((item) => item.inventoryId === product.id)) return fail("Esa referencia ya está en la venta. Quítala si quieres cambiarla.", "variant");
    if (packages * packageSize > Number(product.cantidad)) {
      return fail(`Solo hay ${number(product.cantidad)} unidades de esa referencia.`, "packages");
    }
    if (cart.length >= MAX_ITEMS) return fail(`Una venta admite como máximo ${MAX_ITEMS} productos.`, "variant");
    if (cartTotal + packages * price > MAX_SALE) return fail(`El total de la venta admite como máximo $${thousands(MAX_SALE)}.`, "price");
    return { inventoryId: product.id, product, packageSize, packages, price };
  }

  function addLine() {
    const item = readLine();
    if (!item) return null;
    setCart((current) => [...current, item]);
    setLine(EMPTY_LINE);
    setWarning("");
    return item;
  }

  const lineStarted = Boolean(line.inventoryId || line.packageSize || line.packages || line.price);

  return (
    <>
      <Intro title="Ventas" description="Agrega uno o varios productos a la venta; las existencias se descuentan al registrarla." />
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
                setLine((current) => ({ ...current, inventoryId: "" }));
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
                onClick={() => setLine((current) => ({ ...current, inventoryId: String(item.id) }))}
              >
                <strong>{variantLabel(item)}</strong>
                <span>{number(item.cantidad)} unidades</span>
              </button>
            ))}
          </div>
        ) : <p className="empty">No hay referencias de esta línea con existencias.</p>}
      </Panel>}
      <section className="panel form-panel">
        <header className="panel-header"><h3>Nueva venta</h3></header>
        <form
          className="data-form"
          noValidate
          onInput={(event) => {
            clearInvalid(event);
            setWarning("");
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const client = fields.current.client;
            if (!client.value.trim()) return fail("Completa el campo «Cliente».", "client");
            if (client.value.trim().length > 120) return fail("El cliente admite máximo 120 caracteres.", "client");
            // Si quedó un producto escrito sin agregar, se agrega al registrar
            let items = cart;
            if (lineStarted || !cart.length) {
              const item = readLine();
              if (!item) return null;
              items = [...cart, item];
              setCart(items);
              setLine(EMPTY_LINE);
            }
            setWarning("");
            onSubmitSale(form, {
              cliente: client.value.trim(),
              items: items.map((item) => ({
                inventario_id: item.inventoryId,
                cantidad_paquetes: item.packages,
                unidades_paquete: item.packageSize,
                precio_paquete: item.price,
              })),
            });
            return null;
          }}
        >
          <Field label="Cliente"><input name="cliente" ref={(element) => { fields.current.client = element; }} /></Field>
          <fieldset className="sale-line-editor">
            <legend>Agregar producto</legend>
            <Field label="Línea de producto">
              <select ref={(element) => { fields.current.family = element; }} value={selectedFamily} onChange={(event) => {
                setSelectedFamily(event.target.value);
                setLine((current) => ({ ...current, inventoryId: "" }));
              }}>
                <option value="" disabled>Selecciona una línea</option>
                {lines.map((family) => <option key={family} value={family}>{family}</option>)}
              </select>
            </Field>
            <Field label="Variante (medida / calibre / color)">
              <select name="inventario_id" ref={(element) => { fields.current.variant = element; }} value={selectedProduct ? String(selectedProduct.id) : ""} onChange={(event) => {
                const item = products.find((product) => String(product.id) === event.target.value);
                if (item) setSelectedFamily(item.familia);
                setLine((current) => ({ ...current, inventoryId: event.target.value }));
              }}>
                <option value="" disabled>{selectedFamily ? "Selecciona la variante" : "Primero elige la línea"}</option>
                {availableProducts.filter((item) => item.familia === selectedFamily).map((item) => (
                  <option key={item.id} value={item.id}>{variantLabel(item)} · {number(item.cantidad)} unidades</option>
                ))}
              </select>
            </Field>
            <Field label="Unidades por paquete">
              <select name="unidades_paquete" ref={(element) => { fields.current.packageSize = element; }} value={line.packageSize} onChange={(event) => setLine((current) => ({ ...current, packageSize: event.target.value }))}>
                <option value="" disabled>Selecciona las unidades</option>
                {packageSizes.map((size) => <option key={size} value={size}>{size} unidades</option>)}
              </select>
            </Field>
            <Field label="Cantidad de paquetes">
              <input name="cantidad_paquetes" type="number" ref={(element) => { fields.current.packages = element; }} value={line.packages} onChange={(event) => setLine((current) => ({ ...current, packages: event.target.value }))} />
            </Field>
            <Field label="Precio por paquete">
              <input name="precio_paquete" type="number" ref={(element) => { fields.current.price = element; }} value={line.price} onChange={(event) => setLine((current) => ({ ...current, price: event.target.value }))} />
            </Field>
            <div className="sale-line-actions">
              {selectedProduct && <span className="sale-line-stock">{number(selectedProduct.cantidad)} unidades disponibles</span>}
              <button className="primary-action secondary" type="button" onClick={addLine}>Agregar a la venta</button>
            </div>
          </fieldset>
          <div className="sale-cart">
            {cart.length ? (
              <table aria-label="Productos de la venta">
                <thead><tr><th>Producto</th><th>Presentación</th><th>Unidades</th><th>Precio por paquete</th><th>Subtotal</th><th><span className="sr-only">Quitar</span></th></tr></thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.inventoryId}>
                      <td>{safeProductName(item.product.producto) || "Producto no válido"}</td>
                      <td>{packagesLabel({ cantidad_paquetes: item.packages, unidades_paquete: item.packageSize })}</td>
                      <td>{number(item.packages * item.packageSize)}</td>
                      <td>{money(item.price)}</td>
                      <td>{money(item.packages * item.price)}</td>
                      <td><button className="text-action danger" type="button" aria-label={`Quitar ${safeProductName(item.product.producto)}`} onClick={() => setCart((current) => current.filter((other) => other.inventoryId !== item.inventoryId))}>Quitar</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><th colSpan={4}>Total de la venta</th><th colSpan={2}>{money(cartTotal)}</th></tr></tfoot>
              </table>
            ) : <p className="sale-cart-empty">Aún no hay productos en la venta. Llena el producto y pulsa «Agregar a la venta»; si es uno solo, puedes registrar directamente.</p>}
          </div>
          {warning && <p className="form-error" role="alert">{warning}</p>}
          <button className="primary-action" type="submit" disabled={saving}>{saving ? "Guardando..." : "Registrar venta"}</button>
        </form>
      </section>
      <Panel title="Ventas registradas"><DataTable columns={["N.º", "Cliente", "Productos", "Unidades", "Total", "Comprobante"]} rows={data.sales.map((sale) => ({ key: sale.id, cells: <><td className="nowrap">{sanitizeText(sale.numero || `#${sale.id}`)}</td><td>{sanitizeText(sale.cliente)}</td><td>{itemsSummary(sale)}</td><td>{number(sale.unidades ?? sale.cantidad)}</td><td>{money(sale.total)}</td><td><button className="text-action" type="button" onClick={() => onReceipt(sale.id)}>Ver</button></td></> }))} /></Panel>
    </>
  );
}
