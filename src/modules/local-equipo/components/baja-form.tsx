"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info } from "lucide-react"

import { FloatingTextarea } from "@/shared/components/composed/floating-textarea"
import { FormPanel } from "@/shared/components/composed/form-panel"
import { Button } from "@/shared/components/ui/button"

import { bajaFormSchema, type BajaFormValues, type Empleado } from "../schema"
import { errorClass } from "./estilos"

/** Panel para dar de baja a un empleado, con el motivo opcional (queda en su ficha). */
export function BajaForm({
  empleado,
  onConfirmar,
  onClose,
}: {
  empleado: Empleado
  // Devuelve true si se dio de baja (entonces el panel se cierra)
  onConfirmar: (empleado: Empleado, motivo: string) => Promise<boolean>
  onClose: () => void
}) {
  const formId = React.useId()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BajaFormValues>({ resolver: zodResolver(bajaFormSchema), defaultValues: { motivo: "" } })

  const onSubmit = async ({ motivo }: BajaFormValues) => {
    if (await onConfirmar(empleado, motivo)) onClose()
  }

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto && !isSubmitting) onClose()
      }}
      title="Dar de baja"
      description={`${empleado.nombre} perderá el acceso al sistema; su historial se conserva.`}
      footer={
        <>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} size="md" variant="danger-strong" disabled={isSubmitting}>
            Dar de baja
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <FloatingTextarea
            id="baja-motivo"
            label="Motivo de la baja (opcional)"
            {...register("motivo")}
            maxLength={255}
            rows={3}
            state={errors.motivo ? "error" : "default"}
            aria-invalid={Boolean(errors.motivo)}
          />
          {errors.motivo && <p className={errorClass}>{errors.motivo.message}</p>}
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-stone-950/60 dark:text-stone-300">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          La baja retira al empleado de la lista y revoca sus sesiones; sus pedidos y movimientos de caja se conservan. El motivo queda en su ficha.
        </p>
      </form>
    </FormPanel>
  )
}
