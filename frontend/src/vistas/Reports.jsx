import React from "react";
import { DataTable, Field, Intro, Panel } from "../comun/componentes.jsx";
import { money, number, percentFormat, safeProductName, sanitizeText } from "../comun/formato.js";
import { Icono } from "../comun/iconos.jsx";
import { StackedBarList, groupByLine } from "../comun/BarrasApiladas.jsx";

const PERIODOS = [
  ["diario", "Diario"],
  ["semanal", "Semanal"],
  ["mensual", "Mensual"],
  ["anual", "Anual"],
];

// Rediseño: el periodo se elige una sola vez y cada tarjeta abre su reporte con ese periodo
const TIPOS_REPORTE = [
  { tipo: "produccion", titulo: "Reporte de producción", icono: "produccion", tono: "azul", descripcion: "Unidades producidas y cada registro; filtra por operario y producto." },
  { tipo: "ventas", titulo: "Reporte de ventas", icono: "ventas", tono: "rojo", descripcion: "Total vendido, unidades, clientes y comprobantes." },
  { tipo: "rendimiento", titulo: "Reporte de rendimiento de operarios", icono: "rendimiento", tono: "verde", descripcion: "% de cumplimiento de la meta de cada operario." },
];

export function Reports({ role }) {
  const isAdmin = role === "admin";
  const [periodo, setPeriodo] = React.useState("mensual");
  function abrirReporte(tipo, conPeriodo) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("reporte", tipo);
    if (conPeriodo) url.searchParams.set("periodo", conPeriodo);
    window.location.assign(url.toString());
  }
  return (
    <>
      <Intro icon="reportes" title="Reportes" description="Elige el periodo una vez y abre el reporte que necesites." />
      <div className="report-period-picker" role="radiogroup" aria-label="Periodo de los reportes">
        {PERIODOS.map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={periodo === valor}
            className={`report-period-button${periodo === valor ? " active" : ""}`}
            onClick={() => setPeriodo(valor)}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <section className="report-categories report-cards">
        {TIPOS_REPORTE.filter(({ tipo }) => isAdmin || tipo !== "ventas").map(({ tipo, titulo, icono, tono, descripcion }) => (
          <article key={tipo} className={`panel report-category report-card tono-${tono}`}>
            <span className="report-card-icon"><Icono nombre={icono} size={24} /></span>
            <h3>{titulo}</h3>
            <p>{descripcion}</p>
            <button className="report-open" type="button" onClick={() => abrirReporte(tipo, periodo)}>
              Abrir reporte {PERIODOS.find(([valor]) => valor === periodo)[1].toLowerCase()}
            </button>
          </article>
        ))}
        {/* HU-023 / RF-026: las existencias son de hoy, por eso este reporte no lleva periodo */}
        <article className="panel report-category report-card tono-morado">
          <span className="report-card-icon"><Icono nombre="inventario" size={24} /></span>
          <h3>Reporte de inventario</h3>
          <p>Existencias de hoy de producto terminado y materias primas, con las que están en stock bajo.</p>
          <button className="report-open" type="button" onClick={() => abrirReporte("inventario")}>Ver existencias</button>
        </article>
      </section>
    </>
  );
}

