import React, { useEffect, useRef, useState } from "react";
import { BotonVerClave } from "../comun/VerClave.jsx";
import "../../css/login.css";

// Recuperación de cuenta (antes recuperar.html con js/recovery.js). Sin token pide el correo; con el
// token del enlace que llega por correo muestra el formulario para la nueva contraseña.

const MENSAJE_RED = "No fue posible conectar con el servidor.";

async function enviar(ruta, cuerpo, mensajeError) {
  const respuesta = await fetch(`/api/auth/${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || mensajeError);
  return datos.mensaje;
}

function Estado({ id, estado }) {
  return (
    <p className={`login-status${estado.ok ? " success-message" : ""}`} id={id} role="status" aria-live="polite">
      {estado.texto}
    </p>
  );
}

function PedirCorreo() {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState({ texto: "", ok: false });
  const campo = useRef(null);

  // Validación propia (sin atributos de validación en el HTML); el servidor vuelve a validar el correo
  function correoValido() {
    const limpio = correo.trim();
    if (limpio.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
      setEstado({ texto: limpio ? "Escribe un correo electrónico válido." : "Escribe el correo registrado.", ok: false });
      campo.current.focus();
      return null;
    }
    return limpio;
  }

  async function solicitar(ruta) {
    const valido = correoValido();
    if (!valido) return;
    setEstado({ texto: "", ok: false });
    try {
      setEstado({ texto: await enviar(ruta, { correo: valido }, "No fue posible enviar la solicitud."), ok: true });
    } catch (error) {
      setEstado({ texto: error.message || MENSAJE_RED, ok: false });
    }
  }

  return (
    <form id="account-recovery-form" className="recovery-form" noValidate onSubmit={(event) => event.preventDefault()}>
      <div className="field">
        <label htmlFor="recovery-email">Correo electrónico</label>
        <input
          id="recovery-email"
          name="correo"
          type="text"
          inputMode="email"
          autoComplete="email"
          ref={campo}
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
        />
      </div>
      <div className="recovery-actions">
        <button className="login-button" id="recover-password" type="button" onClick={() => solicitar("recuperar-password")}>
          Recuperar contraseña
        </button>
        <button className="secondary-button" id="recover-username" type="button" onClick={() => solicitar("recordar-usuario")}>
          Recuperar nombre de usuario
        </button>
      </div>
      <Estado id="recovery-status" estado={estado} />
    </form>
  );
}

function NuevaClave({ token }) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  // MEVI-117: el ojo de cada campo muestra lo que se escribe
  const [verClave, setVerClave] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  const [estado, setEstado] = useState({ texto: "", ok: false });

  async function cambiar(event) {
    event.preventDefault();
    if (password.length < 8 || password.length > 128) {
      setEstado({ texto: "La contraseña debe tener entre 8 y 128 caracteres.", ok: false });
      return;
    }
    if (password !== confirmacion) {
      setEstado({ texto: "Las contraseñas no coinciden.", ok: false });
      return;
    }
    try {
      const mensaje = await enviar("restablecer-password", { token, password }, "No fue posible cambiar la contraseña.");
      setEstado({ texto: mensaje, ok: true });
      setPassword("");
      setConfirmacion("");
      // El token no se queda en la barra de direcciones ni en el historial
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setEstado({ texto: error.message || MENSAJE_RED, ok: false });
    }
  }

  return (
    <form id="reset-password-form" className="recovery-form" noValidate onSubmit={cambiar}>
      <div className="field">
        <label htmlFor="new-password">Nueva contraseña</label>
        <div className="password-field">
          <input
            id="new-password"
            name="password"
            type={verClave ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <BotonVerClave visible={verClave} onToggle={() => setVerClave((visible) => !visible)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Confirmar contraseña</label>
        <div className="password-field">
          <input
            id="confirm-password"
            name="confirm-password"
            type={verConfirmacion ? "text" : "password"}
            autoComplete="new-password"
            value={confirmacion}
            onChange={(event) => setConfirmacion(event.target.value)}
          />
          <BotonVerClave visible={verConfirmacion} onToggle={() => setVerConfirmacion((visible) => !visible)} />
        </div>
      </div>
      <button className="login-button" type="submit">
        Cambiar contraseña
      </button>
      <Estado id="reset-status" estado={estado} />
    </form>
  );
}

export default function Recuperar() {
  // Se lee una sola vez: al cambiar la contraseña se borra de la dirección, pero el formulario sigue igual
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));

  useEffect(() => {
    document.title = "Recuperar cuenta | MEVIPLAST";
  }, []);

  return (
    <main className="recovery-shell">
      <a className="recovery-back" href="/login.html">
        ← Volver al inicio de sesión
      </a>
      <section className="login-card recovery-card">
        <div className="login-heading">
          <span>Seguridad de la cuenta</span>
          <h1 id="recovery-title">{token ? "Crear nueva contraseña" : "Recuperar cuenta"}</h1>
          <p id="recovery-description">
            {token
              ? "El enlace es válido durante 30 minutos y solo puede usarse una vez."
              : "Ingresa el correo registrado y elige si quieres recuperar tu contraseña o tu nombre de usuario."}
          </p>
        </div>
        {token ? <NuevaClave token={token} /> : <PedirCorreo />}
      </section>
    </main>
  );
}
