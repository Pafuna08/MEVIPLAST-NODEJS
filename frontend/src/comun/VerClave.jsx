import React, { useState } from "react";
import { Icono } from "./iconos.jsx";

// MEVI-117: el ojo al final de un campo de contraseña muestra u oculta lo que se escribe, para comprobar
// que está bien escrita. Se usa en Mi perfil, Usuarios, el inicio de sesión y la recuperación de cuenta.
export function BotonVerClave({ visible, onToggle, id, className = "password-toggle" }) {
  const texto = visible ? "Ocultar contraseña" : "Mostrar contraseña";
  return (
    <button id={id} className={className} type="button" aria-label={texto} aria-pressed={visible} title={texto} onClick={onToggle}>
      <Icono nombre={visible ? "ojo-cerrado" : "ojo"} size={18} />
    </button>
  );
}

// Campo de contraseña del panel con su ojo (recibe los mismos atributos de un <input>)
export function CampoClave(props) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <BotonVerClave visible={visible} onToggle={() => setVisible((valor) => !valor)} />
    </span>
  );
}
