import React, { useState } from "react";
import { Field, Intro } from "../comun/componentes.jsx";
import { Dialogo } from "../comun/Dialogo.jsx";
import { roleName, sanitizePayload, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { clearInvalid, useObligatorios } from "../comun/validacion.js";
import { CampoClave } from "../comun/VerClave.jsx";

// Datos personales con la misma normalización del servidor (perfil.service), para saber si algo cambió
const PROFILE_FIELDS = [
  ["nombre", "Nombre completo", (value) => value.trim().replace(/\s+/g, " ")],
  ["usuario", "Usuario", (value) => value.trim().toLowerCase()],
  ["correo", "Correo electrónico", (value) => value.trim().toLowerCase()],
];

// CR-028: «Mi perfil», al que cada rol llega con un clic en su avatar. Datos personales (nombre, usuario y
// correo) y Seguridad (cambiar la contraseña escribiendo la actual). MEVI-117: si no se cambió nada no se
// envía; si hay cambios, una ventana los muestra (antes → después) para confirmarlos; la contraseña también
// se confirma, y cada campo de contraseña tiene su ojo para ver lo que se escribe.
export function Profile({ data, onSaveProfile, onChangePassword }) {
  const [profileWarning, checkProfile] = useObligatorios();
  const [passwordWarning, checkPassword] = useObligatorios();
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saving, setSaving] = useState("");
  // Lo que espera confirmación: { kind: "perfil", payload, changes } o { kind: "clave", payload, form }
  const [pending, setPending] = useState(null);

  async function confirm() {
    const current = pending;
    setPending(null);
    setSaving(current.kind);
    if (current.kind === "perfil") {
      setProfileError((await onSaveProfile(current.payload)) || "");
    } else {
      const message = await onChangePassword(current.payload);
      if (message) setPasswordError(message);
      else current.form.reset();
    }
    setSaving("");
  }

  return (
    <>
      <Intro icon="usuario" title="Mi perfil" description="Revisa y cambia tus datos personales y tu contraseña." />
      <div className="profile-layout">
        <section className="panel form-panel profile-card">
          <header className="panel-header">
            <h3><Icono nombre="usuario" size={20} />Datos personales</h3>
            <span className={`role-chip role-${sanitizeText(data.rol)}`}>{roleName(data.rol)}</span>
          </header>
          <form
            className="data-form profile-form"
            noValidate
            onInput={(event) => {
              clearInvalid(event);
              setProfileError("");
              setProfileNotice("");
            }}
            onSubmit={(event) => {
              if (!checkProfile(event, ["nombre", "usuario", "correo"], "perfil")) return;
              event.preventDefault();
              const payload = sanitizePayload(Object.fromEntries(new FormData(event.currentTarget)));
              const changes = PROFILE_FIELDS
                .map(([key, label, normalize]) => ({ label, before: normalize(String(data[key] || "")), after: normalize(String(payload[key] || "")), key }))
                .filter(({ before, after }) => before !== after);
              if (!changes.length) {
                setProfileNotice("No hay cambios para guardar: tus datos son los mismos.");
                return;
              }
              setPending({ kind: "perfil", payload, changes });
            }}
          >
            <Field label="Nombre completo"><input name="nombre" defaultValue={data.nombre} autoComplete="name" /></Field>
            <Field label="Usuario"><input name="usuario" defaultValue={data.usuario} autoComplete="username" /></Field>
            <Field label="Correo electrónico"><input name="correo" type="email" defaultValue={data.correo || ""} autoComplete="email" /></Field>
            <p className="form-hint form-hint-wide">Con el usuario inicias sesión. Tu rol lo asigna el administrador.</p>
            {profileWarning.key === "perfil" && <p className="form-error" role="alert">{profileWarning.text}</p>}
            {profileError && <p className="form-error" role="alert">{profileError}</p>}
            {profileNotice && <p className="form-notice" role="status">{profileNotice}</p>}
            <button className="primary-action" type="submit" disabled={saving === "perfil"}>{saving === "perfil" ? "Guardando..." : "Guardar cambios"}</button>
          </form>
        </section>
        <section className="panel form-panel profile-card">
          <header className="panel-header">
            <h3><Icono nombre="auditoria" size={20} />Seguridad</h3>
          </header>
          <form
            className="data-form profile-form"
            noValidate
            onInput={(event) => {
              clearInvalid(event);
              setPasswordError("");
            }}
            onSubmit={(event) => {
              if (!checkPassword(event, ["actual", "nueva", "confirmacion"], "clave")) return;
              event.preventDefault();
              const form = event.currentTarget;
              const { actual, nueva, confirmacion } = Object.fromEntries(new FormData(form));
              if (nueva.length < 8 || nueva.length > 128) {
                setPasswordError("La nueva contraseña debe tener entre 8 y 128 caracteres.");
                form.elements.namedItem("nueva").focus();
                return;
              }
              if (nueva === actual) {
                setPasswordError("La nueva contraseña debe ser distinta de la actual.");
                form.elements.namedItem("nueva").focus();
                return;
              }
              if (nueva !== confirmacion) {
                setPasswordError("La confirmación no coincide con la nueva contraseña.");
                form.elements.namedItem("confirmacion").focus();
                return;
              }
              setPending({ kind: "clave", payload: { actual, nueva }, form });
            }}
          >
            <Field label="Contraseña actual"><CampoClave name="actual" autoComplete="current-password" /></Field>
            <Field label="Nueva contraseña"><CampoClave name="nueva" autoComplete="new-password" /></Field>
            <Field label="Confirmar nueva contraseña"><CampoClave name="confirmacion" autoComplete="new-password" /></Field>
            <p className="form-hint form-hint-wide">Entre 8 y 128 caracteres. Pulsa el ojo para ver lo que escribes. Al cambiarla se cierran tus sesiones abiertas en otros equipos.</p>
            {passwordWarning.key === "clave" && <p className="form-error" role="alert">{passwordWarning.text}</p>}
            {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
            <button className="primary-action" type="submit" disabled={saving === "clave"}>{saving === "clave" ? "Actualizando..." : "Actualizar contraseña"}</button>
          </form>
        </section>
      </div>
      {pending && (
        <Dialogo onClose={() => setPending(null)} labelledBy="perfil-confirmar-titulo">
          <div className="confirm-header">
            <div className="confirm-icon"><Icono nombre="pregunta" size={22} /></div>
            <div>
              <h3 id="perfil-confirmar-titulo">{pending.kind === "perfil" ? "Confirmar cambios en tu perfil" : "Confirmar cambio de contraseña"}</h3>
              <p>
                {pending.kind === "perfil"
                  ? "Revisa los cambios antes de guardarlos."
                  : "Tu contraseña se cambiará y se cerrarán tus sesiones abiertas en otros equipos. Esta sesión sigue abierta."}
              </p>
            </div>
          </div>
          {pending.kind === "perfil" && (
            <dl className="confirm-summary profile-changes">
              {pending.changes.map(({ key, label, before, after }) => (
                <React.Fragment key={key}>
                  <dt>{label}</dt>
                  <dd><span className="change-before">{before ? sanitizeText(before) : "—"}</span><Icono nombre="siguiente" size={14} /><strong>{sanitizeText(after)}</strong></dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          {pending.kind === "perfil" && pending.changes.some(({ key }) => key === "usuario") && (
            <p className="confirm-note">Desde ahora inicias sesión con el usuario «{sanitizeText(pending.payload.usuario.trim().toLowerCase())}».</p>
          )}
          <div className="confirm-actions">
            <button className="confirm-cancel" type="button" autoFocus onClick={() => setPending(null)}>Revisar</button>
            <button className="confirm-delete" type="button" onClick={confirm}>{pending.kind === "perfil" ? "Sí, guardar" : "Sí, cambiar contraseña"}</button>
          </div>
        </Dialogo>
      )}
    </>
  );
}
