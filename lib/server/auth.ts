import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "pw_admin";
const SESSION_HOURS = 24;

function devMode() {
  return !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** 설정된 PIN. 메모리(개발) 모드에서만 미설정 시 "0000"을 쓴다. */
export function adminPin(): string | null {
  const pin = process.env.ADMIN_PIN?.trim();
  if (pin) return pin;
  return devMode() ? "0000" : null;
}

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // 미설정 시 PIN과 서비스 키로 파생 (PIN을 바꾸면 기존 세션이 무효화된다)
  return createHash("sha256")
    .update(`${adminPin()}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev"}`)
    .digest("hex");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPin(input: string): boolean {
  const pin = adminPin();
  if (!pin) return false;
  // 길이 노출을 막기 위해 해시끼리 비교
  const h = (v: string) => createHash("sha256").update(v).digest("hex");
  return safeEqual(h(input), h(pin));
}

export function createSessionToken(): { value: string; maxAge: number } {
  const maxAge = SESSION_HOURS * 3600;
  const exp = String(Math.floor(Date.now() / 1000) + maxAge);
  return { value: `${exp}.${sign(exp)}`, maxAge };
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) * 1000 > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}
