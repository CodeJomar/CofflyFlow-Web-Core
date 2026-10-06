import type {
  CatalogoPos,
  ComandaDespachada,
  ComandaPayload,
  EstadoMesa,
  MesaPos,
  VentaPayload,
  VentaRegistrada,
} from "../schema"

// TODO: reemplazar por la consulta real al backend cuando esté disponible.
// Por ahora el POS trabaja solo en front con datos y estados en memoria.

const MESAS_INICIALES: MesaPos[] = [
  // Área: Salón
  { id: "m01", nombre: "Mesa 1", area: "salon", estado: "libre", capacidad: 4 },
  {
    id: "m02",
    nombre: "Mesa 2",
    area: "salon",
    estado: "ocupada",
    capacidad: 2,
    mozo: "Jomar Peralta",
    totalActual: 38.5,
    tiempoOcupada: "25 min",
  },
  { id: "m03", nombre: "Mesa 3", area: "salon", estado: "libre", capacidad: 4 },
  {
    id: "m04",
    nombre: "Mesa 4",
    area: "salon",
    estado: "por_cobrar",
    capacidad: 6,
    mozo: "Lucía Ramos",
    totalActual: 62.0,
    tiempoOcupada: "45 min",
  },
  { id: "m05", nombre: "Mesa 5", area: "salon", estado: "libre", capacidad: 2 },
  { id: "m06", nombre: "Mesa 6", area: "salon", estado: "libre", capacidad: 4 },

  // Área: Terraza
  { id: "m07", nombre: "Mesa 7", area: "terraza", estado: "libre", capacidad: 4 },
  {
    id: "m08",
    nombre: "Mesa 8",
    area: "terraza",
    estado: "ocupada",
    capacidad: 2,
    mozo: "Carlos Mendoza",
    totalActual: 24.5,
    tiempoOcupada: "15 min",
  },
  { id: "m09", nombre: "Mesa 9", area: "terraza", estado: "libre", capacidad: 4 },
  { id: "m10", nombre: "Mesa 10", area: "terraza", estado: "libre", capacidad: 6 },
  {
    id: "m11",
    nombre: "Mesa 11",
    area: "terraza",
    estado: "por_cobrar",
    capacidad: 2,
    mozo: "Andrea Paz",
    totalActual: 47.0,
    tiempoOcupada: "55 min",
  },

  // Área: Barra
  { id: "b01", nombre: "Barra 1", area: "barra", estado: "libre", capacidad: 1 },
  {
    id: "b02",
    nombre: "Barra 2",
    area: "barra",
    estado: "ocupada",
    capacidad: 1,
    mozo: "Jomar Peralta",
    totalActual: 12.0,
    tiempoOcupada: "10 min",
  },
  { id: "b03", nombre: "Barra 3", area: "barra", estado: "libre", capacidad: 1 },
  { id: "b04", nombre: "Barra 4", area: "barra", estado: "libre", capacidad: 2 },
]

const CATALOGO: CatalogoPos = {
  categorias: [
    { id: "calientes", nombre: "Bebidas calientes" },
    { id: "frias", nombre: "Bebidas frías" },
    { id: "panaderia", nombre: "Panadería" },
    { id: "salados", nombre: "Salados" },
    { id: "postres", nombre: "Postres" },
    { id: "piqueos", nombre: "Piqueos" },
  ],
  productos: [
    {
      id: "p01",
      nombre: "Espresso",
      descripcion: "Shot intenso de café de altura",
      precio: 6,
      categoriaId: "calientes",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p02",
      nombre: "Americano Doble",
      descripcion: "Doble espresso con agua caliente",
      precio: 7,
      categoriaId: "calientes",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p03",
      nombre: "Capuccino",
      descripcion: "Espresso, leche vaporizada y espuma",
      precio: 9,
      categoriaId: "calientes",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p04",
      nombre: "Latte Vainilla",
      descripcion: "Leche cremosa con jarabe de vainilla",
      precio: 10.5,
      categoriaId: "calientes",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p05",
      nombre: "Chocolate Caliente",
      descripcion: "Cacao peruano al 70% con leche",
      precio: 9.5,
      categoriaId: "calientes",
      disponible: false,
      permitePersonalizacion: true,
    },
    {
      id: "p06",
      nombre: "Frappé de Caramelo",
      descripcion: "Café helado, caramelo y crema",
      precio: 12,
      categoriaId: "frias",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p07",
      nombre: "Cold Brew",
      descripcion: "Infusión en frío por 18 horas",
      precio: 11,
      categoriaId: "frias",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p08",
      nombre: "Limonada Frozen",
      descripcion: "Limón, hierbabuena y hielo frappé",
      precio: 8.5,
      categoriaId: "frias",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p09",
      nombre: "Croissant Artesanal",
      descripcion: "Masa hojaldrada con mantequilla",
      precio: 7,
      categoriaId: "panaderia",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p10",
      nombre: "Pan de Chocolate",
      descripcion: "Hojaldre relleno de chocolate",
      precio: 7.5,
      categoriaId: "panaderia",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p11",
      nombre: "Empanada de Carne",
      descripcion: "Horneada, rellena de carne jugosa",
      precio: 8,
      categoriaId: "panaderia",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p12",
      nombre: "Sándwich Triple",
      descripcion: "Palta, tomate y huevo en pan de molde",
      precio: 10.5,
      categoriaId: "salados",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p13",
      nombre: "Butifarra",
      descripcion: "Jamón del país con salsa criolla",
      precio: 12,
      categoriaId: "salados",
      disponible: true,
      permitePersonalizacion: true,
    },
    {
      id: "p14",
      nombre: "Tostadas con Palta",
      descripcion: "Pan masa madre, palta y semillas",
      precio: 13,
      categoriaId: "salados",
      disponible: false,
      permitePersonalizacion: true,
    },
    {
      id: "p15",
      nombre: "Cheesecake de Maracuyá",
      descripcion: "Base crocante y coulis de maracuyá",
      precio: 11.5,
      categoriaId: "postres",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p16",
      nombre: "Torta de Chocolate",
      descripcion: "Bizcocho húmedo con fudge",
      precio: 10,
      categoriaId: "postres",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p17",
      nombre: "Alfajor de Maicena",
      descripcion: "Relleno de manjar blanco",
      precio: 4.5,
      categoriaId: "postres",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p18",
      nombre: "Tequeños de Queso",
      descripcion: "6 unidades con salsa de guacamole",
      precio: 14,
      categoriaId: "piqueos",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p19",
      nombre: "Empanada de Carne",
      descripcion: "Masa hojaldrada y relleno jugoso",
      precio: 7.5,
      categoriaId: "piqueos",
      disponible: true,
      permitePersonalizacion: false,
    },
    {
      id: "p20",
      nombre: "Papas Nativas",
      descripcion: "Crocantes, con ají de la casa",
      precio: 12,
      categoriaId: "piqueos",
      disponible: true,
      permitePersonalizacion: false,
    },
  ],
  mesas: MESAS_INICIALES,
}

