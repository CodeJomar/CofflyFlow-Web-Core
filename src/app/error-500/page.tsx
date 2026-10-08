import type { Metadata } from "next"
import { Error500View } from "@/modules/errors/views/error-500-view"

export const metadata: Metadata = {
  title: "Error 500 | Coffy Flow",
  description: "Error interno del servidor en Coffy Flow",
}

export default function Error500Page() {
  return <Error500View />
}
