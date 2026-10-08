import type { Metadata } from "next"
import { Error429View } from "@/modules/errors/views/error-429-view"

export const metadata: Metadata = {
  title: "Error 429 | Coffy Flow",
  description: "Demasiadas solicitudes en Coffy Flow",
}

export default function Error429Page() {
  return <Error429View />
}
