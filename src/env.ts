import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_RP_ID: z.string().min(1),
    NEXT_PUBLIC_EXPECTED_ORIGIN: z.string().url(),
    NEXT_PUBLIC_ALLOWED_ORIGINS: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_RP_ID: process.env.NEXT_PUBLIC_RP_ID,
    NEXT_PUBLIC_EXPECTED_ORIGIN: process.env.NEXT_PUBLIC_EXPECTED_ORIGIN,
    NEXT_PUBLIC_ALLOWED_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS,
  },
});
