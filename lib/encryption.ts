/**
 * AES-256-GCM encryption helpers for sensitive values stored in the database
 * (currently: GitHub OAuth access tokens in the GitHubConnection table).
 *
 * Requires ENCRYPTION_KEY env var — a 64-character hex string (32 bytes / 256 bits).
 * Generate one with: openssl rand -hex 32
 *
 * If ENCRYPTION_KEY is not set the functions are no-ops that return the value
 * unchanged. This keeps the app functional in development and during migration,
 * but tokens will not be encrypted at rest until the key is configured.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // 256-bit key
const IV_BYTES = 12; //  96-bit IV (NIST-recommended for GCM)
const TAG_BYTES = 16; // 128-bit auth tag

// Stored format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
// Fixed-length prefixes allow isEncryptedValue() to distinguish
// encrypted blobs from legacy plaintext tokens without ambiguity.
const IV_HEX_LEN = IV_BYTES * 2; // 24
const TAG_HEX_LEN = TAG_BYTES * 2; // 32

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;

  if (!raw) {
    return null; // Key not configured — encryption disabled
  }

  const buf = Buffer.from(raw, "hex");

  if (buf.length !== KEY_BYTES) {
    logger.warn(
      `ENCRYPTION_KEY is ${buf.length} bytes — expected ${KEY_BYTES}. ` +
        `Generate a valid key with: openssl rand -hex ${KEY_BYTES}`,
      { byteLength: buf.length }
    );
    return null;
  }

  return buf;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a colon-delimited hex string: `<iv>:<authTag>:<ciphertext>`.
 * If ENCRYPTION_KEY is not configured, the plaintext is returned unchanged.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypt a value previously produced by encrypt().
 *
 * If the value does not match the encrypted format (i.e. it is a legacy
 * plaintext token stored before encryption was enabled), it is returned
 * unchanged — this ensures backward compatibility during migration.
 *
 * Throws if the value looks encrypted but decryption fails (tampered data).
 */
export function decrypt(value: string): string {
  const key = getKey();

  if (!key || !isEncryptedValue(value)) {
    return value; // No key, or pre-encryption plaintext token
  }

  const [ivHex, authTagHex, ciphertextHex] = value.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Returns true if the value looks like output from encrypt().
 * Used to distinguish encrypted blobs from legacy plaintext tokens.
 */
export function isEncryptedValue(value: string): boolean {
  const parts = value.split(":");
  return (
    parts.length === 3 &&
    parts[0].length === IV_HEX_LEN &&
    parts[1].length === TAG_HEX_LEN &&
    parts.every((p) => /^[0-9a-f]+$/i.test(p))
  );
}