// Correlativos en memoria
let correlativoVenta = 1048
let correlativoComanda = 205

const redondear = (valor: number) => Math.round(valor * 100) / 100

export async function getCatalogoPos(): Promise<CatalogoPos> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  return CATALOGO
}

/* -------------------------------------------------------------------------- */
/*          RF-09 / RF-10: Sincronización en vivo del catálogo (Menú → POS)    */
/* -------------------------------------------------------------------------- */

// TODO: reemplazar por WebSockets / SSE del backend. Mientras tanto, BroadcastChannel
// propaga los cambios del Menú a todos los terminales POS abiertos en el navegador.
const CANAL_CATALOGO = "coffly-flow:catalogo"

export interface CambioCatalogo {
  categorias: CatalogoPos["categorias"]
  productos: CatalogoPos["productos"]
}

export function notificarCambioCatalogo() {
  if (typeof BroadcastChannel === "undefined") return
  const canal = new BroadcastChannel(CANAL_CATALOGO)
  canal.postMessage({ categorias: CATALOGO.categorias, productos: CATALOGO.productos } satisfies CambioCatalogo)
  canal.close()
}

export function suscribirseCambiosCatalogo(callback: (cambio: CambioCatalogo) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {}
  const canal = new BroadcastChannel(CANAL_CATALOGO)
  canal.onmessage = (event: MessageEvent<CambioCatalogo>) => {
    // Mantiene alineada la copia en memoria de esta pestaña
    CATALOGO.categorias = event.data.categorias
    CATALOGO.productos = event.data.productos
    callback(event.data)
  }
  return () => canal.close()
}

/**
 * RF-06: Despacha la orden directamente a cocina/barra.
 * Cambia el estado visual de la mesa asociada a "ocupada" y registra al mozo emisor.
 */
export async function despacharComandaCocina(payload: ComandaPayload): Promise<ComandaDespachada> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  if (payload.items.length === 0) {
    throw new Error("No hay productos en la comanda para enviar a cocina.")
  }

  correlativoComanda += 1

  // Actualizar estado de la mesa en memoria
  if (payload.mesaId) {
    const mesaEncontrada = CATALOGO.mesas.find((m) => m.id === payload.mesaId || m.nombre === payload.mesaNombre)
    if (mesaEncontrada) {
      mesaEncontrada.estado = "ocupada"
      mesaEncontrada.mozo = payload.mozoEmisor
      mesaEncontrada.tiempoOcupada = "Recién enviada"
    }
  }

  const hora = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })

  return {
    codigoComanda: `COM-${correlativoComanda}`,
    mesa: payload.mesaNombre || (payload.tipoPedido === "llevar" ? "Para llevar" : "Mesa"),
    mozoEmisor: payload.mozoEmisor,
    horaEnvio: hora,
    itemsTotal: payload.items.reduce((acc, i) => acc + i.cantidad, 0),
  }
}

/**
 * Permite cambiar el estado de una mesa manualmente (libre, ocupada, por_cobrar)
 */
export async function actualizarEstadoMesa(mesaId: string, nuevoEstado: EstadoMesa): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const mesa = CATALOGO.mesas.find((m) => m.id === mesaId)
  if (mesa) {
    mesa.estado = nuevoEstado
    if (nuevoEstado === "libre") {
      mesa.mozo = undefined
      mesa.totalActual = undefined
      mesa.tiempoOcupada = undefined
    }
  }
}

export async function registrarVenta(payload: VentaPayload): Promise<VentaRegistrada> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  if (payload.items.length === 0) throw new Error("El ticket está vacío.")

  correlativoVenta += 1
  const recibido = payload.metodoPago === "efectivo" ? payload.montoRecibido ?? payload.total : payload.total

  // Si se cobra una mesa, dejarla libre en el mapa
  if (payload.mesa) {
    const mesa = CATALOGO.mesas.find((m) => m.nombre === payload.mesa)
    if (mesa) {
      mesa.estado = "libre"
      mesa.mozo = undefined
      mesa.totalActual = undefined
      mesa.tiempoOcupada = undefined
    }
  }

  return {
    codigo: `#${correlativoVenta}`,
    total: payload.total,
    vuelto: redondear(Math.max(recibido - payload.total, 0)),
    metodoPago: payload.metodoPago,
    registradaEn: new Date().toISOString(),
  }
}