// HU-023 / RF-026: producto terminado y materias primas en el mismo reporte
function InventoryReport({ data }) {
  const productos = data.productos || [];
  const materias = data.materias_primas || [];
  const unidades = productos.reduce((total, item) => total + Number(item.cantidad || 0), 0);
  const bajos = materias.filter((item) => item.bajo_stock).length;
  return (
    <>
      <a className="primary-action secondary back-action" href="/dashboard.html#reportes"><Icono nombre="anterior" size={16} />Volver a reportes</a>
      <Intro icon="inventario" title="Reporte de inventario" description="Existencias actuales de producto terminado y de materias primas, de menor a mayor cantidad." />
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-head"><span>Producto terminado</span></div><strong>{number(unidades)}</strong><small>Unidades en {number(productos.length)} referencias</small></article>
        <article className="stat-card"><div className="stat-head"><span>Materias primas</span></div><strong>{number(materias.length)}</strong><small>Bobinas registradas</small></article>
        <article className="stat-card"><div className="stat-head"><span>Con stock bajo</span></div><strong>{number(bajos)}</strong><small>Materias primas en el mínimo o por debajo</small></article>
      </section>
      <Panel title="Producto terminado">
        <DataTable columns={["Producto", "Existencia"]} empty="No hay producto terminado registrado." rows={productos.map((item, indice) => ({
          key: `${item.producto}-${indice}`,
          cells: <><td>{safeProductName(item.producto) || "Producto no válido"}</td><td>{number(item.cantidad)}</td></>,
        }))} />
      </Panel>
      <Panel title="Materias primas">
        <DataTable columns={["Material", "Existencia", "Stock mínimo", "Estado"]} empty="No hay materias primas registradas." rows={materias.map((item, indice) => ({
          key: `${item.nombre}-${indice}`,
          cells: <><td>{sanitizeText(item.nombre)}</td><td>{number(item.cantidad)} {sanitizeText(item.unidad || "")}</td><td>{number(item.stock_minimo)} {sanitizeText(item.unidad || "")}</td><td>{item.bajo_stock ? <span className="status alert">Stock bajo</span> : <span className="status success">Suficiente</span>}</td></>,
        }))} />
      </Panel>
    </>
  );
}

export function ReportDetail({ data, onExportExcel, onOpenPdf, onReceipt }) {
  const reporteTipo = new URLSearchParams(window.location.search).get("reporte");
  if (reporteTipo === "inventario") return <InventoryReport data={data} />;
  const titulo = { produccion: "producción", ventas: "ventas", rendimiento: "rendimiento de operarios" }[reporteTipo];
  const periodoNombre = data.periodo.charAt(0).toUpperCase() + data.periodo.slice(1);
  const fechas = `${data.desde} - ${data.hastaInclusivo}`;
  return (
    <>
      <a className="primary-action secondary back-action" href="/dashboard.html#reportes"><Icono nombre="anterior" size={16} />Volver a reportes</a>
      <Intro
        icon={{ produccion: "produccion", ventas: "ventas", rendimiento: "rendimiento" }[reporteTipo]}
        title={`Reporte de ${titulo} ${data.periodo}`}
        description={`${periodoNombre} · ${fechas}`}
        action={
          <div className="report-actions">
            <button className="primary-action secondary" type="button" onClick={onExportExcel}>Descargar Excel</button>
            <button className="primary-action" type="button" title="Se abre en otra pestaña; desde allí lo imprimes o lo descargas" onClick={onOpenPdf}>Abrir PDF</button>
          </div>
        }
      />
      {reporteTipo === "produccion" && data.opciones && <ProductionFilters data={data} />}
      {reporteTipo === "rendimiento" ? <PerformanceReport data={data} /> : <>
      <section className="stats-grid">
        {reporteTipo === "produccion" ? (
          <>
            <article className="stat-card"><div className="stat-head"><span>Unidades producidas</span></div><strong>{number(data.resumen.unidades)}</strong><small>{number(data.resumen.movimientos)} registros</small></article>
            <article className="stat-card"><div className="stat-head"><span>Productos fabricados</span></div><strong>{data.porProducto.length}</strong><small>Referencias producidas en el periodo</small></article>
          </>
        ) : (
          <>
            <article className="stat-card"><div className="stat-head"><span>Total vendido</span></div><strong>{money(data.resumen.total_vendido)}</strong><small>{number(data.resumen.numero_ventas)} ventas</small></article>
            <article className="stat-card"><div className="stat-head"><span>Unidades vendidas</span></div><strong>{number(data.resumen.unidades)}</strong><small>Unidades del periodo</small></article>
          </>
        )}
      </section>
      {data.porProducto.length > 0 && (
        <Panel title={reporteTipo === "produccion" ? "Unidades por línea" : "Total vendido por línea"}>
          {/* MEVI-120: cada barra es una línea dividida por sus variantes; un clic abre el detalle */}
          <StackedBarList
            label={reporteTipo === "produccion" ? "Unidades producidas por línea" : "Total vendido por línea"}
            format={reporteTipo === "produccion" ? number : money}
            unit={reporteTipo === "produccion" ? "Unidades" : "Total vendido"}
            items={groupByLine(
              data.porProducto,
              (item) => safeProductName(item.producto),
              (item) => (reporteTipo === "produccion" ? item.unidades : item.total),
              reporteTipo === "produccion" ? undefined : (item) => ({ Unidades: number(item.unidades) }),
            ).slice(0, 8)}
          />
        </Panel>
      )}
      <Panel title="Resumen por producto">
        <DataTable
          columns={reporteTipo === "produccion" ? ["Producto", "Unidades producidas"] : ["Producto", "Unidades", "Total vendido"]}
          rows={data.porProducto.map((item) => ({
            key: item.producto,
            cells: reporteTipo === "produccion"
              ? <><td>{safeProductName(item.producto) || "Producto no válido"}</td><td>{number(item.unidades)}</td></>
              : <><td>{safeProductName(item.producto) || "Producto no válido"}</td><td>{number(item.unidades)}</td><td>{money(item.total)}</td></>,
          }))}
        />
      </Panel>
      <Panel title={reporteTipo === "produccion" ? "Registros de producción" : "Detalle de ventas"}>
        {reporteTipo === "produccion" ? (
          <DataTable columns={["Fecha", "Producto", "Orden", "Operario", "Cantidad"]} rows={data.detalle.map((item) => ({
            key: item.id,
            cells: <><td>{item.fecha}</td><td>{safeProductName(item.producto) || "Producto no válido"}</td><td>{item.orden_id ? `#${item.orden_id}` : "—"}</td><td>{sanitizeText(item.operario || "No registrado")}</td><td>{number(item.cantidad)}</td></>,
          }))} />
        ) : (
          <>
            {data.detalle.length > 0 && <p className="panel-note">Haz clic en una venta para ver su comprobante e imprimirlo o guardarlo en PDF.</p>}
            <DataTable columns={["Fecha", "Venta", "Cliente", "Producto", "Cantidad", "Precio unitario", "Total", "Comprobante"]} rows={data.detalle.map((item) => ({
              key: item.id,
              className: "clickable-row",
              // CR-022: cada fila es un producto; el comprobante es el de su venta
              onClick: () => onReceipt(item.venta_id ?? item.id),
              cells: <><td>{item.fecha}</td><td>{sanitizeText(item.numero || "")}</td><td>{sanitizeText(item.cliente)}</td><td>{safeProductName(item.producto) || "Producto no válido"}</td><td>{number(item.cantidad)}</td><td>{money(item.precio_unitario)}</td><td>{money(item.total)}</td><td><button className="link-button" type="button" aria-label={`Ver el comprobante de la venta a ${sanitizeText(item.cliente)}`} onClick={(event) => {
                event.stopPropagation();
                onReceipt(item.venta_id ?? item.id);
              }}>Ver</button></td></>,
            }))} />
          </>
        )}
        {!data.detalle.length && <p className="empty">No hay registros en este periodo.</p>}
      </Panel>
      </>}
    </>
  );
}

