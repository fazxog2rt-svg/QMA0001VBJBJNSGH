import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { customAlphabet } from "nanoid";
import { API_KEY_PREFIX } from "@nexusbot/shared";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// URL-safe alphabet, 40 chars of entropy after the prefix.
const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  40,
);

/**
 * Generates a new API key. Returns the plaintext (shown once to the user)
 * plus the SHA-256 hash + prefix that are persisted to ApiKey.keyHash/keyPrefix.
 * Never store or log the plaintext key.
 */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = `${API_KEY_PREFIX}${nanoid()}`;
  const hash = sha256(plaintext);
  const prefix = plaintext.slice(0, API_KEY_PREFIX.length + 8);
  return { plaintext, hash, prefix };
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Generates a set of one-time 2FA backup codes (plaintext, shown once). */
export function generateBackupCodes(count = 8): string[] {
  const alphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);
  return Array.from({ length: count }, () => alphabet());
}
