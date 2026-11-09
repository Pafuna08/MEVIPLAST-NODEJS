# Diagramas de arquitectura

Fuentes editables de los diagramas del documento «Arquitectura, Datos y Diseño Técnico» (MEV-DOC-06). GitHub los dibuja a partir de los bloques Mermaid; para cambiarlos se edita el texto. Describen el código de `develop`. El modelo de datos (DIA-006) está en [`../data/er.md`](../data/er.md).

## DIA-001 · Contexto

```mermaid
flowchart LR
  subgraph MEVIPLAST[Red local de MEVIPLAST]
    ADM[Administrador]
    SUP[Supervisor]
    OPE[Operario]
    VEN[Vendedor]
    ALM[Almacenista]
    SYS[[Sistema web MEVIPLAST]]
  end
  SMTP[(Servidor SMTP<br/>Gmail del proyecto)]
  ADM & SUP & OPE & VEN & ALM -->|navegador, HTTP| SYS
  SYS -->|correo de recuperación| SMTP
```

## DIA-002 · Contenedores

```mermaid
flowchart LR
  NAV[Navegador del usuario]
  subgraph SRV[Equipo servidor · Node.js 22]
    WEB[Sitio público y login<br/>HTML, CSS y JS]
    SPA[Panel de trabajo<br/>React 19 + Vite 6, frontend/dist]
    API[API REST<br/>Express 4, /api]
  end
  DB[(MySQL / MariaDB<br/>meviplast_db)]
  SMTP[(Servidor SMTP)]
  NAV -->|HTTP| WEB
  NAV -->|HTTP| SPA
  SPA -->|JSON + Bearer JWT| API
  WEB -->|JSON| API
  API -->|mysql2, transacciones| DB
  API -->|nodemailer| SMTP
```

## DIA-003 · Componentes de la API

```mermaid
flowchart TB
  APP[app.js<br/>CORS, JSON, sanitizar, validarLongitudes, registro de peticiones, errores]
  AUTHMW[auth.middleware<br/>verificarToken, verificarRol]
  subgraph R[Rutas y controladores]
    RA[auth]
    RU[usuarios]
    RP[produccion]
    RM[materia-prima]
    RI[inventario]
    RV[ventas]
    RR[reportes]
  end
  subgraph S[Servicios con las reglas RN]
    SA[auth.service]
    SU[usuarios.service]
    SP[produccion.service]
    SM[materiaPrima.service]
    SI[inventario.service]
    SV[ventas.service]
    SR[reportes.service + reportesExcel.service]
  end
  UT[utils: logger, auditoria, sanitizar]
  CFG[config: database, initDb, schema]
  APP --> AUTHMW --> R
  RA --> SA
  RU --> SU
  RP --> SP
  RM --> SM
  RI --> SI
  RV --> SV
  RR --> SR
  S --> CFG
  S --> UT
```

## DIA-004 · Secuencia: registrar una venta (RF-020, RF-021)

```mermaid
sequenceDiagram
  actor V as Vendedor
  participant P as Panel React
  participant A as API (app.js)
  participant M as auth.middleware
  participant S as ventas.service
  participant D as MySQL
  V->>P: Llena la venta y confirma
  P->>A: POST /api/ventas (Bearer JWT)
  A->>A: Sanitiza y valida largos
  A->>M: verificarToken y verificarRol(admin, vendedor)
  M->>S: registrar(datos, usuario)
  S->>S: Valida RN-018 (1 a 500 unidades por paquete)
  S->>D: BEGIN y SELECT inventario FOR UPDATE
  alt Stock suficiente
    S->>D: INSERT ventas, UPDATE inventario, INSERT movimientos_inventario
    S->>D: COMMIT
    S-->>P: 201 con la venta (comprobante)
  else Stock insuficiente
    S->>D: ROLLBACK
    S-->>P: 400 «Stock insuficiente en inventario para esta venta»
  end
```

## DIA-005 · Despliegue

```mermaid
flowchart LR
  subgraph LAN[Red local de MEVIPLAST]
    PC1[Equipos de trabajo<br/>Chrome, Edge o Firefox]
    subgraph HOST[Equipo servidor]
      NODE[Node.js 22<br/>npm start, puerto PORT 3000]
      MYSQL[(MySQL / MariaDB<br/>puerto 3306)]
      BK[Respaldo diario<br/>mysqldump]
    end
  end
  GH[GitHub<br/>repositorio y GitHub Actions]
  SMTP[(smtp.gmail.com:587)]
  PC1 -->|http://ip-servidor:3000| NODE
  NODE --> MYSQL
  MYSQL --> BK
  NODE -->|STARTTLS| SMTP
  GH -.->|git clone / pull de una versión etiquetada| HOST
```
