const usuariosService = require("../services/usuarios.service");
const ROLES_VALIDOS = [
  "admin",
  "supervisor",
  "operario",
  "vendedor",
  "almacenista",
];

async function listar(req, res) {
  try {
    const usuarios = await usuariosService.listar();
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al listar usuarios" });
  }
}

async function crear(req, res) {
  try {
    const { nombre, usuario, correo, password, rol } = req.body;
    if (!nombre || !usuario || !correo || !password || !rol) {
      return res
        .status(400)
        .json({
          mensaje: "nombre, usuario, correo, password y rol son obligatorios",
        });
    }
    const correoNormalizado = correo.trim().toLowerCase();
    if (
      correoNormalizado.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado)
    ) {
      return res
        .status(400)
        .json({ mensaje: "El correo electrónico no es válido" });
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return res
        .status(400)
        .json({ mensaje: `rol debe ser uno de: ${ROLES_VALIDOS.join(", ")}` });
    }
    const nuevo = await usuariosService.crear(
      { nombre, usuario, correo: correoNormalizado, password, rol },
      req.usuario.id,
    );
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("uq_usuarios_correo")) {
        return res
          .status(409)
          .json({ mensaje: "El correo electrónico ya está registrado" });
      }
      return res
        .status(409)
        .json({ mensaje: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ mensaje: "Error al crear usuario" });
  }
}

async function actualizar(req, res) {
  try {
    const { nombre, correo, rol, activo } = req.body;
    const correoNormalizado =
      correo === undefined ? undefined : String(correo).trim().toLowerCase();
    if (
      correoNormalizado !== undefined &&
      (correoNormalizado.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado))
    ) {
      return res
        .status(400)
        .json({ mensaje: "El correo electrónico no es válido" });
    }
    if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
      return res
        .status(400)
        .json({ mensaje: `rol debe ser uno de: ${ROLES_VALIDOS.join(", ")}` });
    }
    if (activo !== undefined && ![0, 1, false, true].includes(activo)) {
      return res.status(400).json({ mensaje: "activo debe ser 0 o 1" });
    }
    const actualizado = await usuariosService.actualizar(
      req.params.id,
      { nombre, correo: correoNormalizado, rol, activo },
      req.usuario.id,
    );
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ mensaje: "El correo electrónico ya está registrado" });
    }
    res.status(500).json({ mensaje: "Error al actualizar usuario" });
  }
}

async function eliminar(req, res) {
  try {
    await usuariosService.eliminar(req.params.id, req.usuario.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al eliminar usuario" });
  }
}

module.exports = { listar, crear, actualizar, eliminar };
