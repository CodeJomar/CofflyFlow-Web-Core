import type {
  DashboardResumen,
  PedidoReciente,
  PeriodoDashboard,
  ProductoTop,
  VentaPorTramo,
} from "../schema"
import { formatToCurrency } from "@/shared/utils/formatters"

// TODO: reemplazar por la consulta real al backend cuando esté disponible.
// Por ahora el dashboard trabaja solo en front con datos de ejemplo.

const VENTAS_POR_PERIODO: Record<PeriodoDashboard, VentaPorTramo[]> = {
  hoy: [
    { tramo: "07:00", ventas: 85, pedidos: 6 },
    { tramo: "08:00", ventas: 210.5, pedidos: 15 },
    { tramo: "09:00", ventas: 184, pedidos: 12 },
    { tramo: "10:00", ventas: 126, pedidos: 9 },
    { tramo: "11:00", ventas: 98.5, pedidos: 7 },
    { tramo: "12:00", ventas: 236, pedidos: 14 },
    { tramo: "13:00", ventas: 248.5, pedidos: 16 },
    { tramo: "14:00", ventas: 142, pedidos: 10 },
    { tramo: "15:00", ventas: 90, pedidos: 6 },
  ],
  semana: [
    { tramo: "Lun", ventas: 1180, pedidos: 82 },
    { tramo: "Mar", ventas: 1325.5, pedidos: 91 },
    { tramo: "Mié", ventas: 1240, pedidos: 86 },
    { tramo: "Jue", ventas: 1410, pedidos: 97 },
    { tramo: "Vie", ventas: 1680.5, pedidos: 118 },
    { tramo: "Sáb", ventas: 1925, pedidos: 131 },
    { tramo: "Dom", ventas: 1420.5, pedidos: 99 },
  ],
  mes: [
    { tramo: "Sem 1", ventas: 8640, pedidos: 602 },
    { tramo: "Sem 2", ventas: 9120.5, pedidos: 631 },
    { tramo: "Sem 3", ventas: 8875, pedidos: 615 },
    { tramo: "Sem 4", ventas: 10181, pedidos: 704 },
  ],
}

const PEDIDOS_RECIENTES: PedidoReciente[] = [
  { id: "1", codigo: "#1048", mesa: "Mesa 4", cliente: "Lucía R.", total: 38.5, estado: "preparacion", hora: "14:52" },
  { id: "2", codigo: "#1047", mesa: "Para llevar", cliente: "Carlos M.", total: 15, estado: "pendiente", hora: "14:49" },
  { id: "3", codigo: "#1046", mesa: "Mesa 9", cliente: "Andrea P.", total: 62, estado: "listo", hora: "14:41" },
  { id: "4", codigo: "#1045", mesa: "Mesa 2", cliente: "Jorge T.", total: 24.5, estado: "entregado", hora: "14:33" },
  { id: "5", codigo: "#1044", mesa: "Mesa 12", cliente: "Valeria S.", total: 47, estado: "entregado", hora: "14:20" },
  { id: "6", codigo: "#1043", mesa: "Para llevar", cliente: "Miguel A.", total: 12.5, estado: "cancelado", hora: "14:12" },
]

const PRODUCTOS_TOP: ProductoTop[] = [
  { id: "1", nombre: "Americano Doble", categoria: "Bebidas calientes", unidades: 48, ingresos: 336 },
  { id: "2", nombre: "Capuccino", categoria: "Bebidas calientes", unidades: 39, ingresos: 351 },
  { id: "3", nombre: "Croissant Artesanal", categoria: "Panadería", unidades: 31, ingresos: 217 },
  { id: "4", nombre: "Frappé de Caramelo", categoria: "Bebidas frías", unidades: 24, ingresos: 288 },
  { id: "5", nombre: "Sándwich Triple", categoria: "Salados", unidades: 18, ingresos: 189 },
]

const ESCALA_PERIODO: Record<PeriodoDashboard, number> = { hoy: 1, semana: 7, mes: 30 }

const DETALLE_PERIODO: Record<PeriodoDashboard, string> = {
  hoy: "vs. ayer",
  semana: "vs. semana anterior",
  mes: "vs. mes anterior",
}

const MESAS_TOTALES = 15

// Referencias del día anterior para calcular la variación de las métricas diarias
const VENTAS_AYER = 1263.8
const TICKET_AYER = 15.4

const sumar = (tramos: VentaPorTramo[], key: "ventas" | "pedidos") =>
  tramos.reduce((acc, t) => acc + t[key], 0)

