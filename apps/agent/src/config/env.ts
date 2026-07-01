import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NEXUS_API_URL: z.string().url(),
  NEXUS_AGENT_TOKEN: z.string().min(10),
  NEXUS_START_COMMAND: z.string().min(1),
  NEXUS_WORKING_DIR: z.string().default("."),
  NEXUS_STOP_SIGNAL: z.string().default("SIGTERM"),
  NEXUS_STOP_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  NEXUS_RESTART_ON_CRASH: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid agent environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
