import React from "react";
import { dateTimeFormat, money, number, packagesLabel, sanitizeText } from "../comun/formato.js";

// Comprobante imprimible de una venta (RF-023)
export function SaleReceipt({ sale, onClose }) {
  const variante = [sale.medida, sale.calibre && `calibre ${sale.calibre}`, sale.color].filter(Boolean).map((parte) => sanitizeText(parte)).join(" · ");
  return (
    <div className="confirm-overlay receipt-overlay" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="confirm-modal receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
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
            <tr>
              <td><strong>{sanitizeText(sale.familia || sale.producto)}</strong>{variante && <small>{variante}</small>}</td>
              <td>{packagesLabel(sale)}</td>
              <td>{number(sale.cantidad)}</td>
              <td>{money(sale.precio_paquete)}</td>
              <td>{money(sale.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="receipt-total"><span>Total</span><strong>{money(sale.total)}</strong></p>
        <p className="receipt-note">Documento de control interno. No es una factura electrónica.</p>
        <div className="confirm-actions receipt-actions">
          <button className="confirm-cancel" type="button" onClick={onClose}>Cerrar</button>
          <button className="confirm-delete" type="button" onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </div>
      </section>
    </div>
  );
}
