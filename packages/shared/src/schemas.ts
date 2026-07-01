import { z } from "zod";

export const emailRegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z
    .string()
    .min(10)
    .regex(/[A-Z]/, "must contain an uppercase letter")
    .regex(/[a-z]/, "must contain a lowercase letter")
    .regex(/[0-9]/, "must contain a number"),
});

export const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
});

export const moderationActionSchema = z.object({
  targetId: z.string().min(1),
  reason: z.string().max(500).optional(),
  durationSeconds: z.number().int().positive().optional(),
});

export const identityCardCreateSchema = z.object({
  discordUserId: z.string().min(1),
  type: z.enum([
    "MEMBER",
    "CITIZEN",
    "EMPLOYEE",
    "STUDENT",
    "VIP",
    "EVENT_PASS",
    "STAFF",
    "POLICE_RP",
    "MILITARY_RP",
    "ORGANIZATION",
    "CLAN",
    "GUILD",
    "COMPANY",
    "COMMUNITY",
    "CREATOR",
    "PREMIUM_MEMBER",
  ]),
  fullName: z.string().min(1).max(64),
  theme: z.string().default("default"),
  roleLabel: z.string().max(64).optional(),
});

export const ticketCreateSchema = z.object({
  subject: z.string().min(1).max(120),
  category: z.string().optional(),
});

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(64),
  scopes: z.array(z.string()).default([]),
  expiresInDays: z.number().int().positive().optional(),
});