// HU-004: filtra el historial de producción del periodo por operario y por producto.
// Los filtros quedan en la dirección, así que Excel y PDF descargan lo mismo que se ve.
function ProductionFilters({ data }) {
  const actual = data.filtros || {};
  function aplicar(clave, valor) {
    const url = new URL(window.location.href);
    if (valor) url.searchParams.set(clave, valor);
    else url.searchParams.delete(clave);
    window.location.assign(url.toString());
  }
  const productos = data.opciones.productos.includes(actual.producto) || !actual.producto
    ? data.opciones.productos
    : [...data.opciones.productos, actual.producto];
  return (
    <section className="panel report-filters" aria-label="Filtros del historial de producción">
      <div className="data-form">
        <Field label="Operario">
          <select value={actual.operario_id ? String(actual.operario_id) : ""} onChange={(event) => aplicar("operario_id", event.target.value)}>
            <option value="">Todos los operarios</option>
            {data.opciones.operarios.map((operario) => <option key={operario.id} value={operario.id}>{sanitizeText(operario.nombre)}</option>)}
          </select>
        </Field>
        <Field label="Producto">
          <select value={actual.producto || ""} onChange={(event) => aplicar("producto", event.target.value)}>
            <option value="">Todos los productos</option>
            {productos.map((producto) => <option key={producto} value={producto}>{safeProductName(producto) || "Producto no válido"}</option>)}
          </select>
        </Field>
      </div>
    </section>
  );
}

