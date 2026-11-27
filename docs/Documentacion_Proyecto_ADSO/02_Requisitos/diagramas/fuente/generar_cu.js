// Genera los diagramas de casos de uso de MEVIPLAST (SVG editable + PNG para los Word) a partir de modelo_cu.js:
//   DIA-ACT-01 actores, DIA-CU-01 general por paquetes, DIA-CU-02..06 por épica y DIA-CU-001..023 (uno por caso).
// Uso: node generar_cu.js [ruta de playwright-core]   (por defecto, la del backend del repositorio; dibuja con Microsoft Edge)
// Escribe en ../ (02_Requisitos/diagramas) y ../casos_de_uso, y deja ../diagramas_cu.json con la lista.
const fs = require("fs");
const path = require("path");
const { EPICAS, ACTORES, CASOS, RELACIONES, VISTAS } = require("./modelo_cu");

const SALIDA = path.resolve(__dirname, "..");
const SALIDA_CU = path.join(SALIDA, "casos_de_uso");
const FECHA = "27/11/2026";
const FUENTE = "Segoe UI, Arial, Helvetica, sans-serif";
const TINTA = "#1B2A41", AZUL = "#1F3864", LINEA = "#3E4C63", GRIS = "#5F6B7A", FONDO = "#F8FAFD";
const CASO = Object.fromEntries(CASOS.map((c) => [c.id, c]));
const r = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function partir(texto, max) {
  const lineas = [];
  let linea = "";
  for (const palabra of String(texto).split(" ")) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (prueba.length > max && linea) { lineas.push(linea); linea = palabra; } else linea = prueba;
  }
  if (linea) lineas.push(linea);
  return lineas;
}

function texto(x, y, s, { t = 14, peso = 400, color = TINTA, ancla = "middle", cursiva = false } = {}) {
  return `<text x="${r(x)}" y="${r(y)}" font-size="${t}" font-weight="${peso}" fill="${color}" text-anchor="${ancla}"${cursiva ? ' font-style="italic"' : ""}>${esc(s)}</text>`;
}

const DEFS = `<defs>
  <filter id="sombra" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#1B2A41" flood-opacity="0.13"/></filter>
</defs>`;

function lienzo(ancho, alto, cuerpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" font-family="${FUENTE}">
${DEFS}
<rect width="${ancho}" height="${alto}" fill="#ffffff"/>
${cuerpo}
</svg>
`;
}

function encabezado(ancho, titulo, subtitulo) {
  return [
    texto(44, 54, titulo, { t: 26, peso: 700, color: AZUL, ancla: "start" }),
    texto(44, 82, subtitulo, { t: 15, color: GRIS, ancla: "start" }),
    texto(ancho - 44, 54, "MEVIPLAST · MEV-DOC-04", { t: 13, color: GRIS, ancla: "end" }),
    `<line x1="44" y1="100" x2="${ancho - 44}" y2="100" stroke="#D5DCE6" stroke-width="1.2"/>`,
  ].join("\n");
}

function pie(ancho, y) {
  return [
    `<line x1="44" y1="${y}" x2="${ancho - 44}" y2="${y}" stroke="#D5DCE6" stroke-width="1"/>`,
    texto(44, y + 22, `Fuente: permisos de backend/src/routes (verificarRol, iguales a x-roles de Swagger) y vistas de frontend/src/comun/constantes.js · develop, ${FECHA}`, { t: 12, color: GRIS, ancla: "start" }),
  ].join("\n");
}

// ---------- Elementos UML ----------
function actor(x, yAncla, id) {
  const a = ACTORES[id];
  if (a.externo) {
    const w = 236, h = 92, y = yAncla;
    const svg = [
      `<g filter="url(#sombra)"><rect x="${r(x - w / 2)}" y="${r(y - h / 2)}" width="${w}" height="${h}" rx="10" fill="#F4F6F9" stroke="#5B6B82" stroke-width="1.8"/></g>`,
      // sobre
      `<rect x="${r(x - w / 2 + 14)}" y="${r(y - 30)}" width="26" height="18" rx="2" fill="#fff" stroke="#5B6B82" stroke-width="1.5"/>`,
      `<polyline points="${r(x - w / 2 + 14)},${r(y - 30)} ${r(x - w / 2 + 27)},${r(y - 19)} ${r(x - w / 2 + 40)},${r(y - 30)}" fill="none" stroke="#5B6B82" stroke-width="1.5"/>`,
      texto(x + 12, y - 18, "«sistema externo»", { t: 12, color: GRIS }),
      texto(x, y + 6, a.nombre, { t: 16, peso: 700, color: AZUL }),
      texto(x, y + 28, a.nota, { t: 12, color: GRIS }),
    ].join("\n");
    return { svg, izq: [x - w / 2, y], der: [x + w / 2, y], caja: { x: x - w / 2, y: y - h / 2, w, h } };
  }
  const y = yAncla - 46; // tope de la cabeza
  const svg = [
    `<circle cx="${r(x)}" cy="${r(y + 50)}" r="58" fill="#EEF2F8"/>`,
    `<circle cx="${r(x)}" cy="${r(y + 14)}" r="14" fill="#fff" stroke="${AZUL}" stroke-width="2.6"/>`,
    `<line x1="${r(x)}" y1="${r(y + 28)}" x2="${r(x)}" y2="${r(y + 70)}" stroke="${AZUL}" stroke-width="2.6" stroke-linecap="round"/>`,
    `<line x1="${r(x - 24)}" y1="${r(y + 44)}" x2="${r(x + 24)}" y2="${r(y + 44)}" stroke="${AZUL}" stroke-width="2.6" stroke-linecap="round"/>`,
    `<polyline points="${r(x - 19)},${r(y + 100)} ${r(x)},${r(y + 70)} ${r(x + 19)},${r(y + 100)}" fill="none" stroke="${AZUL}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    texto(x, y + 128, a.nombre, { t: 16, peso: 700, color: AZUL }),
    texto(x, y + 146, a.nota, { t: 12, color: GRIS }),
  ].join("\n");
  return { svg, izq: [x - 30, y + 46], der: [x + 30, y + 46] };
}

