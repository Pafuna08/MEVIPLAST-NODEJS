import React, { useEffect, useState } from "react";

const roleViews = {
  Administrador: {
    apiRole: "admin",
    title: "Panel administrativo",
    initials: "AD",
    views: [
      ["inicio", "IN", "Inicio"],
      ["usuarios", "US", "Usuarios"],
      ["materia", "MP", "Materias primas"],
      ["inventario", "IT", "Inventario"],
      ["produccion", "PR", "Producción"],
      ["ventas", "VT", "Ventas"],
      ["reportes", "RP", "Reportes"],
    ],
  },
  Supervisor: {
    apiRole: "supervisor",
    title: "Control de producción",
    initials: "SU",
    views: [
      ["inicio", "IN", "Inicio"],
      ["asignar", "AT", "Asignar tareas"],
      ["operarios", "OP", "Operarios"],
      ["produccion", "SP", "Seguimiento"],
      ["materia", "MP", "Materias primas"],
      ["reportes", "RP", "Reportes"],
    ],
  },
  Operario: {
    apiRole: "operario",
    title: "Mi jornada de producción",
    initials: "OP",
    views: [
      ["inicio", "IN", "Inicio"],
      ["tareas", "TA", "Mis tareas"],
      ["registrar", "RG", "Registrar producción"],
      ["historial", "HI", "Mi historial"],
    ],
  },
  Vendedor: {
    apiRole: "vendedor",
    title: "Gestión de ventas",
    initials: "VE",
    views: [["ventas", "VT", "Ventas"]],
  },
  Almacenista: {
    apiRole: "almacenista",
    title: "Control de almacén",
    initials: "AL",
    views: [
      ["materia", "MP", "Materias primas"],
      ["inventario", "IT", "Inventario"],
    ],
  },
};

const viewTitles = {
  inicio: "Inicio",
  usuarios: "Gestión de usuarios",
  materia: "Materias primas",
  inventario: "Inventario terminado",
  produccion: "Seguimiento de producción",
  asignar: "Asignar tarea",
  operarios: "Operarios",
  tareas: "Mis tareas",
  registrar: "Registrar producción",
  historial: "Mi historial",
  ventas: "Ventas",
  reportes: "Reportes",
};

const sanitizeText = (value, maxLength = 255) =>
  String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /(?:javascript\s*:|on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))/gi,
      " ",
    )
    .replace(/\b(?:alert|confirm|prompt|eval|document\.cookie)\s*\([^)]*\)/gi, " ")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\\["']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const lowerKey = key.toLowerCase();
      if (typeof item !== "string") return [key, sanitizePayload(item)];
      const clean = sanitizeText(
        item,
        /(password|observaciones|cliente|producto|nombre|usuario|correo|tipo|proveedor|ubicacion|lote)/i.test(
          lowerKey,
        )
          ? 255
          : 80,
      );
      const normalized = /(cantidad|precio|stock|min|max|total|id|activo)/i.test(
        lowerKey,
      )
        ? Number(clean) || 0
        : lowerKey.includes("usuario")
          ? clean.toLowerCase().replace(/[^a-z0-9._-]/g, "")
          : lowerKey.includes("correo")
            ? clean.toLowerCase()
            : clean;
      return [key, normalized];
    }),
  );
}

const numberFormat = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 2,
});
const currencyFormat = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const number = (value) => numberFormat.format(Number(value || 0));
const money = (value) => currencyFormat.format(Number(value || 0));
const roleName = (value) =>
  ({
    admin: "Administrador",
    supervisor: "Supervisor",
    operario: "Operario",
    vendedor: "Vendedor",
    almacenista: "Almacenista",
  })[value] || value;

async function api(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("meviplastToken");
    localStorage.removeItem("meviplastSession");
    window.location.replace("/login.html");
    return null;
  }
  if (response.status === 403) {
    throw new Error(data?.mensaje || "No tienes permisos para esta sección.");
  }
  if (!response.ok) {
    throw new Error(data?.mensaje || "No fue posible completar la operación.");
  }
  return data;
}

