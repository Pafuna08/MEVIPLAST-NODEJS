import React, { useEffect, useState } from "react";
import { sanitizeText } from "../comun/formato.js";
import { BotonVerClave } from "../comun/VerClave.jsx";
import "../../css/login.css";

// Inicio de sesión (antes login.html con js/login.js). Misma validación, mismos mensajes y las mismas
// claves de sesión que lee el panel.

// Rol tal como lo devuelve la API -> nombre visible
const ROLES = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operario: "Operario",
  vendedor: "Vendedor",
  almacenista: "Almacenista",
};

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState({ usuario: "", password: "" });
  const [estado, setEstado] = useState("");
  const [verClave, setVerClave] = useState(false);

  useEffect(() => {
    document.title = "Iniciar sesión | MEVIPLAST";
  }, []);

  async function ingresar(event) {
    event.preventDefault();
    setEstado("");
    const userKey = usuario.trim().toLowerCase();
    const nuevos = {
      usuario: userKey ? "" : "El usuario es obligatorio.",
      password: password ? "" : "La contraseña es obligatoria.",
    };
    setErrores(nuevos);
    if (nuevos.usuario || nuevos.password) return;

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: sanitizeText(userKey, 50)
            .replace(/[^a-z0-9._-]/gi, "")
            .toLowerCase(),
          password: sanitizeText(password, 128),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setEstado(datos.mensaje || "Usuario o contraseña incorrectos.");
        return;
      }

      const rol = ROLES[datos.usuario.rol];
      localStorage.setItem("meviplastToken", datos.token);
      localStorage.setItem(
        "meviplastSession",
        JSON.stringify({
          username: datos.usuario.usuario,
          name: datos.usuario.nombre,
          role: rol || datos.usuario.rol,
          loginAt: new Date().toISOString(),
        }),
      );
      // Sin la contraseña en memoria y sin dejar el formulario en el historial (equipo compartido)
      setPassword("");
      setUsuario("");
      window.location.replace(rol ? "/dashboard.html" : "/");
    } catch {
      setEstado("No fue posible conectar con el servidor.");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="Presentación del sistema">
        <a className="back-link" href="/">
          ← Volver al sitio
        </a>
        <div className="brand-copy">
          <img src="/assets/logo-meviplast.png" alt="Logo de MEVIPLAST" />
          <p className="eyebrow">Sistema de gestión industrial</p>
          <h1>Control operativo en un solo lugar</h1>
          <p>
            Acceso seguro para administradores, supervisores, operarios, almacenistas y vendedores de MEVIPLAST.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" id="login-form" noValidate onSubmit={ingresar}>
          <div className="login-heading">
            <span>Acceso interno</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresa las credenciales asignadas a tu rol.</p>
          </div>

          <div className={`field${errores.usuario ? " invalid" : ""}`}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
            />
            <small>{errores.usuario}</small>
          </div>

          <div className={`field${errores.password ? " invalid" : ""}`}>
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={verClave ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {/* MEVI-117: el ojo, igual que en el panel, en lugar de la palabra «Ver» */}
              <BotonVerClave id="toggle-password" visible={verClave} onToggle={() => setVerClave((visible) => !visible)} />
            </div>
            <small>{errores.password}</small>
          </div>

          <button className="login-button" type="submit">
            Ingresar
          </button>
          <p className="login-status" id="login-status" role="alert" aria-live="polite">
            {estado}
          </p>
          <p className="recovery-link">
            <a href="/recuperar.html">¿Olvidaste tu usuario o contraseña?</a>
          </p>
        </form>
      </section>
    </main>
  );
}