function ovalo(c, cx, cy, rx, ry, { principal = false } = {}) {
  const ep = EPICAS[c.epica];
  const sinCodigo = Boolean(c.sin);
  const tam = principal ? 17 : 15;
  const max = Math.floor((rx * 2 * 0.8) / (tam * 0.52));
  const lineas = partir(c.nombre, max);
  const alto = 17 + lineas.length * (tam + 4);
  let y = cy - alto / 2 + 13;
  const partes = [
    `<g filter="url(#sombra)"><ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${rx}" ry="${ry}" fill="${sinCodigo ? "#ffffff" : ep.relleno}" stroke="${ep.borde}" stroke-width="${principal ? 3 : 2}"/></g>`,
    texto(cx, y, sinCodigo ? `sin código CU · ${c.sin}` : c.id, { t: 13, peso: 700, color: sinCodigo ? GRIS : ep.borde }),
  ];
  for (const l of lineas) { y += tam + 4; partes.push(texto(cx, y, l, { t: tam, peso: principal ? 600 : 400 })); }
  return { svg: partes.join("\n"), cx, cy, rx, ry };
}

function bordeElipse(o, px, py) {
  const ang = Math.atan2((py - o.cy) / o.ry, (px - o.cx) / o.rx);
  return [o.cx + o.rx * Math.cos(ang), o.cy + o.ry * Math.sin(ang)];
}

function bordeCaja(k, px, py) {
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2, dx = px - cx, dy = py - cy;
  const s = Math.min(Math.abs((k.w / 2) / (dx || 1e-9)), Math.abs((k.h / 2) / (dy || 1e-9)));
  return [cx + dx * s, cy + dy * s];
}

function asociacion([x1, y1], [x2, y2]) {
  return `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${LINEA}" stroke-width="1.8"/>`;
}

