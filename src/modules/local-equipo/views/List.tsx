"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Grid2X2,
  IdCard,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/utils/cn"
import { formatDateStrict } from "@/shared/utils/formatters"
import { useWorkspaceLayout } from "@/shared/context/workspace-layout-context"
import { PERMISO, PERMISOS_POR_ROL, ROL_LABELS, tienePermiso } from "@/shared/constants/permisos"

import { usePersonal, usePlanoMesas } from "../hooks"
import {
  ESTADO_EMPLEADO_CONFIG,
  ESTADO_MESA_CONFIG,
  MODULOS_PERMISOS,
  ROL_OPERATIVO_CONFIG,
  getAreaIcon,
  opcionClass,
  panelClass,
} from "../components"
import {
  FILTRO_ESTADO_LABELS,
  ROLES_OPERATIVOS,
  rolOperativoSchema,
  type Empleado,
  type FiltroEstadoEmpleado,
  type Mesa,
} from "../schema"
import EmpleadoForm, { AreasForm, BajaEmpleadoForm, MesaForm } from "./Form"

const botonPrimario =
  "h-10 rounded-full bg-[#4C0107] px-5 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
const botonSecundario = "h-10 rounded-full px-5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
const botonIcono =
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"

// Las fechas YYYY-MM-DD se interpretan como fecha local (evita el desfase por zona horaria)
const formatearFecha = (iso: string) => formatDateStrict(`${iso}T00:00:00`)

/* -------------------------------------------------------------------------- */
/*                         Encabezado y navegación                            */
/* -------------------------------------------------------------------------- */

const SECCIONES = [
  { href: "/local-equipo/personal", label: "Gestión de Empleados", icon: Users },
  { href: "/local-equipo/roles-permisos", label: "Roles y Permisos", icon: ShieldCheck },
  { href: "/local-equipo/mesas", label: "Gestión de Mesas", icon: Grid2X2 },
] as const

function EncabezadoLocal({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion: string
  acciones?: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Secciones de Local y Equipo" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {SECCIONES.map(({ href, label, icon: Icono }) => {
          const activa = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors",
                opcionClass(activa)
              )}
            >
              <Icono className="size-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-stone-100">{titulo}</h1>
          <p className="text-sm text-slate-500 dark:text-stone-400">{descripcion}</p>
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </div>
  )
}

