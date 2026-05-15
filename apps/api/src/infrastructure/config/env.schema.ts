import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  APP_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // JWT + cookies — required to boot, even if no auth routes exist yet,
  // so misconfiguration surfaces at startup rather than at first login.
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(2592000),
  COOKIE_SECRET: z.string().min(32),

  // Optional until Sprint 1 wires the encryption transformer and search-hash helper.
  ENCRYPTION_KEY: z.string().optional(),
  SEARCH_HASH_SECRET: z.string().min(32).optional(),

  // Optional until Sprint 1 wires the email adapter.
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().default('noreply@conecta.local'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new Error(`Invalid environment variables:\n${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}
