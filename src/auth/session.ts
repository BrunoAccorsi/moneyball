export const SESSION_COOKIE = "mb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function sessionSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret";
  return "";
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(value: string): Promise<string> {
  const secret = sessionSecret();
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return hex(signature);
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  if (!sessionSecret()) throw new Error("SESSION_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const signature = await sign(String(exp));
  return `${exp}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || !sessionSecret()) return false;
  const [exp, signature] = token.split(".");
  if (!exp || !signature || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(exp);
  return safeEqual(expected, signature);
}
