# Diagrama entidad-relación

Fuente: [`../../backend/sql/schema.sql`](../../backend/sql/schema.sql). GitHub dibuja el diagrama a partir del bloque Mermaid; para editarlo se modifica el texto. La prueba `backend/tests/er.test.js` falla si `schema.sql` tiene una tabla o una clave foránea que no aparece aquí.

Notación: `PK` clave primaria, `FK` clave foránea, `UK` valor único. `||` exactamente uno, `|o` cero o uno (la clave foránea admite NULL), `o{` cero o muchos. La etiqueta de cada relación es la columna de la clave foránea y su regla al borrar.

```mermaid
erDiagram
    usuarios {
        INT id PK
        VARCHAR nombre
        VARCHAR usuario UK
        VARCHAR correo UK "opcional en cuentas antiguas"
        VARCHAR password_hash "bcrypt"
        ENUM rol "admin, supervisor, operario, vendedor, almacenista"
        TINYINT activo
        INT intentos_fallidos
        DATETIME bloqueado_hasta
        DATETIME creado_en
    }
    tokens_recuperacion {
        INT id PK
        INT usuario_id FK
        CHAR token_hash UK "SHA-256"
        DATETIME expira_en
        DATETIME usado_en
        DATETIME creado_en
    }
    auditoria {
        INT id PK
        INT usuario_id FK
        VARCHAR accion
        VARCHAR tabla_afectada
        VARCHAR detalle
        DATETIME fecha
    }
    materia_prima {
        INT id PK
        VARCHAR nombre
        VARCHAR tipo "PEBD, PEAD o PP"
        VARCHAR medida
        VARCHAR calibre
        VARCHAR color
        DECIMAL peso_rollo
        DECIMAL cantidad "kg; cambia solo con movimientos"
        VARCHAR unidad
        VARCHAR proveedor
        DECIMAL stock_minimo
        DATETIME fecha_ingreso
    }
    produccion {
        INT id PK
        VARCHAR producto
        DECIMAL cantidad "meta"
        INT materia_prima_id FK
        INT supervisor_id FK
        INT responsable_id FK
        ENUM estado "pendiente, en_proceso, finalizado, cancelado"
        ENUM prioridad "baja, media, alta"
        DECIMAL cantidad_producida
        VARCHAR lote
        VARCHAR observaciones
        DATETIME fecha_inicio
        DATETIME fecha_fin
    }
    plantillas_produccion {
        INT id PK
        VARCHAR producto UK
        DECIMAL cantidad
        INT materia_prima_id FK
        ENUM prioridad
        INT creado_por FK
        DATETIME creado_en
    }
    inventario {
        INT id PK
        VARCHAR producto
        VARCHAR familia UK "UK compuesta: familia, medida, calibre, color"
        VARCHAR medida UK
        VARCHAR calibre UK
        VARCHAR color UK
        DECIMAL cantidad "unidades"
        VARCHAR ubicacion
        DATETIME actualizado_en
    }
    ventas {
        INT id PK
        VARCHAR cliente
        VARCHAR producto
        DECIMAL cantidad "unidades"
        DECIMAL precio_unitario
        INT inventario_id FK
        INT cantidad_paquetes
        INT unidades_paquete "1 a 500"
        DECIMAL precio_paquete
        DECIMAL total "generada: paquetes x precio"
        INT usuario_id FK
        DATETIME fecha
    }
    movimientos_materia_prima {
        INT id PK
        INT materia_prima_id FK
        INT usuario_id FK
        INT produccion_id FK
        ENUM tipo "compra, ajuste_entrada, ajuste_salida, consumo_produccion"
        DECIMAL cantidad
        VARCHAR observaciones
        DATETIME fecha
    }
    movimientos_inventario {
        INT id PK
        INT inventario_id FK
        INT usuario_id FK
        INT produccion_id FK
        INT venta_id FK
        ENUM tipo "saldo_inicial, ingreso_manual, produccion, salida_manual, venta"
        DECIMAL cantidad
        VARCHAR observaciones
        DATETIME fecha
    }

    usuarios ||--o{ tokens_recuperacion : "usuario_id, CASCADE"
    usuarios |o--o{ auditoria : "usuario_id, SET NULL"
    usuarios |o--o{ produccion : "supervisor_id, SET NULL"
    usuarios |o--o{ produccion : "responsable_id, SET NULL"
    usuarios |o--o{ plantillas_produccion : "creado_por, SET NULL"
    usuarios |o--o{ ventas : "usuario_id, SET NULL"
    usuarios |o--o{ movimientos_materia_prima : "usuario_id, SET NULL"
    usuarios |o--o{ movimientos_inventario : "usuario_id, SET NULL"
    materia_prima |o--o{ produccion : "materia_prima_id, SET NULL"
    materia_prima |o--o{ plantillas_produccion : "materia_prima_id, SET NULL"
    materia_prima ||--o{ movimientos_materia_prima : "materia_prima_id, RESTRICT"
    produccion |o--o{ movimientos_materia_prima : "produccion_id, SET NULL"
    produccion |o--o{ movimientos_inventario : "produccion_id, SET NULL"
    inventario |o--o{ ventas : "inventario_id, SET NULL"
    inventario ||--o{ movimientos_inventario : "inventario_id, RESTRICT"
    ventas |o--o{ movimientos_inventario : "venta_id, SET NULL"
```

## Lectura rápida

- **Ledgers (ADR-003):** cada cambio de `materia_prima.cantidad` o `inventario.cantidad` deja una fila en su tabla de movimientos, en la misma transacción. Con `RESTRICT` no se puede borrar una bobina o variante que tenga movimientos.
- **Trazabilidad:** un consumo de bobina apunta a su orden (`produccion_id`); un avance de producción y una venta apuntan a su orden o venta en `movimientos_inventario`.
- **Usuarios:** al borrar un usuario, su historial se conserva con `usuario_id` en NULL; por eso se recomienda desactivarlo en lugar de borrarlo.