function flecha(origen, destino, tipo, { posicion = 0.5, condicion = null } = {}) {
  const [x1, y1] = bordeElipse(origen, destino.cx, destino.cy);
  const [x2, y2] = bordeElipse(destino, origen.cx, origen.cy);
  const ang = Math.atan2(y2 - y1, x2 - x1), largo = 13, abre = 0.42;
  const p1 = [x2 - largo * Math.cos(ang - abre), y2 - largo * Math.sin(ang - abre)];
  const p2 = [x2 - largo * Math.cos(ang + abre), y2 - largo * Math.sin(ang + abre)];
  const etiqueta = `«${tipo}»`;
  const w = etiqueta.length * 7.2 + 18;
  // En una flecha vertical y corta la etiqueta va al lado, para no tapar la punta
  const vertical = Math.abs(x2 - x1) < 12;
  const mx = vertical ? x1 + w / 2 + 12 : x1 + (x2 - x1) * posicion;
  const my = y1 + (y2 - y1) * posicion;
  const partes = [
    `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${LINEA}" stroke-width="1.8" stroke-dasharray="7,5"/>`,
    `<polyline points="${r(p1[0])},${r(p1[1])} ${r(x2)},${r(y2)} ${r(p2[0])},${r(p2[1])}" fill="none" stroke="${LINEA}" stroke-width="2" stroke-linejoin="round"/>`,
    `<rect x="${r(mx - w / 2)}" y="${r(my - 12)}" width="${r(w)}" height="22" rx="11" fill="#fff" stroke="#C9D2DF" stroke-width="1"/>`,
    texto(mx, my + 4, etiqueta, { t: 12.5, color: LINEA, cursiva: true }),
  ];
  if (condicion) partes.push(texto(vertical ? mx - w / 2 : mx, my + 26, condicion, { t: 11.5, color: GRIS, ancla: vertical ? "start" : "middle" }));
  return partes.join("\n");
}

// Leyenda en una fila: cada muestra con su texto, una tras otra
function leyenda(x, y, conRelaciones = true, conSinCodigo = true) {
  const muestras = [];
  let cx = x + 18;
  const agregar = (dibujo, etiqueta) => {
    muestras.push(dibujo(cx), texto(cx + 62, y + 28, etiqueta, { t: 13, ancla: "start" }));
    cx += 62 + etiqueta.length * 6.9 + 34;
  };
  agregar((a) => `<line x1="${a}" y1="${y + 23}" x2="${a + 52}" y2="${y + 23}" stroke="${LINEA}" stroke-width="1.8"/>`, "Asociación: el rol tiene el permiso en el servidor");
  if (conRelaciones) agregar((a) => `<line x1="${a}" y1="${y + 23}" x2="${a + 52}" y2="${y + 23}" stroke="${LINEA}" stroke-width="1.8" stroke-dasharray="7,5"/><polyline points="${a + 42},${y + 17} ${a + 52},${y + 23} ${a + 42},${y + 29}" fill="none" stroke="${LINEA}" stroke-width="2"/>`,
    "«include»: lo ejecuta siempre · «extend»: lo amplía en una condición");
  if (conSinCodigo) agregar((a) => `<ellipse cx="${a + 26}" cy="${y + 23}" rx="24" ry="11" fill="#fff" stroke="${GRIS}" stroke-width="1.6"/>`, "función sin código CU");
  return `<rect x="${x}" y="${y}" width="${r(cx - x - 16)}" height="46" rx="8" fill="${FONDO}" stroke="#D5DCE6"/>\n${muestras.join("\n")}`;
}

// Reparte actores en un lado: cada uno cerca del promedio de sus casos, sin encimarse
function repartir(lista, minimo, maximo, separacion) {
  lista.sort((a, b) => a.objetivo - b.objetivo);
  for (let i = 0; i < lista.length; i++) {
    lista[i].y = Math.max(lista[i].objetivo, minimo, i ? lista[i - 1].y + separacion : minimo);
  }
  const exceso = lista.length ? lista[lista.length - 1].y - maximo : 0;
  if (exceso > 0) for (let i = lista.length - 1; i >= 0; i--) {
    lista[i].y = Math.min(lista[i].y - exceso, i < lista.length - 1 ? lista[i + 1].y - separacion : Infinity);
  }
  return lista;
}

