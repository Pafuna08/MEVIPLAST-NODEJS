import React, { useEffect, useRef } from "react";

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Ventana de confirmación usable solo con teclado (RNF-012, WCAG 2.1.2 y 2.4.3): al abrir, el foco entra
// (en el botón con autoFocus o en el primero); Tab y Mayús+Tab circulan dentro; Esc la cierra, igual que
// el clic fuera; al cerrar, el foco vuelve al botón que la abrió.
export function Dialogo({ onClose, labelledBy, className = "", overlayClassName = "", children }) {
  const ventana = useRef(null);
  // Se toma en el primer render, antes de que un botón con autoFocus de la ventana se quede con el foco
  const anterior = useRef(document.activeElement);
  const cerrar = useRef(onClose);
  cerrar.current = onClose;

  useEffect(() => {
    const nodo = ventana.current;
    const origen = anterior.current;
    if (nodo && !nodo.contains(document.activeElement)) (nodo.querySelector(ENFOCABLES) || nodo).focus();
    function tecla(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        cerrar.current();
        return;
      }
      if (event.key !== "Tab" || !nodo) return;
      const enfocables = [...nodo.querySelectorAll(ENFOCABLES)].filter((elemento) => elemento.offsetParent !== null);
      if (!enfocables.length) {
        event.preventDefault();
        return;
      }
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const fuera = !nodo.contains(document.activeElement);
      if (event.shiftKey && (fuera || document.activeElement === primero)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (fuera || document.activeElement === ultimo)) {
        event.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("keydown", tecla);
      if (origen instanceof HTMLElement && document.contains(origen)) origen.focus();
    };
  }, []);

  return (
    <div className={`confirm-overlay ${overlayClassName}`.trim()} role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={ventana} className={`confirm-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
      </section>
    </div>
  );
}
