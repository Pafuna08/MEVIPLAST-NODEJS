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
  inicio: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  usuarios: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14c2.2.7 3.5 3 3.5 6" /></>,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  materia: <><ellipse cx="8" cy="12" rx="4.5" ry="8" /><ellipse cx="8" cy="12" rx="1.5" ry="2.7" /><path d="M8 4h8c2.5 0 4.5 3.6 4.5 8s-2 8-4.5 8H8" /></>,
  carrito: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.2h11.6L21.5 7H6.3" /></>,
  reportes: <path d="M4 20V11M10 20V5M16 20v-6M21 20H3" />,
  auditoria: <><path d="M12 3l8 3v6c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  asignar: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M12 10v6M9 13h6" /></>,
  operarios: <><path d="M2.5 18.5h19" /><path d="M4.5 18.5V16a7.5 7.5 0 0 1 15 0v2.5" /><path d="M9.5 9.2V6.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3" /><path d="M12 5.2v4" /></>,
  seguimiento: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  registrar: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  historial: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3 4v5h5" /><path d="M12 7.5v4.5l3 2" /></>,
  salir: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  pregunta: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.5" /><path d="M12 17h.01" /></>,
  correo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
};

// Ícono de cada vista del menú lateral (reemplaza las abreviaturas IN, US, MP…)
export const VIEW_ICONS = {
  inicio: "inicio",
  usuarios: "usuarios",
  materia: "materia",
  inventario: "inventario",
  produccion: "produccion",
  ventas: "carrito",
  reportes: "reportes",
  auditoria: "auditoria",
  asignar: "asignar",
  operarios: "operarios",
  tareas: "tareas",
  registrar: "registrar",
  historial: "historial",
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