// ---------- DIA-CU-02..06: diagrama por épica ----------
function diagramaEpica({ id, archivo, epica, items, izq, der }) {
  const ancho = 1640, x0 = 380, x1 = 1260, top = 128, gap = 128;
  const dosColumnas = items.some((i) => i.col === 1);
  const colX = dosColumnas ? [x0 + 280, x0 + 700] : [(x0 + x1) / 2];
  const rx = dosColumnas ? 158 : 176, ry = 42;
  const filas = Math.max(...items.map((i) => i.fila)) + 1;
  const primera = top + 92;
  const abajo = primera + (filas - 1) * gap + 78;
  const ovalos = {};
  const partes = [encabezado(ancho, `${id} · ${epica} ${EPICAS[epica].nombre}`, "Diagrama de casos de uso por épica: quién hace qué en el sistema, con los permisos que valida el servidor"),
    `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${abajo - top}" rx="16" fill="${FONDO}" stroke="${AZUL}" stroke-width="2"/>`,
    texto(x0 + 22, top + 32, "Sistema MEVIPLAST", { t: 16, peso: 700, color: AZUL, ancla: "start" }),
    `<rect x="${x0 + 196}" y="${top + 14}" width="${epica.length * 9 + 22}" height="26" rx="13" fill="${EPICAS[epica].relleno}" stroke="${EPICAS[epica].borde}"/>`,
    texto(x0 + 196 + (epica.length * 9 + 22) / 2, top + 32, epica, { t: 13, peso: 700, color: EPICAS[epica].borde })];
  const capaOvalos = [];
  for (const it of items) {
    const o = ovalo(CASO[it.id], colX[it.col || 0], primera + it.fila * gap, rx, ry);
    ovalos[it.id] = o; capaOvalos.push(o.svg);
  }
  // Actores y asociaciones
  const capaLineas = [], capaActores = [];
  for (const [lado, lista, x] of [["izq", izq, 190], ["der", der, ancho - 190]]) {
    const datos = lista.map((a) => {
      const casos = items.map((i) => CASO[i.id]).filter((c) => (c.actores || []).includes(a) || (c.der || []).includes(a));
      const ys = casos.map((c) => ovalos[c.id].cy);
      return { a, casos, objetivo: ys.reduce((s, v) => s + v, 0) / ys.length };
    });
    repartir(datos, top + 40, abajo - 60, ACTORES[lista[0]]?.externo ? 175 : 190);
    for (const d of datos) {
      const fig = actor(x, d.y, d.a);
      capaActores.push(fig.svg);
      for (const c of d.casos) {
        const o = ovalos[c.id];
        const desde = fig.caja ? bordeCaja(fig.caja, o.cx, o.cy) : fig[lado === "izq" ? "der" : "izq"];
        capaLineas.push(asociacion(desde, bordeElipse(o, desde[0], desde[1])));
      }
    }
  }
  const capaFlechas = RELACIONES.filter((rel) => ovalos[rel.de] && ovalos[rel.a]).map((rel) => flecha(ovalos[rel.de], ovalos[rel.a], rel.tipo));
  const alto = abajo + 150;
  partes.push(capaLineas.join("\n"), capaFlechas.join("\n"), capaOvalos.join("\n"), capaActores.join("\n"),
    leyenda(230, abajo + 34, capaFlechas.length > 0, items.some((i) => CASO[i.id].sin)), pie(ancho, abajo + 104));
  return { archivo, svg: lienzo(ancho, alto, partes.join("\n")), ancho, alto };
}

