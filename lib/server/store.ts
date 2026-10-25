import "server-only";
import type { EventRow, PhotoRow, PhotoStatus, UploadTarget } from "@/lib/types";
import { createMemoryStore } from "./store-memory";
import { createSupabaseStore } from "./store-supabase";

export interface NewPhoto {
  id: string;
  event_code: string;
  storage_path: string;
  thumb_path: string;
  caption: string | null;
  uploader_name: string | null;
  device_id: string | null;
  ip_hash: string | null;
}

export interface Store {
  mode: "supabase" | "memory";
  getEvent(code: string): Promise<EventRow | null>;
  listEvents(): Promise<EventRow[]>;
  createEvent(code: string, title: string): Promise<EventRow>;
  updateEvent(
    code: string,
    patch: Partial<Pick<EventRow, "upload_enabled" | "pinned_photo_id">>,
  ): Promise<EventRow | null>;

  /** 기본 정렬: approved_at(없으면 created_at) 오름차순 — 채팅처럼 최신이 아래 */
  listPhotos(code: string, statuses: PhotoStatus[]): Promise<PhotoRow[]>;
  getPhoto(id: string): Promise<PhotoRow | null>;
  countRecentUploads(
    code: string,
    by: { deviceId?: string; ipHash?: string },
    sinceIso: string,
  ): Promise<number>;
  createPhoto(row: NewPhoto): Promise<PhotoRow>;
  updatePhoto(
    id: string,
    patch: Partial<Pick<PhotoRow, "status" | "approved_at">>,
  ): Promise<PhotoRow | null>;
  deletePhoto(id: string): Promise<void>;

  createUploadTarget(path: string): Promise<UploadTarget>;
  objectExists(path: string): Promise<boolean>;
  removeObjects(paths: string[]): Promise<void>;
  publicUrl(path: string): string;
}

let store: Store | undefined;

export function getStore(): Store {
  if (!store) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    store = url && key ? createSupabaseStore(url, key) : createMemoryStore();
  }
  return store;
}
