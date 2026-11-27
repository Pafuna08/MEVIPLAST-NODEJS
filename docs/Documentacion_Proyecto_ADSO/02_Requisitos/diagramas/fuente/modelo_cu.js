// Modelo de casos de uso de MEVIPLAST, tomado del código de develop (27/11/2026):
//  - actores y permisos: verificarRol(...) en backend/src/routes/*.routes.js (los mismos de x-roles en docs/api/openapi.json)
//  - vistas de cada rol: roleViews en frontend/src/comun/constantes.js
// Las asociaciones actor–caso siguen los permisos del servidor (criterio del numeral 10 del Backlog, MEV-DOC-04).

const EPICAS = {
  "EP-004": { nombre: "Seguridad y control de acceso", relleno: "#E8F0FB", borde: "#2F5D9E" },
  "EP-001": { nombre: "Gestión de producción", relleno: "#E6F4EC", borde: "#2E7D57" },
  "EP-002": { nombre: "Gestión de materias primas", relleno: "#FFF2DF", borde: "#A8640A" },
  "EP-003": { nombre: "Gestión de inventario y ventas", relleno: "#F2EAFA", borde: "#7446A3" },
  "EP-005": { nombre: "Reportes y seguimiento operacional", relleno: "#E4F3F5", borde: "#1D7380" },
};

const ACTORES = {
  usuario: { nombre: "Usuario", nota: "cualquier rol con cuenta" },
  admin: { nombre: "Administrador", nota: "rol admin" },
  supervisor: { nombre: "Supervisor", nota: "rol supervisor" },
  operario: { nombre: "Operario", nota: "rol operario" },
  vendedor: { nombre: "Vendedor", nota: "rol vendedor" },
  almacenista: { nombre: "Almacenista", nota: "rol almacenista" },
  correo: { nombre: "Servicio de correo", nota: "Brevo (Render) · SMTP (red local)", externo: true },
};