// ---------- DIA-CU-01: general por paquetes ----------
function diagramaGeneral() {
  const ancho = 1680, x0 = 420, x1 = 1260, top = 128;
  const orden = ["EP-004", "EP-001", "EP-002", "EP-003", "EP-005"];
  const paquetes = [];
  let y = top + 62;
  for (const ep of orden) {
    const casos = CASOS.filter((c) => c.epica === ep);
    const filas = Math.ceil(casos.length / 2);
    const h = 48 + filas * 25 + 14;
    paquetes.push({ ep, casos, x: x0 + 34, y, w: x1 - x0 - 68, h });
    y += h + 24;
  }
  const abajo = y + 14;
  const partes = [encabezado(ancho, "DIA-CU-01 · Diagrama general de casos de uso", "Alto nivel: las cinco épicas como paquetes, sus casos de uso y los roles que los usan"),
    `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${abajo - top}" rx="16" fill="${FONDO}" stroke="${AZUL}" stroke-width="2"/>`,
    texto(x0 + 22, top + 34, "Sistema MEVIPLAST", { t: 16, peso: 700, color: AZUL, ancla: "start" })];
  const capaPaq = [];
  for (const p of paquetes) {
    const e = EPICAS[p.ep];
    capaPaq.push(`<g filter="url(#sombra)"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10" fill="#fff" stroke="${e.borde}" stroke-width="2"/></g>`,
      `<path d="M${p.x} ${p.y + 10} a10 10 0 0 1 10 -10 h${p.w - 20} a10 10 0 0 1 10 10 v28 h-${p.w} z" fill="${e.relleno}" stroke="${e.borde}" stroke-width="2"/>`,
      texto(p.x + 16, p.y + 26, `${p.ep} · ${e.nombre}`, { t: 15, peso: 700, color: e.borde, ancla: "start" }));
    p.casos.forEach((c, i) => {
      const cx = p.x + 18 + (i % 2) * (p.w / 2), cy = p.y + 62 + Math.floor(i / 2) * 25;
      capaPaq.push(`<ellipse cx="${cx + 8}" cy="${cy - 5}" rx="8" ry="5.5" fill="${c.sin ? "#fff" : e.relleno}" stroke="${c.sin ? GRIS : e.borde}" stroke-width="1.4"/>`,
        texto(cx + 22, cy, c.sin ? c.sin : c.id, { t: 12.5, peso: 700, color: c.sin ? GRIS : e.borde, ancla: "start" }),
        texto(cx + 86, cy, c.nombre.replace(/\s*\(.*\)$/, c.nombre.length > 42 ? "" : "$&"), { t: 13, ancla: "start" }));
    });
  }
  const capaLineas = [], capaActores = [];
  const actoresDe = (p) => new Set(p.casos.flatMap((c) => [...(c.actores || []), ...(c.der || [])]));
  const entradas = new Map(paquetes.map((p) => [p.ep, { izq: [], der: [] }]));
  for (const [lado, lista, x] of [["izq", ["usuario", "admin", "supervisor"], 200], ["der", ["correo", "operario", "almacenista", "vendedor"], ancho - 200]]) {
    const datos = lista.map((a) => {
      const pqs = paquetes.filter((p) => actoresDe(p).has(a));
      return { a, pqs, objetivo: pqs.reduce((s, p) => s + p.y + p.h / 2, 0) / pqs.length };
    });
    repartir(datos, top + 50, abajo - 70, 200);
    for (const d of datos) {
      const fig = actor(x, d.y, d.a);
      capaActores.push(fig.svg);
      for (const p of d.pqs) entradas.get(p.ep)[lado].push({ fig, d });
    }
  }
  for (const p of paquetes) for (const lado of ["izq", "der"]) {
    const lista = entradas.get(p.ep)[lado].sort((a, b) => a.d.y - b.d.y);
    lista.forEach(({ fig }, i) => {
      const yy = p.y + 48 + ((i + 1) * (p.h - 58)) / (lista.length + 1);
      const xx = lado === "izq" ? p.x : p.x + p.w;
      const desde = fig.caja ? bordeCaja(fig.caja, xx, yy) : fig[lado === "izq" ? "der" : "izq"];
      capaLineas.push(asociacion(desde, [xx, yy]), `<circle cx="${xx}" cy="${r(yy)}" r="3.2" fill="${LINEA}"/>`);
    });
  }
  const alto = abajo + 150;
  partes.push(capaLineas.join("\n"), capaPaq.join("\n"), capaActores.join("\n"), leyenda(250, abajo + 34, false, true), pie(ancho, abajo + 104));
  return { archivo: "DIA-CU-01_general", svg: lienzo(ancho, alto, partes.join("\n")), ancho, alto };
}

