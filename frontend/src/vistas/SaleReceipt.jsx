import React from "react";
import { dateTimeFormat, money, number, packagesLabel, sanitizeText } from "../comun/formato.js";
import { Dialogo } from "../comun/Dialogo.jsx";

const variantOf = (item) => [item.medida, item.calibre && `calibre ${item.calibre}`, item.color].filter(Boolean).map((parte) => sanitizeText(parte)).join(" · ");

// Comprobante imprimible de una venta (RF-023), con una fila por producto (CR-022)
export function SaleReceipt({ sale, onClose, onOpenPdf }) {
  const items = Array.isArray(sale.items) && sale.items.length ? sale.items : [sale];
  return (
    <Dialogo onClose={() => onClose()} labelledBy="receipt-title" overlayClassName="receipt-overlay" className="receipt">
        <header className="receipt-header">
          <img src="/assets/logo-meviplast.png" alt="" />
          <div>
            <strong>MEVIPLAST</strong>
            <span>Empaques adhesivos y bolsas plásticas</span>
          </div>
          <div className="receipt-number">
            <h3 id="receipt-title">Comprobante de venta</h3>
            <span>N.º {sale.numero}</span>
          </div>
        </header>
        <dl className="receipt-data">
          <div><dt>Fecha</dt><dd>{sale.fecha ? dateTimeFormat.format(new Date(sale.fecha)) : "—"}</dd></div>
          <div><dt>Cliente</dt><dd>{sanitizeText(sale.cliente)}</dd></div>
          <div><dt>Atendido por</dt><dd>{sanitizeText(sale.vendedor || "—")}</dd></div>
        </dl>
        <table className="receipt-table">
          <thead><tr><th>Producto</th><th>Presentación</th><th>Unidades</th><th>Precio por paquete</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((item, index) => {
              const variante = variantOf(item);
              return (
                <tr key={item.id ?? index}>
                  <td><strong>{sanitizeText(item.familia || item.producto)}</strong>{variante && <small>{variante}</small>}</td>
                  <td>{packagesLabel(item)}</td>
                  <td>{number(item.cantidad)}</td>
                  <td>{money(item.precio_paquete)}</td>
                  <td>{money(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="receipt-total"><span>Total</span><strong>{money(sale.total)}</strong></p>
        <p className="receipt-note">Documento de control interno. No es una factura electrónica.</p>
        <p className="receipt-hint">«Abrir PDF» lo abre en otra pestaña; desde allí lo imprimes o lo descargas con los botones del visor.</p>
        <div className="confirm-actions receipt-actions">
          <button className="confirm-cancel" type="button" onClick={onClose}>Cerrar</button>
          <button className="confirm-delete" type="button" onClick={() => onOpenPdf(sale.id)}>Abrir PDF</button>
        </div>
      </Dialogo>
  );
}
