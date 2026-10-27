# ADR-003: registrar cada cambio de stock como un movimiento dentro de una transacción

- Estado: Aceptado
- Fecha de la decisión: 2026-10-21; registrada el 2026-10-27
- Trazabilidad: RF-015, RF-016, RF-018, RF-019, RF-021, RN-015 (sin saldo negativo), commit `a969f2c` (migración `20261020_roles_and_stock_movements.sql`)

## Contexto

Las tablas `materia_prima` e `inventario` guardan el saldo actual de cada material y producto. Al principio, compras, consumos de producción, ventas y ajustes solo modificaban ese saldo. Eso dejaba dos problemas:

- No quedaba registro de quién movió el stock, cuándo ni por qué. El almacenista y el administrador no podían revisar el historial, y los reportes por periodo no tenían de dónde calcular entradas y salidas.
- Dos usuarios que vendían o consumían el mismo producto al mismo tiempo podían leer el mismo saldo y dejarlo incorrecto o negativo.

Con los perfiles de vendedor y almacenista (sprint 3), aumentaron los usuarios que mueven stock a la vez.

## Opciones

1. Solo actualizar el saldo y registrar el cambio en la tabla de auditoría general.
2. Calcular el saldo siempre sumando los movimientos, sin guardar el saldo.
3. Guardar el saldo y, además, un registro de movimientos (ledger) por tabla, actualizando ambos en la misma transacción con bloqueo de fila.

## Decisión

Opción 3. Se crearon `movimientos_materia_prima` y `movimientos_inventario`. Cada movimiento tiene un tipo (`compra`, `consumo_produccion`, `venta`, `produccion`, ajustes, `saldo_inicial`), una cantidad, el usuario y, cuando aplica, la orden de producción o la venta que lo originó.

Todo cambio de stock en `backend/src/services` sigue el mismo patrón:

1. `beginTransaction()`.
2. `SELECT … FOR UPDATE` de la fila del saldo, que bloquea a cualquier otra operación sobre ese producto hasta terminar.
3. Validar que el saldo alcanza (no se permite stock negativo).
4. Actualizar el saldo e insertar el movimiento.
5. `commit()`; ante cualquier error, `rollback()`: o se guardan ambos cambios o ninguno.

La migración cargó un movimiento `saldo_inicial` por cada saldo existente, para que el historial empiece cuadrado.

## Consecuencias

- El historial de movimientos y los reportes por periodo salen del ledger (`reportes.service.js`).
- Las ventas y los consumos simultáneos no pueden dejar el saldo negativo ni perder actualizaciones; lo cubren las pruebas de `inventario`, `materiaPrima`, `ventas` y `production`, y la suite E2E contra MySQL.
- Los movimientos no se editan ni se borran desde la aplicación; una corrección se hace con un ajuste nuevo. Las claves foráneas con `ON DELETE RESTRICT` impiden borrar un material o producto que tenga movimientos.
- El saldo se guarda dos veces (el saldo y la suma de movimientos). Si alguien modifica la base a mano sin pasar por la API, pueden quedar distintos. Las migraciones requieren respaldo y autorización explícita (ver `docs/operations/backup-restore.md`).
- Cada servicio nuevo que mueva stock debe seguir este patrón; conviene revisarlo en el PR.
