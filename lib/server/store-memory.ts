import "server-only";
import type { EventRow, PhotoRow } from "@/lib/types";
import type { Store } from "./store";

/**
 * Supabase 없이 로컬에서 전체 흐름을 확인하기 위한 메모리 저장소.
 * 서버를 재시작하면 데이터가 사라진다. 실제 행사에는 쓰지 않는다.
 */
interface MemoryState {
  events: Map<string, EventRow>;
  photos: Map<string, PhotoRow>;
  objects: Map<string, Uint8Array>;
}

const g = globalThis as unknown as { __photowallMemory?: MemoryState };

export function memoryState(): MemoryState {
  if (!g.__photowallMemory) {
    g.__photowallMemory = { events: new Map(), photos: new Map(), objects: new Map() };
  }
  return g.__photowallMemory;
}

export function createMemoryStore(): Store {
  const s = memoryState();

  return {
    mode: "memory",

    async getEvent(code) {
      return s.events.get(code) ?? null;
    },

    async listEvents() {
      return [...s.events.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async createEvent(code, title) {
      const row: EventRow = {
        code,
        title,
        upload_enabled: true,
        pinned_photo_id: null,
        created_at: new Date().toISOString(),
      };
      s.events.set(code, row);
      return row;
    },

    async updateEvent(code, patch) {
      const row = s.events.get(code);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },

    async listPhotos(code, statuses) {
      return [...s.photos.values()]
        .filter((p) => p.event_code === code && statuses.includes(p.status))
        .sort((a, b) =>
          (a.approved_at ?? "").localeCompare(b.approved_at ?? "") || a.created_at.localeCompare(b.created_at),
        );
    },

    async getPhoto(id) {
      return s.photos.get(id) ?? null;
    },

    async countRecentUploads(code, by, sinceIso) {
      let n = 0;
      for (const p of s.photos.values()) {
        if (p.event_code !== code || p.created_at < sinceIso) continue;
        if (by.deviceId && p.device_id !== by.deviceId) continue;
        if (by.ipHash && p.ip_hash !== by.ipHash) continue;
        n++;
      }
      return n;
    },

    async createPhoto(row) {
      const photo: PhotoRow = {
        ...row,
        status: "uploading",
        created_at: new Date().toISOString(),
        approved_at: null,
      };
      s.photos.set(photo.id, photo);
      return photo;
    },

    async updatePhoto(id, patch) {
      const row = s.photos.get(id);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },

    async deletePhoto(id) {
      s.photos.delete(id);
      for (const ev of s.events.values()) {
        if (ev.pinned_photo_id === id) ev.pinned_photo_id = null;
      }
    },

    async createUploadTarget(path) {
      return { kind: "put", url: `/api/dev-storage/${path}` };
    },

    async objectExists(path) {
      return s.objects.has(path);
    },

    async removeObjects(paths) {
      for (const p of paths) s.objects.delete(p);
    },

    publicUrl(path) {
      return `/api/dev-storage/${path}`;
    },
  };
}
