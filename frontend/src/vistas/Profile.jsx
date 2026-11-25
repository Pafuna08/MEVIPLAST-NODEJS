import React, { useState } from "react";
import { Field, Intro } from "../comun/componentes.jsx";
import { roleName, sanitizePayload, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { clearInvalid, useObligatorios } from "../comun/validacion.js";

// CR-028: «Mi perfil», al que cada rol llega con un clic en su avatar. Datos personales (nombre, usuario y
// correo) y Seguridad (cambiar la contraseña escribiendo la actual). Los errores del servidor se muestran
// en la tarjeta que los causó.
export function Profile({ data, onSaveProfile, onChangePassword }) {
  const [profileWarning, checkProfile] = useObligatorios();
  const [passwordWarning, checkPassword] = useObligatorios();
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [saving, setSaving] = useState("");
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
            }}
            onSubmit={async (event) => {
              if (!checkProfile(event, ["nombre", "usuario", "correo"], "perfil")) return;
              event.preventDefault();
              setSaving("perfil");
              setProfileError((await onSaveProfile(sanitizePayload(Object.fromEntries(new FormData(event.currentTarget))))) || "");
              setSaving("");
            }}
          >
            <Field label="Nombre completo"><input name="nombre" defaultValue={data.nombre} autoComplete="name" /></Field>
            <Field label="Usuario"><input name="usuario" defaultValue={data.usuario} autoComplete="username" /></Field>
            <Field label="Correo electrónico"><input name="correo" type="email" defaultValue={data.correo || ""} autoComplete="email" /></Field>
            <p className="form-hint form-hint-wide">Con el usuario inicias sesión. Tu rol lo asigna el administrador.</p>
            {profileWarning.key === "perfil" && <p className="form-error" role="alert">{profileWarning.text}</p>}
            {profileError && <p className="form-error" role="alert">{profileError}</p>}
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
            onSubmit={async (event) => {
              if (!checkPassword(event, ["actual", "nueva", "confirmacion"], "clave")) return;
              event.preventDefault();
              const form = event.currentTarget;
              const { actual, nueva, confirmacion } = Object.fromEntries(new FormData(form));
              if (nueva.length < 8 || nueva.length > 128) {
                setPasswordError("La nueva contraseña debe tener entre 8 y 128 caracteres.");
                return;
              }
              if (nueva !== confirmacion) {
                setPasswordError("La confirmación no coincide con la nueva contraseña.");
                form.elements.namedItem("confirmacion").focus();
                return;
              }
              setSaving("clave");
              const message = await onChangePassword({ actual, nueva });
              setSaving("");
              if (message) setPasswordError(message);
              else form.reset();
            }}
          >
            <Field label="Contraseña actual"><input name="actual" type="password" autoComplete="current-password" /></Field>
            <Field label="Nueva contraseña"><input name="nueva" type="password" autoComplete="new-password" /></Field>
            <Field label="Confirmar nueva contraseña"><input name="confirmacion" type="password" autoComplete="new-password" /></Field>
            <p className="form-hint form-hint-wide">Entre 8 y 128 caracteres. Al cambiarla se cierran tus sesiones abiertas en otros equipos.</p>
            {passwordWarning.key === "clave" && <p className="form-error" role="alert">{passwordWarning.text}</p>}
            {passwordError && <p className="form-error" role="alert">{passwordError}</p>}
            <button className="primary-action" type="submit" disabled={saving === "clave"}>{saving === "clave" ? "Actualizando..." : "Actualizar contraseña"}</button>
          </form>
        </section>
      </div>
    </>
  );
}