// Casos de uso. actores: asociaciones del diagrama; izq/der: lado en el diagrama propio del caso.
// Los que no tienen código CU (sin), son funciones implementadas que el catálogo no numera.
const CASOS = [
  { id: "CU-001", epica: "EP-004", nombre: "Iniciar sesión", actores: ["usuario"],
    hu: "HU-016", rf: "RF-001", rn: "RN-001, RN-024", panel: "Inicio de sesión (/login.html)",
    api: ["POST /api/auth/login (público)"], resultado: "Token JWT de 8 horas y el panel de su rol." },
  { id: "CU-002", epica: "EP-004", nombre: "Gestionar usuarios, roles y desbloqueo", actores: ["admin"],
    hu: "HU-017", rf: "RF-002", rn: "RN-003, RN-004 (permisos fijos por rol: CR-025)", panel: "Usuarios",
    api: ["GET, POST /api/usuarios", "PUT, DELETE /api/usuarios/{id}", "PUT /api/usuarios/{id}/desbloquear"],
    resultado: "Cuentas con su rol; siempre queda un administrador activo (DEF-021)." },
  { id: "CU-003", epica: "EP-004", nombre: "Recuperar contraseña o usuario", actores: ["usuario"], der: ["correo"],
    hu: "HU-018", rf: "RF-003", rn: "RN-002", panel: "«¿Olvidaste tu usuario o contraseña?» (/recuperar.html)",
    api: ["POST /api/auth/recuperar-password", "POST /api/auth/recordar-usuario", "POST /api/auth/restablecer-password"],
    resultado: "Enlace de un solo uso (30 min) o el usuario en su correo; restablecer también desbloquea." },
  // Extensión de CU-001 sin actor propio: la dispara el fallo al iniciar sesión; el administrador desbloquea en CU-002
  { id: "CU-004", epica: "EP-004", nombre: "Bloquear cuenta por intentos fallidos", actores: [],
    hu: "HU-019", rf: "RF-004", rn: "RN-024", panel: "Inicio de sesión (aviso de bloqueo); Usuarios → Desbloquear (CU-002)",
    api: ["POST /api/auth/login → 423 mientras dure el bloqueo", "PUT /api/usuarios/{id}/desbloquear (CU-002)"],
    resultado: "5 fallos seguidos bloquean la cuenta 15 minutos (configurable); el administrador puede desbloquearla antes (CU-002)." },
  { id: "CU-005", epica: "EP-004", nombre: "Cerrar sesión", actores: ["usuario"],
    hu: "HU-020", rf: "RF-005", rn: "—", panel: "Avatar → Cerrar sesión",
    api: ["POST /api/auth/logout"], resultado: "El token queda revocado en el servidor: el mismo token responde 401." },
  { sin: "CR-028", id: "PERFIL", epica: "EP-004", nombre: "Gestionar mi perfil", actores: ["usuario"] },

  { id: "CU-006", epica: "EP-001", nombre: "Asignar tareas de producción", actores: ["admin", "supervisor"], der: ["operario"],
    hu: "HU-001", rf: "RF-007, RF-008", rn: "RN-005, RN-006, RN-012, RN-026 (CR-014)",
    panel: "Producción → «+ Nueva orden» (administrador); Asignar tareas → ventana con la carga de cada operario (supervisor)",
    api: ["POST /api/produccion", "PUT /api/produccion/{id}/asignar", "GET /api/produccion/operarios"],
    resultado: "La orden del administrador queda pendiente para los supervisores; la toma el que le asigna un operario." },
  { sin: "RF-013", id: "PLANTILLAS", epica: "EP-001", nombre: "Gestionar plantillas de órdenes", actores: ["admin"] },
  { id: "CU-007", epica: "EP-001", nombre: "Consultar tareas asignadas", actores: ["operario"],
    hu: "HU-002", rf: "RF-009", rn: "RN-007, RN-008 (CR-013)", panel: "Mis tareas",
    api: ["GET /api/produccion (solo sus órdenes)", "PUT /api/produccion/{id}/estado (iniciar)"],
    resultado: "Ve sus órdenes por prioridad y las inicia; nadie finaliza a mano (CR-013)." },
  { id: "CU-008", epica: "EP-001", nombre: "Registrar producción realizada", actores: ["operario"],
    hu: "HU-003", rf: "RF-010, RF-011", rn: "RN-009, RN-010, RN-017", panel: "Registrar producción",
    api: ["POST /api/produccion/{id}/avance"],
    resultado: "Avance sumado e inventario aumentado en la misma transacción; la orden se finaliza al completar la meta." },
  { sin: "RN-017", id: "INV_PROD", epica: "EP-001", nombre: "Aumentar inventario terminado", actores: [] },
  { id: "CU-009", epica: "EP-001", nombre: "Consultar historial de producción", actores: ["admin", "supervisor"], der: ["operario"],
    hu: "HU-004", rf: "RF-024, RF-009", rn: "—", panel: "Reportes → producción con filtros por operario y producto; operario: Mi historial",
    api: ["GET /api/reportes/produccion/detalle", "GET /api/produccion/mis-registros (operario)"],
    resultado: "Producción del periodo filtrada por operario y producto; el operario ve solo sus avances." },
  { id: "CU-010", epica: "EP-001", nombre: "Modificar órdenes de producción", actores: ["admin", "supervisor"],
    hu: "HU-005", rf: "RF-012, RF-011", rn: "RN-011 (CR-013)", panel: "Producción (administrador) y Seguimiento (supervisor)",
    api: ["PUT /api/produccion/{id}", "PUT /api/produccion/{id}/estado (cancelar)", "DELETE /api/produccion/{id} (administrador)"],
    resultado: "Solo se editan órdenes pendientes sin avance; las demás se cancelan." },

  { id: "CU-011", epica: "EP-002", nombre: "Registrar materias primas", actores: ["admin"], der: ["almacenista"],
    hu: "HU-006", rf: "RF-014", rn: "RN-025 (CR-027)", panel: "Materias primas → Registrar material",
    api: ["POST, DELETE /api/materia-prima (administrador)", "PUT /api/materia-prima/{id} (administrador y almacenista)"],
    resultado: "Bobina por material, tamaño del rollo con su unidad, calibre y color; su peso es la existencia inicial." },
  { id: "CU-015", epica: "EP-002", nombre: "Registrar compras de materiales", actores: ["admin"], der: ["almacenista"],
    hu: "HU-010", rf: "RF-015", rn: "RN-014", panel: "Materias primas → Registrar movimiento → Compra (costo y factura opcionales)",
    api: ["POST /api/materia-prima/movimientos (tipo compra)"], resultado: "Existencia aumentada y movimiento con costo y factura." },
  { id: "CU-012", epica: "EP-002", nombre: "Actualizar cantidades (ajustes)", actores: ["admin"], der: ["almacenista"],
    hu: "HU-007", rf: "RF-015", rn: "RN-014, RN-015", panel: "Materias primas → Registrar movimiento → Ajuste",
    api: ["POST /api/materia-prima/movimientos (ajuste_entrada o ajuste_salida)"], resultado: "Existencia corregida sin quedar negativa, con su movimiento." },
  { id: "CU-014", epica: "EP-002", nombre: "Consultar disponibilidad y bajo stock", actores: ["admin", "supervisor"], der: ["almacenista"],
    hu: "HU-009", rf: "RF-017", rn: "RN-022", panel: "Materias primas; Inicio → «Requiere atención»",
    api: ["GET /api/materia-prima", "GET /api/materia-prima/bajo-stock"], resultado: "Existencias y bobinas con cantidad menor o igual al mínimo." },
  { id: "CU-013", epica: "EP-002", nombre: "Registrar consumo en una orden", actores: ["supervisor", "admin"],
    hu: "HU-008", rf: "RF-016", rn: "RN-015, RN-016 (CR-026)",
    panel: "Seguimiento → «Consumo» en la orden (supervisor); Materias primas → Registrar movimiento (administrador)",
    api: ["POST /api/materia-prima/movimientos (tipo consumo_produccion)"], resultado: "Existencia descontada y consumo ligado a la orden activa que usa esa bobina." },

  { id: "CU-016", epica: "EP-003", nombre: "Registrar productos terminados (ingresos y salidas)", actores: ["admin", "supervisor"], der: ["almacenista"],
    hu: "HU-011", rf: "RF-018", rn: "RN-015", panel: "Inventario (administrador y almacenista)",
    api: ["POST /api/inventario (ingreso)", "POST /api/inventario/{id}/salida"],
    resultado: "Existencia de la variante actualizada, sin saldo negativo, con su movimiento.",
    aviso: "El supervisor tiene este permiso en la API, pero el panel no le muestra la vista de Inventario." },
  { id: "CU-017", epica: "EP-003", nombre: "Consultar inventario disponible", actores: ["admin", "supervisor"], der: ["almacenista", "vendedor"],
    hu: "HU-012", rf: "RF-019", rn: "—", panel: "Inventario (administrador y almacenista); Ventas (vendedor); reporte de inventario (supervisor)",
    api: ["GET /api/inventario", "GET /api/inventario/movimientos (sin el vendedor)"], resultado: "Existencias por variante; el vendedor solo consulta." },
  { id: "CU-018", epica: "EP-003", nombre: "Registrar ventas por paquetes", actores: ["admin"], der: ["vendedor"],
    hu: "HU-013, HU-014", rf: "RF-020, RF-021", rn: "RN-018, RN-019 (CR-018, CR-022)", panel: "Ventas",
    api: ["POST /api/ventas"], resultado: "Venta con uno a 20 productos y stock descontado en una sola transacción." },
  { id: "CU-019", epica: "EP-003", nombre: "Actualizar stock automáticamente", actores: [],
    hu: "HU-014", rf: "RF-021", rn: "RN-019", panel: "Sin pantalla propia: ocurre al registrar la venta",
    api: ["Dentro de POST /api/ventas (bloqueo de fila y una transacción)"], resultado: "Cada producto vendido descuenta su variante y deja un movimiento «venta»." },
  { sin: "RF-023", id: "COMPROBANTE", epica: "EP-003", nombre: "Generar comprobante de venta (PDF)", actores: [] },
  { sin: "HU-024", id: "HIST_VENTAS", epica: "EP-003", nombre: "Consultar historial de ventas", actores: ["admin"], der: ["vendedor"] },

  { id: "CU-020", epica: "EP-005", nombre: "Generar reporte de producción", actores: ["admin", "supervisor"],
    hu: "HU-021", rf: "RF-024", rn: "—", panel: "Reportes → Reporte de producción",
    api: ["GET /api/reportes/produccion", "GET /api/reportes/produccion/detalle"], resultado: "Órdenes y unidades del periodo, por producto y por referencia." },
  { sin: "HU-022", id: "RENDIMIENTO", epica: "EP-005", nombre: "Consultar rendimiento por operario", actores: ["admin", "supervisor"] },
  { id: "CU-022", epica: "EP-005", nombre: "Generar reporte de ventas", actores: ["admin"],
    hu: "HU-015", rf: "RF-025", rn: "— (solo el administrador: CR-021)", panel: "Reportes → Reporte de ventas",
    api: ["GET /api/reportes/ventas", "GET /api/reportes/ventas/detalle"], resultado: "Ventas del periodo por producto y por cliente, con el total." },
  { id: "CU-021", epica: "EP-005", nombre: "Generar reporte de inventario", actores: ["admin", "supervisor"],
    hu: "HU-023", rf: "RF-026", rn: "RN-022", panel: "Reportes → Reporte de inventario → Ver existencias",
    api: ["GET /api/reportes/inventario"], resultado: "Existencias de hoy de producto terminado y de materias primas, con el stock bajo." },
  { id: "CU-023", epica: "EP-005", nombre: "Exportar reportes (PDF y Excel)", actores: [],
    hu: "HU-025", rf: "RF-028", rn: "— (el de ventas, solo el administrador)", panel: "«Abrir PDF» y «Descargar Excel» en cada reporte",
    api: ["GET /api/reportes/{produccion|ventas}/detalle/pdf y /excel", "GET /api/reportes/rendimiento/pdf y /excel"],
    resultado: "El mismo reporte en PDF generado por el servidor (otra pestaña) o en Excel." },
  { sin: "RF-029", id: "BITACORA", epica: "EP-005", nombre: "Consultar bitácora de auditoría", actores: ["admin"] },
];

