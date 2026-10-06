"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { ROL_LABELS } from "@/shared/constants/permisos"
import { cn } from "@/shared/utils/cn"

import { ROL_OPERATIVO_CONFIG, getAreaIcon, opcionClass } from "../components"
import {
  CAPACIDAD_MAXIMA_MESA,
  ROLES_OPERATIVOS,
  areaFormSchema,
  bajaEmpleadoSchema,
  empleadoFormSchema,
  empleadoToFormValues,
  mesaFormSchema,
  mesaFormToInput,
  mesaToFormValues,
  rolOperativoSchema,
  type Area,
  type AreaFormValues,
  type BajaEmpleadoValues,
  type Empleado,
  type EmpleadoFormValues,
  type EmpleadoInput,
  type Mesa,
  type MesaFormValues,
  type MesaInput,
} from "../schema"

const labelClass = "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-stone-400"
const errorClass = "text-xs font-medium text-red-600 dark:text-red-400"
const inputClass = "h-11 rounded-xl"
const botonPrimario =
  "h-10 rounded-full bg-[#4C0107] px-5 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
const botonSecundario = "h-10 rounded-full px-5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"

const mensajeError = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto)

/* -------------------------------------------------------------------------- */
/*                               Modal base                                   */
/* -------------------------------------------------------------------------- */

function ModalBase({
  titulo,
  descripcion,
  onClose,
  bloqueado = false,
  ancho = "max-w-lg",
  children,
}: {
  titulo: string
  descripcion?: string
  onClose: () => void
  bloqueado?: boolean
  ancho?: string
  children: React.ReactNode
}) {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const tituloId = React.useId()

  const cerrar = React.useCallback(() => {
    if (!bloqueado) onClose()
  }, [bloqueado, onClose])

  // Foco inicial dentro del modal (solo al abrir)
  React.useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  // Cierre con Escape
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [cerrar])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        onClick={cerrar}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs dark:bg-black/70"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 dark:border-stone-800 dark:bg-stone-900",
          ancho
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-stone-800">
          <div className="flex flex-col gap-0.5">
            <h2 id={tituloId} className="text-lg font-bold text-slate-900 dark:text-stone-100">
              {titulo}
            </h2>
            {descripcion && <p className="text-xs text-slate-500 dark:text-stone-400">{descripcion}</p>}
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={bloqueado}
            aria-label="Cerrar"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
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
    <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-stone-800">
      <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={enviando} className={botonSecundario}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" loading={enviando} className={botonPrimario}>
        {textoEnviar}
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*              RF-11: Registro y actualización de empleados                  */
/* -------------------------------------------------------------------------- */

interface EmpleadoFormProps {
  // Empleado a editar; si no se envía, el formulario registra uno nuevo
  empleado?: Empleado
  onGuardar: (input: EmpleadoInput, id?: string) => Promise<unknown>
  onClose: () => void
}

