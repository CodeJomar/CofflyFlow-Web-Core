"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"

import { useCan } from "@/modules/auth"
import { EstadoError } from "@/shared/components/composed/estado-error"
import { EstadoVacio } from "@/shared/components/composed/estado-vacio"
import { SearchInput } from "@/shared/components/composed/search-input"
import { Button } from "@/shared/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select"
import { BarraPaginacion, GrillaAjustada } from "@/shared/components/ui/pagination"
import { ACCION, MODULO } from "@/shared/constants/permisos"
import { usePaginacionAjustada } from "@/shared/hooks"
import { cn } from "@/shared/utils/cn"

import {
  BajaForm,
  ESTADO_EMPLEADO_CONFIG,
  EmpleadoCard,
  EmpleadoForm,
  EncabezadoSeccion,
  GrillaSkeleton,
  botonPrimario,
  selectClass,
} from "../components"
import { usePersonal } from "../hooks"
import { estadoEmpleadoSchema, type Empleado, type FiltroEstadoEmpleado } from "../schema"
import { ALTO_EMPLEADO, vistaClass } from "./medidas"

type ModalPersonal = { modo: "registrar" } | { modo: "editar"; empleado: Empleado } | { modo: "baja"; empleado: Empleado } | null

/** Gestión de personal y asignación de cargos. */
export function PersonalView() {
  // Entrar a la pantalla lo exige la ruta (USERS:LEER); aquí se decide qué más puede hacer cada cargo
  const { puede } = useCan()
  const puedeRegistrar = puede({ modulo: MODULO.USERS, accion: ACCION.CREAR })
  const puedeEditar = puede({ modulo: MODULO.USERS, accion: ACCION.EDITAR })
  const puedeDarDeBaja = puede({ modulo: MODULO.USERS, accion: ACCION.ELIMINAR })

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
        <SearchInput
          value={personal.busqueda}
          onValueChange={personal.setBusqueda}
          placeholder="Buscar por nombre, correo o cargo…"
          aria-label="Buscar empleado"
          className="min-w-0 flex-1"
        />
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
        <EstadoError mensaje={error} onReintentar={recargar} className="min-h-0 flex-1" />
      ) : !cargado ? (
        <GrillaSkeleton />
      ) : empleadosFiltrados.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion="No hay empleados que coincidan con los filtros."
          accion={{ texto: "Limpiar filtros", onClick: personal.limpiarFiltros }}
          className="min-h-0 flex-1"
        />
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
                  onDarDeBaja={(e) => setModal({ modo: "baja", empleado: e })}
                  onCambiarEstado={personal.cambiarEstado}
                  onReenviar={personal.reenviar}
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
          cargos={cargos}
          onGuardar={personal.guardarEmpleado}
          onClose={cerrarModal}
        />
      )}

      {modal?.modo === "baja" && (
        <BajaForm empleado={modal.empleado} onConfirmar={personal.darDeBaja} onClose={cerrarModal} />
      )}
    </div>
  )
}
