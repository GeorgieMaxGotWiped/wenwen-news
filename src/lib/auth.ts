import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "wenwen_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const DEV_SECRET = "wenwen-dev-secret-not-for-production";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

function authSecret(): string | null {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  return null;
}

export function authConfigured(): boolean {
  return authSecret() !== null;
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

export function createSessionToken(user: SessionUser): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: issuedAt,
      exp: issuedAt + SESSION_MAX_AGE,
    }),
  );
  const body = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const secret = authSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      name?: string;
      exp?: number;
    };
    if (!data.sub || !data.email || !data.name) return null;
    if (typeof data.exp === "number" && data.exp * 1000 < Date.now()) return null;
    return { id: data.sub, email: data.email, name: data.name };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<boolean> {
  const token = createSessionToken(user);
  if (!token) return false;
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return true;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
