import React from "react";
import { DataTable, Field, Intro, Panel } from "../comun/componentes.jsx";
import { money, number, percentFormat, safeProductName, sanitizeText } from "../comun/formato.js";

export function Reports({ role }) {
  const isAdmin = role === "admin";
  const periodos = [
    ["diario", "Diario"],
    ["semanal", "Semanal"],
    ["mensual", "Mensual"],
    ["anual", "Anual"],
  ];
  function abrirReporte(tipo, periodo) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("reporte", tipo);
    if (periodo) url.searchParams.set("periodo", periodo);
    window.location.assign(url.toString());
  }
  return (
    <>
      <Intro title="Reportes" description={isAdmin ? "Consulta el seguimiento de producción, las ventas y el rendimiento de los operarios por periodo." : "Consulta el seguimiento de producción y el rendimiento de los operarios por periodo."} />
      <section className="report-categories">
        {[
          ["produccion", "Producción", "Consulta las cantidades producidas y cada registro de producción."],
          ["ventas", "Ventas", "Consulta ventas, unidades, clientes y valores registrados."],
          ["rendimiento", "Rendimiento de operarios", "Consulta el % de cumplimiento de la meta de cada operario."],
        ].filter(([tipo]) => isAdmin || tipo !== "ventas").map(([tipo, titulo, descripcion]) => (
          <Panel key={tipo} title={`Reporte de ${titulo.toLowerCase()}`} className="report-category">
            <p>{descripcion}</p>
            <div className="report-periods">
              {periodos.map(([periodo, etiqueta]) => (
                <button
                  key={periodo}
                  className="report-period-button"
                  type="button"
                  onClick={() => abrirReporte(tipo, periodo)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </Panel>
        ))}
        {/* HU-023 / RF-026: las existencias son de hoy, por eso este reporte no lleva periodo */}
        <Panel title="Reporte de inventario" className="report-category">
          <p>Consulta las existencias actuales de producto terminado y de materias primas, con las que están por debajo del mínimo.</p>
          <div className="report-periods">
            <button className="report-period-button" type="button" onClick={() => abrirReporte("inventario")}>Ver existencias</button>
          </div>
        </Panel>
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
      <a className="primary-action secondary back-action" href="/dashboard.html#reportes">← Volver a reportes</a>
      <Intro title="Reporte de inventario" description="Existencias actuales de producto terminado y de materias primas, de menor a mayor cantidad." />
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
      <a className="primary-action secondary back-action" href="/dashboard.html#reportes">← Volver a reportes</a>
      <Intro
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
