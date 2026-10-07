import { LoginView } from "@/modules/auth"

export const metadata = {
  title: "Iniciar sesión | Coffy Flow",
  description: "Ingresar credenciales para el accesso al sistema.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string | string[] }>
}) {
  const { siguiente } = await searchParams
  return <LoginView siguiente={Array.isArray(siguiente) ? siguiente[0] : siguiente} />
}