async function loadView(view, role, token) {
  if (view === "inicio") {
    const orders = await api("/api/produccion", token);
    if (role.apiRole === "operario") {
      return { orders, inventory: [] };
    }
    const [inventory, sales] = await Promise.all([
      api("/api/inventario", token),
      api("/api/reportes/ventas", token),
    ]);
    return { orders, inventory, sales };
  }
  if (view === "usuarios") return api("/api/usuarios", token);
  if (view === "materia") {
    const [materials, movements, orders] = await Promise.all([
      api("/api/materia-prima", token),
      api("/api/materia-prima/movimientos", token),
      ["admin", "supervisor"].includes(role.apiRole)
        ? api("/api/produccion", token)
        : Promise.resolve([]),
    ]);
    return { materials, movements, orders };
  }
  if (view === "inventario") {
    const [items, movements] = await Promise.all([
      api("/api/inventario", token),
      api("/api/inventario/movimientos", token),
    ]);
    return { items, movements };
  }
  if (["produccion", "tareas", "historial", "registrar"].includes(view)) {
    const orders = await api("/api/produccion", token);
    if (role.apiRole === "admin") {
      const [materials, supervisors, templates] = await Promise.all([
        api("/api/materia-prima", token),
        api("/api/produccion/supervisores", token),
        api("/api/produccion/plantillas", token),
      ]);
      return { orders, materials, supervisors, templates };
    }
    if (role.apiRole === "supervisor") {
      const [operators, materials, templates] = await Promise.all([
        api("/api/produccion/operarios", token),
        api("/api/materia-prima", token),
        api("/api/produccion/plantillas", token),
      ]);
      return { orders, operators, materials, templates };
    }
    return orders;
  }
  if (view === "asignar") {
    const [operators, materials] = await Promise.all([
      api("/api/produccion/operarios", token),
      api("/api/materia-prima", token),
    ]);
    return { operators, materials };
  }
  if (view === "operarios") {
    const [operators, orders] = await Promise.all([
      api("/api/produccion/operarios", token),
      api("/api/produccion", token),
    ]);
    return { operators, orders };
  }
  if (view === "ventas") {
    const [sales, inventory] = await Promise.all([
      api("/api/ventas", token),
      api("/api/inventario", token),
    ]);
    return { sales, inventory };
  }
  if (view === "reportes") {
    const [production, sales, inventory] = await Promise.all([
      api("/api/reportes/produccion", token),
      api("/api/reportes/ventas", token),
      api("/api/reportes/inventario", token),
    ]);
    return { production, sales, inventory };
  }
  return null;
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <header className="panel-header">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function DataTable({ columns, rows, empty = "No hay datos para mostrar." }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => <tr key={row.key ?? index}>{row.cells}</tr>)
          ) : (
            <tr><td colSpan={columns.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }) {
  return <label>{label}{children}</label>;
}

function FormPanel({ title, onSubmit, children, saving }) {
  return (
    <section className="panel form-panel">
      <header className="panel-header"><h3>{title}</h3></header>
      <form className="data-form" onSubmit={onSubmit}>
        {children}
        <button className="primary-action" type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </section>
  );
}

function Intro({ title, description, action }) {
  return (
    <div className="page-intro">
      <div><h2>{title}</h2><p>{description}</p></div>
      {action}
    </div>
  );
}

function StatusBadge({ status }) {
  const style = {
    finalizado: "success",
    en_proceso: "progress",
    cancelado: "alert",
  }[status] || "pending";
  return <span className={`status ${style}`}>{String(status || "").replace("_", " ")}</span>;
}

function OrderRow({ order, canManage, onChangeStatus, canEdit, onEdit }) {
  const goal = Number(order.cantidad) || 0;
  const produced = Number(order.cantidad_producida) || 0;
  const progress = goal ? Math.round((produced * 100) / goal) : 0;
  return (
    <div className="order-row">
      <div>
        <strong>#{order.id} · {order.producto}</strong>
        <span>
          {order.responsable_nombre || "Sin asignar"}
          {order.supervisor_nombre ? ` · Supervisor: ${sanitizeText(order.supervisor_nombre)}` : ""}
          {" · "}{number(produced)}/{number(goal)} ({progress}%)
        </span>
      </div>
      <StatusBadge status={order.estado} />
      {canEdit && <button className="text-action" type="button" onClick={() => onEdit(order)}>Editar</button>}
      {canManage && (
        <select
          className="state-select"
          aria-label={`Estado de orden ${order.id}`}
          value={order.estado}
          onChange={(event) => onChangeStatus(order.id, event.target.value)}
        >
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="finalizado">Finalizado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      )}
    </div>
  );
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("meviplastSession") || "null");
  } catch {
    return null;
  }
}

