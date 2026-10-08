"use client"

import * as React from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Info, Lock, Pencil, Plus, Trash2, X } from "lucide-react"

import type { OneQuery } from "@/dtos/core/oneQuery.dto"
import { useEntityDelete, useEntityForm, usePaginacionAjustada } from "@/shared/hooks"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { cn } from "@/shared/utils/cn"

import {
  actualizarEmpleado,
  actualizarMesa,
  actualizarRol,
  crearRol,
  darDeBajaEmpleado,
  eliminarArea,
  eliminarRol,
  registrarEmpleado,
  registrarMesa,
} from "../actions/local-equipo.actions"
import {
  MODULO_ICONOS,
  botonPrimario as botonPrimarioBase,
  botonSecundario as botonSecundarioBase,
  getAreaIcon,
  opcionClass,
  panelClass,
  selectClass,
  tarjetaClass,
} from "../components"
import {
  CAPACIDAD_MAXIMA_MESA,
  MODULOS_SISTEMA,
  TODOS_LOS_PERMISOS,
  areaFormSchema,
  clavePermiso,
  empleadoFormSchema,
  empleadoToFormValues,
  mesaFormSchema,
  mesaFormToInput,
  mesaToFormValues,
  modulosConAcceso,
  rolFormSchema,
  rolToFormValues,
  type Area,
  type AreaFormValues,
  type Empleado,
  type EmpleadoFormValues,
  type EmpleadoInput,
  type Mesa,
  type MesaFormValues,
  type MesaInput,
  type ModuloSistema,
  type Rol,
  type RolFormValues,
  type RolInput,
} from "../schema"

const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
const etiquetaCampoClass = "text-sm font-semibold text-slate-800 dark:text-stone-200 [@media(max-height:700px)]:sr-only"
// En pantallas de poca altura se ocultan textos secundarios para que el contenido quepa sin scroll
const ocultarEnPantallaBaja = "[@media(max-height:700px)]:hidden"
const errorClass = "text-xs font-medium text-red-600 dark:text-red-400"
const inputClass = "h-11 rounded-xl"
const botonPrimario = cn(botonPrimarioBase, "px-5")
const botonSecundario = cn(botonSecundarioBase, "px-5")

/* -------------------------------------------------------------------------- */
/*            Componentes de apoyo: encabezado, grilla y paginación           */
/* -------------------------------------------------------------------------- */

// Encabezado estándar de las vistas de Local y Equipo (título, descripción y acciones)
export function EncabezadoSeccion({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion: string
  acciones?: React.ReactNode
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-stone-100">
          {titulo}
        </h1>
        <p className={cn("line-clamp-1 text-xs text-slate-500 sm:text-sm dark:text-stone-400", ocultarEnPantallaBaja)}>
          {descripcion}
        </p>
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  )
}

// Chips de "Módulos con acceso" de un rol
export function ChipsModulos({ permisos, maximo }: { permisos: readonly string[]; maximo?: number }) {
  const modulos = modulosConAcceso(permisos)
  const visibles = maximo ? modulos.slice(0, maximo) : modulos
  const restantes = modulos.length - visibles.length

  if (modulos.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-stone-500">Sin módulos asignados</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibles.map((m) => {
        const Icono = MODULO_ICONOS[m.id]
        return (
          <Badge
            key={m.id}
            variant="estado"
            className="gap-1 bg-indigo-50 px-2 text-[11px] text-slate-700 dark:bg-stone-800 dark:text-stone-200"
          >
            <Icono className="size-3" />
            {m.etiqueta}
          </Badge>
        )
      })}
      {restantes > 0 && (
        <Badge variant="estado" className="bg-slate-100 px-2 text-[11px] text-slate-600 dark:bg-stone-800 dark:text-stone-300">
          +{restantes} más
        </Badge>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Modal base                                   */
/* -------------------------------------------------------------------------- */

// Envoltorio fino sobre Dialog de shared con el encabezado estándar de la app
function ModalBase({
  titulo,
  descripcion,
  onClose,
  bloqueado = false,
  ancho,
  children,
}: {
  titulo: string
  descripcion?: string
  onClose: () => void
  bloqueado?: boolean
  ancho?: string
  children: React.ReactNode
}) {
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !bloqueado) onClose()
      }}
    >
      <DialogContent className={ancho}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function ErrorGuardado({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
    >
      {mensaje}
    </p>
  )
}

