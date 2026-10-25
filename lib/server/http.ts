import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { PhotoDTO, PhotoRow } from "@/lib/types";
import { isAdmin } from "./auth";
import type { Store } from "./store";

export function json(data: unknown, init?: number | ResponseInit) {
  const opts = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, {
    ...opts,
    headers: { "cache-control": "no-store", ...(opts?.headers ?? {}) },
  });
}

export function error(status: number, message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

/** 관리자 세션이 없으면 401 응답을, 있으면 null을 돌려준다. */
export async function requireAdmin() {
  return (await isAdmin()) ? null : error(401, "로그인이 필요합니다.");
}

export async function readJson<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export function clientIpHash(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** 혼동되는 문자(0/o, 1/l/i)를 뺀 행사 코드 생성. 31^10 ≈ 8×10^14 */
export function newEventCode(length = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function isValidCode(code: string) {
  return /^[a-z0-9-]{4,40}$/.test(code);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  return t || null;
}

export function toDTO(store: Store, p: PhotoRow): PhotoDTO {
  return {
    id: p.id,
    url: store.publicUrl(p.storage_path),
    thumbUrl: store.publicUrl(p.thumb_path),
    caption: p.caption,
    name: p.uploader_name,
    status: p.status,
    createdAt: p.created_at,
    approvedAt: p.approved_at,
  };
}