// ---------- DIA-ACT-01: actores ----------
function diagramaActores() {
  const ancho = 1640, alto = 860;
  const partes = [encabezado(ancho, "DIA-ACT-01 · Actores y sistemas externos de MEVIPLAST", "Cada rol especializa al usuario autenticado; debajo, las vistas del panel que tiene cada uno")];
  const top = actor(ancho / 2, 210, "usuario");
  partes.push(top.svg.replace(">Usuario<", ">Usuario autenticado<"));
  const roles = ["admin", "supervisor", "operario", "vendedor", "almacenista"];
  const ys = 560, paso = (ancho - 300) / (roles.length - 1);
  const pies = [ancho / 2, 210 - 46 + 100];
  roles.forEach((rol, i) => {
    const x = 150 + i * paso;
    const fig = actor(x, ys, rol);
    const cabeza = [x, ys - 46 - 2];
    const destino = [pies[0] + (x - pies[0]) * 0.11, pies[1] + 86];
    const ang = Math.atan2(destino[1] - cabeza[1], destino[0] - cabeza[0]);
    const t = 18, a = 0.5;
    const base = [destino[0] - t * Math.cos(ang), destino[1] - t * Math.sin(ang)];
    const p1 = [destino[0] - t * Math.cos(ang - a), destino[1] - t * Math.sin(ang - a)];
    const p2 = [destino[0] - t * Math.cos(ang + a), destino[1] - t * Math.sin(ang + a)];
    partes.push(`<line x1="${r(cabeza[0])}" y1="${r(cabeza[1] - 14)}" x2="${r(base[0])}" y2="${r(base[1])}" stroke="${LINEA}" stroke-width="1.8"/>`,
      `<polygon points="${r(destino[0])},${r(destino[1])} ${r(p1[0])},${r(p1[1])} ${r(p2[0])},${r(p2[1])}" fill="#fff" stroke="${LINEA}" stroke-width="1.8"/>`, fig.svg);
    partir(VISTAS[rol], 30).forEach((l, j) => partes.push(texto(x, ys + 132 + j * 18, l, { t: 12.5, color: GRIS })));
  });
  const correo = actor(ancho - 250, 230, "correo");
  partes.push(correo.svg,
    texto(ancho - 250, 300, "Envía el enlace de recuperación y el", { t: 12.5, color: GRIS }),
    texto(ancho - 250, 318, "recordatorio de usuario (INT-01)", { t: 12.5, color: GRIS }));
  partes.push(`<rect x="70" y="150" width="330" height="128" rx="10" fill="${FONDO}" stroke="#D5DCE6"/>`,
    texto(90, 180, "Visitante sin sesión", { t: 15, peso: 700, color: AZUL, ancla: "start" }),
    texto(90, 206, "Ve el sitio público y llega al inicio de", { t: 13, color: GRIS, ancla: "start" }),
    texto(90, 226, "sesión y a la recuperación de cuenta.", { t: 13, color: GRIS, ancla: "start" }),
    texto(90, 254, "No es un rol: no tiene permisos en la API.", { t: 13, color: GRIS, ancla: "start" }));
  partes.push(texto(44, 790, "La flecha con triángulo es una generalización: cada rol hereda lo del usuario autenticado (cerrar sesión y Mi perfil). Los permisos propios de cada rol se validan en el servidor.", { t: 13, color: GRIS, ancla: "start" }), pie(ancho, 808));
  return { archivo: "DIA-ACT-01_actores", svg: lienzo(ancho, alto, partes.join("\n")), ancho, alto };
}

// ---------- DIA-CU-001..023: un diagrama por caso ----------
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48);

