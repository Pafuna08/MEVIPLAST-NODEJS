export async function api(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  // null si el cuerpo no se pudo leer (respuesta cortada o una navegación que la interrumpió)
  const data = response.status === 204 ? null : await response.json().catch(() => null);

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
  // Una respuesta correcta sin datos legibles es un error, no una lista vacía: la vista muestra el aviso
  if (response.status !== 204 && data === null) {
    throw new Error("No se pudo leer la respuesta del servidor. Intenta de nuevo.");
  }
  return data;
}

// HU-004: filtros del historial de producción que viajan en la dirección (?operario_id=&producto=)
export function filtrosReporte(params = new URLSearchParams(window.location.search)) {
  if (params.get("reporte") !== "produccion") return "";
  return ["operario_id", "producto"]
    .filter((clave) => params.get(clave))
    .map((clave) => `&${clave}=${encodeURIComponent(params.get(clave))}`)
    .join("");
}

export async function loadView(view, role, token) {
  if (view === "reporte-detalle") {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get("reporte");
    const periodo = params.get("periodo");
    if (tipo === "inventario") {
      return api("/api/reportes/inventario", token);
    }
    if (tipo === "rendimiento") {
      return api(`/api/reportes/rendimiento?periodo=${encodeURIComponent(periodo)}`, token);
    }
    const recurso = tipo === "produccion" ? "produccion" : "ventas";
    return api(`/api/reportes/${recurso}/detalle?periodo=${encodeURIComponent(periodo)}${filtrosReporte(params)}`, token);
  }
  if (view === "inicio") {
    const orders = await api("/api/produccion", token);
    if (role.apiRole === "operario") {
      return { orders, inventory: [] };
    }
    // CR-021: solo el administrador ve el resumen de ventas
    // Rediseño: «Requiere atención» avisa de las materias primas en stock bajo; si la consulta
    // falla, el Inicio se muestra igual, sin ese aviso
    // El administrador gestiona la orden desde el Inicio (editar o asignar): materiales y operarios, como en Producción
    const isAdmin = role.apiRole === "admin";
    const [inventory, sales, lowStock, materials, operators] = await Promise.all([
      api("/api/inventario", token),
      isAdmin ? api("/api/reportes/ventas", token) : null,
      ["admin", "supervisor", "almacenista"].includes(role.apiRole) ? api("/api/materia-prima/bajo-stock", token).catch(() => []) : [],
      isAdmin ? api("/api/materia-prima", token).catch(() => []) : [],
      isAdmin ? api("/api/produccion/operarios", token).catch(() => []) : [],
    ]);
    return { orders, inventory, sales, lowStock, materials, operators };
  }
  if (view === "usuarios") return api("/api/usuarios", token);
  // CR-028: «Mi perfil» de cualquier rol
  if (view === "perfil") return api("/api/auth/perfil", token);
  if (view === "materia") {
    // Las órdenes solo hacen falta para el consumo: aquí lo registra el administrador
    // (CR-026: el supervisor ya no entra a esta vista; registra el consumo desde Seguimiento)
    const canConsume = role.apiRole === "admin";
    const [materials, movements, orders] = await Promise.all([
      api("/api/materia-prima", token),
      api("/api/materia-prima/movimientos", token),
      canConsume ? api("/api/produccion", token) : [],
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
      // Los operarios son para asignar cuando falta el supervisor (CR-014)
      const [materials, operators, templates] = await Promise.all([
        api("/api/materia-prima", token),
        api("/api/produccion/operarios", token),
        api("/api/produccion/plantillas", token),
      ]);
      return { orders, materials, operators, templates };
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
    // Las órdenes, para «Órdenes por asignar» (las pendientes sin operario) y la carga de cada operario
    const [operators, materials, orders] = await Promise.all([
      api("/api/produccion/operarios", token),
      api("/api/materia-prima", token),
      api("/api/produccion", token),
    ]);
    return { operators, materials, orders };
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
    return {};
  }
  if (view === "auditoria") {
    // La vista consulta con sus filtros (CR-016); no se precarga nada
    return {};
  }
  return null;
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem("meviplastSession") || "null");
  } catch {
    return null;
  }
}
