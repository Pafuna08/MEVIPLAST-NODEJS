import React from "react";
import { DataTable, Intro, Panel } from "../comun/componentes.jsx";

export function Operators({ data }) {
  return (
    <>
      <Intro title="Operarios" description="Disponibilidad basada en órdenes activas." />
      <Panel title="Equipo de producción"><DataTable columns={["Nombre", "Usuario", "Órdenes activas"]} rows={data.operators.map((operator) => ({
        key: operator.id,
        cells: <><td>{operator.nombre}</td><td>{operator.usuario}</td><td>{data.orders.filter((order) => Number(order.responsable_id) === Number(operator.id) && ["pendiente", "en_proceso"].includes(order.estado)).length}</td></>,
      }))} /></Panel>
    </>
  );
}
