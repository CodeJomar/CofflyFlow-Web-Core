import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url("URL base de la API NestJS"),
  NEXT_PUBLIC_WS_URL: z.string().url("URL del servidor WebSocket (KDS/POS)"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Las variables NEXT_PUBLIC_* deben leerse de forma explícita para que Next las inline en el cliente.
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("Error en las variables de entorno:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
