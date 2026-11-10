import React, { useState } from "react";
import { DataTable, Field, FormPanel, Intro, Panel } from "../comun/componentes.jsx";
import { roleName, sanitizeText } from "../comun/formato.js";
import { clearInvalid, useObligatorios } from "../comun/validacion.js";

export function Users({
  data,
  username,
  onSubmit,
  saving,
  onToggle,
  onUnlock,
  onUpdateEmail,
  onDelete,
  role,
}) {
  const lockedUntil = (user) =>
    new Date(user.bloqueado_hasta).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const [emailUser, setEmailUser] = useState(null);
  const [emailWarning, checkEmail] = useObligatorios();
  return (
    <>
      <Intro title="Gestión de usuarios" description="Crea cuentas, activa o desactiva accesos y administra los usuarios del sistema." />
      <FormPanel title="Nuevo usuario" onSubmit={onSubmit} saving={saving} obligatorios={["nombre", "usuario", "correo", "password", "rol"]}>
        <Field label="Nombre"><input name="nombre" /></Field>
        <Field label="Usuario"><input name="usuario" /></Field>
        <Field label="Correo electrónico"><input name="correo" type="text" inputMode="email" autoComplete="email" /></Field>
        <Field label="Contraseña"><input name="password" type="password" /></Field>
        <Field label="Rol"><select name="rol" defaultValue=""><option value="" disabled>Selecciona el rol</option><option value="operario">Operario</option><option value="vendedor">Vendedor</option><option value="almacenista">Almacenista</option><option value="supervisor">Supervisor</option><option value="admin">Administrador</option></select></Field>
      </FormPanel>
      <Panel title="Usuarios registrados">
        <DataTable columns={["Nombre", "Usuario", "Correo electrónico", "Rol", "Estado", "Acción"]} rows={data.map((user) => ({
          key: user.id,
          cells: <><td>{sanitizeText(user.nombre)}</td><td>{sanitizeText(user.usuario)}</td><td>{emailUser === user.id ? <><form className="inline-email-form" noValidate onInput={clearInvalid} onSubmit={async (event) => { if (!checkEmail(event, ["correo"])) return; event.preventDefault(); const correo = new FormData(event.currentTarget).get("correo"); if (await onUpdateEmail(user.id, correo)) setEmailUser(null); }}><input name="correo" type="text" inputMode="email" defaultValue={user.correo || ""} aria-label={`Correo de ${user.usuario}`} /><button className="text-action primary" type="submit">Guardar correo</button><button className="text-action" type="button" onClick={() => setEmailUser(null)}>Cancelar</button></form>{emailWarning.text && <span className="form-error" role="alert">{emailWarning.text}</span>}</> : <span className="email-cell"><span>{sanitizeText(user.correo || "Sin correo registrado")}</span><button className="text-action" type="button" onClick={() => setEmailUser(user.id)}>{user.correo ? "Cambiar" : "Agregar correo"}</button></span>}</td><td>{roleName(user.rol)}</td><td>{user.activo ? "Activo" : "Inactivo"}{Number(user.bloqueado) ? ` · Bloqueado hasta las ${lockedUntil(user)}` : ""}</td><td><div className="inline-actions">{user.usuario === username ? <span className="own-account">Tu cuenta</span> : <button className="text-action" type="button" onClick={() => onToggle(user)}>{user.activo ? "Desactivar" : "Activar"}</button>}{Number(user.bloqueado) ? <button className="text-action" type="button" onClick={() => onUnlock(user)}>Desbloquear</button> : null}{role === "admin" && user.usuario !== username && <button className="text-action danger" type="button" onClick={() => onDelete(user)}>Eliminar</button>}</div></td></>,
        }))} />
      </Panel>
    </>
  );
}