function Campo({
  id,
  label,
  error,
  children,
  className,
}: {
  id?: string
  label: React.ReactNode
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {id ? (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}

function AccionesFormulario({
  onCancelar,
  enviando,
  textoEnviar,
}: {
  onCancelar: () => void
  enviando: boolean
  textoEnviar: string
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={enviando} className={botonSecundario}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" loading={enviando} className={botonPrimario}>
        {textoEnviar}
      </Button>
    </DialogFooter>
  )
}

/* -------------------------------------------------------------------------- */
/*       RF-11: Registro y actualización de empleados (tabla usuarios)        */
/* -------------------------------------------------------------------------- */

interface EmpleadoFormProps {
  // Empleado a editar; si no se envía, el formulario registra uno nuevo
  empleado?: Empleado
  roles: Rol[]
  onGuardado: (nombre: string, esNuevo: boolean) => void
  onClose: () => void
}

export default function EmpleadoForm({ empleado, roles, onGuardado, onClose }: EmpleadoFormProps) {
  const esEdicion = Boolean(empleado)
  const esDueno = empleado?.tipoCuenta === "OWNER"
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const { submit, isSubmitting } = useEntityForm<Empleado, EmpleadoFormValues, EmpleadoInput, EmpleadoInput, Empleado>({
    id: empleado?.id,
    actionCreate: registrarEmpleado,
    actionUpdate: actualizarEmpleado,
    mapEntityToForm: (entidad) => empleadoToFormValues(entidad),
    mapFormToCreatePayload: (values) => values,
    mapFormToUpdatePayload: (values) => values,
    onCreated: (creado) => {
      onGuardado(creado.nombre, true)
      onClose()
    },
    onUpdated: (values) => {
      onGuardado(values.nombre, false)
      onClose()
    },
    onSaveError: setErrorGuardado,
  })

  // Por defecto se propone el primer rol operativo (no el de Administrador)
  const rolPorDefecto = roles.find((r) => !r.esSistema)?.id ?? roles[0]?.id ?? ""

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoFormSchema),
    defaultValues: empleadoToFormValues(empleado, rolPorDefecto),
  })

  const idRol = useWatch({ control, name: "idRol" })
  const rolSeleccionado = roles.find((r) => r.id === idRol)

  const onSubmit = async (values: EmpleadoFormValues) => {
    setErrorGuardado(null)
    await submit(values)
  }

  return (
    <ModalBase
      titulo={esEdicion ? "Actualizar empleado" : "Registrar empleado"}
      descripcion="El rol operativo define a qué módulos podrá acceder en Coffy Flow."
      onClose={onClose}
      bloqueado={isSubmitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="flex flex-col gap-4 p-5">
          <Campo id="emp-nombre" label="Nombre completo" error={errors.nombre?.message}>
            <Input
              id="emp-nombre"
              {...register("nombre")}
              placeholder="Ej. Lucía Ramírez Soto"
              autoComplete="off"
              maxLength={80}
              state={errors.nombre ? "error" : "default"}
              aria-invalid={Boolean(errors.nombre)}
              className={inputClass}
            />
          </Campo>

          <Campo id="emp-email" label="Correo electrónico" error={errors.email?.message}>
            <Input
              id="emp-email"
              {...register("email")}
              type="email"
              placeholder="nombre@coffyflow.pe"
              autoComplete="off"
              state={errors.email ? "error" : "default"}
              aria-invalid={Boolean(errors.email)}
              className={inputClass}
            />
          </Campo>

          <Campo id="emp-rol" label="Rol operativo" error={errors.idRol?.message}>
            <NativeSelect
              id="emp-rol"
              {...register("idRol")}
              disabled={esDueno}
              aria-invalid={Boolean(errors.idRol)}
              className={cn("w-full [&_select]:h-11", selectClass)}
            >
              {roles.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {r.nombre}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {rolSeleccionado && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-stone-500">
                  Módulos con acceso
                </span>
                <ChipsModulos permisos={rolSeleccionado.permisos} maximo={5} />
              </div>
            )}
          </Campo>

          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-stone-950/60 dark:text-stone-300">
            {esDueno ? (
              <>
                <Lock className="mt-0.5 size-3.5 shrink-0" /> La cuenta del Dueño conserva siempre el rol de Administrador.
              </>
            ) : (
              <>
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {esEdicion
                  ? "Los cambios de rol se aplican en el próximo inicio de sesión del empleado."
                  : "La cuenta se crea como Pendiente de activación hasta que el empleado verifique su correo."}
              </>
            )}
          </p>

          <ErrorGuardado mensaje={errorGuardado} />
        </div>

        <AccionesFormulario
          onCancelar={onClose}
          enviando={isSubmitting}
          textoEnviar={esEdicion ? "Guardar cambios" : "Registrar empleado"}
        />
      </form>
    </ModalBase>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-11: Dar de baja a un empleado (baja lógica)             */
/* -------------------------------------------------------------------------- */

export function BajaEmpleadoForm({
  empleado,
  onDadoDeBaja,
  onClose,
}: {
  empleado: Empleado
  onDadoDeBaja: (empleado: Empleado) => void
  onClose: () => void
}) {
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  // La baja es lógica (estado "inactivo"): se usa el hook de eliminación de shared
  const { isDeleting, confirmDelete } = useEntityDelete<string>({
    actionDelete: darDeBajaEmpleado,
    onSuccess: () => {
      onDadoDeBaja(empleado)
      onClose()
    },
    onError: setErrorGuardado,
  })

  return (
    <ModalBase
      titulo="Dar de baja"
      descripcion={`${empleado.nombre} · ${empleado.email}`}
      onClose={onClose}
      bloqueado={isDeleting}
      ancho="sm:max-w-md"
    >
      <div className="flex flex-col gap-4 p-5">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          El empleado pasará a estado <strong>De baja</strong> y perderá el acceso al sistema. Su historial se conserva y
          podrás reactivarlo después.
        </p>
        <ErrorGuardado mensaje={errorGuardado} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting} className={botonSecundario}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          loading={isDeleting}
          onClick={() => {
            setErrorGuardado(null)
            void confirmDelete(empleado.id)
          }}
          className="h-10 rounded-full bg-red-600 px-5 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
        >
          Confirmar baja
        </Button>
      </DialogFooter>
    </ModalBase>
  )
}

/* -------------------------------------------------------------------------- */
/*          Roles y permisos: vista "Crear Nuevo Rol" / "Editar Permisos"      */
/* -------------------------------------------------------------------------- */

const ALTO_TARJETA_MODULO = 152

export function RolForm({
  rol,
  puedeEditar,
  puedeEliminar,
  empleadosAsignados,
  onGuardado,
  onEliminado,
  onVolver,
}: {
  // Rol a editar; si no se envía, se crea uno nuevo
  rol?: Rol
  puedeEditar: boolean
  puedeEliminar: boolean
  empleadosAsignados: number
  onGuardado: (nombre: string, esNuevo: boolean) => void
  onEliminado: (rol: Rol) => void
  onVolver: () => void
}) {
  const esEdicion = Boolean(rol)
  // Un rol base del sistema o un usuario sin permiso solo puede consultar
  const soloLectura = !puedeEditar || Boolean(rol?.esSistema)
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = React.useState(false)

  const { submit, isSubmitting } = useEntityForm<Rol, RolFormValues, RolInput, RolInput, Rol>({
    id: rol?.id,
    actionCreate: crearRol,
    actionUpdate: actualizarRol,
    mapEntityToForm: rolToFormValues,
    mapFormToCreatePayload: (values) => values,
    mapFormToUpdatePayload: (values) => values,
    onCreated: (creado) => {
      onGuardado(creado.nombre, true)
      onVolver()
    },
    onUpdated: (values) => {
      onGuardado(values.nombre, false)
      onVolver()
    },
    onSaveError: setErrorGuardado,
  })

  const { isDeleting, confirmDelete } = useEntityDelete<string>({
    actionDelete: eliminarRol,
    onSuccess: () => {
      if (rol) onEliminado(rol)
      onVolver()
    },
    onError: (mensaje) => {
      setConfirmandoEliminar(false)
      setErrorGuardado(mensaje)
    },
  })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RolFormValues>({
    resolver: zodResolver(rolFormSchema),
    defaultValues: rolToFormValues(rol),
  })

  const permisos = useWatch({ control, name: "permisos" })
  const paginacion = usePaginacionAjustada(MODULOS_SISTEMA, { altoItem: ALTO_TARJETA_MODULO, anchoMinimo: 220 })

  const todosSeleccionados = permisos.length === TODOS_LOS_PERMISOS.length

  const onSubmit = async (values: RolFormValues) => {
    setErrorGuardado(null)
    await submit(values)
  }

  const titulo = !esEdicion ? "Crear Nuevo Rol" : soloLectura ? `Permisos de ${rol?.nombre}` : "Editar Permisos"
  const descripcion = !esEdicion
    ? "Configura un nuevo perfil de acceso definiendo sus responsabilidades y permisos en el sistema."
    : soloLectura
      ? rol?.esSistema
        ? "Rol base del sistema: tiene acceso total y sus permisos no se pueden modificar."
        : "Consulta los módulos y acciones habilitados para este rol."
      : "Actualiza las responsabilidades y los permisos de este rol operativo."

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full min-h-0 flex-col gap-4 overflow-hidden [@media(max-height:700px)]:gap-2"
      noValidate
    >
      <EncabezadoSeccion titulo={titulo} descripcion={descripcion} />

      <div
        className={cn(
          panelClass,
          "flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5 [@media(max-height:700px)]:gap-2.5 [@media(max-height:700px)]:p-3"
        )}
      >
        {/* Datos del rol */}
        <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rol-nombre" className={etiquetaCampoClass}>
              Nombre del Rol
            </label>
            <Input
              id="rol-nombre"
              {...register("nombre")}
              placeholder="Ej. Encargado de Turno"
              maxLength={40}
              autoComplete="off"
              disabled={soloLectura}
              state={errors.nombre ? "error" : "default"}
              aria-invalid={Boolean(errors.nombre)}
              className={inputClass}
            />
            {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rol-descripcion" className={etiquetaCampoClass}>
              Descripción
            </label>
            <Input
              id="rol-descripcion"
              {...register("descripcion")}
              placeholder="Breve descripción de las responsabilidades..."
              maxLength={160}
              autoComplete="off"
              disabled={soloLectura}
              state={errors.descripcion ? "error" : "default"}
              aria-invalid={Boolean(errors.descripcion)}
              className={inputClass}
            />
            {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
          </div>
        </div>

        <div className="h-px shrink-0 bg-slate-200 dark:bg-stone-800" />

        {/* Permisos por módulo (rol_permisos) */}
        <div className="flex shrink-0 items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-stone-100">Permisos por Módulo</h2>
            <p className={cn("line-clamp-1 text-xs text-slate-500 dark:text-stone-400", ocultarEnPantallaBaja)}>
              Selecciona las áreas a las que este rol tendrá acceso.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 tabular-nums sm:inline dark:text-stone-400">
              {permisos.length} de {TODOS_LOS_PERMISOS.length}
            </span>
            {!soloLectura && (
              <button
                type="button"
                onClick={() =>
                  setValue("permisos", todosSeleccionados ? [] : [...TODOS_LOS_PERMISOS], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="cursor-pointer text-xs font-semibold text-[#4C0107] hover:underline dark:text-[#E7B7BC]"
              >
                {todosSeleccionados ? "Quitar todo" : "Seleccionar todo"}
              </button>
            )}
          </div>
        </div>
        {errors.permisos && <p className={cn(errorClass, "-mt-2 shrink-0")}>{errors.permisos.message}</p>}

        <Controller
          control={control}
          name="permisos"
          render={({ field }) => (
            <GrillaAjustada paginacion={paginacion} etiqueta="Permisos por módulo">
              {paginacion.visibles.map((modulo) => (
                <li key={modulo.id} className="min-h-0">
                  <TarjetaModulo
                    modulo={modulo}
                    seleccionados={field.value}
                    soloLectura={soloLectura}
                    onChange={(siguientes) => field.onChange(siguientes)}
                  />
                </li>
              ))}
            </GrillaAjustada>
          )}
        />

        <BarraPaginacion paginacion={paginacion} etiqueta="módulos" />

        <ErrorGuardado mensaje={errorGuardado} />

        {/* Acciones */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-stone-800 [@media(max-height:700px)]:pt-2.5">
          <div className="min-w-0">
            {esEdicion && !soloLectura && puedeEliminar && rol && (
              confirmandoEliminar ? (
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs font-medium text-red-700 sm:inline dark:text-red-300">¿Eliminar rol?</span>
                  <Button
                    type="button"
                    size="sm"
                    loading={isDeleting}
                    onClick={() => void confirmDelete(rol.id)}
                    className="h-9 rounded-full bg-red-600 px-3 text-xs text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
                  >
                    Eliminar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmandoEliminar(false)}
                    disabled={isDeleting}
                    className="h-9 rounded-full px-3 text-xs dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setErrorGuardado(null)
                    setConfirmandoEliminar(true)
                  }}
                  disabled={empleadosAsignados > 0}
                  title={empleadosAsignados > 0 ? "Tiene empleados asignados" : undefined}
                  leftIcon={<Trash2 className="size-4" />}
                  className="h-10 rounded-full px-3 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <span className="hidden sm:inline">Eliminar rol</span>
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVolver}
              disabled={isSubmitting || isDeleting}
              className={botonSecundario}
            >
              {soloLectura ? "Volver" : "Cancelar"}
            </Button>
            {!soloLectura && (
              <Button type="submit" size="sm" loading={isSubmitting} disabled={isDeleting} className={botonPrimario}>
                {esEdicion ? "Guardar cambios" : "Crear Rol"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

function TarjetaModulo({
  modulo,
  seleccionados,
  soloLectura,
  onChange,
}: {
  modulo: ModuloSistema
  seleccionados: string[]
  soloLectura: boolean
  onChange: (permisos: string[]) => void
}) {
  const Icono = MODULO_ICONOS[modulo.id]
  const activos = modulo.acciones.filter((a) => seleccionados.includes(clavePermiso(modulo.id, a.id))).length

  const alternar = (clave: string, marcado: boolean) =>
    onChange(marcado ? [...seleccionados, clave] : seleccionados.filter((p) => p !== clave))

  return (
    <article className={cn(tarjetaClass, "gap-3")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-stone-100">
          <Icono className="size-4 shrink-0 text-[#4C0107] dark:text-[#E7B7BC]" />
          <span className="truncate">{modulo.nombre}</span>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            activos > 0
              ? "bg-[#EDE5E6] text-[#4C0107] dark:bg-[#E7B7BC]/15 dark:text-[#E7B7BC]"
              : "bg-slate-100 text-slate-500 dark:bg-stone-800 dark:text-stone-400"
          )}
        >
          {activos}/{modulo.acciones.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {modulo.acciones.map((accion) => {
          const clave = clavePermiso(modulo.id, accion.id)
          const marcado = seleccionados.includes(clave)
          return (
            <li key={accion.id}>
              <label
                className={cn(
                  "flex items-center gap-2.5 text-sm text-slate-700 dark:text-stone-300",
                  soloLectura ? "cursor-default" : "cursor-pointer"
                )}
              >
                <Checkbox
                  checked={marcado}
                  disabled={soloLectura}
                  onCheckedChange={(valor) => alternar(clave, valor === true)}
                  className="border-slate-300 data-checked:border-[#4C0107] data-checked:bg-[#4C0107] data-checked:text-white dark:border-stone-600 dark:data-checked:border-[#E7B7BC] dark:data-checked:bg-[#E7B7BC] dark:data-checked:text-stone-900"
                />
                <span className="truncate">{accion.nombre}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Registro y renombrado de mesas                      */
/* -------------------------------------------------------------------------- */

export function MesaForm({
  mesa,
  areas,
  areaPorDefecto,
  onGuardada,
  onClose,
}: {
  // Mesa a editar; si no se envía, se registra una nueva
  mesa?: Mesa
  areas: Area[]
  areaPorDefecto?: string
  onGuardada: (mesa: Mesa, esNueva: boolean) => void
  onClose: () => void
}) {
  const esEdicion = Boolean(mesa)
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const { submit, isSubmitting } = useEntityForm<Mesa, MesaFormValues, MesaInput, MesaInput, Mesa>({
    id: mesa?.id,
    actionCreate: registrarMesa,
    actionUpdate: actualizarMesa,
    mapEntityToForm: (entidad) => mesaToFormValues(entidad),
    mapFormToCreatePayload: mesaFormToInput,
    mapFormToUpdatePayload: (values) => mesaFormToInput(values),
    onCreated: (creada) => {
      onGuardada(creada, true)
      onClose()
    },
    onUpdated: (values) => {
      if (mesa) onGuardada({ ...mesa, ...mesaFormToInput(values) }, false)
      onClose()
    },
    onSaveError: setErrorGuardado,
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MesaFormValues>({
    resolver: zodResolver(mesaFormSchema),
    defaultValues: mesaToFormValues(mesa, areaPorDefecto ?? areas[0]?.id),
  })

  const onSubmit = async (values: MesaFormValues) => {
    setErrorGuardado(null)
    await submit(values)
  }

  return (
    <ModalBase
      titulo={esEdicion ? "Editar mesa" : "Nueva mesa"}
      descripcion="Los mozos verán este identificador en el mapa de mesas del POS."
      onClose={onClose}
      bloqueado={isSubmitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
            <Campo id="mesa-nombre" label="Identificador" error={errors.nombre?.message}>
              <Input
                id="mesa-nombre"
                {...register("nombre")}
                placeholder="Ej. Mesa 10"
                autoComplete="off"
                maxLength={20}
                state={errors.nombre ? "error" : "default"}
                aria-invalid={Boolean(errors.nombre)}
                className={inputClass}
              />
            </Campo>
            <Campo id="mesa-capacidad" label="Capacidad" error={errors.capacidad?.message}>
              <Input
                id="mesa-capacidad"
                {...register("capacidad")}
                type="number"
                inputMode="numeric"
                min={1}
                max={CAPACIDAD_MAXIMA_MESA}
                state={errors.capacidad ? "error" : "default"}
                aria-invalid={Boolean(errors.capacidad)}
                className={cn(inputClass, "tabular-nums")}
              />
            </Campo>
          </div>

          <Campo label="Área de atención" error={errors.area?.message}>
            <Controller
              control={control}
              name="area"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Área de atención" className="flex flex-wrap gap-2">
                  {areas.map((a) => {
                    const Icono = getAreaIcon(a.id)
                    const activa = field.value === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={activa}
                        onClick={() => field.onChange(a.id)}
                        className={cn(
                          "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                          opcionClass(activa)
                        )}
                      >
                        <Icono className="size-3.5" />
                        {a.nombre}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </Campo>

          <ErrorGuardado mensaje={errorGuardado} />
        </div>

        <AccionesFormulario
          onCancelar={onClose}
          enviando={isSubmitting}
          textoEnviar={esEdicion ? "Guardar cambios" : "Registrar mesa"}
        />
      </form>
    </ModalBase>
  )
}

/* -------------------------------------------------------------------------- */
/*              RF-12: Administración de áreas de atención                    */
/* -------------------------------------------------------------------------- */

export function AreasForm({
  areas,
  mesasPorArea,
  onGuardar,
  onEliminada,
  onClose,
}: {
  areas: Area[]
  mesasPorArea: ReadonlyMap<string, number>
  onGuardar: (nombre: string, id?: string) => Promise<OneQuery<Area>>
  onEliminada: (area: Area) => void
  onClose: () => void
}) {
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [errorAccion, setErrorAccion] = React.useState<string | null>(null)

  const { entityToDelete, confirmDelete } = useEntityDelete<string>({
    actionDelete: eliminarArea,
    onSuccess: (id) => {
      const eliminada = areas.find((a) => a.id === id)
      if (eliminada) onEliminada(eliminada)
    },
    onError: setErrorAccion,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: { nombre: "" },
  })

  const onCrear = async ({ nombre }: AreaFormValues) => {
    setErrorAccion(null)
    const respuesta = await onGuardar(nombre)
    if (respuesta.isOk()) reset({ nombre: "" })
    else setErrorAccion(respuesta.getMessage())
  }

  return (
    <ModalBase
      titulo="Áreas de atención"
      descripcion="Agrupa las mesas por zona del local: salón, terraza, segundo piso…"
      onClose={onClose}
    >
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        <form onSubmit={handleSubmit(onCrear)} className="flex flex-col gap-1.5" noValidate>
          <label htmlFor="area-nueva" className={labelClass}>
            Nueva área
          </label>
          <div className="flex items-start gap-2">
            <Input
              id="area-nueva"
              {...register("nombre")}
              placeholder="Ej. Segundo piso"
              maxLength={30}
              autoComplete="off"
              state={errors.nombre ? "error" : "default"}
              aria-invalid={Boolean(errors.nombre)}
              className="h-10 rounded-xl"
            />
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
              leftIcon={<Plus className="size-4" />}
              className={cn(botonPrimario, "shrink-0 px-4")}
            >
              Agregar
            </Button>
          </div>
          {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
        </form>

        <ErrorGuardado mensaje={errorAccion} />

        <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
          {areas.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">Aún no hay áreas.</li>
          )}
          {areas.map((area) => (
            <AreaFila
              key={area.id}
              area={area}
              totalMesas={mesasPorArea.get(area.id) ?? 0}
              editando={editandoId === area.id}
              eliminando={entityToDelete === area.id}
              onEditar={() => {
                setErrorAccion(null)
                setEditandoId(area.id)
              }}
              onCancelarEdicion={() => setEditandoId(null)}
              onGuardar={async (nombre) => {
                setErrorAccion(null)
                const respuesta = await onGuardar(nombre, area.id)
                if (respuesta.isOk()) setEditandoId(null)
                else setErrorAccion(respuesta.getMessage())
              }}
              onEliminar={async () => {
                setErrorAccion(null)
                await confirmDelete(area.id)
              }}
            />
          ))}
        </ul>
      </div>
    </ModalBase>
  )
}

function AreaFila({
  area,
  totalMesas,
  editando,
  eliminando,
  onEditar,
  onCancelarEdicion,
  onGuardar,
  onEliminar,
}: {
  area: Area
  totalMesas: number
  editando: boolean
  eliminando: boolean
  onEditar: () => void
  onCancelarEdicion: () => void
  onGuardar: (nombre: string) => Promise<void>
  onEliminar: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = React.useState(false)
  const enUso = totalMesas > 0
  const inputId = React.useId()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: { nombre: area.nombre },
  })

  const botonIcono =
    "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"

  if (editando) {
    return (
      <li className="p-3">
        <form onSubmit={handleSubmit(({ nombre }) => onGuardar(nombre))} className="flex flex-col gap-1.5" noValidate>
          <label htmlFor={inputId} className="sr-only">
            Nombre del área
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              {...register("nombre")}
              maxLength={30}
              autoComplete="off"
              autoFocus
              state={errors.nombre ? "error" : "default"}
              aria-invalid={Boolean(errors.nombre)}
              className="h-9 rounded-xl"
            />
            <button type="submit" disabled={isSubmitting} aria-label="Guardar nombre" className={botonIcono}>
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={onCancelarEdicion}
              disabled={isSubmitting}
              aria-label="Cancelar edición"
              className={botonIcono}
            >
              <X className="size-4" />
            </button>
          </div>
          {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EDE5E6] text-[#4C0107] dark:bg-stone-800 dark:text-stone-200">
        {React.createElement(getAreaIcon(area.id), { className: "size-4" })}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{area.nombre}</span>
        <span className="text-xs text-slate-500 dark:text-stone-400">
          {totalMesas} {totalMesas === 1 ? "mesa" : "mesas"}
        </span>
      </div>

      {confirmando ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-red-700 dark:text-red-300">¿Eliminar?</span>
          <button
            type="button"
            disabled={eliminando}
            onClick={async () => {
              await onEliminar()
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
      ) : (
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEditar} aria-label={`Renombrar ${area.nombre}`} className={botonIcono}>
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={enUso}
            title={enUso ? "Tiene mesas asignadas" : undefined}
            aria-label={`Eliminar ${area.nombre}`}
            className={cn(botonIcono, "hover:text-red-600 dark:hover:text-red-400")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </li>
  )
}
