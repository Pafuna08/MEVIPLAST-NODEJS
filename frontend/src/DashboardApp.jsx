import React, { useEffect, useState } from "react";
import { api, loadView, readSession } from "./comun/api.js";
import { orderVariant } from "./comun/componentes.jsx";
import { movementTypeNames, roleViews, viewTitles } from "./comun/constantes.js";
import { money, number, packagesLabel, safeProductName, sanitizePayload, sanitizeText } from "./comun/formato.js";
import { blockNonNumericKeys, blockNonNumericPaste } from "./comun/validacion.js";
import { Advance } from "./vistas/Advance.jsx";
import { Assign } from "./vistas/Assign.jsx";
import { Audit } from "./vistas/Audit.jsx";
import { History } from "./vistas/History.jsx";
import { Home } from "./vistas/Home.jsx";
import { Inventory } from "./vistas/Inventory.jsx";
import { Materials } from "./vistas/Materials.jsx";
import { Operators } from "./vistas/Operators.jsx";
import { Production } from "./vistas/Production.jsx";
import { ReportDetail, Reports } from "./vistas/Reports.jsx";
import { SaleReceipt } from "./vistas/SaleReceipt.jsx";
import { Sales } from "./vistas/Sales.jsx";
import { Tasks } from "./vistas/Tasks.jsx";
import { Users } from "./vistas/Users.jsx";
import { Dialogo } from "./comun/Dialogo.jsx";

// Resumen para confirmar los registros que mueven inventario o dinero: quedan en el ledger y no se deshacen.
// Devuelve null para los formularios que guardan directo (órdenes, plantillas, usuarios, bobinas nuevas).
function irreversibleSummary(view, payload, data) {
  const units = (value) => number(Number(value) || 0);
  if (view === "materia" && payload.materia_prima_id) {
    const material = data.materials.find((item) => Number(item.id) === Number(payload.materia_prima_id));
    return {
      title: "Confirmar movimiento de materia prima",
      lines: [
        ["Bobina", sanitizeText(material?.nombre || `#${payload.materia_prima_id}`)],
        ["Movimiento", movementTypeNames[payload.tipo] + (payload.produccion_id ? ` (orden #${payload.produccion_id})` : "")],
        ["Cantidad", `${units(payload.cantidad)} kg`],
        ...(payload.observaciones ? [["Observaciones", sanitizeText(payload.observaciones)]] : []),
      ],
    };
  }
  if (view === "inventario" && payload.inventario_id) {
    const item = data.items.find((row) => Number(row.id) === Number(payload.inventario_id));
    return {
      title: "Confirmar salida manual",
      lines: [
        ["Producto", safeProductName(item?.producto) || `#${payload.inventario_id}`],
        ["Cantidad", `${units(payload.cantidad)} unidades (quedan ${units(Number(item?.cantidad || 0) - Number(payload.cantidad || 0))})`],
        ["Motivo", sanitizeText(payload.detalle ? `${payload.motivo}: ${payload.detalle}` : payload.motivo)],
      ],
    };
  }
  if (view === "inventario") {
    return {
      title: "Confirmar ingreso de inventario",
      lines: [
        ["Producto", sanitizeText(`${payload.familia} · ${payload.medida} · calibre ${payload.calibre} · ${payload.color}`)],
        ["Cantidad", `${units(payload.cantidad)} unidades`],
      ],
    };
  }
  if (view === "registrar") {
    const order = data.find((row) => Number(row.id) === Number(payload.id));
    const pending = order ? Number(order.cantidad) - Number(order.cantidad_producida || 0) : 0;
    return {
      title: "Confirmar registro de producción",
      lines: [
        ["Orden", order ? `#${order.id} · ${(safeProductName(order.producto) || "Producto no válido") + orderVariant(order)}` : `#${payload.id}`],
        ["Cantidad", `${units(payload.cantidad)} unidades (pendiente después: ${units(pending - Number(payload.cantidad || 0))})`],
        ...(payload.observaciones ? [["Observaciones", sanitizeText(payload.observaciones)]] : []),
      ],
    };
  }
  if (view === "ventas") {
    const item = data.inventory.find((row) => Number(row.id) === Number(payload.inventario_id));
    const packages = Number(payload.cantidad_paquetes) || 0;
    const perPackage = Number(payload.unidades_paquete) || 0;
    return {
      title: "Confirmar venta",
      lines: [
        ["Cliente", sanitizeText(payload.cliente)],
        ["Producto", safeProductName(item?.producto) || `#${payload.inventario_id}`],
        ["Presentación", `${packagesLabel({ cantidad_paquetes: packages, unidades_paquete: perPackage })} = ${number(packages * perPackage)} unidades`],
        ["Precio por paquete", money(payload.precio_paquete)],
        ["Total", money(packages * (Number(payload.precio_paquete) || 0))],
      ],
    };
  }
  return null;
}

