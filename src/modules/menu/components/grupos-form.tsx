"use client"

import * as React from "react"
import { Button } from "@/shared/components/ui/button"
import { FormPanel } from "@/shared/components/composed/form-panel"
import { useConfirm } from "@/shared/providers/confirm-provider"
import { type GrupoFormValues, type GrupoMenu, type OpcionFormValues } from "../schema"
import { NuevoGrupoForm } from "./nuevo-grupo-form"
import { GrupoFila } from "./grupo-fila"

/* -------------------------------------------------------------------------- */
/*              Grupos de personalización (leche, endulzante, etc.)           */
/* -------------------------------------------------------------------------- */

interface GruposFormProps {
  grupos: GrupoMenu[]
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  onGuardarGrupo: (values: GrupoFormValues, id?: string) => Promise<boolean>
  onEliminarGrupo: (grupo: GrupoMenu) => Promise<boolean>
  onGuardarOpcion: (idGrupo: string, values: OpcionFormValues, idOpcion?: string) => Promise<boolean>
  onAlternarOpcion: (idOpcion: string, nombre: string, disponible: boolean) => Promise<boolean>
  onEliminarOpcion: (idOpcion: string, nombre: string) => Promise<boolean>
  onClose: () => void
}

/**
 * Panel lateral para administrar los grupos de personalización y sus opciones. Cada opción puede sumar o restar
 * al precio del producto («+ S/ 1.50 por leche de avena»). Los grupos se asignan a cada producto desde su formulario.
 */
export function GruposForm({
  grupos,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onGuardarGrupo,
  onEliminarGrupo,
  onGuardarOpcion,
  onAlternarOpcion,
  onEliminarOpcion,
  onClose,
}: GruposFormProps) {
  const confirm = useConfirm()
  const [abiertoId, setAbiertoId] = React.useState<string | null>(null)

  return (
    <FormPanel
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose()
      }}
      title="Personalización"
      description="Grupos de opciones que el cliente elige al pedir: leche, endulzante, temperatura…"
      footer={
        <Button type="button" variant="outline" size="md" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {puedeCrear && <NuevoGrupoForm onCrear={(values) => onGuardarGrupo(values)} />}

        <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-100 dark:divide-stone-800 dark:border-stone-800">
          {grupos.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500 dark:text-stone-400">Aún no hay grupos.</li>
          )}
          {grupos.map((grupo) => (
            <GrupoFila
              key={grupo.id_grupo}
              grupo={grupo}
              abierto={abiertoId === grupo.id_grupo}
              puedeCrear={puedeCrear}
              puedeEditar={puedeEditar}
              puedeEliminar={puedeEliminar}
              onAlternar={() => setAbiertoId((actual) => (actual === grupo.id_grupo ? null : grupo.id_grupo))}
              onGuardarGrupo={(values) => onGuardarGrupo(values, grupo.id_grupo)}
              onEliminarGrupo={async () => {
                if (await confirm({ variant: "destructive" })) await onEliminarGrupo(grupo)
              }}
              onGuardarOpcion={(values, idOpcion) => onGuardarOpcion(grupo.id_grupo, values, idOpcion)}
              onAlternarOpcion={onAlternarOpcion}
              onEliminarOpcion={async (idOpcion, nombre) => {
                if (await confirm({ variant: "destructive" })) await onEliminarOpcion(idOpcion, nombre)
              }}
            />
          ))}
        </ul>
      </div>
    </FormPanel>
  )
}
