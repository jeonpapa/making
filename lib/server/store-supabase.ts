import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { EventRow, PhotoRow } from "@/lib/types";
import type { Store } from "./store";

const BUCKET = "photos";

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  function check<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  return {
    mode: "supabase",

    async getEvent(code) {
      return check(await sb.from("events").select("*").eq("code", code).maybeSingle()) as EventRow | null;
    },

    async listEvents() {
      return check(await sb.from("events").select("*").order("created_at", { ascending: false })) as EventRow[];
    },

    async createEvent(code, title) {
      return check(await sb.from("events").insert({ code, title }).select().single()) as EventRow;
    },

    async updateEvent(code, patch) {
      return check(
        await sb
          .from("events")
          .update({ ...patch, changed_at: new Date().toISOString() })
          .eq("code", code)
          .select()
          .maybeSingle(),
      ) as EventRow | null;
    },

    async listPhotos(code, statuses) {
      const rows = check(
        await sb
          .from("photos")
          .select("*")
          .eq("event_code", code)
          .in("status", statuses)
          .order("approved_at", { ascending: true, nullsFirst: true })
          .order("created_at", { ascending: true })
          .limit(5000),
      ) as PhotoRow[];
      return rows;
    },

    async getPhoto(id) {
      return check(await sb.from("photos").select("*").eq("id", id).maybeSingle()) as PhotoRow | null;
    },

    async countRecentUploads(code, by, sinceIso) {
      let q = sb
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("event_code", code)
        .gte("created_at", sinceIso);
      if (by.deviceId) q = q.eq("device_id", by.deviceId);
      if (by.ipHash) q = q.eq("ip_hash", by.ipHash);
      const res = await q;
      if (res.error) throw new Error(res.error.message);
      return res.count ?? 0;
    },

    async createPhoto(row) {
      return check(await sb.from("photos").insert({ ...row, status: "uploading" }).select().single()) as PhotoRow;
    },

    async updatePhoto(id, patch) {
      return check(await sb.from("photos").update(patch).eq("id", id).select().maybeSingle()) as PhotoRow | null;
    },

    async deletePhoto(id) {
      check(await sb.from("photos").delete().eq("id", id));
    },

    async createUploadTarget(path) {
      const data = check(await sb.storage.from(BUCKET).createSignedUploadUrl(path));
      if (!data) throw new Error("서명 업로드 URL을 만들지 못했습니다");
      return { kind: "supabase", path: data.path, token: data.token };
    },

    async objectExists(path) {
      const slash = path.lastIndexOf("/");
      const dir = path.slice(0, slash);
      const name = path.slice(slash + 1);
      const res = await sb.storage.from(BUCKET).list(dir, { search: name, limit: 10 });
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []).some((o) => o.name === name);
    },

    async removeObjects(paths) {
      if (paths.length) check(await sb.storage.from(BUCKET).remove(paths));
    },

    publicUrl(path) {
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
  };
}