export default function DashboardApp() {
  const [session] = useState(readSession);
  const [token] = useState(() => localStorage.getItem("meviplastToken"));
  const role = session && roleViews[session.role] ? session.role : null;
  const config = role ? roleViews[role] : null;
  const requestedView = window.location.hash.slice(1) || "inicio";
  const activeView = config?.views.some(([view]) => view === requestedView)
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
  const requestVersion = `${activeView}:${reloadKey}`;

  useEffect(() => {
    if (!token || !config) {
      window.location.replace("/login.html");
      return;
    }
    document.body.dataset.role = role;
    document.title = `${role} | MEVIPLAST`;
  }, [config, role, token]);

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
    window.location.hash = view;
    setSidebarOpen(false);
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const payload = sanitizePayload(Object.fromEntries(new FormData(form)));
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
        await api("/api/ventas", token, { method: "POST", body: JSON.stringify(payload) });
      }
      form.reset();
      setToast("Registro guardado correctamente.");
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setToast(cause.message);
    } finally {
      setSaving(false);
    }
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
    } catch (cause) {
      setToast(cause.message);
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
    navigate,
    submitForm,
    saving,
    toggleUser,
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
                href={`#${view}`}
                key={view}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{icon}</span>{label}
              </a>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("meviplastToken");
                localStorage.removeItem("meviplastSession");
                window.location.replace("/login.html");
              }}
            >
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
        <div className="confirm-overlay" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) setDeleteTarget(null);
        }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
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
          </section>
        </div>
      )}
    </>
  );
}

function renderView({
  view,
  data,
  role,
  username,
  navigate,
  submitForm,
  saving,
  toggleUser,
  updateUserEmail,
  requestDelete,
  updateOrderStatus,
  updateOrder,
  assignOrder,
  saveProductionTemplate,
  deleteProductionTemplate,
}) {
  if (view === "inicio") return <Home data={data} role={role} navigate={navigate} />;
  if (view === "usuarios") return <Users data={data} username={username} onSubmit={submitForm} saving={saving} onToggle={toggleUser} onUpdateEmail={updateUserEmail} onDelete={requestDelete} role={role} />;
  if (view === "materia") return <Materials data={data} role={role} onSubmit={submitForm} saving={saving} />;
  if (view === "inventario") return <Inventory data={data} onSubmit={submitForm} saving={saving} />;
  if (["produccion", "tareas", "historial"].includes(view)) return <Production data={data} role={role} view={view} onSubmit={submitForm} saving={saving} onChangeStatus={updateOrderStatus} onEditOrder={updateOrder} onAssignOrder={assignOrder} onSaveTemplate={saveProductionTemplate} onDeleteTemplate={deleteProductionTemplate} />;
  if (view === "asignar") return <Assign data={data} onSubmit={submitForm} saving={saving} />;
  if (view === "registrar") return <Advance data={data} onSubmit={submitForm} saving={saving} />;
  if (view === "operarios") return <Operators data={data} />;
  if (view === "ventas") return <Sales data={data} onSubmit={submitForm} saving={saving} />;
  if (view === "reportes") return <Reports data={data} navigate={navigate} />;
  return <section className="panel empty"><h2>{viewTitles[view] || "Sección"}</h2></section>;
}