function diagramaCaso(c) {
  const ancho = 1600, x0 = 390, x1 = 1210, top = 128, cx = (x0 + x1) / 2;
  const rels = RELACIONES.filter((rel) => rel.de === c.id || rel.a === c.id);
  const otros = rels.map((rel) => (rel.de === c.id ? rel.a : rel.de));
  // Alto del sistema: el que piden los óvalos o el que piden los actores de un mismo lado (176 px entre actores)
  const porLado = Math.max((c.actores || []).length, (c.der || []).length, 1);
  const altoActores = 192 + (porLado - 1) * 176;
  let cy = top + 118;
  const filaOtros = cy + 196;
  let abajo = (otros.length ? filaOtros + 44 : cy + 56) + 66;
  if (abajo - top < altoActores) {
    abajo = top + altoActores;
    if (!otros.length) cy = (top + abajo) / 2 + 12;
  }
  const principal = ovalo(c, cx, cy, 214, 58, { principal: true });
  const ovalos = { [c.id]: principal };
  const posX = { 1: [cx], 2: [cx - 205, cx + 205], 3: [cx - 270, cx, cx + 270] }[otros.length] || [];
  const capaOvalos = [principal.svg];
  otros.forEach((idOtro, i) => { const o = ovalo(CASO[idOtro], posX[i], filaOtros, otros.length === 3 ? 128 : 160, 42); ovalos[idOtro] = o; capaOvalos.push(o.svg); });
  // Actores: los del caso; si no tiene (incluido o extensión), los de sus casos base
  let izq = c.actores || [], der = c.der || [], conectarA = () => [c.id];
  if (!izq.length && !der.length) {
    const bases = otros.filter((o) => (CASO[o].actores || []).length || (CASO[o].der || []).length);
    izq = [...new Set(bases.flatMap((b) => CASO[b].actores || []))];
    der = [...new Set(bases.flatMap((b) => CASO[b].der || []))];
    conectarA = (a) => bases.filter((b) => (CASO[b].actores || []).includes(a) || (CASO[b].der || []).includes(a));
  }
  const capaLineas = [], capaActores = [];
  for (const [lado, lista, x] of [["izq", izq, 200], ["der", der, ancho - 200]]) {
    const datos = lista.map((a) => {
      const dest = conectarA(a);
      const objetivo = dest.reduce((s, d) => s + ovalos[d].cy, 0) / dest.length;
      return { a, dest, objetivo };
    });
    repartir(datos, top + 78, abajo - 112, 176);
    for (const d of datos) {
      const fig = actor(x, d.y, d.a);
      capaActores.push(fig.svg);
      for (const destino of d.dest) {
        const o = ovalos[destino];
        const desde = fig.caja ? bordeCaja(fig.caja, o.cx, o.cy) : fig[lado === "izq" ? "der" : "izq"];
        capaLineas.push(asociacion(desde, bordeElipse(o, desde[0], desde[1])));
      }
    }
  }
  const capaFlechas = rels.map((rel) => flecha(ovalos[rel.de], ovalos[rel.a], rel.tipo));
  // Ficha: nota UML con la trazabilidad, las relaciones y la API
  const nombreDe = (id) => (CASO[id].sin ? `«${CASO[id].nombre}» (${CASO[id].sin})` : `${id} «${CASO[id].nombre}»`);
  const relTexto = rels.map((rel) => rel.tipo === "include"
    ? `${nombreDe(rel.de)} incluye siempre a ${nombreDe(rel.a)}`
    : `${nombreDe(rel.de)} extiende a ${nombreDe(rel.a)} cuando: ${rel.condicion}`);
  const filas = [
    [`Historia: ${c.hu}   ·   Requisito: ${c.rf}   ·   Reglas: ${c.rn}`, TINTA, 600],
    ...relTexto.flatMap((t) => partir(`Relación: ${t}`, 150)).map((l) => [l, TINTA, 400]),
    ...partir(`En el panel: ${c.panel}`, 150).map((l) => [l, TINTA, 400]),
    ...partir(`API: ${c.api.join("   ·   ")}`, 150).map((l) => [l, TINTA, 400]),
    ...partir(`Resultado: ${c.resultado}`, 150).map((l) => [l, TINTA, 400]),
    ...(c.aviso ? partir(`Nota: ${c.aviso}`, 150).map((l) => [l, "#8A4B00", 600]) : []),
  ];
  const ny = abajo + 30, nh = 30 + filas.length * 23, nx = 70, nw = ancho - 140;
  const nota = [`<path d="M${nx} ${ny} h${nw - 22} l22 22 v${nh - 22} h-${nw} z" fill="#FFFCEB" stroke="#C9B458" stroke-width="1.4"/>`,
    `<path d="M${nx + nw - 22} ${ny} v22 h22" fill="none" stroke="#C9B458" stroke-width="1.4"/>`,
    ...filas.map(([l, color, peso], i) => texto(nx + 22, ny + 30 + i * 23, l, { t: 14, color, peso, ancla: "start" }))];
  const ly = ny + nh + 24;
  const alto = ly + (rels.length ? 46 : 0) + 74;
  const partes = [encabezado(ancho, `DIA-${c.id} · ${c.id} ${c.nombre}`, `${c.epica} ${EPICAS[c.epica].nombre} · diagrama del caso de uso con sus actores, relaciones y API`),
    `<rect x="${x0}" y="${top}" width="${x1 - x0}" height="${abajo - top}" rx="16" fill="${FONDO}" stroke="${AZUL}" stroke-width="2"/>`,
    texto(x0 + 22, top + 32, "Sistema MEVIPLAST", { t: 16, peso: 700, color: AZUL, ancla: "start" }),
    capaLineas.join("\n"), capaFlechas.join("\n"), capaOvalos.join("\n"), capaActores.join("\n"), nota.join("\n"),
    rels.length ? leyenda(210, ly, true, otros.some((o) => CASO[o].sin)) : "", pie(ancho, alto - 46)];
  return { archivo: path.join("casos_de_uso", `DIA-${c.id}_${slug(c.nombre)}`), svg: lienzo(ancho, alto, partes.join("\n")), ancho, alto, caso: c.id, titulo: `DIA-${c.id} · ${c.id} ${c.nombre}` };
}

