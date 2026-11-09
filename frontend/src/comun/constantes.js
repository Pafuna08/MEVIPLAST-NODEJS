// RN-025: lista fija de colores, la misma de backend/src/constants/colores.js
export const productColors = ["Amarillo", "Azul", "Blanco", "Café", "Gris", "Morado", "Naranja", "Natural", "Negro", "Rojo", "Rosado", "Transparente", "Verde"];

export const finishedProductFamilies = [
  "Adhesivo PP",
  "Adhesivo Seguridad",
  "Sencilla PP",
  "Bolsas para la basura",
  "Cargadera",
  "Troquel riñón",
];

// Mismos motivos que backend/src/constants/motivosSalida.js
export const exitReasons = [
  "Producto dañado o defectuoso",
  "Muestra para cliente",
  "Merma",
  "Devolución a producción",
  "Ajuste por conteo físico",
  "Otro",
];

export const inventoryMovementLabels = {
  saldo_inicial: "Saldo inicial",
  ingreso_manual: "Ingreso manual",
  produccion: "Producción",
  salida_manual: "Salida manual",
  venta: "Venta",
};

export const roleViews = {
  Administrador: {
    apiRole: "admin",
    title: "Panel administrativo",
    welcome: "gestiona usuarios, inventario, producción, ventas y reportes",
    initials: "AD",
    views: [
      ["inicio", "IN", "Inicio"],
      ["usuarios", "US", "Usuarios"],
      ["materia", "MP", "Materias primas"],
      ["inventario", "IT", "Inventario"],
      ["produccion", "PR", "Producción"],
      ["ventas", "VT", "Ventas"],
      ["reportes", "RP", "Reportes"],
      ["auditoria", "AU", "Auditoría"],
    ],
  },
  Supervisor: {
    apiRole: "supervisor",
    title: "Control de producción",
    welcome: "asigna y sigue las órdenes de producción",
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
    welcome: "consulta tus tareas y registra tu producción",
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
    welcome: "registra tus ventas e imprime sus comprobantes",
    initials: "VE",
    views: [["ventas", "VT", "Ventas"]],
  },
  Almacenista: {
    apiRole: "almacenista",
    title: "Control de almacén",
    welcome: "controla las materias primas y el inventario terminado",
    initials: "AL",
    views: [
      ["materia", "MP", "Materias primas"],
      ["inventario", "IT", "Inventario"],
    ],
  },
};

export const viewTitles = {
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
  auditoria: "Auditoría",
};

export const movementTypeNames = {
  compra: "Compra",
  ajuste_entrada: "Ajuste de entrada",
  ajuste_salida: "Ajuste de salida",
  consumo_produccion: "Consumo en una orden",
};

// Orden elegida en «Mis tareas» para abrir «Registrar producción» con ella seleccionada
export const ADVANCE_ORDER_KEY = "meviplastOrdenAvance";

export const historyPeriods = [["diario", "Hoy"], ["semanal", "Esta semana"], ["mensual", "Este mes"], ["anual", "Este año"]];
