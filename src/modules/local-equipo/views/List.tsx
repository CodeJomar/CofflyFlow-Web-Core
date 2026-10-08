"use client"

import * as React from "react"
import {
  Crown,
  Lock,
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
  Users,
} from "lucide-react"

import { useEntityDelete, usePaginacionAjustada } from "@/shared/hooks"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/components/ui/empty"
import { Input } from "@/shared/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { toast } from "@/shared/components/ui/toast"
import { cn } from "@/shared/utils/cn"
import { formatDateStrict } from "@/shared/utils/formatters"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import { eliminarMesa } from "../actions/local-equipo.actions"
import { usePersonal, usePlanoMesas, useRoles } from "../hooks"
import {
  ESTADO_EMPLEADO_CONFIG,
  ESTADO_MESA_CONFIG,
  botonIcono,
  botonPrimario,
  botonSecundario,
  getAreaIcon,
  getRolVisual,
  selectClass,
  tarjetaClass,
} from "../components"
import { estadoEmpleadoSchema, type Empleado, type FiltroEstadoEmpleado, type Mesa, type Rol } from "../schema"
import EmpleadoForm, {
  AreasForm,
  BajaEmpleadoForm,
  ChipsModulos,
  EncabezadoSeccion,
  MesaForm,
  RolForm,
} from "./Form"

// Altos fijos de cada tarjeta: permiten calcular cuántas caben sin scroll en cualquier pantalla
const ALTO_EMPLEADO = 160
const ALTO_ROL = 216
const ALTO_MESA = 128

// Cada vista ocupa exactamente el alto disponible del workspace: sin scroll vertical ni horizontal
const vistaClass = "flex h-full min-h-0 flex-col gap-4 overflow-hidden"

const iniciales = (nombre: string) => {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : (partes[0]?.[1] ?? ""))).toUpperCase()
}

/* -------------------------------------------------------------------------- */
/*            RF-11: Gestión de Personal y Asignación de Roles                */
/* -------------------------------------------------------------------------- */

type ModalPersonal = { modo: "registrar" } | { modo: "editar"; empleado: Empleado } | { modo: "baja"; empleado: Empleado } | null

