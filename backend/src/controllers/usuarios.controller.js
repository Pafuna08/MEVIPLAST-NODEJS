const usuariosService = require("../services/usuarios.service");

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
    const { nombre, usuario, password, rol } = req.body;
    if (!nombre || !usuario || !password || !rol) {
      return res.status(400).json({ mensaje: "nombre, usuario, password y rol son obligatorios" });
    }
    const nuevo = await usuariosService.crear({ nombre, usuario, password, rol }, req.usuario.id);
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ mensaje: "Error al crear usuario" });
  }
}

async function actualizar(req, res) {
  try {
    const { nombre, rol, activo } = req.body;
    const actualizado = await usuariosService.actualizar(req.params.id, { nombre, rol, activo }, req.usuario.id);
    res.json(actualizado);
  } catch (error) {
    console.error(error);
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
