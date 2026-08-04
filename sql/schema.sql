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
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'supervisor', 'operario') NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  responsable_id INT NULL,
  estado ENUM('pendiente', 'en_proceso', 'finalizado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_fin DATETIME NULL,
  FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE SET NULL,
  FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- EP-003 Inventario y Ventas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto VARCHAR(120) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 0,
  ubicacion VARCHAR(80) NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(120) NOT NULL,
  producto VARCHAR(120) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  usuario_id INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- Datos de prueba
-- Las contrasenas equivalen a las del login demo actual:
-- admin/admin123, supervisor/super123, operario/oper123
-- Los hashes se generan con bcryptjs (ver src/config/initDb.js)
-- ---------------------------------------------------------
