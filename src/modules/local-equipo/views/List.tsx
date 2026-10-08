"use client"

import * as React from "react"
import {
  Crown,
  Lock,
  MailCheck,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  Users,
} from "lucide-react"

import { useCan } from "@/modules/auth"
import { usePaginacionAjustada } from "@/shared/hooks"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyContent, EmptyDescription } from "@/shared/components/ui/empty"
import { Input } from "@/shared/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ACCION, MODULO } from "@/shared/constants/permisos"
import { useConfirm } from "@/shared/providers/confirm-provider"
import { cn } from "@/shared/utils/cn"
import { formatDateStrict } from "@/shared/utils/formatters"

import { usePersonal, usePlanoMesas, useRoles } from "../hooks"
import {
  ESTADO_EMPLEADO_CONFIG,
  ESTADO_MESA_CONFIG,
  botonIcono,
  botonPrimario,
  getAreaConfig,
  getRolVisual,
  selectClass,
  tarjetaClass,
} from "../components"
import {
  FILTRO_TODAS_LAS_AREAS,
  areaDeMesa,
  estadoEmpleadoSchema,
  type Empleado,
  type FiltroEstadoEmpleado,
  type Mesa,
  type Rol,
  type RolDetalle,
} from "../schema"
import EmpleadoForm, { EncabezadoSeccion, MesaForm, RolForm } from "./Form"

// Altos fijos de cada tarjeta: permiten calcular cuántas caben sin scroll en cualquier pantalla
const ALTO_EMPLEADO = 160
const ALTO_ROL = 150
const ALTO_MESA = 128

// Cada vista ocupa exactamente el alto disponible del workspace: sin scroll vertical ni horizontal
const vistaClass = "flex h-full min-h-0 flex-col gap-4 overflow-hidden"

const iniciales = (nombre: string) => {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : (partes[0]?.[1] ?? ""))).toUpperCase()
}

/* -------------------------------------------------------------------------- */
/*                Gestión de personal y asignación de cargos                  */
/* -------------------------------------------------------------------------- */

type ModalPersonal = { modo: "registrar" } | { modo: "editar"; empleado: Empleado } | null