function Contador({
  label,
  valor,
  valueClass = "text-slate-900 dark:text-stone-100",
  activo,
  onClick,
}: {
  label: string
  valor: number
  valueClass?: string
  activo?: boolean
  onClick?: () => void
}) {
  const contenido = (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs dark:text-stone-400">
        {label}
      </span>
      <span className={cn("text-2xl font-bold tabular-nums sm:text-3xl", valueClass)}>{valor}</span>
    </>
  )
  const clases = cn(panelClass, "flex flex-col items-start gap-1 p-3 text-left sm:p-4")

  if (!onClick) return <div className={clases}>{contenido}</div>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        clases,
        "cursor-pointer hover:border-[#4C0107]/30 dark:hover:border-stone-600",
        activo && "border-[#4C0107]/50 ring-1 ring-[#4C0107]/20 dark:border-stone-400 dark:ring-stone-400/20"
      )}
    >
      {contenido}
    </button>
  )
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

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} seccion="la gestión de personal" />

  const { empleados, empleadosFiltrados, resumen, isLoading, error, recargar } = personal

  return (
    <div className="flex flex-col gap-6 pb-2">
      <EncabezadoLocal
        titulo="Gestión de Empleados"
        descripcion="Registra al equipo, actualiza sus datos y asígnales su rol operativo."
        acciones={
          puedeRegistrar && (
            <Button
              type="button"
              size="sm"
              onClick={() => setModal({ modo: "registrar" })}
              disabled={!empleados}
              leftIcon={<UserPlus className="size-4" />}
              className={botonPrimario}
            >
              Registrar empleado
            </Button>
          )
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !empleados || isLoading ? (
        <ListadoSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {(["todos", "activo", "baja"] as FiltroEstadoEmpleado[]).map((filtro) => (
              <Contador
                key={filtro}
                label={filtro === "todos" ? "Personal" : FILTRO_ESTADO_LABELS[filtro]}
                valor={filtro === "todos" ? resumen.total : filtro === "activo" ? resumen.activos : resumen.baja}
                valueClass={
                  filtro === "activo"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : filtro === "baja"
                      ? "text-slate-500 dark:text-stone-400"
                      : undefined
                }
                activo={personal.estado === filtro}
                onClick={() => personal.setEstado(filtro)}
              />
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-stone-500" />
              <Input
                type="search"
                value={personal.busqueda}
                onChange={(e) => personal.setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, DNI o correo"
                aria-label="Buscar empleado"
                className="h-10 rounded-full pl-10"
              />
            </div>
            <div role="radiogroup" aria-label="Rol operativo" className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:pb-0">
              {(["todos", ...rolOperativoSchema.options] as const).map((r) => {
                const activo = personal.rol === r
                const Icono = r === "todos" ? Users : ROL_OPERATIVO_CONFIG[r].icon
                return (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => personal.setRol(r)}
                    className={cn(
                      "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors",
                      opcionClass(activo)
                    )}
                  >
                    <Icono className="size-3.5" />
                    {r === "todos" ? "Todos los roles" : ROLES_OPERATIVOS[r].nombre}
                  </button>
                )
              })}
            </div>
          </div>

          {empleadosFiltrados.length === 0 ? (
            <SinResultados texto="No hay empleados que coincidan con los filtros." onLimpiar={personal.limpiarFiltros} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {empleadosFiltrados.map((empleado) => (
                <li key={empleado.id}>
                  <EmpleadoCard
                    empleado={empleado}
                    puedeEditar={puedeEditar}
                    puedeDarDeBaja={puedeDarDeBaja}
                    onEditar={(e) => setModal({ modo: "editar", empleado: e })}
                    onBaja={(e) => setModal({ modo: "baja", empleado: e })}
                    onReactivar={personal.reactivar}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {personal.aviso && <Aviso {...personal.aviso} onCerrar={personal.cerrarAviso} />}

      {(modal?.modo === "registrar" || modal?.modo === "editar") && (
        <EmpleadoForm
          empleado={modal.modo === "editar" ? modal.empleado : undefined}
          onGuardar={personal.guardarEmpleado}
          onClose={cerrarModal}
        />
      )}

      {modal?.modo === "baja" && (
        <BajaEmpleadoForm empleado={modal.empleado} onConfirmar={personal.darDeBaja} onClose={cerrarModal} />
      )}
    </div>
  )
}

function EmpleadoCard({
  empleado,
  puedeEditar,
  puedeDarDeBaja,
  onEditar,
  onBaja,
  onReactivar,
}: {
  empleado: Empleado
  puedeEditar: boolean
  puedeDarDeBaja: boolean
  onEditar: (empleado: Empleado) => void
  onBaja: (empleado: Empleado) => void
  onReactivar: (empleado: Empleado) => Promise<void>
}) {
  const rolInfo = ROLES_OPERATIVOS[empleado.rol]
  const rolConfig = ROL_OPERATIVO_CONFIG[empleado.rol]
  const IconoRol = rolConfig.icon
  const estado = ESTADO_EMPLEADO_CONFIG[empleado.estado]
  const deBaja = empleado.estado === "baja"
  const iniciales = `${empleado.nombres[0] ?? ""}${empleado.apellidos[0] ?? ""}`.toUpperCase()
  const [reactivando, setReactivando] = React.useState(false)

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border bg-white p-4 transition-colors",
        "border-slate-100 dark:border-stone-800 dark:bg-stone-900",
        deBaja && "bg-slate-50/70 dark:bg-stone-950/40"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            deBaja
              ? "bg-slate-200 text-slate-500 dark:bg-stone-800 dark:text-stone-400"
              : "bg-[#4C0107] text-white dark:bg-[#E7B7BC] dark:text-stone-900"
          )}
          aria-hidden="true"
        >
          {iniciales}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            className={cn(
              "truncate text-sm font-semibold text-slate-900 dark:text-stone-100",
              deBaja && "text-slate-500 dark:text-stone-400"
            )}
          >
            {empleado.nombres} {empleado.apellidos}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", rolConfig.className)}>
              <IconoRol className="size-3" />
              {rolInfo.nombre}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", estado.className)}>
              {estado.label}
            </span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 dark:text-stone-300">
        <DatoEmpleado icon={IdCard} label="DNI" valor={empleado.dni} />
        <DatoEmpleado icon={Phone} label="Celular" valor={empleado.telefono} />
        <DatoEmpleado icon={Mail} label="Correo" valor={empleado.correo} />
        <DatoEmpleado icon={CalendarDays} label="Ingreso" valor={formatearFecha(empleado.fechaIngreso)} />
      </dl>

      {deBaja && empleado.fechaBaja && (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-stone-800 dark:text-stone-300">
          Baja el {formatearFecha(empleado.fechaBaja)}
          {empleado.motivoBaja && ` · ${empleado.motivoBaja}`}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-stone-800">
        <span className="text-[11px] text-slate-500 dark:text-stone-400">Acceso: {ROL_LABELS[rolInfo.acceso]}</span>
        <div className="flex items-center gap-1">
          {puedeEditar && !deBaja && (
            <button
              type="button"
              onClick={() => onEditar(empleado)}
              aria-label={`Actualizar datos de ${empleado.nombres}`}
              className={botonIcono}
            >
              <Pencil className="size-4" />
            </button>
          )}
          {puedeDarDeBaja &&
            (deBaja ? (
              <button
                type="button"
                disabled={reactivando}
                onClick={async () => {
                  setReactivando(true)
                  await onReactivar(empleado)
                  setReactivando(false)
                }}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 px-3.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
              >
                {reactivando ? <RefreshCw className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                Reactivar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onBaja(empleado)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-red-200 px-3.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <UserMinus className="size-3.5" />
                Dar de baja
              </button>
            ))}
          {!puedeEditar && !puedeDarDeBaja && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-stone-500">
              <Lock className="size-3.5" /> Solo lectura
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function DatoEmpleado({ icon: Icono, label, valor }: { icon: typeof IdCard; label: string; valor: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icono className="size-3.5 shrink-0 text-slate-400 dark:text-stone-500" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate tabular-nums">{valor}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-11: Roles operativos y sus permisos                     */
/* -------------------------------------------------------------------------- */

export function RolesPermisosView() {
  const { rol } = useWorkspaceLayout()
  const puedeVer = tienePermiso(rol, PERMISO.READ_STAFF)
  const personal = usePersonal()

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} seccion="los roles y permisos" />

  const { empleados, activosPorRol, isLoading, error, recargar } = personal

  return (
    <div className="flex flex-col gap-6 pb-2">
      <EncabezadoLocal
        titulo="Roles y Permisos"
        descripcion="Cada empleado se vincula a un rol operativo que define su nivel de acceso al sistema."
        acciones={
          <Link
            href="/local-equipo/personal"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Users className="size-4" /> Asignar roles al personal
          </Link>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !empleados || isLoading ? (
        <ListadoSkeleton />
      ) : (
        <>
          {/* Roles operativos */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {rolOperativoSchema.options.map((r) => {
              const info = ROLES_OPERATIVOS[r]
              const config = ROL_OPERATIVO_CONFIG[r]
              const Icono = config.icon
              const total = activosPorRol.get(r) ?? 0
              return (
                <li key={r} className={cn(panelClass, "flex flex-col gap-3 p-4")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex size-10 items-center justify-center rounded-xl", config.className)}>
                      <Icono className="size-5" />
                    </span>
                    <span className="text-right">
                      <span className="block text-2xl font-bold tabular-nums text-slate-900 dark:text-stone-100">{total}</span>
                      <span className="text-[11px] text-slate-500 dark:text-stone-400">{total === 1 ? "activo" : "activos"}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-stone-100">{info.nombre}</h2>
                    <p className="text-xs text-slate-500 dark:text-stone-400">{info.descripcion}</p>
                  </div>
                  <span className="mt-auto self-start rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-stone-800 dark:text-stone-200">
                    Acceso: {ROL_LABELS[info.acceso]}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Matriz de permisos por nivel de acceso */}
          <section className={cn(panelClass, "flex flex-col gap-4 p-4 lg:p-5")}>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-stone-100">Permisos por nivel de acceso</h2>
              <p className="text-xs text-slate-500 dark:text-stone-400">
                El Dueño tiene acceso total. Los roles operativos heredan los permisos de su nivel.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-stone-800 dark:text-stone-400">
                    <th className="pb-2 font-semibold">Permiso</th>
                    {(["dueno", "administrador", "empleado"] as const).map((nivel) => (
                      <th key={nivel} className="pb-2 text-center font-semibold">
                        {ROL_LABELS[nivel]}
                      </th>
                    ))}
                  </tr>
                </thead>
                {MODULOS_PERMISOS.map(({ modulo, permisos }) => (
                  <tbody key={modulo} className="divide-y divide-slate-100 dark:divide-stone-800">
                    <tr>
                      <th
                        colSpan={4}
                        scope="colgroup"
                        className="pt-4 pb-1 text-left text-xs font-semibold text-[#4C0107] dark:text-[#E7B7BC]"
                      >
                        {modulo}
                      </th>
                    </tr>
                    {permisos.map(({ label, permiso }) => (
                      <tr key={permiso} className="text-slate-700 dark:text-stone-300">
                        <td className="py-2">{label}</td>
                        {(["dueno", "administrador", "empleado"] as const).map((nivel) => {
                          const tiene = PERMISOS_POR_ROL[nivel].includes(permiso)
                          return (
                            <td key={nivel} className="py-2 text-center">
                              {tiene ? (
                                <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Permitido" />
                              ) : (
                                <X className="mx-auto size-4 text-slate-300 dark:text-stone-600" aria-label="No permitido" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </section>
        </>
      )}
    </div>
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

  if (!puedeVer) return <AccesoRestringido rol={ROL_LABELS[rol]} seccion="el plano de mesas" />

  const { plano, mesasFiltradas, mesasPorArea, resumen, isLoading, error, recargar } = mesas
  const nombreArea = (id: string) => plano?.areas.find((a) => a.id === id)?.nombre ?? "Sin área"

  return (
    <div className="flex flex-col gap-6 pb-2">
      <EncabezadoLocal
        titulo="Gestión de Mesas"
        descripcion="Configura el plano del local: mesas, capacidad y áreas de atención."
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
                className={botonSecundario}
              >
                Áreas
              </Button>
            )}
            {puedeRegistrar && (
              <Button
                type="button"
                size="sm"
                onClick={() => setModal({ modo: "registrar" })}
                disabled={!plano || plano.areas.length === 0}
                leftIcon={<Plus className="size-4" />}
                className={botonPrimario}
              >
                Nueva mesa
              </Button>
            )}
          </>
        }
      />

      {!puedeEditar && (
        <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-300">
          <Lock className="mt-0.5 size-4 shrink-0" />
          Solo el Dueño o el Administrador pueden modificar el plano de mesas.
        </p>
      )}

      {error ? (
        <ErrorState message={error} onRetry={recargar} />
      ) : !plano || isLoading ? (
        <ListadoSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Contador label="Áreas" valor={resumen.areas} />
            <Contador label="Mesas" valor={resumen.mesas} />
            <Contador label="Aforo" valor={resumen.capacidad} valueClass="text-[#4C0107] dark:text-[#E7B7BC]" />
          </div>

          {/* Filtro por área */}
          <div role="radiogroup" aria-label="Área de atención" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {[{ id: "todas", nombre: "Todas las áreas" }, ...plano.areas].map((a) => {
              const activa = mesas.areaFiltro === a.id
              const Icono = a.id === "todas" ? Grid2X2 : getAreaIcon(a.id)
              const total = a.id === "todas" ? plano.mesas.length : (mesasPorArea.get(a.id) ?? 0)
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  onClick={() => mesas.setAreaFiltro(a.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold whitespace-nowrap transition-colors",
                    opcionClass(activa)
                  )}
                >
                  <Icono className="size-3.5" />
                  {a.nombre}
                  <span className="tabular-nums opacity-70">{total}</span>
                </button>
              )
            })}
          </div>

          {mesasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
              <Grid2X2 className="size-8 text-slate-400 dark:text-stone-500" />
              <p className="text-sm text-slate-600 dark:text-stone-300">No hay mesas registradas en esta área.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {mesasFiltradas.map((mesa) => (
                <li key={mesa.id}>
                  <MesaCard
                    mesa={mesa}
                    area={nombreArea(mesa.area)}
                    puedeEditar={puedeEditar}
                    puedeEliminar={puedeEliminar}
                    onEditar={(m) => setModal({ modo: "editar", mesa: m })}
                    onEliminar={mesas.borrarMesa}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mesas.aviso && <Aviso {...mesas.aviso} onCerrar={mesas.cerrarAviso} />}

      {(modal?.modo === "registrar" || modal?.modo === "editar") && plano && (
        <MesaForm
          mesa={modal.modo === "editar" ? modal.mesa : undefined}
          areas={plano.areas}
          areaPorDefecto={mesas.areaFiltro !== "todas" ? mesas.areaFiltro : undefined}
          onGuardar={mesas.guardarMesa}
          onClose={cerrarModal}
        />
      )}

      {modal?.modo === "areas" && plano && (
        <AreasForm
          areas={plano.areas}
          mesasPorArea={mesasPorArea}
          onGuardar={mesas.guardarArea}
          onEliminar={mesas.borrarArea}
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
  onEditar,
  onEliminar,
}: {
  mesa: Mesa
  area: string
  puedeEditar: boolean
  puedeEliminar: boolean
  onEditar: (mesa: Mesa) => void
  onEliminar: (mesa: Mesa) => Promise<void>
}) {
  const estado = ESTADO_MESA_CONFIG[mesa.estado]
  const [confirmando, setConfirmando] = React.useState(false)
  const [eliminando, setEliminando] = React.useState(false)
  const enUso = mesa.estado !== "libre"

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-bold text-slate-900 dark:text-stone-100">{mesa.nombre}</h3>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", estado.badge)}>{estado.label}</span>
      </div>

      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          {React.createElement(getAreaIcon(mesa.area), { className: "size-3.5" })} {area}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" /> {mesa.capacidad} {mesa.capacidad === 1 ? "persona" : "personas"}
        </span>
      </div>

      {(puedeEditar || puedeEliminar) && (
        <div className="mt-auto flex items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-stone-800">
          {confirmando ? (
            <div className="flex w-full items-center justify-between gap-1">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">¿Eliminar?</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={async () => {
                    setEliminando(true)
                    await onEliminar(mesa)
                    setEliminando(false)
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
              {puedeEditar && (
                <button type="button" onClick={() => onEditar(mesa)} aria-label={`Editar ${mesa.nombre}`} className={botonIcono}>
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
                  className={cn(
                    botonIcono,
                    "hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:text-red-400"
                  )}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Auxiliares                                 */
/* -------------------------------------------------------------------------- */

function Aviso({ tipo, mensaje, onCerrar }: { tipo: "ok" | "error"; mensaje: string; onCerrar: () => void }) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border bg-white p-3 text-sm text-slate-800 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 dark:bg-stone-900 dark:text-stone-100",
        tipo === "ok" ? "border-emerald-200 dark:border-emerald-500/30" : "border-red-200 dark:border-red-500/30"
      )}
    >
      {tipo === "ok" ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
      )}
      <p className="flex-1">{mensaje}</p>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="cursor-pointer text-slate-400 hover:text-slate-700 dark:text-stone-500 dark:hover:text-stone-200"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function SinResultados({ texto, onLimpiar }: { texto: string; onLimpiar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <SearchX className="size-8 text-slate-400 dark:text-stone-500" />
      <p className="text-sm text-slate-600 dark:text-stone-300">{texto}</p>
      <Button type="button" variant="outline" size="sm" onClick={onLimpiar} className="rounded-full dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
        Limpiar filtros
      </Button>
    </div>
  )
}

function AccesoRestringido({ rol, seccion }: { rol: string; seccion: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <Lock className="size-8 text-[#4C0107] dark:text-[#E7B7BC]" />
      <h1 className="text-lg font-bold text-slate-900 dark:text-stone-100">Acceso restringido</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-stone-400">
        Tu rol actual (<span className="font-semibold text-slate-700 dark:text-stone-200">{rol}</span>) no tiene acceso a{" "}
        {seccion}.
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-stone-700">
      <p className="text-sm text-slate-600 dark:text-stone-300">{message}</p>
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
    </div>
  )
}

function ListadoSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl dark:bg-stone-800" />
        ))}
      </div>
      <Skeleton className="h-10 rounded-full dark:bg-stone-800" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl dark:bg-stone-800" />
        ))}
      </div>
    </div>
  )
}