function Home({ data, role, navigate }) {
  const active = data.orders.filter((order) => ["pendiente", "en_proceso"].includes(order.estado));
  const produced = data.orders.reduce((sum, order) => sum + Number(order.cantidad_producida || 0), 0);
  const stats = role === "operario"
    ? [
        ["Mis tareas activas", active.length],
        ["Producción registrada", number(produced)],
        ["Completadas", data.orders.filter((order) => order.estado === "finalizado").length],
        ["Meta pendiente", number(active.reduce((sum, order) => sum + Number(order.cantidad) - Number(order.cantidad_producida || 0), 0))],
      ]
    : [
        ["Órdenes activas", active.length],
        ["Producción registrada", number(produced)],
        ["Inventario terminado", number(data.inventory.reduce((sum, item) => sum + Number(item.cantidad), 0))],
        ["Ventas", money(data.sales.resumen.total_vendido)],
      ];
  const destination = role === "operario" ? "registrar" : role === "supervisor" ? "asignar" : "reportes";
  return (
    <>
      <Intro
        title={role === "operario" ? "Mi jornada" : "Resumen operativo"}
        description="Información actualizada directamente desde el sistema."
        action={<button className="primary-action" type="button" onClick={() => navigate(destination)}>{role === "operario" ? "Registrar producción" : role === "supervisor" ? "Asignar tarea" : "Ver reportes"}</button>}
      />
      <section className="stats-grid">
        {stats.map(([label, value]) => <article className="stat-card" key={label}><div className="stat-head"><span>{label}</span><i className="stat-icon">•</i></div><strong>{value}</strong><small>Datos reales</small></article>)}
      </section>
      <div className="dashboard-grid">
        <Panel title="Órdenes recientes" action={<button type="button" onClick={() => navigate(role === "operario" ? "historial" : "produccion")}>Ver todas</button>}>
          {data.orders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} canManage={false} />)}
          {!data.orders.length && <p className="empty">Sin órdenes.</p>}
        </Panel>
        <Panel title="Estado">
          <ul className="activity-list">
            <li><strong>{active.length} órdenes activas</strong><span>Revisa el seguimiento para actualizar.</span></li>
            {role === "operario" ? (
              <li><strong>{data.orders.filter((order) => order.estado === "finalizado").length} órdenes completadas</strong><span>Tu historial de producción.</span></li>
            ) : (
              <li><strong>{data.inventory.filter((item) => Number(item.cantidad) === 0).length} productos agotados</strong><span>Inventario actual.</span></li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Users({
  data,
  username,
  onSubmit,
  saving,
  onToggle,
  onUpdateEmail,
  onDelete,
  role,
}) {
  const [emailUser, setEmailUser] = useState(null);
  return (
    <>
      <Intro title="Gestión de usuarios" description="Crea cuentas, activa o desactiva accesos y administra los usuarios del sistema." />
      <FormPanel title="Nuevo usuario" onSubmit={onSubmit} saving={saving}>
        <Field label="Nombre"><input name="nombre" maxLength="120" required /></Field>
        <Field label="Usuario"><input name="usuario" maxLength="50" required /></Field>
        <Field label="Correo electrónico"><input name="correo" type="email" maxLength="254" autoComplete="email" required /></Field>
        <Field label="Contraseña"><input name="password" type="password" minLength="6" required /></Field>
        <Field label="Rol"><select name="rol" defaultValue="operario"><option value="operario">Operario</option><option value="vendedor">Vendedor</option><option value="almacenista">Almacenista</option><option value="supervisor">Supervisor</option><option value="admin">Administrador</option></select></Field>
      </FormPanel>
      <Panel title="Usuarios registrados">
        <DataTable columns={["Nombre", "Usuario", "Correo electrónico", "Rol", "Estado", "Acción"]} rows={data.map((user) => ({
          key: user.id,
          cells: <><td>{sanitizeText(user.nombre)}</td><td>{sanitizeText(user.usuario)}</td><td>{emailUser === user.id ? <form className="inline-email-form" onSubmit={async (event) => { event.preventDefault(); const correo = new FormData(event.currentTarget).get("correo"); if (await onUpdateEmail(user.id, correo)) setEmailUser(null); }}><input name="correo" type="email" maxLength="254" defaultValue={user.correo || ""} aria-label={`Correo de ${user.usuario}`} required /><button className="text-action" type="submit">Guardar correo</button><button className="text-action" type="button" onClick={() => setEmailUser(null)}>Cancelar</button></form> : <>{sanitizeText(user.correo || "Sin correo registrado")}<button className="text-action" type="button" onClick={() => setEmailUser(user.id)}>{user.correo ? "Cambiar" : "Agregar correo"}</button></>}</td><td>{roleName(user.rol)}</td><td>{user.activo ? "Activo" : "Inactivo"}</td><td><div className="inline-actions"><button className="text-action" type="button" onClick={() => onToggle(user)}>{user.activo ? "Desactivar" : "Activar"}</button>{role === "admin" && user.usuario !== username && <button className="text-action danger" type="button" onClick={() => onDelete(user)}>Eliminar</button>}</div></td></>,
        }))} />
      </Panel>
    </>
  );
}

function Materials({ data, role, onSubmit, saving }) {
  const canConsume = ["admin", "supervisor"].includes(role);
  const canManageStock = ["admin", "almacenista"].includes(role);
  const canCreate = role === "admin";
  const movementTypes = [
    ...(canConsume ? [["consumo_produccion", "Consumo en producción"]] : []),
    ...(canManageStock
      ? [
          ["compra", "Compra"],
          ["ajuste_entrada", "Ajuste de entrada"],
          ["ajuste_salida", "Ajuste de salida"],
        ]
      : []),
  ];
  return (
    <>
      <Intro title="Materias primas" description="Consulta existencias y registra entradas, ajustes y consumos trazables." />
      {canCreate && <FormPanel title="Crear materia prima" onSubmit={onSubmit} saving={saving}>
          <Field label="Nombre"><input name="nombre" maxLength="120" required /></Field>
          <Field label="Tipo"><input name="tipo" maxLength="80" required /></Field>
          <Field label="Cantidad inicial"><input name="cantidad" type="number" min="0" step="0.01" required /></Field>
          <Field label="Unidad"><input name="unidad" defaultValue="kg" maxLength="30" /></Field>
          <Field label="Proveedor"><input name="proveedor" maxLength="120" /></Field>
          <Field label="Stock mínimo"><input name="stock_minimo" type="number" min="0" step="0.01" defaultValue="0" /></Field>
        </FormPanel>}
      <FormPanel title="Registrar movimiento" onSubmit={onSubmit} saving={saving}>
        <Field label="Materia prima"><select name="materia_prima_id" required>{data.materials.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({number(item.cantidad)} {item.unidad})</option>)}</select></Field>
        <Field label="Tipo"><select name="tipo" defaultValue={movementTypes[0]?.[0]}>
          {movementTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></Field>
        {canConsume && <Field label="Orden (para consumo)"><select name="produccion_id"><option value="">Sin asociar</option>{data.orders.map((order) => <option key={order.id} value={order.id}>#{order.id} · {order.producto}</option>)}</select></Field>}
        <Field label="Cantidad"><input name="cantidad" type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Observaciones"><input name="observaciones" maxLength="255" /></Field>
      </FormPanel>
      <Panel title="Existencias"><DataTable columns={["Material", "Tipo", "Cantidad", "Mínimo", "Proveedor"]} rows={data.materials.map((item) => ({
        key: item.id,
        cells: <><td>{item.nombre}</td><td>{item.tipo}</td><td>{number(item.cantidad)} {item.unidad}</td><td>{number(item.stock_minimo)}</td><td>{item.proveedor || "—"}</td></>,
      }))} /></Panel>
      <Panel title="Movimientos recientes"><DataTable columns={["Fecha", "Material", "Movimiento", "Cantidad", "Registrado por"]} rows={data.movements.map((movement) => ({
        key: movement.id,
        cells: <><td>{movement.fecha}</td><td>{movement.materia_prima}</td><td>{movement.tipo}</td><td>{number(movement.cantidad)}</td><td>{movement.registrado_por || "Sistema"}</td></>,
      }))} /></Panel>
    </>
  );
}

function Inventory({ data, onSubmit, saving }) {
  return (
    <>
      <Intro title="Inventario terminado" description="Registra ingresos y salidas manuales; la producción y las ventas también dejan su movimiento." />
      <FormPanel title="Ingreso de inventario" onSubmit={onSubmit} saving={saving}>
        <Field label="Producto"><input name="producto" maxLength="120" required /></Field>
        <Field label="Cantidad"><input name="cantidad" type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Ubicación"><input name="ubicacion" defaultValue="Bodega A" maxLength="80" /></Field>
      </FormPanel>
      <FormPanel title="Registrar salida manual" onSubmit={onSubmit} saving={saving}>
        <Field label="Producto"><select name="inventario_id" required>{data.items.map((item) => <option key={item.id} value={item.id}>{item.producto} ({number(item.cantidad)})</option>)}</select></Field>
        <Field label="Cantidad"><input name="cantidad" type="number" min="0.01" step="0.01" required /></Field>
      </FormPanel>
      <Panel title="Productos disponibles"><DataTable columns={["Producto", "Cantidad", "Ubicación"]} rows={data.items.map((item) => ({ key: item.id, cells: <><td>{item.producto}</td><td>{number(item.cantidad)}</td><td>{item.ubicacion || "—"}</td></> }))} /></Panel>
      <Panel title="Movimientos recientes"><DataTable columns={["Fecha", "Producto", "Movimiento", "Cantidad", "Venta / orden"]} rows={data.movements.map((movement) => ({
        key: movement.id,
        cells: <><td>{movement.fecha}</td><td>{movement.producto}</td><td>{movement.tipo}</td><td>{number(movement.cantidad)}</td><td>{movement.cliente_venta || (movement.orden_id ? `Orden #${movement.orden_id}` : "—")}</td></>,
      }))} /></Panel>
    </>
  );
}

function Production({
  data,
  role,
  view,
  onSubmit,
  saving,
  onChangeStatus,
  onEditOrder,
  onAssignOrder,
  onSaveTemplate,
  onDeleteTemplate,
}) {
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const orders = Array.isArray(data) ? data : data.orders;
  const canManage = role !== "operario";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const templates = data.templates || [];
  const selectedTemplate = templates.find(
    (template) => String(template.id) === selectedTemplateId,
  );
  const title = view === "tareas" ? "Mis tareas" : view === "historial" ? "Mi historial" : "Seguimiento de producción";
  return (
    <>
      <Intro
        title={isAdmin && view === "produccion" ? "Gestión de producción" : title}
        description={
          isAdmin && view === "produccion"
            ? "Crea órdenes, asígnalas a un supervisor o reutiliza una plantilla frecuente."
            : isSupervisor
              ? "Revisa las órdenes que te asignaron y elige al operario que las ejecutará."
              : canManage
                ? "Actualiza el estado de las órdenes asignadas."
                : "Solo se muestran tus tareas asignadas."
        }
      />
      {isAdmin && view === "produccion" && (
        <>
          <Panel title="Órdenes frecuentes">
            {templates.length ? (
              <div className="order-list">
                {templates.map((template) => (
                  <div className="order-row" key={template.id}>
                    <div>
                      <strong>{sanitizeText(template.producto)}</strong>
                      <span>
                        Meta habitual: {number(template.cantidad)}
                        {template.materia_prima_nombre
                          ? ` · ${sanitizeText(template.materia_prima_nombre)}`
                          : ""}
                      </span>
                    </div>
                    <button
                      className="text-action"
                      type="button"
                      onClick={() => setSelectedTemplateId(String(template.id))}
                    >
                      Usar plantilla
                    </button>
                    <button
                      className="text-action danger"
                      type="button"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">Aún no hay plantillas. Puedes crear una abajo.</p>
            )}
          </Panel>
          <FormPanel
            title="Nueva orden de producción"
            onSubmit={(event) => {
              setSelectedTemplateId("");
              onSubmit(event);
            }}
            saving={saving}
          >
            {selectedTemplate && (
              <p className="form-hint">
                Plantilla seleccionada: {sanitizeText(selectedTemplate.producto)}. Puedes ajustar sus datos antes de crear la orden.
              </p>
            )}
            <Field label="Producto">
              <input
                key={`producto-${selectedTemplateId}`}
                name="producto"
                maxLength="120"
                defaultValue={selectedTemplate?.producto || ""}
                required
              />
            </Field>
            <Field label="Meta de producción">
              <input
                key={`cantidad-${selectedTemplateId}`}
                name="cantidad"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={selectedTemplate?.cantidad || ""}
                required
              />
            </Field>
            <Field label="Supervisor responsable">
              <select name="supervisor_id" required defaultValue="">
                <option value="" disabled>Selecciona un supervisor</option>
                {data.supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {sanitizeText(supervisor.nombre)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Materia prima">
              <select
                key={`materia-${selectedTemplateId}`}
                name="materia_prima_id"
                defaultValue={selectedTemplate?.materia_prima_id || ""}
              >
                <option value="">Sin asociar</option>
                {data.materials.map((material) => (
                  <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad">
              <select
                key={`prioridad-${selectedTemplateId}`}
                name="prioridad"
                defaultValue={selectedTemplate?.prioridad || "media"}
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
            {!data.supervisors.length && (
              <p className="empty">No hay supervisores activos. Crea o activa uno antes de registrar una orden.</p>
            )}
          </FormPanel>
          <FormPanel
            title="Guardar plantilla frecuente"
            onSubmit={async (event) => {
              event.preventDefault();
              const payload = sanitizePayload(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
              const form = event.currentTarget;
              if (await onSaveTemplate(payload)) form.reset();
            }}
            saving={false}
          >
            <Field label="Producto">
              <input name="producto" maxLength="120" required />
            </Field>
            <Field label="Meta habitual">
              <input name="cantidad" type="number" min="0.01" step="0.01" required />
            </Field>
            <Field label="Materia prima">
              <select name="materia_prima_id" defaultValue="">
                <option value="">Sin asociar</option>
                {data.materials.map((material) => (
                  <option key={material.id} value={material.id}>{sanitizeText(material.nombre)}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad habitual">
              <select name="prioridad" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
          </FormPanel>
        </>
      )}
      <Panel title="Órdenes">
        {orders.map((order) => (
          <React.Fragment key={order.id}>
            <OrderRow
              order={order}
              canManage={canManage && !(isSupervisor && !order.responsable_id)}
              onChangeStatus={onChangeStatus}
              canEdit={["admin", "supervisor"].includes(role) && order.estado === "pendiente" && Number(order.cantidad_producida || 0) === 0}
              onEdit={setEditingOrder}
            />
            {isSupervisor && !order.responsable_id && order.estado === "pendiente" && (
              <form
                className="data-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const responsableId = new FormData(event.currentTarget).get("responsable_id");
                  onAssignOrder(order.id, responsableId);
                }}
              >
                <Field label={`Asignar operario a la orden #${order.id}`}>
                  <select name="responsable_id" required defaultValue="">
                    <option value="" disabled>Selecciona un operario</option>
                    {data.operators.map((operator) => (
                      <option key={operator.id} value={operator.id}>{sanitizeText(operator.nombre)}</option>
                    ))}
                  </select>
                </Field>
                <button className="primary-action" type="submit" disabled={!data.operators.length}>
                  Asignar operario
                </button>
              </form>
            )}
          </React.Fragment>
        ))}
        {!orders.length && <p className="empty">No hay órdenes asignadas.</p>}
      </Panel>
      {editingOrder && (
        <FormPanel title={`Editar orden #${editingOrder.id}`} onSubmit={(event) => {
          event.preventDefault();
          const payload = sanitizePayload(Object.fromEntries(new FormData(event.currentTarget)));
          onEditOrder(editingOrder.id, payload);
          setEditingOrder(null);
        }} saving={false}>
          <Field label="Producto"><input name="producto" maxLength="120" defaultValue={editingOrder.producto} required /></Field>
          <Field label="Meta"><input name="cantidad" type="number" min="0.01" step="0.01" defaultValue={editingOrder.cantidad} required /></Field>
          <Field label="Materia prima"><select name="materia_prima_id" defaultValue={editingOrder.materia_prima_id || ""}><option value="">Sin asociar</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{material.nombre}</option>)}</select></Field>
          <Field label="Prioridad"><select name="prioridad" defaultValue={editingOrder.prioridad}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
          <button className="text-action" type="button" onClick={() => setEditingOrder(null)}>Cancelar</button>
        </FormPanel>
      )}
    </>
  );
}

function Assign({ data, onSubmit, saving }) {
  return (
    <>
      <Intro title="Asignar tarea" description="Crea una orden y entrégala a un operario activo." />
      <FormPanel title="Nueva orden de producción" onSubmit={onSubmit} saving={saving}>
        <Field label="Producto"><input name="producto" maxLength="120" required /></Field>
        <Field label="Meta"><input name="cantidad" type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Operario"><select name="responsable_id" required>{data.operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.nombre}</option>)}</select></Field>
        <Field label="Materia prima"><select name="materia_prima_id"><option value="">Sin asociar</option>{data.materials.map((material) => <option key={material.id} value={material.id}>{material.nombre}</option>)}</select></Field>
        <Field label="Prioridad"><select name="prioridad" defaultValue="media"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
      </FormPanel>
    </>
  );
}

function Advance({ data, onSubmit, saving }) {
  const activeOrders = data.filter((order) => !["finalizado", "cancelado"].includes(order.estado));
  return (
    <>
      <Intro title="Registrar producción" description="El avance se suma a la orden e ingresa al inventario terminado." />
      <FormPanel title="Nuevo registro" onSubmit={onSubmit} saving={saving}>
        <Field label="Orden"><select name="id" required>{activeOrders.map((order) => <option key={order.id} value={order.id}>#{order.id} · {order.producto} (pendiente {number(Number(order.cantidad) - Number(order.cantidad_producida || 0))})</option>)}</select></Field>
        <Field label="Cantidad producida"><input name="cantidad" type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Lote"><input name="lote" maxLength="80" placeholder="Ej. L-2406" /></Field>
        <Field label="Observaciones"><textarea name="observaciones" rows="3" maxLength="255" /></Field>
        {!activeOrders.length && <p className="empty">No hay órdenes pendientes para registrar producción.</p>}
      </FormPanel>
    </>
  );
}

function Sales({ data, onSubmit, saving }) {
  return (
    <>
      <Intro title="Ventas" description="Registra ventas; el stock se descuenta automáticamente." />
      <FormPanel title="Nueva venta" onSubmit={onSubmit} saving={saving}>
        <Field label="Cliente"><input name="cliente" maxLength="120" required /></Field>
        <Field label="Producto"><select name="producto" required>{data.inventory.map((item) => <option key={item.id} value={item.producto}>{item.producto} ({number(item.cantidad)})</option>)}</select></Field>
        <Field label="Cantidad"><input name="cantidad" type="number" min="0.01" step="0.01" required /></Field>
        <Field label="Precio unitario"><input name="precio_unitario" type="number" min="1" required /></Field>
      </FormPanel>
      <Panel title="Ventas registradas"><DataTable columns={["Cliente", "Producto", "Cantidad", "Total"]} rows={data.sales.map((sale) => ({ key: sale.id, cells: <><td>{sale.cliente}</td><td>{sale.producto}</td><td>{number(sale.cantidad)}</td><td>{money(sale.total)}</td></> }))} /></Panel>
    </>
  );
}

function Operators({ data }) {
  return (
    <>
      <Intro title="Operarios" description="Disponibilidad basada en órdenes activas." />
      <Panel title="Equipo de producción"><DataTable columns={["Nombre", "Usuario", "Órdenes activas"]} rows={data.operators.map((operator) => ({
        key: operator.id,
        cells: <><td>{operator.nombre}</td><td>{operator.usuario}</td><td>{data.orders.filter((order) => Number(order.responsable_id) === Number(operator.id) && ["pendiente", "en_proceso"].includes(order.estado)).length}</td></>,
      }))} /></Panel>
    </>
  );
}

function Reports({ data, navigate }) {
  return (
    <>
      <Intro title="Reportes" description="Consolidado actual de la operación." action={<button className="primary-action" type="button" onClick={() => window.print()}>Imprimir / guardar PDF</button>} />
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-head"><span>Ventas acumuladas</span></div><strong>{money(data.sales.resumen.total_vendido)}</strong><small>{data.sales.resumen.numero_ventas} ventas</small></article>
        <article className="stat-card"><div className="stat-head"><span>Productos en inventario</span></div><strong>{data.inventory.length}</strong><small>Referencias disponibles</small></article>
      </section>
      <Panel title="Producción por estado" className="report-panel">
        <DataTable columns={["Estado", "Órdenes", "Meta"]} rows={data.production.map((item) => ({ key: item.estado, cells: <><td><StatusBadge status={item.estado} /></td><td>{number(item.total)}</td><td>{number(item.cantidad_total)}</td></> }))} />
      </Panel>
      <button className="report-shortcut" type="button" onClick={() => navigate("ventas")}>Consultar ventas</button>
    </>
  );
}
