const session = JSON.parse(localStorage.getItem("meviplastSession") || "null"),
  token = localStorage.getItem("meviplastToken"),
  role = document.body.dataset.role,
  apiRole = {
    Administrador: "admin",
    Supervisor: "supervisor",
    Operario: "operario",
  }[role],
  app = document.querySelector("#app");
let view = location.hash.slice(1) || "inicio";
if (!session || !token || session.role !== role) location.replace("login.html");
async function api(url, opt = {}) {
  const r = await fetch(url, {
      ...opt,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opt.headers || {}),
      },
    }),
    d = r.status === 204 ? null : await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) {
    localStorage.clear();
    location.replace("login.html");
    return null;
  }
  if (!r.ok) throw Error(d.mensaje || "No fue posible completar la operación");
  return d;
}
const esc = (v) =>
    String(v ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    ),
  num = (v) =>
    new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(
      Number(v || 0),
    ),
  money = (v) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(v || 0)),
  badge = (v) =>
    `<span class="status ${v === "finalizado" ? "success" : v === "en_proceso" ? "progress" : v === "cancelado" ? "alert" : "pending"}">${esc(v.replace("_", " "))}</span>`;
const tbl = (heads, rows) =>
    `<div class="table-wrap"><table><thead><tr>${heads.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${heads.length}">No hay datos para mostrar.</td></tr>`}</tbody></table></div>`,
  form = (title, fields, id) =>
    `<section class="panel form-panel"><header class="panel-header"><h3>${title}</h3></header><form id="${id}" class="data-form">${fields}<button class="primary-action">Guardar</button></form></section>`;
function toast(m) {
  const e = document.querySelector("#toast");
  e.textContent = m;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 3000);
}
document
  .querySelectorAll("[data-user-name]")
  .forEach((e) => (e.textContent = session.username));
document
  .querySelectorAll("[data-role-name]")
  .forEach((e) => (e.textContent = role));
document
  .querySelectorAll("[data-today]")
  .forEach(
    (e) =>
      (e.textContent = new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date())),
  );
document
  .querySelector(".sidebar-toggle")
  ?.addEventListener("click", () =>
    document.querySelector(".sidebar").classList.toggle("open"),
  );
document.querySelector("#logout").onclick = () => {
  localStorage.clear();
  location.href = "login.html";
};
document.querySelectorAll("[data-view]").forEach(
  (a) =>
    (a.onclick = () => {
      view = a.dataset.view;
      location.hash = view;
      render();
    }),
);
function order(o, actions = "") {
  let p = Number(o.cantidad)
    ? Math.round((Number(o.cantidad_producida || 0) * 100) / Number(o.cantidad))
    : 0;
  return `<div class="order-row"><div><strong>#${o.id} · ${esc(o.producto)}</strong><span>${esc(o.responsable_nombre || "Sin asignar")} · ${num(o.cantidad_producida)}/${num(o.cantidad)} (${p}%)</span></div>${badge(o.estado)}${actions}</div>`;
}
async function home() {
  let [orders, inv] = await Promise.all([
      api("/api/produccion"),
      api("/api/inventario"),
    ]),
    active = orders.filter((o) =>
      ["pendiente", "en_proceso"].includes(o.estado),
    ),
    produced = orders.reduce(
      (s, o) => s + Number(o.cantidad_producida || 0),
      0,
    ),
    sales =
      apiRole === "operario"
        ? 0
        : (await api("/api/reportes/ventas")).resumen.total_vendido,
    stats =
      apiRole === "operario"
        ? [
            ["Mis tareas activas", active.length],
            ["Producción registrada", num(produced)],
            [
              "Completadas",
              orders.filter((o) => o.estado === "finalizado").length,
            ],
            [
              "Meta pendiente",
              num(
                active.reduce(
                  (s, o) =>
                    s + Number(o.cantidad) - Number(o.cantidad_producida || 0),
                  0,
                ),
              ),
            ],
          ]
        : [
            ["Órdenes activas", active.length],
            ["Producción registrada", num(produced)],
            [
              "Inventario terminado",
              num(inv.reduce((s, i) => s + Number(i.cantidad), 0)),
            ],
            ["Ventas", money(sales)],
          ];
  app.innerHTML = `<div class="page-intro"><div><h2>${apiRole === "operario" ? "Mi jornada" : "Resumen operativo"}</h2><p>Información actualizada directamente desde el sistema.</p></div><button class="primary-action" data-go="${apiRole === "operario" ? "registrar" : apiRole === "supervisor" ? "asignar" : "reportes"}">${apiRole === "operario" ? "Registrar producción" : apiRole === "supervisor" ? "Asignar tarea" : "Ver reportes"}</button></div><section class="stats-grid">${stats.map((x) => `<article class="stat-card"><div class="stat-head"><span>${x[0]}</span><i class="stat-icon">•</i></div><strong>${x[1]}</strong><small>Datos reales</small></article>`).join("")}</section><div class="dashboard-grid"><section class="panel"><header class="panel-header"><h3>Órdenes recientes</h3><button data-go="produccion">Ver todas</button></header>${orders.slice(0, 5).map(order).join("") || '<p class="empty">Sin órdenes.</p>'}</section><aside class="panel"><header class="panel-header"><h3>Estado</h3></header><ul class="activity-list"><li><strong>${active.length} órdenes activas</strong><span>Revisa el seguimiento para actualizar.</span></li><li><strong>${inv.filter((i) => Number(i.cantidad) === 0).length} productos agotados</strong><span>Inventario actual.</span></li></ul></aside></div>`;
}
async function users() {
  let a = await api("/api/usuarios");
  app.innerHTML = `<div class="page-intro"><div><h2>Gestión de usuarios</h2><p>Crea cuentas y activa o desactiva accesos.</p></div></div>${form("Nuevo usuario", '<label>Nombre<input name="nombre" required></label><label>Usuario<input name="usuario" required></label><label>Contraseña<input name="password" type="password" minlength="6" required></label><label>Rol<select name="rol"><option value="operario">Operario</option><option value="supervisor">Supervisor</option><option value="admin">Administrador</option></select></label>', "user-form")}<section class="panel"><header class="panel-header"><h3>Usuarios registrados</h3></header>${tbl(
    ["Nombre", "Usuario", "Rol", "Estado", "Acción"],
    a.map(
      (u) =>
        `<tr><td>${esc(u.nombre)}</td><td>${esc(u.usuario)}</td><td>${u.rol}</td><td>${u.activo ? "Activo" : "Inactivo"}</td><td><button class="text-action" data-toggle="${u.id}" data-active="${u.activo ? 0 : 1}">${u.activo ? "Desactivar" : "Activar"}</button></td></tr>`,
    ),
  )}</section>`;
}
async function materials() {
  let a = await api("/api/materia-prima");
  app.innerHTML = `<div class="page-intro"><div><h2>Materias primas</h2><p>Registra y consulta el abastecimiento.</p></div></div>${form("Registrar materia prima", '<label>Nombre<input name="nombre" required></label><label>Tipo<input name="tipo" required></label><label>Cantidad<input name="cantidad" type="number" min="0" step="0.01" required></label><label>Unidad<input name="unidad" value="kg"></label><label>Proveedor<input name="proveedor"></label><label>Stock mínimo<input name="stock_minimo" type="number" min="0" step="0.01" value="0"></label>', "material-form")}<section class="panel"><header class="panel-header"><h3>Existencias</h3></header>${tbl(
    ["Material", "Tipo", "Cantidad", "Mínimo", "Proveedor"],
    a.map(
      (i) =>
        `<tr><td>${esc(i.nombre)}</td><td>${esc(i.tipo)}</td><td>${num(i.cantidad)} ${esc(i.unidad)}</td><td>${num(i.stock_minimo)}</td><td>${esc(i.proveedor || "—")}</td></tr>`,
    ),
  )}</section>`;
}
async function inventory() {
  let a = await api("/api/inventario");
  app.innerHTML = `<div class="page-intro"><div><h2>Inventario terminado</h2><p>Ingresa productos fabricados y consulta existencias.</p></div></div>${form("Ingreso de inventario", '<label>Producto<input name="producto" required></label><label>Cantidad<input name="cantidad" type="number" min="0.01" step="0.01" required></label><label>Ubicación<input name="ubicacion" value="Bodega A"></label>', "inventory-form")}<section class="panel"><header class="panel-header"><h3>Productos disponibles</h3></header>${tbl(
    ["Producto", "Cantidad", "Ubicación"],
    a.map(
      (i) =>
        `<tr><td>${esc(i.producto)}</td><td>${num(i.cantidad)}</td><td>${esc(i.ubicacion || "—")}</td></tr>`,
    ),
  )}</section>`;
}
async function production() {
  let a = await api("/api/produccion"),
    manage = apiRole !== "operario";
  app.innerHTML = `<div class="page-intro"><div><h2>${manage ? "Seguimiento de producción" : "Mis tareas"}</h2><p>${manage ? "Actualiza el estado de las órdenes asignadas." : "Solo se muestran tus tareas asignadas."}</p></div></div><section class="panel"><header class="panel-header"><h3>Órdenes</h3></header>${a.map((o) => order(o, manage ? `<select class="state-select" data-order="${o.id}"><option value="pendiente" ${o.estado === "pendiente" ? "selected" : ""}>Pendiente</option><option value="en_proceso" ${o.estado === "en_proceso" ? "selected" : ""}>En proceso</option><option value="finalizado" ${o.estado === "finalizado" ? "selected" : ""}>Finalizado</option><option value="cancelado" ${o.estado === "cancelado" ? "selected" : ""}>Cancelado</option></select>` : "")).join("") || '<p class="empty">No hay órdenes asignadas.</p>'}</section>`;
}
async function assign() {
  let [ops, mat] = await Promise.all([
    api("/api/produccion/operarios"),
    api("/api/materia-prima"),
  ]);
  app.innerHTML = `<div class="page-intro"><div><h2>Asignar tarea</h2><p>Crea una orden y entrégala a un operario activo.</p></div></div>${form("Nueva orden de producción", `<label>Producto<input name="producto" required></label><label>Meta<input name="cantidad" type="number" min="0.01" step="0.01" required></label><label>Operario<select name="responsable_id">${ops.map((o) => `<option value="${o.id}">${esc(o.nombre)}</option>`).join("")}</select></label><label>Materia prima<select name="materia_prima_id"><option value="">Sin asociar</option>${mat.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}</select></label><label>Prioridad<select name="prioridad"><option value="alta">Alta</option><option value="media" selected>Media</option><option value="baja">Baja</option></select></label>`, "production-form")}`;
}
async function advance() {
  let a = (await api("/api/produccion")).filter(
    (o) => !["finalizado", "cancelado"].includes(o.estado),
  );
  app.innerHTML = `<div class="page-intro"><div><h2>Registrar producción</h2><p>El avance se suma a la orden e ingresa al inventario terminado.</p></div></div>${form("Nuevo registro", `<label>Orden<select name="id">${a.map((o) => `<option value="${o.id}">#${o.id} · ${esc(o.producto)} (pendiente ${num(Number(o.cantidad) - Number(o.cantidad_producida || 0))})</option>`).join("")}</select></label><label>Cantidad producida<input name="cantidad" type="number" min="0.01" step="0.01" required></label><label>Lote<input name="lote" placeholder="Ej. L-2406"></label><label>Observaciones<textarea name="observaciones" rows="3"></textarea></label>`, "advance-form")}`;
}
async function sales() {
  let [a, i] = await Promise.all([api("/api/ventas"), api("/api/inventario")]);
  app.innerHTML = `<div class="page-intro"><div><h2>Ventas</h2><p>Registra ventas; el stock se descuenta automáticamente.</p></div></div>${form("Nueva venta", `<label>Cliente<input name="cliente" required></label><label>Producto<select name="producto">${i.map((x) => `<option value="${esc(x.producto)}">${esc(x.producto)} (${num(x.cantidad)})</option>`).join("")}</select></label><label>Cantidad<input name="cantidad" type="number" min="0.01" step="0.01" required></label><label>Precio unitario<input name="precio_unitario" type="number" min="1" required></label>`, "sale-form")}<section class="panel"><header class="panel-header"><h3>Ventas registradas</h3></header>${tbl(
    ["Cliente", "Producto", "Cantidad", "Total"],
    a.map(
      (x) =>
        `<tr><td>${esc(x.cliente)}</td><td>${esc(x.producto)}</td><td>${num(x.cantidad)}</td><td>${money(x.total)}</td></tr>`,
    ),
  )}</section>`;
}
async function operators() {
  let [a, o] = await Promise.all([
    api("/api/produccion/operarios"),
    api("/api/produccion"),
  ]);
  app.innerHTML = `<div class="page-intro"><div><h2>Operarios</h2><p>Disponibilidad basada en órdenes activas.</p></div></div><section class="panel"><header class="panel-header"><h3>Equipo de producción</h3></header>${tbl(
    ["Nombre", "Usuario", "Órdenes activas"],
    a.map(
      (x) =>
        `<tr><td>${esc(x.nombre)}</td><td>${esc(x.usuario)}</td><td>${o.filter((z) => z.responsable_id === x.id && ["pendiente", "en_proceso"].includes(z.estado)).length}</td></tr>`,
    ),
  )}</section>`;
}
async function reports() {
  let [p, v, i] = await Promise.all([
    api("/api/reportes/produccion"),
    api("/api/reportes/ventas"),
    api("/api/reportes/inventario"),
  ]);
  app.innerHTML = `<div class="page-intro"><div><h2>Reportes</h2><p>Consolidado actual de la operación.</p></div><button class="primary-action" data-print>Imprimir / guardar PDF</button></div><section class="stats-grid"><article class="stat-card"><div class="stat-head"><span>Ventas acumuladas</span></div><strong>${money(v.resumen.total_vendido)}</strong><small>${v.resumen.numero_ventas} ventas</small></article><article class="stat-card"><div class="stat-head"><span>Productos en inventario</span></div><strong>${i.length}</strong><small>Referencias disponibles</small></article></section><section class="panel" style="margin-top:18px"><header class="panel-header"><h3>Producción por estado</h3></header>${tbl(
    ["Estado", "Órdenes", "Meta"],
    p.map(
      (x) =>
        `<tr><td>${badge(x.estado)}</td><td>${num(x.total)}</td><td>${num(x.cantidad_total)}</td></tr>`,
    ),
  )}</section>`;
}
async function render() {
  try {
    document
      .querySelectorAll("[data-view]")
      .forEach((a) => a.classList.toggle("active", a.dataset.view === view));
    let f = {
      inicio: home,
      usuarios: users,
      materia: materials,
      inventario: inventory,
      produccion: production,
      asignar: assign,
      operarios: operators,
      tareas: production,
      registrar: advance,
      historial: production,
      ventas: sales,
      reportes: reports,
    };
    await (f[view] || home)();
  } catch (e) {
    app.innerHTML = `<section class="panel empty"><h2>No se pudo cargar esta sección</h2><p>${esc(e.message)}</p><button class="primary-action" data-retry>Reintentar</button></section>`;
  }
}
app.addEventListener("click", async (e) => {
  let g = e.target.closest("[data-go]");
  if (g) {
    view = g.dataset.go;
    location.hash = view;
    return render();
  }
  if (e.target.matches("[data-print]")) return print();
  if (e.target.matches("[data-retry]")) return render();
  let b = e.target.closest("[data-toggle]");
  if (b)
    try {
      await api(`/api/usuarios/${b.dataset.toggle}`, {
        method: "PUT",
        body: JSON.stringify({ activo: Number(b.dataset.active) }),
      });
      toast("Estado actualizado.");
      render();
    } catch (x) {
      toast(x.message);
    }
});
app.addEventListener("change", async (e) => {
  if (e.target.matches(".state-select"))
    try {
      await api(`/api/produccion/${e.target.dataset.order}/estado`, {
        method: "PUT",
        body: JSON.stringify({ estado: e.target.value }),
      });
      toast("Estado actualizado.");
      render();
    } catch (x) {
      toast(x.message);
    }
});
app.addEventListener("submit", async (e) => {
  let f = e.target;
  if (!f.matches("form")) return;
  e.preventDefault();
  const formId = f.getAttribute("id");
  let d = Object.fromEntries(new FormData(f));
  try {
    if (formId === "user-form")
      await api("/api/usuarios", { method: "POST", body: JSON.stringify(d) });
    if (formId === "material-form")
      await api("/api/materia-prima", {
        method: "POST",
        body: JSON.stringify(d),
      });
    if (formId === "inventory-form")
      await api("/api/inventario", { method: "POST", body: JSON.stringify(d) });
    if (formId === "production-form")
      await api("/api/produccion", { method: "POST", body: JSON.stringify(d) });
    if (formId === "advance-form") {
      let id = d.id;
      delete d.id;
      await api(`/api/produccion/${id}/avance`, {
        method: "POST",
        body: JSON.stringify(d),
      });
    }
    if (formId === "sale-form")
      await api("/api/ventas", { method: "POST", body: JSON.stringify(d) });
    toast("Registro guardado correctamente.");
    render();
  } catch (x) {
    toast(x.message);
  }
});
addEventListener("hashchange", () => {
  view = location.hash.slice(1) || "inicio";
  render();
});
render();