export default function DashboardApp() {
  const [session] = useState(readSession);
  const [token] = useState(() => localStorage.getItem("meviplastToken"));
  const role = session && roleViews[session.role] ? session.role : null;
  const config = role ? roleViews[role] : null;
  const reportParams = new URLSearchParams(window.location.search);
  const requestedReport = reportParams.get("reporte");
  const requestedPeriod = reportParams.get("periodo");
  const isReportDetail =
    ["produccion", "ventas", "rendimiento"].includes(requestedReport) &&
    ["diario", "semanal", "mensual", "anual"].includes(requestedPeriod) &&
    ["Administrador", "Supervisor"].includes(role);
  const requestedView = window.location.hash.slice(1) || "inicio";
  const activeView = isReportDetail
    ? "reporte-detalle"
    : config?.views.some(([view]) => view === requestedView)
    ? requestedView
    : config?.views[0]?.[0] || "inicio";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadedVersion, setLoadedVersion] = useState("");
  const [errorVersion, setErrorVersion] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const requestVersion = `${activeView}:${reloadKey}`;

  useEffect(() => {
    if (!token || !config) {
      window.location.replace("/login.html");
      return;
    }
    document.body.dataset.role = role;
    document.title = `${role} | MEVIPLAST`;
  }, [config, role, token]);

  // En todos los campos numéricos del panel: sin «e», «+» ni «-» al escribir o pegar
  useEffect(() => {
    document.addEventListener("keydown", blockNonNumericKeys);
    document.addEventListener("paste", blockNonNumericPaste);
    return () => {
      document.removeEventListener("keydown", blockNonNumericKeys);
      document.removeEventListener("paste", blockNonNumericPaste);
    };
  }, []);

  useEffect(() => {
    if (!config || !token) return undefined;
    let current = true;
    setLoading(true);
    setError("");
    setErrorVersion("");
    loadView(activeView, config, token)
      .then((result) => {
        if (current) {
          setData(result);
          setLoadedVersion(requestVersion);
        }
      })
      .catch((cause) => {
        if (current) {
          setError(cause.message || "No se pudo cargar esta sección.");
          setErrorVersion(requestVersion);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => { current = false; };
  }, [activeView, config, reloadKey, requestVersion, token]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const updateFromHash = () => setReloadKey((value) => value + 1);
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  function navigate(view) {
    // Desde un reporte detallado hay que quitar ?reporte=…, que tiene prioridad sobre la vista
    if (window.location.search) window.location.assign(`/dashboard.html#${view}`);
    else window.location.hash = view;
    setSidebarOpen(false);
  }

  function logout() {
    localStorage.removeItem("meviplastToken");
    localStorage.removeItem("meviplastSession");
    window.location.replace("/login.html");
  }

  // Descarga el reporte detallado del periodo en Excel (RF-028)
  async function downloadReportExcel() {
    try {
      const ruta = requestedReport === "rendimiento" ? "rendimiento/excel" : `${requestedReport}/detalle/excel`;
      const response = await fetch(`/api/reportes/${ruta}?periodo=${requestedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        localStorage.removeItem("meviplastToken");
        localStorage.removeItem("meviplastSession");
        window.location.replace("/login.html");
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.mensaje || "No fue posible descargar el Excel.");
      }
      const fileName = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "reporte.xlsx";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function openReceipt(id) {
    try {
      const venta = await api(`/api/ventas/${id}/comprobante`, token);
      if (venta) setReceipt(venta);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = sanitizePayload(Object.fromEntries(new FormData(form)));
    const summary = irreversibleSummary(activeView, payload, data);
    if (summary) {
      setPendingSave({ form, payload, ...summary });
      return;
    }
    await save(form, payload);
  }

  async function save(form, payload) {
    setSaving(true);
    let newSaleId = null;
    try {
      if (activeView === "usuarios") {
        await api("/api/usuarios", token, { method: "POST", body: JSON.stringify(payload) });
      } else if (activeView === "materia") {
        if (payload.materia_prima_id) {
          await api("/api/materia-prima/movimientos", token, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else {
          await api("/api/materia-prima", token, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      } else if (activeView === "inventario") {
        if (payload.inventario_id) {
          const { inventario_id, ...salida } = payload;
          await api(`/api/inventario/${inventario_id}/salida`, token, {
            method: "POST",
            body: JSON.stringify(salida),
          });
        } else {
          await api("/api/inventario", token, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      } else if (activeView === "asignar") {
        await api("/api/produccion", token, { method: "POST", body: JSON.stringify(payload) });
      } else if (activeView === "produccion") {
        const { plantilla_id, ...order } = payload;
        await api("/api/produccion", token, {
          method: "POST",
          body: JSON.stringify(order),
        });
      } else if (activeView === "registrar") {
        const { id, ...advance } = payload;
        await api(`/api/produccion/${id}/avance`, token, {
          method: "POST",
          body: JSON.stringify(advance),
        });
      } else if (activeView === "ventas") {
        const venta = await api("/api/ventas", token, { method: "POST", body: JSON.stringify(payload) });
        newSaleId = venta?.id;
      }
      form.reset();
      setToast("Registro guardado correctamente.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    } finally {
      setSaving(false);
    }
    if (newSaleId) await openReceipt(newSaleId);
  }

  async function updateOrderStatus(id, status) {
    try {
      await api(`/api/produccion/${id}/estado`, token, {
        method: "PUT",
        body: JSON.stringify({ estado: status }),
      });
      setToast("Estado actualizado.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function updateOrder(id, payload) {
    try {
      await api(`/api/produccion/${id}`, token, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setToast("Orden actualizada.");
      setReloadKey((value) => value + 1);
      return true;
    } catch (cause) {
      setToast(cause.message);
      return false;
    }
  }

  async function assignOrder(id, responsableId) {
    try {
      await api(`/api/produccion/${id}/asignar`, token, {
        method: "PUT",
        body: JSON.stringify({ responsable_id: responsableId }),
      });
      setToast("Operario asignado a la orden.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function saveProductionTemplate(payload) {
    try {
      await api("/api/produccion/plantillas", token, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToast("Plantilla guardada.");
      setReloadKey((value) => value + 1);
      return true;
    } catch (cause) {
      setToast(cause.message);
      return false;
    }
  }

  async function deleteProductionTemplate(id) {
    try {
      await api(`/api/produccion/plantillas/${id}`, token, { method: "DELETE" });
      setToast("Plantilla eliminada.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function toggleUser(user) {
    try {
      await api(`/api/usuarios/${user.id}`, token, {
        method: "PUT",
        body: JSON.stringify({ activo: user.activo ? 0 : 1 }),
      });
      setToast("Estado actualizado.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function unlockUser(user) {
    try {
      await api(`/api/usuarios/${user.id}/desbloquear`, token, { method: "PUT" });
      setToast("Cuenta desbloqueada.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    }
  }

  async function updateUserEmail(userId, correo) {
    try {
      await api(`/api/usuarios/${userId}`, token, {
        method: "PUT",
        body: JSON.stringify({ correo }),
      });
      setToast("Correo actualizado.");
      setReloadKey((value) => value + 1);
      return true;
    } catch (cause) {
      setToast(cause.message);
      return false;
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    try {
      await api(`/api/usuarios/${deleteTarget.id}`, token, { method: "DELETE" });
      setToast("Usuario eliminado correctamente.");
      setDeleteTarget(null);
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
      setDeleteTarget(null);
    }
  }

  if (!config || !token) return null;
  const today = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const appRole = config.apiRole;
  const content = loading || (loadedVersion !== requestVersion && errorVersion !== requestVersion) ? (
    <section className="panel empty" role="status">Cargando información...</section>
  ) : error && errorVersion === requestVersion ? (
    <section className="panel empty" role="alert">
      <h2>No se pudo cargar esta sección</h2>
      <p>{error}</p>
      <button className="primary-action" type="button" onClick={() => setReloadKey((value) => value + 1)}>
        Reintentar
      </button>
    </section>
  ) : renderView({
    view: activeView,
    data,
    role: appRole,
    username: session.username,
    token,
    navigate,
    submitForm,
    saving,
    toggleUser,
    unlockUser,
    updateUserEmail,
    requestDelete: (user) => {
      if (user.usuario === session.username) {
        setToast("No puedes eliminar tu propio usuario.");
        return;
      }
      setDeleteTarget(user);
    },
    updateOrderStatus,
    updateOrder,
    assignOrder,
    saveProductionTemplate,
    deleteProductionTemplate,
    openReceipt,
    downloadReportExcel,
  });

  return (
    <>
      <div className="dashboard">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <a className="sidebar-brand" href="/dashboard.html">
            <img src="/assets/logo-meviplast.png" alt="" />
            <span>MEVIPLAST</span>
          </a>
          <p className="role-label">{role}</p>
          <nav className="side-nav" aria-label="Navegación principal">
            {config.views.map(([view, icon, label]) => (
              <a
                className={activeView === view ? "active" : ""}
                href={`/dashboard.html#${view}`}
                key={view}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{icon}</span>{label}
              </a>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button type="button" onClick={() => setConfirmLogout(true)}>
              Cerrar sesión
            </button>
          </div>
        </aside>
        <section className="workspace">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="sidebar-toggle"
                type="button"
                aria-label="Abrir menú"
                onClick={() => setSidebarOpen((open) => !open)}
              >
                ☰
              </button>
              <div><h1>{config.title}</h1><p>{today}</p></div>
            </div>
            <div className="topbar-welcome">
              <strong>Te damos la bienvenida, {sanitizeText(session.name || session.username, 80)}</strong>
              <span>{role}: {config.welcome}</span>
            </div>
            <div className="user-menu">
              <span className="user-avatar">{config.initials}</span>
              <div><strong>{session.username}</strong><span>{role}</span></div>
            </div>
          </header>
          <main className="main-content" key={activeView}>{content}</main>
        </section>
      </div>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
      {deleteTarget && (
        <Dialogo onClose={() => setDeleteTarget(null)} labelledBy="delete-title">
            <div className="confirm-header">
              <div className="confirm-icon">!</div>
              <div>
                <h3 id="delete-title">Confirmar eliminación</h3>
                <p>¿Deseas eliminar al usuario <strong>{deleteTarget.usuario}</strong>?<br />Se eliminará del sistema y no podrá iniciar sesión.</p>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="confirm-delete" type="button" onClick={deleteUser}>Eliminar</button>
            </div>
          </Dialogo>
      )}
      {pendingSave && (
        <Dialogo onClose={() => setPendingSave(null)} labelledBy="save-title">
            <div className="confirm-header">
              <div className="confirm-icon">?</div>
              <div>
                <h3 id="save-title">{pendingSave.title}</h3>
                <p>Revisa los datos antes de guardar. Este registro mueve el inventario y no se puede deshacer desde el panel.</p>
              </div>
            </div>
            <dl className="confirm-summary">
              {pendingSave.lines.map(([label, value]) => (
                <React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>
              ))}
            </dl>
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" autoFocus onClick={() => setPendingSave(null)}>Revisar</button>
              <button
                className="confirm-delete"
                type="button"
                onClick={async () => {
                  const { form, payload } = pendingSave;
                  setPendingSave(null);
                  await save(form, payload);
                }}
              >
                Sí, guardar
              </button>
            </div>
          </Dialogo>
      )}
      {confirmLogout && (
        <Dialogo onClose={() => setConfirmLogout(false)} labelledBy="logout-title">
            <div className="confirm-header">
              <div className="confirm-icon">?</div>
              <div>
                <h3 id="logout-title">Cerrar sesión</h3>
                <p>¿Deseas cerrar tu sesión?<br />Lo que no hayas guardado se perderá.</p>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="confirm-cancel" type="button" autoFocus onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button className="confirm-delete" type="button" onClick={logout}>Cerrar sesión</button>
            </div>
          </Dialogo>
      )}
      {receipt && <SaleReceipt sale={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

function renderView({
  view,
  data,
  role,
  username,
  token,
  navigate,
  submitForm,
  saving,
  toggleUser,
  unlockUser,
  updateUserEmail,
  requestDelete,
  updateOrderStatus,
  updateOrder,
  assignOrder,
  saveProductionTemplate,
  deleteProductionTemplate,
  openReceipt,
  downloadReportExcel,
}) {
  if (view === "reporte-detalle") return <ReportDetail data={data} onExportExcel={downloadReportExcel} />;
  if (view === "inicio") return <Home data={data} role={role} navigate={navigate} />;
  if (view === "usuarios") return <Users data={data} username={username} onSubmit={submitForm} saving={saving} onToggle={toggleUser} onUnlock={unlockUser} onUpdateEmail={updateUserEmail} onDelete={requestDelete} role={role} />;
  if (view === "materia") return <Materials data={data} role={role} onSubmit={submitForm} saving={saving} />;
  if (view === "inventario") return <Inventory data={data} onSubmit={submitForm} saving={saving} />;
  if (view === "tareas") return <Tasks orders={data} onChangeStatus={updateOrderStatus} navigate={navigate} />;
  if (view === "historial") return <History orders={data} token={token} />;
  if (view === "produccion") return <Production data={data} role={role} view={view} onSubmit={submitForm} saving={saving} onChangeStatus={updateOrderStatus} onEditOrder={updateOrder} onAssignOrder={assignOrder} onSaveTemplate={saveProductionTemplate} onDeleteTemplate={deleteProductionTemplate} />;
  if (view === "asignar") return <Assign data={data} onSubmit={submitForm} saving={saving} />;
  if (view === "registrar") return <Advance data={data} onSubmit={submitForm} saving={saving} />;
  if (view === "operarios") return <Operators data={data} />;
  if (view === "ventas") return <Sales data={data} onSubmit={submitForm} saving={saving} onReceipt={openReceipt} />;
  if (view === "reportes") return <Reports />;
  if (view === "auditoria") return <Audit token={token} />;
  return <section className="panel empty"><h2>{viewTitles[view] || "Sección"}</h2></section>;
}