export default function EmpleadoForm({ empleado, onGuardar, onClose }: EmpleadoFormProps) {
  const esEdicion = Boolean(empleado)
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmpleadoFormValues>({
    resolver: zodResolver(empleadoFormSchema),
    defaultValues: empleadoToFormValues(empleado),
  })

  const onSubmit = async (values: EmpleadoFormValues) => {
    setErrorGuardado(null)
    try {
      await onGuardar(values, empleado?.id)
      onClose()
    } catch (e) {
      setErrorGuardado(mensajeError(e, "No se pudo guardar al empleado."))
    }
  }

  return (
    <ModalBase
      titulo={esEdicion ? "Actualizar datos del empleado" : "Registrar empleado"}
      descripcion="Los datos y el rol operativo definen a qué módulos podrá acceder."
      onClose={onClose}
      bloqueado={isSubmitting}
      ancho="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo id="emp-nombres" label="Nombres" error={errors.nombres?.message}>
              <Input
                id="emp-nombres"
                {...register("nombres")}
                placeholder="Ej. Lucía"
                autoComplete="off"
                maxLength={60}
                state={errors.nombres ? "error" : "default"}
                aria-invalid={Boolean(errors.nombres)}
                className={inputClass}
              />
            </Campo>
            <Campo id="emp-apellidos" label="Apellidos" error={errors.apellidos?.message}>
              <Input
                id="emp-apellidos"
                {...register("apellidos")}
                placeholder="Ej. Ramírez Soto"
                autoComplete="off"
                maxLength={60}
                state={errors.apellidos ? "error" : "default"}
                aria-invalid={Boolean(errors.apellidos)}
                className={inputClass}
              />
            </Campo>
            <Campo id="emp-dni" label="DNI" error={errors.dni?.message}>
              <Input
                id="emp-dni"
                {...register("dni")}
                inputMode="numeric"
                placeholder="8 dígitos"
                autoComplete="off"
                maxLength={8}
                state={errors.dni ? "error" : "default"}
                aria-invalid={Boolean(errors.dni)}
                className={cn(inputClass, "tabular-nums")}
              />
            </Campo>
            <Campo id="emp-telefono" label="Celular" error={errors.telefono?.message}>
              <Input
                id="emp-telefono"
                {...register("telefono")}
                type="tel"
                inputMode="numeric"
                placeholder="9XXXXXXXX"
                autoComplete="off"
                maxLength={9}
                state={errors.telefono ? "error" : "default"}
                aria-invalid={Boolean(errors.telefono)}
                className={cn(inputClass, "tabular-nums")}
              />
            </Campo>
            <Campo id="emp-correo" label="Correo" error={errors.correo?.message}>
              <Input
                id="emp-correo"
                {...register("correo")}
                type="email"
                placeholder="nombre@coffyflow.pe"
                autoComplete="off"
                state={errors.correo ? "error" : "default"}
                aria-invalid={Boolean(errors.correo)}
                className={inputClass}
              />
            </Campo>
            <Campo id="emp-ingreso" label="Fecha de ingreso" error={errors.fechaIngreso?.message}>
              <Input
                id="emp-ingreso"
                {...register("fechaIngreso")}
                type="date"
                state={errors.fechaIngreso ? "error" : "default"}
                aria-invalid={Boolean(errors.fechaIngreso)}
                className={cn(inputClass, "dark:[color-scheme:dark]")}
              />
            </Campo>
          </div>

          {/* Asignación de rol operativo */}
          <Campo label="Rol operativo" error={errors.rol?.message}>
            <Controller
              control={control}
              name="rol"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Rol operativo" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {rolOperativoSchema.options.map((rol) => {
                    const info = ROLES_OPERATIVOS[rol]
                    const Icono = ROL_OPERATIVO_CONFIG[rol].icon
                    const activo = field.value === rol
                    return (
                      <button
                        key={rol}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => field.onChange(rol)}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 text-left transition-colors",
                          opcionClass(activo)
                        )}
                      >
                        <Icono className="mt-0.5 size-4 shrink-0" />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold">{info.nombre}</span>
                          <span className={cn("text-[11px]", activo ? "opacity-85" : "opacity-75")}>
                            Acceso: {ROL_LABELS[info.acceso]}
                          </span>
                        </span>
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
          textoEnviar={esEdicion ? "Guardar cambios" : "Registrar empleado"}
        />
      </form>
    </ModalBase>
  )
}

/* -------------------------------------------------------------------------- */
/*                    RF-11: Dar de baja a un empleado                        */
/* -------------------------------------------------------------------------- */

