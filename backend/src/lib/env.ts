import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET é obrigatório"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET_NAME: z.string().optional().default(""),
  R2_ENDPOINT: z.string().optional().default(""),
  R2_PUBLIC_URL: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
