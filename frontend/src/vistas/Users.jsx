import React, { useState } from "react";
import { DataTable, Field, FormPanel, FormToggles, Intro, Panel, StatCard, useFormularioAbierto } from "../comun/componentes.jsx";
import { roleName, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { clearInvalid, useObligatorios } from "../comun/validacion.js";

// Rediseño: indicadores de las cuentas, el formulario se abre con «+ Nuevo usuario» y la tabla
// muestra el rol y el estado como etiquetas de color
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
  const [openForm, setOpenForm] = useFormularioAbierto("usuarios");
  const active = data.filter((user) => user.activo).length;
  const locked = data.filter((user) => Number(user.bloqueado)).length;
  return (
    <>
      <Intro
        icon="usuarios"
        title="Gestión de usuarios"
        description="Crea cuentas, activa o desactiva accesos y administra los usuarios del sistema."
        action={<FormToggles open={openForm} onToggle={setOpenForm} options={[{ key: "usuario", label: "+ Nuevo usuario", closeLabel: "Cerrar formulario", main: true }]} />}
      />
      <section className="stats-grid stats-grid-3">
        <StatCard label="Usuarios registrados" value={data.length} icon="usuarios" tone="azul" detail="Cuentas del sistema" />
        <StatCard label="Activos" value={active} icon="ok" tone="verde" detail={`${data.length - active} ${data.length - active === 1 ? "inactivo" : "inactivos"}`} />
        <StatCard label="Bloqueados" value={locked} icon="alerta" tone="rojo" detail={locked ? "Por intentos fallidos; puedes desbloquearlos" : "Ninguna cuenta bloqueada"} />
      </section>
      {openForm === "usuario" && (
        <FormPanel title="Nuevo usuario" onSubmit={onSubmit} saving={saving} obligatorios={["nombre", "usuario", "correo", "password", "rol"]}>
          <Field label="Nombre"><input name="nombre" /></Field>
          <Field label="Usuario"><input name="usuario" autoComplete="off" /></Field>
          <Field label="Correo electrónico"><input name="correo" type="text" inputMode="email" autoComplete="email" /></Field>
          <Field label="Contraseña"><input name="password" type="password" autoComplete="new-password" /></Field>
          <Field label="Rol"><select name="rol" defaultValue=""><option value="" disabled>Selecciona el rol</option><option value="operario">Operario</option><option value="vendedor">Vendedor</option><option value="almacenista">Almacenista</option><option value="supervisor">Supervisor</option><option value="admin">Administrador</option></select></Field>
        </FormPanel>
      )}
      <Panel title="Usuarios registrados">
        <DataTable columns={["Usuario", "Correo electrónico", "Rol", "Estado", "Acción"]} rows={data.map((user) => ({
          key: user.id,
          cells: <>
            <td>
              <span className="user-cell">
                <span className="user-cell-icon" aria-hidden="true"><Icono nombre="usuario" size={18} /></span>
                <span><strong>{sanitizeText(user.nombre)}</strong><small>{sanitizeText(user.usuario)}</small></span>
              </span>
            </td>
            <td>{emailUser === user.id ? <><form className="inline-email-form" noValidate onInput={clearInvalid} onSubmit={async (event) => { if (!checkEmail(event, ["correo"])) return; event.preventDefault(); const correo = new FormData(event.currentTarget).get("correo"); if (await onUpdateEmail(user.id, correo)) setEmailUser(null); }}><input name="correo" type="text" inputMode="email" defaultValue={user.correo || ""} aria-label={`Correo de ${user.usuario}`} /><button className="text-action primary" type="submit">Guardar correo</button><button className="text-action" type="button" onClick={() => setEmailUser(null)}>Cancelar</button></form>{emailWarning.text && <span className="form-error" role="alert">{emailWarning.text}</span>}</> : <span className="email-cell"><span>{sanitizeText(user.correo || "Sin correo registrado")}</span><button className="text-action" type="button" onClick={() => setEmailUser(user.id)}>{user.correo ? "Cambiar" : "Agregar correo"}</button></span>}</td>
            <td><span className={`role-chip role-${sanitizeText(user.rol)}`}>{roleName(user.rol)}</span></td>
            <td>
              <span className="state-cell">
                <span className={`status ${user.activo ? "success" : "muted"}`}>{user.activo ? "Activo" : "Inactivo"}</span>
                {Number(user.bloqueado) ? <span className="status alert">Bloqueado hasta las {lockedUntil(user)}</span> : null}
              </span>
            </td>
            <td><div className="inline-actions">{user.usuario === username ? <span className="own-account">Tu cuenta</span> : <button className="text-action" type="button" onClick={() => onToggle(user)}>{user.activo ? "Desactivar" : "Activar"}</button>}{Number(user.bloqueado) ? <button className="text-action" type="button" onClick={() => onUnlock(user)}>Desbloquear</button> : null}{role === "admin" && user.usuario !== username && <button className="text-action danger" type="button" onClick={() => onDelete(user)}>Eliminar</button>}</div></td>
          </>,
        }))} />
      </Panel>
    </>
  );
}