export function BajaEmpleadoForm({
  empleado,
  onConfirmar,
  onClose,
}: {
  empleado: Empleado
  onConfirmar: (empleado: Empleado, motivo: string) => Promise<void>
  onClose: () => void
}) {
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BajaEmpleadoValues>({
    resolver: zodResolver(bajaEmpleadoSchema),
    defaultValues: { motivo: "" },
  })

  const onSubmit = async ({ motivo }: BajaEmpleadoValues) => {
    setErrorGuardado(null)
    try {
      await onConfirmar(empleado, motivo)
      onClose()
    } catch (e) {
      setErrorGuardado(mensajeError(e, "No se pudo dar de baja al empleado."))
    }
  }

  return (
    <ModalBase
      titulo="Dar de baja"
      descripcion={`${empleado.nombres} ${empleado.apellidos} · ${ROLES_OPERATIVOS[empleado.rol].nombre}`}
      onClose={onClose}
      bloqueado={isSubmitting}
      ancho="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            El empleado perderá el acceso al sistema. Su historial se conserva y podrás reactivarlo después.
          </p>
          <Campo id="baja-motivo" label="Motivo de la baja" error={errors.motivo?.message}>
            <Textarea
              id="baja-motivo"
              {...register("motivo")}
              rows={3}
              maxLength={120}
              placeholder="Ej. Renuncia voluntaria, fin de contrato…"
              aria-invalid={Boolean(errors.motivo)}
              className="rounded-xl border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
          </Campo>
          <ErrorGuardado mensaje={errorGuardado} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-stone-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className={botonSecundario}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={isSubmitting}
            className="h-10 rounded-full bg-red-600 px-5 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
          >
            Confirmar baja
          </Button>
        </div>
      </form>
    </ModalBase>
  )
}

/* -------------------------------------------------------------------------- */
/*                 RF-12: Registro y renombrado de mesas                      */
/* -------------------------------------------------------------------------- */

export function MesaForm({
  mesa,
  areas,
  areaPorDefecto,
  onGuardar,
  onClose,
}: {
  // Mesa a editar; si no se envía, se registra una nueva
  mesa?: Mesa
  areas: Area[]
  areaPorDefecto?: string
  onGuardar: (input: MesaInput, id?: string) => Promise<unknown>
  onClose: () => void
}) {
  const esEdicion = Boolean(mesa)
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MesaFormValues>({
    resolver: zodResolver(mesaFormSchema),
    defaultValues: mesaToFormValues(mesa, areaPorDefecto ?? areas[0]?.id),
  })

  const onSubmit = async (values: MesaFormValues) => {
    setErrorGuardado(null)
    try {
      await onGuardar(mesaFormToInput(values), mesa?.id)
      onClose()
    } catch (e) {
      setErrorGuardado(mensajeError(e, "No se pudo guardar la mesa."))
    }
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
  onEliminar,
  onClose,
}: {
  areas: Area[]
  mesasPorArea: ReadonlyMap<string, number>
  onGuardar: (nombre: string, id?: string) => Promise<unknown>
  onEliminar: (area: Area) => Promise<void>
  onClose: () => void
}) {
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [errorAccion, setErrorAccion] = React.useState<string | null>(null)

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
    try {
      await onGuardar(nombre)
      reset({ nombre: "" })
    } catch (e) {
      setErrorAccion(mensajeError(e, "No se pudo crear el área."))
    }
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
              className="h-10 shrink-0 rounded-full bg-[#4C0107] px-4 text-white hover:bg-[#4C0107]/90 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
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
              onEditar={() => {
                setErrorAccion(null)
                setEditandoId(area.id)
              }}
              onCancelarEdicion={() => setEditandoId(null)}
              onGuardar={async (nombre) => {
                setErrorAccion(null)
                try {
                  await onGuardar(nombre, area.id)
                  setEditandoId(null)
                } catch (e) {
                  setErrorAccion(mensajeError(e, "No se pudo renombrar el área."))
                }
              }}
              onEliminar={async () => {
                setErrorAccion(null)
                try {
                  await onEliminar(area)
                } catch (e) {
                  setErrorAccion(mensajeError(e, "No se pudo eliminar el área."))
                }
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
  onEditar,
  onCancelarEdicion,
  onGuardar,
  onEliminar,
}: {
  area: Area
  totalMesas: number
  editando: boolean
  onEditar: () => void
  onCancelarEdicion: () => void
  onGuardar: (nombre: string) => Promise<void>
  onEliminar: () => Promise<void>
}) {
  const [confirmando, setConfirmando] = React.useState(false)
  const [eliminando, setEliminando] = React.useState(false)
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
              setEliminando(true)
              await onEliminar()
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