// include: el caso base incluye siempre al otro; extend: el caso extensor amplía al base en una condición.
// La flecha va del primero al segundo (desde la base en include; desde el extensor en extend).
const RELACIONES = [
  { de: "CU-004", a: "CU-001", tipo: "extend", condicion: "5 intentos fallidos seguidos" },
  { de: "CU-003", a: "CU-001", tipo: "extend", condicion: "«¿Olvidaste tu usuario o contraseña?»" },
  { de: "CU-008", a: "INV_PROD", tipo: "include" },
  { de: "CU-018", a: "CU-019", tipo: "include" },
  { de: "COMPROBANTE", a: "CU-018", tipo: "extend", condicion: "al guardar la venta o desde el historial" },
  { de: "CU-023", a: "CU-020", tipo: "extend", condicion: "«Abrir PDF» o «Descargar Excel»" },
  { de: "CU-023", a: "RENDIMIENTO", tipo: "extend", condicion: "«Abrir PDF» o «Descargar Excel»" },
  { de: "CU-023", a: "CU-022", tipo: "extend", condicion: "«Abrir PDF» o «Descargar Excel»" },
];

// Vistas del panel por rol (frontend/src/comun/constantes.js)
const VISTAS = {
  admin: "Inicio, Usuarios, Materias primas, Inventario, Producción, Ventas, Reportes y Auditoría",
  supervisor: "Inicio, Asignar tareas, Operarios, Seguimiento y Reportes",
  operario: "Inicio, Mis tareas, Registrar producción y Mi historial",
  vendedor: "Ventas",
  almacenista: "Materias primas e Inventario",
};

module.exports = { EPICAS, ACTORES, CASOS, RELACIONES, VISTAS };