const BASE_VENTAS_HOY = sumar(VENTAS_POR_PERIODO.hoy, "ventas")
const BASE_PEDIDOS_HOY = sumar(VENTAS_POR_PERIODO.hoy, "pedidos")

// Estado en memoria que emula la operación en vivo del local.
// Cada consulta avanza la simulación como si llegaran nuevos pedidos.
const enVivo = {
  ventasHoy: BASE_VENTAS_HOY,
  pedidosHoy: BASE_PEDIDOS_HOY,
  pedidosEnCola: 12,
  mesasOcupadas: 8,
}

const aleatorioEntero = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const limitar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max)
const redondear = (valor: number) => Math.round(valor * 100) / 100

function simularActividad() {
  const nuevosPedidos = aleatorioEntero(0, 2)
  const pedidosAtendidos = aleatorioEntero(0, 2)

  enVivo.pedidosHoy += nuevosPedidos
  enVivo.ventasHoy = redondear(enVivo.ventasHoy + nuevosPedidos * aleatorioEntero(9, 28))
  enVivo.pedidosEnCola = limitar(enVivo.pedidosEnCola + nuevosPedidos - pedidosAtendidos, 0, 30)
  enVivo.mesasOcupadas = limitar(enVivo.mesasOcupadas + aleatorioEntero(-1, 1), 0, MESAS_TOTALES)
}

const variacion = (actual: number, anterior: number) =>
  anterior ? redondear(((actual - anterior) / anterior) * 100) : null

export async function getDashboardResumen(periodo: PeriodoDashboard): Promise<DashboardResumen> {
  // Simula la latencia de red para poder visualizar el estado de carga
  await new Promise((resolve) => setTimeout(resolve, 350))

  simularActividad()

  // Lo vendido en vivo hoy se suma al último tramo de cada periodo
  const ventasDelta = enVivo.ventasHoy - BASE_VENTAS_HOY
  const pedidosDelta = enVivo.pedidosHoy - BASE_PEDIDOS_HOY
  const tramos = VENTAS_POR_PERIODO[periodo]
  const ventas = tramos.map((t, i) =>
    i === tramos.length - 1
      ? { ...t, ventas: redondear(t.ventas + ventasDelta), pedidos: t.pedidos + pedidosDelta }
      : t
  )

  const ventasAcumuladas = sumar(ventas, "ventas")
  const pedidosPeriodo = sumar(ventas, "pedidos")
  const ticketDiario = enVivo.pedidosHoy ? enVivo.ventasHoy / enVivo.pedidosHoy : 0
  const ocupacion = Math.round((enVivo.mesasOcupadas / MESAS_TOTALES) * 100)
  const escala = ESCALA_PERIODO[periodo]

  return {
    periodo,
    actualizadoEn: new Date().toISOString(),
    kpis: [
      {
        id: "ventas",
        titulo: "Ventas acumuladas",
        valor: formatToCurrency(ventasAcumuladas),
        detalle: DETALLE_PERIODO[periodo],
        variacion:
          periodo === "hoy" ? variacion(ventasAcumuladas, VENTAS_AYER) : periodo === "semana" ? 8.1 : 5.6,
      },
      {
        id: "pedidos",
        titulo: "Pedidos en cola",
        valor: String(enVivo.pedidosEnCola),
        detalle: `${pedidosPeriodo} pedidos en el periodo`,
        variacion: null,
      },
      {
        id: "mesas",
        titulo: "Mesas ocupadas",
        valor: `${ocupacion}%`,
        detalle: `${enVivo.mesasOcupadas} de ${MESAS_TOTALES} mesas`,
        variacion: null,
      },
      {
        id: "ticket",
        titulo: "Ticket promedio diario",
        valor: formatToCurrency(ticketDiario),
        detalle: "vs. ayer",
        variacion: variacion(ticketDiario, TICKET_AYER),
      },
    ],
    ventas,
    pedidosRecientes: PEDIDOS_RECIENTES,
    productosTop: PRODUCTOS_TOP.map((p) => ({
      ...p,
      unidades: p.unidades * escala,
      ingresos: p.ingresos * escala,
    })),
    caja: {
      abierta: true,
      responsable: "Jomar Peralta",
      apertura: "07:00",
      montoInicial: 200,
      efectivo: redondear(642.5 + ventasDelta * 0.45),
      digital: redondear(778 + ventasDelta * 0.55),
    },
  }
}