export function PersonalView() {
  const { rol } = useWorkspaceLayout()
  const puedeVer = tienePermiso(rol, PERMISO.READ_STAFF)
  const puedeRegistrar = tienePermiso(rol, PERMISO.CREATE_STAFF)
  const puedeEditar = tienePermiso(rol, PERMISO.UPDATE_STAFF)
  const puedeDarDeBaja = tienePermiso(rol, PERMISO.DELETE_STAFF)

  const personal = usePersonal()
  const [modal, setModal] = React.useState<ModalPersonal>(null)
  const cerrarModal = React.useCallback(() => setModal(null), [])

  const paginacion = usePaginacionAjustada(personal.empleadosFiltrados, {
    altoItem: ALTO_EMPLEADO,
    anchoMinimo: 280,
    clave: `${personal.busqueda}|${personal.rol}|${personal.estado}`,
  })

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} seccion="la gestión de personal" />

  const { roles, rolesPorId, empleados, empleadosFiltrados, conteoPorEstado, cargado, error, recargar } = personal

  return (
    <div className={vistaClass}>
      <EncabezadoSeccion
        titulo="Gestión de Empleados"
        descripcion="Registra, actualiza y da de baja al personal, vinculándolo a su rol operativo."
        acciones={
          puedeRegistrar && (
            <Button
              type="button"
              size="sm"
              onClick={() => setModal({ modo: "registrar" })}
              disabled={!cargado || roles.length === 0}
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
            placeholder="Buscar por nombre, correo o rol…"
            aria-label="Buscar empleado"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <NativeSelect
            value={personal.rol}
            onChange={(e) => personal.setRol(e.target.value)}
            aria-label="Filtrar por rol"
            className={cn("w-full sm:w-44", selectClass)}
          >
            <NativeSelectOption value="todos">Todos los roles</NativeSelectOption>
            {roles.map((r) => (
              <NativeSelectOption key={r.id} value={r.id}>
                {r.nombre}
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
              <li key={empleado.id} className="min-h-0">
                <EmpleadoCard
                  empleado={empleado}
                  rol={empleado.idRol ? rolesPorId.get(empleado.idRol) : undefined}
                  puedeEditar={puedeEditar}
                  puedeDarDeBaja={puedeDarDeBaja}
                  onEditar={(e) => setModal({ modo: "editar", empleado: e })}
                  onDarDeBaja={(e) => setModal({ modo: "baja", empleado: e })}
                  onReactivar={personal.reactivar}
                />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="empleados" />
        </>
      )}

      {(modal?.modo === "registrar" || modal?.modo === "editar") && (
        <EmpleadoForm
          empleado={modal.modo === "editar" ? modal.empleado : undefined}
          roles={roles}
          onGuardado={personal.empleadoGuardado}
          onClose={cerrarModal}
        />
      )}

      {modal?.modo === "baja" && (
        <BajaEmpleadoForm empleado={modal.empleado} onDadoDeBaja={personal.empleadoDadoDeBaja} onClose={cerrarModal} />
      )}
    </div>
  )
}

function EmpleadoCard({
  empleado,
  rol,
  puedeEditar,
  puedeDarDeBaja,
  onEditar,
  onDarDeBaja,
  onReactivar,
}: {
  empleado: Empleado
  rol?: Rol
  puedeEditar: boolean
  puedeDarDeBaja: boolean
  onEditar: (empleado: Empleado) => void
  onDarDeBaja: (empleado: Empleado) => void
  onReactivar: (empleado: Empleado) => Promise<void>
}) {
  const [reactivando, setReactivando] = React.useState(false)
  const estado = ESTADO_EMPLEADO_CONFIG[empleado.estado]
  const visual = getRolVisual(rol?.nombre ?? "")
  const IconoRol = visual.icon
  const esDueno = empleado.tipoCuenta === "OWNER"
  const deBaja = empleado.estado === "inactivo"
  const puedeReactivar = empleado.estado === "inactivo" || empleado.estado === "suspendido"

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
          <span className="truncate">{rol?.nombre ?? "Sin rol asignado"}</span>
        </Badge>
        {esDueno && (
          <Badge variant="estado" className="bg-amber-50 px-2 text-[11px] text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Dueño
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-stone-800">
        <span className="truncate text-[11px] text-slate-400 dark:text-stone-500">
          Registrado el {formatDateStrict(empleado.fechaCreacion)}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {puedeEditar && (
            <button type="button" onClick={() => onEditar(empleado)} aria-label={`Editar ${empleado.nombre}`} className={botonIcono}>
              <Pencil className="size-4" />
            </button>
          )}
          {puedeDarDeBaja && !esDueno && puedeReactivar && (
            <button
              type="button"
              disabled={reactivando}
              onClick={async () => {
                setReactivando(true)
                await onReactivar(empleado)
                setReactivando(false)
              }}
              aria-label={`Reactivar a ${empleado.nombre}`}
              title="Reactivar"
              className={cn(botonIcono, "hover:text-emerald-700 dark:hover:text-emerald-400")}
            >
              <UserCheck className={cn("size-4", reactivando && "animate-pulse")} />
            </button>
          )}
          {puedeDarDeBaja && !esDueno && !deBaja && (
            <button
              type="button"
              onClick={() => onDarDeBaja(empleado)}
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
/*                     Gestión de Roles y Permisos                            */
/* -------------------------------------------------------------------------- */

type VistaRoles = { modo: "lista" } | { modo: "crear" } | { modo: "editar"; rol: Rol }

export function RolesPermisosView() {
  const { rol } = useWorkspaceLayout()
  const puedeVer = tienePermiso(rol, PERMISO.READ_STAFF)
  const puedeCrear = tienePermiso(rol, PERMISO.CREATE_STAFF)
  const puedeEditar = tienePermiso(rol, PERMISO.UPDATE_STAFF)
  const puedeEliminar = tienePermiso(rol, PERMISO.DELETE_STAFF)

  const roles = useRoles()
  const [vista, setVista] = React.useState<VistaRoles>({ modo: "lista" })
  const volver = React.useCallback(() => setVista({ modo: "lista" }), [])

  // Ancho mínimo amplio: 2 columnas en escritorio como el diseño de referencia
  const paginacion = usePaginacionAjustada(roles.roles, { altoItem: ALTO_ROL, anchoMinimo: 400 })

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} seccion="los roles y permisos" />

  // Vista "Crear Nuevo Rol" / "Editar Permisos" en la misma pantalla
  if (vista.modo !== "lista") {
    const rolEditado = vista.modo === "editar" ? vista.rol : undefined
    return (
      <RolForm
        key={rolEditado?.id ?? "nuevo"}
        rol={rolEditado}
        puedeEditar={rolEditado ? puedeEditar : puedeCrear}
        puedeEliminar={puedeEliminar}
        empleadosAsignados={rolEditado ? (roles.empleadosPorRol.get(rolEditado.id) ?? 0) : 0}
        onGuardado={roles.rolGuardado}
        onEliminado={roles.rolEliminado}
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
              disabled={!roles.cargado}
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
              <li key={r.id} className="min-h-0">
                <RolCard
                  rol={r}
                  empleados={roles.empleadosPorRol.get(r.id) ?? 0}
                  editable={puedeEditar && !r.esSistema}
                  onAbrir={() => setVista({ modo: "editar", rol: r })}
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
  empleados,
  editable,
  onAbrir,
}: {
  rol: Rol
  empleados: number
  editable: boolean
  onAbrir: () => void
}) {
  const visual = getRolVisual(rol.nombre)
  const Icono = visual.icon
  const conPersonal = rol.esSistema || empleados > 0
  const subtitulo = rol.esSistema
    ? "Rol base del sistema"
    : empleados > 0
      ? `${empleados} ${empleados === 1 ? "empleado asignado" : "empleados asignados"}`
      : "Sin empleados asignados"

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
                conPersonal ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-stone-400"
              )}
            >
              <span
                className={cn("size-1.5 shrink-0 rounded-full", conPersonal ? "bg-emerald-500" : "bg-slate-300 dark:bg-stone-600")}
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
          leftIcon={editable ? <Pencil className="size-3.5" /> : <Lock className="size-3.5" />}
          aria-label={editable ? `Editar permisos de ${rol.nombre}` : `Ver permisos de ${rol.nombre}`}
          className="h-8 shrink-0 gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-stone-700 dark:bg-transparent dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <span className="hidden sm:inline">{editable ? "Editar Permisos" : "Ver Permisos"}</span>
        </Button>
      </div>

      <p className="line-clamp-1 text-sm text-slate-600 dark:text-stone-300" title={rol.descripcion}>
        {rol.descripcion || "Sin descripción."}
      </p>

      <div className="h-px shrink-0 bg-slate-100 dark:bg-stone-800" />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-stone-500">
          Módulos con acceso
        </span>
        <ChipsModulos permisos={rol.permisos} maximo={4} />
      </div>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Configuración del Plano de Mesas                    */
/* -------------------------------------------------------------------------- */

type ModalMesas = { modo: "registrar" } | { modo: "editar"; mesa: Mesa } | { modo: "areas" } | null

export function MesasView() {
  const { rol } = useWorkspaceLayout()
  const puedeVer = tienePermiso(rol, PERMISO.READ_TABLES)
  const puedeRegistrar = tienePermiso(rol, PERMISO.CREATE_TABLE)
  const puedeEditar = tienePermiso(rol, PERMISO.UPDATE_TABLE)
  const puedeEliminar = tienePermiso(rol, PERMISO.DELETE_TABLE)

  const mesas = usePlanoMesas()
  const [modal, setModal] = React.useState<ModalMesas>(null)
  const cerrarModal = React.useCallback(() => setModal(null), [])

  const paginacion = usePaginacionAjustada(mesas.mesasFiltradas, {
    altoItem: ALTO_MESA,
    anchoMinimo: 190,
    clave: mesas.areaFiltro,
  })

  // Eliminación con el hook genérico de shared
  const { entityToDelete: mesaEnEliminacion, confirmDelete: confirmarEliminarMesa } = useEntityDelete<string>({
    actionDelete: eliminarMesa,
    onSuccess: (id) => {
      const eliminada = mesas.plano?.mesas.find((m) => m.id === id)
      if (eliminada) mesas.mesaEliminada(eliminada)
    },
    onError: (mensaje) => toast.add({ type: "error", title: "No se pudo eliminar la mesa.", description: mensaje }),
  })

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} seccion="el plano de mesas" />

  const { plano, mesasFiltradas, mesasPorArea, resumen, isLoading, error, recargar } = mesas
  const nombreArea = (id: string) => plano?.areas.find((a) => a.id === id)?.nombre ?? "Sin área"

  return (
    <div className={vistaClass}>
      <EncabezadoSeccion
        titulo="Gestión de Mesas"
        descripcion="Registra, renombra o elimina las mesas y las áreas de atención del local."
        acciones={
          <>
            {puedeEditar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModal({ modo: "areas" })}
                disabled={!plano}
                leftIcon={<MapPin className="size-4" />}
                aria-label="Gestionar áreas"
                className={botonSecundario}
              >
                <span className="hidden sm:inline">Áreas</span>
              </Button>
            )}
            {puedeRegistrar && (
              <Button
                type="button"
                size="sm"
                onClick={() => setModal({ modo: "registrar" })}
                disabled={!plano || plano.areas.length === 0}
                leftIcon={<Plus className="size-4" />}
                aria-label="Registrar nueva mesa"
                className={botonPrimario}
              >
                <span className="hidden sm:inline">Nueva Mesa</span>
              </Button>
            )}
          </>
        }
      />

      {/* Filtro por área y resumen */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <NativeSelect
          value={mesas.areaFiltro}
          onChange={(e) => mesas.setAreaFiltro(e.target.value)}
          disabled={!plano}
          aria-label="Filtrar por área de atención"
          className={cn("w-full min-w-0 sm:w-56", selectClass)}
        >
          <NativeSelectOption value="todas">Todas las áreas ({plano?.mesas.length ?? 0})</NativeSelectOption>
          {plano?.areas.map((a) => (
            <NativeSelectOption key={a.id} value={a.id}>
              {a.nombre} ({mesasPorArea.get(a.id) ?? 0})
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
          <span className="truncate">Solo el Dueño o el Administrador pueden modificar el plano de mesas.</span>
        </p>
      )}

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !plano || isLoading ? (
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
              <li key={mesa.id} className="min-h-0">
                <MesaCard
                  mesa={mesa}
                  area={nombreArea(mesa.area)}
                  puedeEditar={puedeEditar}
                  puedeEliminar={puedeEliminar}
                  eliminando={mesaEnEliminacion === mesa.id}
                  onEditar={(m) => setModal({ modo: "editar", mesa: m })}
                  onEliminar={(m) => confirmarEliminarMesa(m.id)}
                />
              </li>
            ))}
          </GrillaAjustada>
          <BarraPaginacion paginacion={paginacion} etiqueta="mesas" />
        </>
      )}

      {(modal?.modo === "registrar" || modal?.modo === "editar") && plano && (
        <MesaForm
          mesa={modal.modo === "editar" ? modal.mesa : undefined}
          areas={plano.areas}
          areaPorDefecto={mesas.areaFiltro !== "todas" ? mesas.areaFiltro : undefined}
          onGuardada={mesas.mesaGuardada}
          onClose={cerrarModal}
        />
      )}

      {modal?.modo === "areas" && plano && (
        <AreasForm
          areas={plano.areas}
          mesasPorArea={mesasPorArea}
          onGuardar={mesas.guardarArea}
          onEliminada={mesas.areaEliminada}
          onClose={cerrarModal}
        />
      )}
    </div>
  )
}

function MesaCard({
  mesa,
  area,
  puedeEditar,
  puedeEliminar,
  eliminando,
  onEditar,
  onEliminar,
}: {
  mesa: Mesa
  area: string
  puedeEditar: boolean
  puedeEliminar: boolean
  eliminando: boolean
  onEditar: (mesa: Mesa) => void
  onEliminar: (mesa: Mesa) => Promise<unknown>
}) {
  const estado = ESTADO_MESA_CONFIG[mesa.estado]
  const [confirmando, setConfirmando] = React.useState(false)
  const enUso = mesa.estado !== "libre"

  return (
    <article className={cn(tarjetaClass, "gap-2 p-3.5")}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-bold text-slate-900 dark:text-stone-100">{mesa.nombre}</h3>
        <Badge variant="estado" className={cn("shrink-0 px-2 text-[11px]", estado.badge)}>
          {estado.label}
        </Badge>
      </div>

      <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-stone-400">
        {React.createElement(getAreaIcon(mesa.area), { className: "size-3.5 shrink-0" })}
        <span className="truncate">{area}</span>
        <span>·</span>
        <Users className="size-3.5 shrink-0" />
        <span className="shrink-0">{mesa.capacidad}</span>
      </p>

      <div className="mt-auto flex min-h-8 items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-stone-800">
        {confirmando ? (
          <div className="flex w-full items-center justify-between gap-1">
            <span className="text-xs font-medium text-red-700 dark:text-red-300">¿Eliminar?</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={eliminando}
                onClick={async () => {
                  await onEliminar(mesa)
                  setConfirmando(false)
                }}
                className="h-8 cursor-pointer rounded-full bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
              >
                Sí
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setConfirmando(false)}
                className="h-8 cursor-pointer rounded-full px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <>
            {!puedeEditar && !puedeEliminar && (
              <span className="mr-auto text-[11px] text-slate-400 dark:text-stone-500">Solo lectura</span>
            )}
            {puedeEditar && (
              <button
                type="button"
                onClick={() => onEditar(mesa)}
                aria-label={`Editar ${mesa.nombre}`}
                className={cn(botonIcono, "size-8")}
              >
                <Pencil className="size-4" />
              </button>
            )}
            {puedeEliminar && (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={enUso}
                title={enUso ? "Tiene un pedido en curso" : undefined}
                aria-label={`Eliminar ${mesa.nombre}`}
                className={cn(botonIcono, "size-8 hover:text-red-600 dark:hover:text-red-400")}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </>
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

function AccesoRestringido({ rol, seccion }: { rol: string; seccion: string }) {
  return (
    <Empty className="h-full">
      <Lock className="size-8 text-[#4C0107] dark:text-[#E7B7BC]" />
      <EmptyHeader>
        <EmptyTitle>Acceso restringido</EmptyTitle>
        <EmptyDescription>
          Tu rol actual (<span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span>) no tiene
          acceso a {seccion}.
        </EmptyDescription>
      </EmptyHeader>
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
