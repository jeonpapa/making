"use client";

import { useCallback, useEffect, useState } from "react";

export type Session = { admin: boolean; mode: "supabase" | "memory" } | null;

export function useSession() {
  const [session, setSession] = useState<Session>(null);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      setSession(await res.json());
    } catch {
      setSession({ admin: false, mode: "supabase" });
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { session, refresh };
}

export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? `오류 (${res.status})`), { status: res.status });
  return data as T;
}
