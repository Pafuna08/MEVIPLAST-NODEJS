-- =========================================================
-- MEVIPLAST - Esquema de base de datos
-- Cubre las 5 epicas: EP-001 Produccion, EP-002 Materia Prima,
-- EP-003 Inventario/Ventas, EP-004 Seguridad, EP-005 Reportes
-- =========================================================

CREATE DATABASE IF NOT EXISTS meviplast_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE meviplast_db;

-- ---------------------------------------------------------
-- EP-004 Seguridad: usuarios y roles
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  correo VARCHAR(254) NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'supervisor', 'operario', 'vendedor', 'almacenista') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_correo (correo)
);

CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tokens_recuperacion_usuario (usuario_id),
  INDEX idx_tokens_recuperacion_expira (expira_en),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- EP-004 Seguridad: bitacora / auditoria de acciones
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  accion VARCHAR(100) NOT NULL,
  tabla_afectada VARCHAR(60) NOT NULL,
  detalle VARCHAR(255) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- EP-002 Materia Prima
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS materia_prima (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  medida VARCHAR(80) NULL,
  calibre VARCHAR(40) NULL,
  color VARCHAR(80) NULL,
  peso_rollo DECIMAL(10,2) NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad VARCHAR(20) NOT NULL DEFAULT 'kg',
  proveedor VARCHAR(120) NULL,
  stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- EP-001 Produccion
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS produccion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto VARCHAR(120) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  materia_prima_id INT NULL,
  supervisor_id INT NULL,
  responsable_id INT NULL,
  estado ENUM('pendiente', 'en_proceso', 'finalizado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  prioridad ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media',
  cantidad_producida DECIMAL(10,2) NOT NULL DEFAULT 0,
  lote VARCHAR(80) NULL,
  observaciones VARCHAR(500) NULL,
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin DATETIME NULL,
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE SET NULL,
  FOREIGN KEY (supervisor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS plantillas_produccion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto VARCHAR(120) NOT NULL UNIQUE,
  cantidad DECIMAL(10,2) NOT NULL,
  materia_prima_id INT NULL,
  prioridad ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media',
  creado_por INT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- EP-003 Inventario y Ventas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto VARCHAR(255) NOT NULL,
  familia VARCHAR(80) NULL,
  medida VARCHAR(40) NULL,
  calibre VARCHAR(40) NULL,
  color VARCHAR(80) NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 0,
  ubicacion VARCHAR(80) NULL,
  UNIQUE KEY uq_inventario_variante (familia, medida, calibre, color),
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(120) NOT NULL,
  producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(12,4) NOT NULL,
  inventario_id INT NULL,
  cantidad_paquetes INT NOT NULL,
  unidades_paquete INT NOT NULL,
  precio_paquete DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_paquetes * precio_paquete) STORED,
  usuario_id INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS movimientos_materia_prima (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_prima_id INT NOT NULL,
  usuario_id INT NULL,
  produccion_id INT NULL,
  tipo ENUM('compra', 'ajuste_entrada', 'ajuste_salida', 'consumo_produccion') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  observaciones VARCHAR(255) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_materia_fecha (materia_prima_id, fecha),
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (produccion_id) REFERENCES produccion(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventario_id INT NOT NULL,
  usuario_id INT NULL,
  produccion_id INT NULL,
  venta_id INT NULL,
  tipo ENUM('saldo_inicial', 'ingreso_manual', 'produccion', 'salida_manual', 'venta') NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  observaciones VARCHAR(255) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mov_inventario_fecha (inventario_id, fecha),
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (produccion_id) REFERENCES produccion(id) ON DELETE SET NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- Datos de prueba
-- Las contrasenas equivalen a las del login demo actual:
-- admin/admin123, supervisor/super123, operario/oper123
-- Los hashes se generan con bcryptjs (ver src/config/initDb.js)
-- ---------------------------------------------------------