export function PersonalView() {
  // Entrar a la pantalla lo exige la ruta (USERS:LEER); aquí se decide qué más puede hacer cada cargo
  const { puede } = useCan()
  const puedeRegistrar = puede({ modulo: MODULO.USERS, accion: ACCION.CREAR })
  const puedeEditar = puede({ modulo: MODULO.USERS, accion: ACCION.EDITAR })
  const puedeDarDeBaja = puede({ modulo: MODULO.USERS, accion: ACCION.ELIMINAR })
  const confirm = useConfirm()

  const personal = usePersonal()
  const [modal, setModal] = React.useState<ModalPersonal>(null)
  const cerrarModal = React.useCallback(() => setModal(null), [])

  const paginacion = usePaginacionAjustada(personal.empleadosFiltrados, {
    altoItem: ALTO_EMPLEADO,
    anchoMinimo: 280,
    clave: `${personal.busqueda}|${personal.rol}|${personal.estado}`,
  })

  const { cargos, empleados, empleadosFiltrados, conteoPorEstado, cargado, error, recargar } = personal

  return (
    <div className={vistaClass}>
      <EncabezadoSeccion
        titulo="Gestión de Empleados"
        descripcion="Registra, actualiza y da de baja al personal, vinculándolo a su cargo."
        acciones={
          puedeRegistrar && (
            <Button
              type="button"
              size="sm"
              onClick={() => setModal({ modo: "registrar" })}
              disabled={!cargado || cargos.length === 0}
              leftIcon={<UserPlus className="size-4" />}
              aria-label="Registrar empleado"
              className={botonPrimario}
            >
              <span className="hidden sm:inline">Registrar Empleado</span>
            </Button>
          )
        }
      />

      {/* Filtros */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
          <Input
            type="search"
            value={personal.busqueda}
            onChange={(e) => personal.setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o cargo…"
            aria-label="Buscar empleado"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <NativeSelect
            value={personal.rol}
            onChange={(e) => personal.setRol(e.target.value)}
            aria-label="Filtrar por cargo"
            className={cn("w-full sm:w-44", selectClass)}
          >
            <NativeSelectOption value="todos">Todos los cargos</NativeSelectOption>
            {cargos.map((c) => (
              <NativeSelectOption key={c.id_rol} value={c.id_rol}>
                {c.nombre}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={personal.estado}
            onChange={(e) => personal.setEstado(e.target.value as FiltroEstadoEmpleado)}
            aria-label="Filtrar por estado"
            className={cn("w-full sm:w-44", selectClass)}
          >
            <NativeSelectOption value="todos">Todos ({empleados.length})</NativeSelectOption>
            {estadoEmpleadoSchema.options.map((estado) => (
              <NativeSelectOption key={estado} value={estado}>
                {ESTADO_EMPLEADO_CONFIG[estado].label} ({conteoPorEstado.get(estado) ?? 0})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !cargado ? (
        <GrillaSkeleton />
      ) : empleadosFiltrados.length === 0 ? (
        <SinResultados texto="No hay empleados que coincidan con los filtros." onLimpiar={personal.limpiarFiltros} />
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta="Empleados">
            {paginacion.visibles.map((empleado) => (
              <li key={empleado.id_usuario} className="min-h-0">
                <EmpleadoCard
                  empleado={empleado}
                  puedeEditar={puedeEditar}
                  puedeDarDeBaja={puedeDarDeBaja}
                  onEditar={(e) => setModal({ modo: "editar", empleado: e })}
                  onDarDeBaja={async (e) => {
                    if (await confirm({ variant: "destructive" })) await personal.darDeBaja(e)
                  }}
                  onCambiarEstado={personal.cambiarEstado}
                  onReenviar={personal.reenviar}
                />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="empleados" />
        </>
      )}

      {modal && (
        <EmpleadoForm
          empleado={modal.modo === "editar" ? modal.empleado : undefined}
          cargos={cargos}
          onGuardar={personal.guardarEmpleado}
          onClose={cerrarModal}
        />
      )}
    </div>
  )
}

function EmpleadoCard({
  empleado,
  puedeEditar,
  puedeDarDeBaja,
  onEditar,
  onDarDeBaja,
  onCambiarEstado,
  onReenviar,
}: {
  empleado: Empleado
  puedeEditar: boolean
  puedeDarDeBaja: boolean
  onEditar: (empleado: Empleado) => void
  onDarDeBaja: (empleado: Empleado) => Promise<void>
  onCambiarEstado: (empleado: Empleado, estado: "activo" | "suspendido") => Promise<boolean>
  onReenviar: (empleado: Empleado) => Promise<boolean>
}) {
  const [ocupado, setOcupado] = React.useState(false)
  const estado = ESTADO_EMPLEADO_CONFIG[empleado.estado]
  const visual = getRolVisual(empleado.rol_nombre ?? "")
  const IconoRol = visual.icon
  const esDueno = empleado.tipo_cuenta === "OWNER"
  const deBaja = empleado.estado === "inactivo"
  const puedeReactivar = empleado.estado === "inactivo" || empleado.estado === "suspendido"
  const puedeSuspender = empleado.estado === "activo"
  const pendiente = empleado.estado === "pendiente_activacion"

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setOcupado(true)
    await accion()
    setOcupado(false)
  }

  return (
    <article className={cn(tarjetaClass, "gap-3", deBaja && "opacity-70")}>
      <div className="flex items-start gap-3">
        <Avatar className="size-11">
          <AvatarFallback className={cn("text-sm", visual.className)}>{iniciales(empleado.nombre)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{empleado.nombre}</h3>
            {esDueno && <Crown className="size-3.5 shrink-0 text-amber-500" aria-label="Dueño" />}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-stone-400">{empleado.email}</p>
        </div>
        <Badge variant="estado" className={cn("shrink-0 px-2 text-[11px]", estado.className)}>
          {estado.label}
        </Badge>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <Badge variant="estado" className={cn("max-w-full gap-1 px-2 text-[11px]", visual.className)}>
          <IconoRol className="size-3 shrink-0" />
          <span className="truncate">{empleado.rol_nombre ?? (esDueno ? "Propietario" : "Sin cargo asignado")}</span>
        </Badge>
        {esDueno && (
          <Badge variant="estado" className="bg-amber-50 px-2 text-[11px] text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Dueño
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-stone-800">
        <span className="truncate text-[11px] text-slate-400 dark:text-stone-500">
          Registrado el {formatDateStrict(empleado.fecha_creacion)}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {puedeEditar && !esDueno && pendiente && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void ejecutar(() => onReenviar(empleado))}
              aria-label={`Reenviar activación a ${empleado.nombre}`}
              title="Reenviar correo de activación"
              className={cn(botonIcono, "hover:text-sky-700 dark:hover:text-sky-300")}
            >
              <MailCheck className={cn("size-4", ocupado && "animate-pulse")} />
            </button>
          )}
          {puedeEditar && !esDueno && (
            <button type="button" onClick={() => onEditar(empleado)} aria-label={`Editar ${empleado.nombre}`} className={botonIcono}>
              <Pencil className="size-4" />
            </button>
          )}
          {puedeEditar && !esDueno && puedeSuspender && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void ejecutar(() => onCambiarEstado(empleado, "suspendido"))}
              aria-label={`Suspender a ${empleado.nombre}`}
              title="Suspender"
              className={cn(botonIcono, "hover:text-amber-700 dark:hover:text-amber-400")}
            >
              <UserX className={cn("size-4", ocupado && "animate-pulse")} />
            </button>
          )}
          {puedeEditar && !esDueno && puedeReactivar && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void ejecutar(() => onCambiarEstado(empleado, "activo"))}
              aria-label={`Reactivar a ${empleado.nombre}`}
              title="Reactivar"
              className={cn(botonIcono, "hover:text-emerald-700 dark:hover:text-emerald-400")}
            >
              <UserCheck className={cn("size-4", ocupado && "animate-pulse")} />
            </button>
          )}
          {puedeDarDeBaja && !esDueno && !deBaja && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void ejecutar(() => onDarDeBaja(empleado))}
              aria-label={`Dar de baja a ${empleado.nombre}`}
              title="Dar de baja"
              className={cn(botonIcono, "hover:text-red-600 dark:hover:text-red-400")}
            >
              <UserMinus className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Roles (cargos) y permisos                          */
/* -------------------------------------------------------------------------- */

type VistaRoles = { modo: "lista" } | { modo: "crear" } | { modo: "editar"; rol: RolDetalle }

export function RolesPermisosView() {
  const { puede } = useCan()
  const puedeCrear = puede({ modulo: MODULO.ROLES, accion: ACCION.CREAR })
  const puedeEditar = puede({ modulo: MODULO.ROLES, accion: ACCION.EDITAR })
  const puedeEliminar = puede({ modulo: MODULO.ROLES, accion: ACCION.ELIMINAR })

  const roles = useRoles()
  const [vista, setVista] = React.useState<VistaRoles>({ modo: "lista" })
  const [abriendoId, setAbriendoId] = React.useState<string | null>(null)
  const volver = React.useCallback(() => setVista({ modo: "lista" }), [])

  // Ancho mínimo amplio: 2 columnas en escritorio como el diseño de referencia
  const paginacion = usePaginacionAjustada(roles.roles, { altoItem: ALTO_ROL, anchoMinimo: 400 })

  // Para ver o editar un rol hacen falta sus permisos, que vienen en el detalle
  const abrirRol = async (rol: Rol) => {
    setAbriendoId(rol.id_rol)
    const detalle = await roles.cargarDetalle(rol.id_rol)
    setAbriendoId(null)
    if (detalle) setVista({ modo: "editar", rol: detalle })
  }

  // Vista «Crear nuevo rol» / «Editar permisos» en la misma pantalla
  if (vista.modo !== "lista") {
    const rolEditado = vista.modo === "editar" ? vista.rol : undefined
    return (
      <RolForm
        key={rolEditado?.id_rol ?? "nuevo"}
        rol={rolEditado}
        catalogo={roles.catalogo}
        puedeEditar={rolEditado ? puedeEditar : puedeCrear}
        puedeEliminar={puedeEliminar}
        empleadosAsignados={rolEditado?.total_usuarios ?? 0}
        onGuardar={roles.guardarRol}
        onEliminar={roles.quitarRol}
        onVolver={volver}
      />
    )
  }

  return (
    <div className={vistaClass}>
      <EncabezadoSeccion
        titulo="Gestión de Roles"
        descripcion="Define las responsabilidades y niveles de acceso para tu equipo en Coffy Flow."
        acciones={
          puedeCrear && (
            <Button
              type="button"
              size="sm"
              onClick={() => setVista({ modo: "crear" })}
              disabled={!roles.cargado || roles.catalogo.length === 0}
              leftIcon={<Plus className="size-4" />}
              aria-label="Crear nuevo rol"
              className={botonPrimario}
            >
              <span className="hidden sm:inline">Crear Nuevo Rol</span>
            </Button>
          )
        }
      />

      {roles.error ? (
        <ErrorState message={roles.error} onRetry={roles.recargar} />
      ) : !roles.cargado ? (
        <GrillaSkeleton />
      ) : roles.roles.length === 0 ? (
        <Empty className="min-h-0 flex-1">
          <Users className="size-8 text-slate-400 dark:text-stone-500" />
          <EmptyDescription>Aún no hay roles registrados.</EmptyDescription>
        </Empty>
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta="Roles operativos">
            {paginacion.visibles.map((r) => (
              <li key={r.id_rol} className="min-h-0">
                <RolCard
                  rol={r}
                  editable={puedeEditar}
                  abriendo={abriendoId === r.id_rol}
                  onAbrir={() => void abrirRol(r)}
                />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="roles" />
        </>
      )}
    </div>
  )
}

function RolCard({
  rol,
  editable,
  abriendo,
  onAbrir,
}: {
  rol: Rol
  editable: boolean
  abriendo: boolean
  onAbrir: () => void
}) {
  const visual = getRolVisual(rol.nombre)
  const Icono = visual.icon
  const empleados = rol.total_usuarios
  const subtitulo =
    empleados > 0 ? `${empleados} ${empleados === 1 ? "empleado asignado" : "empleados asignados"}` : "Sin empleados asignados"

  return (
    <article className={cn(tarjetaClass, "gap-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", visual.className)}>
            <Icono className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-base font-bold text-slate-900 dark:text-stone-100">{rol.nombre}</h3>
            <p
              className={cn(
                "flex items-center gap-1.5 truncate text-xs font-medium",
                empleados > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-stone-400"
              )}
            >
              <span
                className={cn("size-1.5 shrink-0 rounded-full", empleados > 0 ? "bg-emerald-500" : "bg-slate-300 dark:bg-stone-600")}
              />
              {subtitulo}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAbrir}
          disabled={abriendo}
          leftIcon={editable ? <Pencil className="size-3.5" /> : <Lock className="size-3.5" />}
          aria-label={editable ? `Editar permisos de ${rol.nombre}` : `Ver permisos de ${rol.nombre}`}
          className="h-8 shrink-0 gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-stone-700 dark:bg-transparent dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <span className="hidden sm:inline">{editable ? "Editar Permisos" : "Ver Permisos"}</span>
        </Button>
      </div>

      <p className="line-clamp-1 text-sm text-slate-600 dark:text-stone-300" title={rol.descripcion ?? undefined}>
        {rol.descripcion || "Sin descripción."}
      </p>

      <div className="h-px shrink-0 bg-slate-100 dark:bg-stone-800" />

      <p className="text-xs font-medium text-slate-500 tabular-nums dark:text-stone-400">
        {rol.total_permisos} {rol.total_permisos === 1 ? "permiso concedido" : "permisos concedidos"}
      </p>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                    Configuración del plano de mesas                        */
/* -------------------------------------------------------------------------- */

type ModalMesas = { modo: "registrar" } | { modo: "editar"; mesa: Mesa } | null

export function MesasView() {
  const { puede } = useCan()
  const puedeRegistrar = puede({ modulo: MODULO.TABLES, accion: ACCION.CREAR })
  const puedeEditar = puede({ modulo: MODULO.TABLES, accion: ACCION.EDITAR })
  const puedeEliminar = puede({ modulo: MODULO.TABLES, accion: ACCION.ELIMINAR })
  const confirm = useConfirm()

  const plano = usePlanoMesas()
  const [modal, setModal] = React.useState<ModalMesas>(null)
  const cerrarModal = React.useCallback(() => setModal(null), [])

  const paginacion = usePaginacionAjustada(plano.mesasFiltradas, {
    altoItem: ALTO_MESA,
    anchoMinimo: 190,
    clave: plano.areaFiltro,
  })

  const { mesas, areas, mesasFiltradas, mesasPorArea, resumen, isLoading, error, recargar } = plano

  return (
    <div className={vistaClass}>
      <EncabezadoSeccion
        titulo="Gestión de Mesas"
        descripcion="Registra, renombra o elimina las mesas del local y asígnalas a un área de atención."
        acciones={
          puedeRegistrar && (
            <Button
              type="button"
              size="sm"
              onClick={() => setModal({ modo: "registrar" })}
              disabled={isLoading}
              leftIcon={<Plus className="size-4" />}
              aria-label="Registrar nueva mesa"
              className={botonPrimario}
            >
              <span className="hidden sm:inline">Nueva Mesa</span>
            </Button>
          )
        }
      />

      {/* Filtro por área y resumen */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <NativeSelect
          value={plano.areaFiltro}
          onChange={(e) => plano.setAreaFiltro(e.target.value)}
          disabled={isLoading}
          aria-label="Filtrar por área de atención"
          className={cn("w-full min-w-0 sm:w-56", selectClass)}
        >
          <NativeSelectOption value={FILTRO_TODAS_LAS_AREAS}>Todas las áreas ({mesas.length})</NativeSelectOption>
          {areas.map((a) => (
            <NativeSelectOption key={a} value={a}>
              {a} ({mesasPorArea.get(a) ?? 0})
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="shrink-0 text-xs text-slate-500 tabular-nums dark:text-stone-400">
          {resumen.mesas} {resumen.mesas === 1 ? "mesa" : "mesas"} · {resumen.capacidad}{" "}
          <span className="hidden sm:inline">personas</span>
          <span className="sm:hidden">pers.</span>
        </p>
      </div>

      {!puedeEditar && (
        <p className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-300">
          <Lock className="size-3.5 shrink-0" />
          <span className="truncate">Tu cargo no puede modificar el plano de mesas.</span>
        </p>
      )}

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : isLoading ? (
        <GrillaSkeleton />
      ) : mesasFiltradas.length === 0 ? (
        <Empty className="min-h-0 flex-1">
          <MapPin className="size-8 text-slate-400 dark:text-stone-500" />
          <EmptyDescription>No hay mesas registradas en esta área.</EmptyDescription>
        </Empty>
      ) : (
        <>
          <GrillaAjustada paginacion={paginacion} etiqueta="Mesas del local">
            {paginacion.visibles.map((mesa) => (
              <li key={mesa.id_mesa} className="min-h-0">
                <MesaCard
                  mesa={mesa}
                  puedeEditar={puedeEditar}
                  puedeEliminar={puedeEliminar}
                  onEditar={(m) => setModal({ modo: "editar", mesa: m })}
                  onEliminar={async (m) => {
                    if (await confirm({ variant: "destructive" })) await plano.quitarMesa(m)
                  }}
                />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="mesas" />
        </>
      )}

      {modal && (
        <MesaForm
          mesa={modal.modo === "editar" ? modal.mesa : undefined}
          areas={areas.filter((a) => a !== "Sin área")}
          areaPorDefecto={plano.areaFiltro !== FILTRO_TODAS_LAS_AREAS ? plano.areaFiltro : undefined}
          onGuardar={plano.guardarMesa}
          onClose={cerrarModal}
        />
      )}
    </div>
  )
}

function MesaCard({
  mesa,
  puedeEditar,
  puedeEliminar,
  onEditar,
  onEliminar,
}: {
  mesa: Mesa
  puedeEditar: boolean
  puedeEliminar: boolean
  onEditar: (mesa: Mesa) => void
  onEliminar: (mesa: Mesa) => Promise<void>
}) {
  const estado = ESTADO_MESA_CONFIG[mesa.estado]
  const area = areaDeMesa(mesa)
  const areaConfig = getAreaConfig(area)
  const enUso = mesa.estado !== "libre"

  return (
    <article className={cn(tarjetaClass, "gap-2 p-3.5")}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-bold text-slate-900 dark:text-stone-100">{mesa.numero}</h3>
        <Badge variant="estado" className={cn("shrink-0 px-2 text-[11px]", estado.badge)}>
          {estado.label}
        </Badge>
      </div>

      <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-stone-400">
        <areaConfig.icon className="size-3.5 shrink-0" />
        <span className="truncate">{area}</span>
        <span>·</span>
        <Users className="size-3.5 shrink-0" />
        <span className="shrink-0">{mesa.capacidad}</span>
      </p>

      <div className="mt-auto flex min-h-8 items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-stone-800">
        {!puedeEditar && !puedeEliminar && (
          <span className="mr-auto text-[11px] text-slate-400 dark:text-stone-500">Solo lectura</span>
        )}
        {puedeEditar && (
          <button
            type="button"
            onClick={() => onEditar(mesa)}
            aria-label={`Editar ${mesa.numero}`}
            className={cn(botonIcono, "size-8")}
          >
            <Pencil className="size-4" />
          </button>
        )}
        {puedeEliminar && (
          <button
            type="button"
            onClick={() => void onEliminar(mesa)}
            disabled={enUso}
            title={enUso ? "Tiene un pedido en curso" : undefined}
            aria-label={`Eliminar ${mesa.numero}`}
            className={cn(botonIcono, "size-8 hover:text-red-600 dark:hover:text-red-400")}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Auxiliares                                 */
/* -------------------------------------------------------------------------- */

function SinResultados({ texto, onLimpiar }: { texto: string; onLimpiar: () => void }) {
  return (
    <Empty className="min-h-0 flex-1">
      <SearchX className="size-8 text-slate-400 dark:text-stone-500" />
      <EmptyDescription>{texto}</EmptyDescription>
      <EmptyContent>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLimpiar}
          className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Limpiar filtros
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty className="min-h-0 flex-1">
      <EmptyDescription>{message}</EmptyDescription>
      <EmptyContent>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-4" />}
          className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Reintentar
        </Button>
      </EmptyContent>
    </Empty>
  )
}

// Esqueleto que ocupa el espacio disponible sin desbordarlo
function GrillaSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 auto-rows-[136px] grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="rounded-2xl dark:bg-stone-800" />
      ))}
    </div>
  )
}
