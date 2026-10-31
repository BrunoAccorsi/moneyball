import bcrypt from "bcryptjs";

let cachedPlain: string | null = null;
let cachedHash: string | null = null;

export function authConfigured(): boolean {
  return Boolean(process.env.AUTH_PASSWORD_HASH || process.env.AUTH_PASSWORD);
}

/**
 * AUTH_PASSWORD_HASH is a bcrypt hash and is preferred.
 * AUTH_PASSWORD is hashed in memory on first login and never written to the database.
 */
export async function verifyPassword(password: string): Promise<boolean> {
  const configuredHash = process.env.AUTH_PASSWORD_HASH;
  if (configuredHash) return bcrypt.compare(password, configuredHash);
  const plain = process.env.AUTH_PASSWORD;
  if (!plain) return false;
  if (cachedPlain !== plain || !cachedHash) {
    cachedPlain = plain;
    cachedHash = bcrypt.hashSync(plain, 10);
  }
  return bcrypt.compare(password, cachedHash);
}
