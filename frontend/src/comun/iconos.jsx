import React from "react";

// Íconos de línea del panel (decorativos: el texto de al lado dice lo mismo).
const trazos = {
  ordenes: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  produccion: <path d="M3 21V10l6 4V10l6 4V6l6 4v11z" />,
  inventario: <><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /></>,
  ventas: <path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.3-5 3.3 2.2 2.7 5 3.2 5 1.3 5 3.3-2.2 3.2-5 3.2-5-1.1-5-3" />,
  rendimiento: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 11l2 2 4-4" /></>,
  alerta: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  ok: <path d="M5 12l5 5 9-10" />,
  tareas: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>,
};

export function Icono({ nombre, size = 20 }) {
  return (
    <svg className="icono" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {trazos[nombre] || trazos.ordenes}
    </svg>
  );
}

// Barras horizontales para comparar cantidades (producción por línea, ventas por producto…)
export function BarList({ items, format = (valor) => valor, label }) {
  const maximo = Math.max(...items.map((item) => Number(item.valor) || 0), 1);
  return (
    <div className="bar-list" role="list" aria-label={label}>
      {items.map((item) => (
        <div className="bar-row" role="listitem" key={item.clave}>
          <span className="bar-label">{item.etiqueta}</span>
          <span className="bar-track" aria-hidden="true"><span className="bar-fill" style={{ width: `${Math.max(((Number(item.valor) || 0) * 100) / maximo, 2)}%` }} /></span>
          <strong className="bar-value">{format(item.valor)}</strong>
        </div>
      ))}
    </div>
  );
}