// ---------- Armado ----------
const EPICAS_DIAG = [
  { id: "DIA-CU-02", archivo: "DIA-CU-02_seguridad", epica: "EP-004", izq: ["usuario"], der: ["correo", "admin"],
    items: [["CU-004", 0], ["CU-001", 1], ["CU-003", 2], ["CU-005", 3], ["PERFIL", 4], ["CU-002", 5]] },
  { id: "DIA-CU-03", archivo: "DIA-CU-03_produccion", epica: "EP-001", izq: ["admin", "supervisor"], der: ["operario"],
    items: [["PLANTILLAS", 0], ["CU-010", 1], ["CU-006", 2], ["CU-009", 3], ["CU-007", 4], ["CU-008", 5], ["INV_PROD", 6]] },
  { id: "DIA-CU-04", archivo: "DIA-CU-04_materias_primas", epica: "EP-002", izq: ["admin", "supervisor"], der: ["almacenista"],
    items: [["CU-011", 0], ["CU-015", 1], ["CU-012", 2], ["CU-014", 3], ["CU-013", 4]] },
  { id: "DIA-CU-05", archivo: "DIA-CU-05_inventario_ventas", epica: "EP-003", izq: ["admin", "supervisor"], der: ["almacenista", "vendedor"],
    items: [["CU-016", 0], ["CU-017", 1], ["COMPROBANTE", 2], ["CU-018", 3], ["CU-019", 4], ["HIST_VENTAS", 5]] },
  { id: "DIA-CU-06", archivo: "DIA-CU-06_reportes", epica: "EP-005", izq: ["admin", "supervisor"], der: [],
    items: [["CU-020", 0], ["RENDIMIENTO", 1], ["CU-022", 2], ["CU-021", 3], ["BITACORA", 4], ["CU-023", 1, 1]] },
];

async function main() {
  fs.mkdirSync(SALIDA_CU, { recursive: true });
  const diagramas = [diagramaActores(), diagramaGeneral(),
    ...EPICAS_DIAG.map((d) => diagramaEpica({ ...d, items: d.items.map(([id, fila, col]) => ({ id, fila, col })) })),
    ...CASOS.filter((c) => !c.sin).sort((a, b) => a.id.localeCompare(b.id)).map(diagramaCaso)];
  for (const d of diagramas) fs.writeFileSync(path.join(SALIDA, `${d.archivo}.svg`), d.svg, "utf8");
  // playwright-core del backend: desde la copia del repositorio (docs/...) o desde la carpeta del paquete junto al repositorio
  const candidatas = [process.argv[2], path.resolve(__dirname, "../../../../../backend/node_modules/playwright-core"),
    path.resolve(__dirname, "../../../../meviplast-nodejs/backend/node_modules/playwright-core")].filter(Boolean);
  const rutaPw = candidatas.find((r) => fs.existsSync(r));
  if (!rutaPw) throw new Error("No encuentro playwright-core: instale el backend (npm install) o pase su ruta como argumento");
  const { chromium } = require(rutaPw);
  const navegador = await chromium.launch({ channel: "msedge" });
  try {
    for (const d of diagramas) {
      const pagina = await navegador.newPage({ deviceScaleFactor: 1.5, viewport: { width: d.ancho, height: d.alto } });
      await pagina.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${d.svg}</body></html>`);
      await pagina.locator("svg").screenshot({ path: path.join(SALIDA, `${d.archivo}.png`) });
      await pagina.close();
    }
  } finally { await navegador.close(); }
  const lista = diagramas.map((d) => ({ archivo: d.archivo.replace(/\\/g, "/"), ancho: d.ancho, alto: d.alto, caso: d.caso || null, titulo: d.titulo || null }));
  fs.writeFileSync(path.join(SALIDA, "diagramas_cu.json"), JSON.stringify(lista, null, 2), "utf8");
  console.log(`${diagramas.length} diagramas (SVG y PNG) en ${SALIDA}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
