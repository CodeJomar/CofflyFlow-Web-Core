"use client"

import * as React from "react"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import type { RolUsuario } from "@/shared/constants/permisos"

interface WorkspaceLayoutContextProps {
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  isDrawerOpen: boolean
  setIsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggleSidebar: () => void
  isMobile: boolean
  // Rol activo del usuario en el workspace (Dueño / Empleado / Administrador)
  rol: RolUsuario
  setRol: React.Dispatch<React.SetStateAction<RolUsuario>>
}

const WorkspaceLayoutContext = React.createContext<WorkspaceLayoutContextProps | undefined>(undefined)

export function WorkspaceLayoutProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [rol, setRol] = React.useState<RolUsuario>("dueno")
  const isMobile = useIsMobile()

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setIsDrawerOpen((prev) => !prev)
    } else {
      setIsCollapsed((prev) => !prev)
    }
  }, [isMobile])

  return (
    <WorkspaceLayoutContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isDrawerOpen,
        setIsDrawerOpen,
        toggleSidebar,
        isMobile: !!isMobile,
        rol,
        setRol,
      }}
    >
      {children}
    </WorkspaceLayoutContext.Provider>
  )
}

export function useWorkspaceLayout() {
  const context = React.useContext(WorkspaceLayoutContext)
  if (!context) {
    throw new Error("useWorkspaceLayout debe usarse dentro de un WorkspaceLayoutProvider")
  }
  return context
}