// HU-022: % de cumplimiento de la meta por operario
function PerformanceBar({ value, label }) {
  if (value === null || value === undefined) return <span className="performance-none">Sin órdenes</span>;
  const width = Math.min(Math.max(Number(value), 0), 100);
  return (
    <div className="performance-cell">
      <div className="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={width} aria-label={label}>
        <span style={{ width: `${width}%` }} />
      </div>
      <strong>{percentFormat.format(value)} %</strong>
    </div>
  );
}

function PerformanceReport({ data }) {
  const { resumen } = data;
  return (
    <>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-head"><span>Cumplimiento general</span></div><strong>{resumen.cumplimiento === null ? "—" : `${percentFormat.format(resumen.cumplimiento)} %`}</strong><small>{number(resumen.producido)} de {number(resumen.meta)} unidades de la meta</small></article>
        <article className="stat-card"><div className="stat-head"><span>Operarios con órdenes</span></div><strong>{number(resumen.con_ordenes)}</strong><small>De {number(resumen.operarios)} operarios activos · {number(resumen.ordenes)} {resumen.ordenes === 1 ? "orden" : "órdenes"}</small></article>
        <article className="stat-card"><div className="stat-head"><span>Unidades registradas</span></div><strong>{number(resumen.unidades_periodo)}</strong><small>Avances de los operarios en el periodo</small></article>
      </section>
      {data.operarios.some((item) => item.producido > 0) && (
        <Panel title="Producción por operario">
          {/* MEVI-120: lo producido por cada operario, dividido por referencia; el mismo color es la misma
              referencia en todos los operarios. Un clic abre el detalle con la meta y el cumplimiento */}
          <StackedBarList
            label="Unidades producidas por operario"
            format={number}
            unit="Producido"
            colorBy="entity"
            items={data.operarios.filter((item) => item.producido > 0).map((item) => ({
              clave: String(item.id),
              etiqueta: sanitizeText(item.nombre),
              valor: item.producido,
              subtitulo: `meta ${number(item.meta)} · cumplimiento ${item.cumplimiento === null ? "—" : `${percentFormat.format(item.cumplimiento)} %`}`,
              totalesExtra: { "Órdenes": number(item.ordenes), Meta: number(item.meta), Cumplimiento: item.cumplimiento === null ? "—" : `${percentFormat.format(item.cumplimiento)} %` },
              partes: (item.referencias || []).map((ref) => {
                const nombre = [safeProductName(ref.producto) || "Producto no válido", ref.medida, ref.calibre && `calibre ${ref.calibre}`, ref.color].filter(Boolean).map((parte) => sanitizeText(parte)).join(" · ");
                return {
                  clave: nombre,
                  etiqueta: nombre,
                  valor: ref.producido,
                  extra: { "Órdenes": number(ref.ordenes), Meta: number(ref.meta), Cumplimiento: ref.cumplimiento === null ? "—" : `${percentFormat.format(ref.cumplimiento)} %` },
                };
              }),
            }))}
          />
        </Panel>
      )}
      <Panel title="Cumplimiento por operario">
        <p className="panel-note">Cumplimiento = unidades producidas ÷ meta de las órdenes asignadas al operario que se crearon en el periodo, sin las canceladas. «Unidades registradas» suma todos sus avances del periodo, incluidos los de órdenes anteriores.</p>
        <DataTable
          columns={["Operario", "Órdenes", "Finalizadas", "Meta", "Producido", "Cumplimiento", "Unidades registradas"]}
          empty="No hay operarios activos."
          rows={data.operarios.map((item) => ({
            key: item.id,
            cells: <><td>{sanitizeText(item.nombre)}</td><td>{number(item.ordenes)}</td><td>{number(item.finalizadas)}</td><td>{number(item.meta)}</td><td>{number(item.producido)}</td><td><PerformanceBar value={item.cumplimiento} label={`Cumplimiento de ${sanitizeText(item.nombre)}`} /></td><td>{number(item.unidades_periodo)}</td></>,
          }))}
        />
      </Panel>
    </>
  );
}
