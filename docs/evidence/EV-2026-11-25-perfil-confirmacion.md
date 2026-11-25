# Evidencia: Mi perfil con confirmación y el ojo en las contraseñas (2026-11-25)

- Alcance: MEVI-117, pedido del usuario al probar Mi perfil:
  - «Guardar cambios» sin cambios no debe decir «Datos actualizados»;
  - una ventana de confirmación de los cambios;
  - un ojo al lado de cada campo de contraseña para ver lo que se escribe.
- Qué cambia:
  - el panel compara con los datos guardados (con la misma normalización del servidor) y, sin cambios, avisa «No hay cambios para guardar» sin enviar nada;
  - con cambios, una ventana muestra cada dato antes → después (y avisa si cambia el usuario con el que se inicia sesión); el cambio de contraseña también se confirma;
  - el servidor responde qué datos cambiaron (`cambios`) y, si son los mismos, no escribe ni audita;
  - el ojo está en Mi perfil, en Usuarios (nuevo usuario), en el inicio de sesión (antes era la palabra «Ver») y en la recuperación de cuenta; se oculta el ojo propio de Edge para que no salgan dos.
- Responsable: Pablo E. Fuenmayor Osuna, con asistencia de Claude Code.

## EV-2026-11-25-07 · Mi perfil con confirmación

| Comprobación | Resultado |
| --- | --- |
| Lint y build del frontend; lint del backend | Sin errores |
| Pruebas unitarias (`npm test`) | 164 de 164; `perfil.test.js` con CP-116: los mismos datos con otros espacios o mayúsculas responden `cambios: []` sin UPDATE |
| E2E con MySQL | 24 de 24 |
| Navegadores | 63 de 63 flujos: Mi perfil sin cambios avisa y no abre la ventana; la ventana muestra solo nombre y correo; «Revisar» no guarda; el ojo muestra y oculta la contraseña; el cambio de contraseña se confirma; el ojo del inicio de sesión también |
| Revisión visual | Mi perfil (aviso sin cambios, ojo, ventana con antes → después) e inicio de sesión |
