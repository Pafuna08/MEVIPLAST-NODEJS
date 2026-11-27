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
  BREVO[(API de Brevo<br/>solo en Render)]
  ADM & SUP & OPE & VEN & ALM -->|navegador, HTTP| SYS
  SYS -->|correo de recuperación, red local| SMTP
  SYS -.->|correo de recuperación, demostración en Render| BREVO
```

## DIA-002 · Contenedores

```mermaid
flowchart LR
  NAV[Navegador del usuario]
  subgraph SRV[Equipo servidor · Node.js 22]
    SPA[Sitio, login, recuperación y panel<br/>React 19 + Vite 6, solo frontend/dist]
    API[API REST<br/>Express 4, /api]
    DOCS[Swagger UI<br/>/api-docs]
  end
  DB[(MySQL / MariaDB<br/>meviplast_db)]
  SMTP[(Servidor SMTP)]
  BREVO[(API de Brevo)]
  NAV -->|HTTP| SPA
  NAV -->|HTTP| DOCS
  SPA -->|JSON + Bearer JWT| API
  DOCS -->|Try it out con el token| API
  API -->|mysql2, transacciones| DB
  API -->|nodemailer, sin BREVO_API_KEY| SMTP
  API -->|HTTPS, con BREVO_API_KEY| BREVO
```

## DIA-003 · Componentes de la API

```mermaid
flowchart LR
  APP[app.js<br/>cabeceras, CORS, JSON, sanitizar,<br/>validarLongitudes, registro de peticiones, errores]
  AUTHMW[auth.middleware<br/>verificarToken, verificarRol]
  PUB[utils/apiDocs + utils/frontend<br/>Swagger UI en /api-docs y solo frontend/dist]
  subgraph R[Rutas y controladores]
    RA[auth + perfil]
    RU[usuarios]
    RL[lineas]
    RP[produccion]
    RM[materia-prima]
    RI[inventario]
    RV[ventas]
    RR[reportes]
  end
  subgraph S[Servicios con las reglas RN]
    SA[auth.service<br/>SMTP o Brevo]
    SPF[perfil.service]
    SU[usuarios.service]
    SL[lineas.service]
    SP[produccion.service]
    SM[materiaPrima.service]
    SI[inventario.service]
    SV[ventas.service + comprobantePdf.service]
    SR[reportes.service + reportesExcel.service + reportesPdf.service]
    SAA[archivoAuditoria.service]
  end
  UT[utils: logger, auditoria, sanitizar, numeros, variantes]
  CFG[config: conexion, database, initDb, schema, archivarAuditoria]
  APP --> AUTHMW --> R
  APP --> PUB
  RA --> SA
  RA --> SPF
  RU --> SU
  RL --> SL
  RP --> SP
  RM --> SM
  RI --> SI
  RV --> SV
  RR --> SR
  RR --> SAA
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
  V->>P: Agrega uno o varios productos y confirma
  P->>A: POST /api/ventas con items (Bearer JWT)
  A->>A: Sanitiza y valida largos
  A->>M: verificarToken y verificarRol(admin, vendedor)
  M->>S: registrar(datos, usuario)
  S->>S: Valida RN-018, CR-018 y CR-022 (hasta 20 productos sin repetir, paquetes de 50, 100 o 500 unidades, hasta 1 000 paquetes, total hasta $100 000 000)
  S->>D: BEGIN y SELECT inventario de todas las variantes FOR UPDATE (en orden de id)
  alt Stock suficiente en todos los productos
    S->>D: INSERT ventas (encabezado y total)
    S->>D: Por producto: INSERT ventas_detalle, UPDATE inventario, INSERT movimientos_inventario
    S->>D: COMMIT
    S-->>P: 201 con la venta (comprobante)
  else Stock insuficiente en algún producto
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
  subgraph NUBE[Demostración en internet · CR-023]
    RENDER[Render<br/>servicio web meviplast, HTTPS]
    AIVEN[(Aiven<br/>MySQL 8.4 con TLS)]
  end
  BREVO[(API de Brevo<br/>api.brevo.com, HTTPS)]
  INSTR[Instructor y equipo] -->|https://meviplast.onrender.com| RENDER
  RENDER -->|DB_SSL| AIVEN
  RENDER -->|BREVO_API_KEY: el plan gratuito bloquea SMTP| BREVO
  GH -.->|Auto-Deploy de cada fusión en develop| RENDER
```

La operación de la empresa sigue en su red local (EXC-02); la demostración en Render es para el instructor y el equipo.
