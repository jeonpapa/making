import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadInitResponse, UploadTarget } from "@/lib/types";
import { prepareImage, type PreparedImage } from "./image";

/** waiting(고름) → converting → ready(미리보기·전송 준비 끝) → uploading → done / failed */
export type ItemState = "waiting" | "converting" | "ready" | "uploading" | "done" | "failed";

export interface UploadItem {
  key: string;
  file: File;
  state: ItemState;
  error?: string;
  /** 변환 후 만든 480px 썸네일의 blob URL (미리보기용) */
  thumbUrl?: string;
  /** 고르는 즉시 미리 변환해 둔 결과. 보낼 때 그대로 쓰고, 다 보내면 버린다. */
  prepared?: PreparedImage;
}

/** 업로드 중단(운영자가 off) — 재시도하지 않는다 */
export class UploadClosedError extends Error {}

const MAX_PARALLEL_UPLOADS = 2;
const MAX_ATTEMPTS = 4;

export function getDeviceId(): string {
  const KEY = "pw_device";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

let supabase: Promise<SupabaseClient> | undefined;
function getSupabase() {
  supabase ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    }),
  );
  return supabase;
}

async function putFile(target: UploadTarget, blob: Blob) {
  if (target.kind === "put") {
    const res = await fetch(target.url, { method: "PUT", body: blob, headers: { "content-type": "image/jpeg" } });
    if (!res.ok) throw new Error(`파일 전송 실패 (${res.status})`);
    return;
  }
  const sb = await getSupabase();
  const { error } = await sb.storage
    .from("photos")
    .uploadToSignedUrl(target.path, target.token, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(`파일 전송 실패: ${error.message}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJson(url: string, body: unknown) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

interface Meta {
  code: string;
  deviceId: string;
  name: string;
  caption: string;
}

/** 한 장을 서버에 올린다. 네트워크 오류는 지수 백오프로 재시도, 429는 기다렸다가 재시도. */
async function uploadPrepared(img: PreparedImage, meta: Meta) {
  let attempt = 0;
  for (;;) {
    try {
      const init = await postJson("/api/upload/init", meta);
      if (init.status === 429) {
        const { retryAfter } = await init.json().catch(() => ({ retryAfter: 20 }));
        await sleep((retryAfter ?? 20) * 1000);
        continue; // 제한 대기는 실패 횟수에 넣지 않는다
      }
      if (init.status === 403) throw new UploadClosedError("지금은 업로드가 중단되었습니다");
      if (!init.ok) throw new Error((await init.json().catch(() => null))?.error ?? `오류 (${init.status})`);
      const { photoId, main, thumb } = (await init.json()) as UploadInitResponse;

      await putFile(main, img.main);
      await putFile(thumb, img.thumb);

      const done = await postJson("/api/upload/complete", { photoId, deviceId: meta.deviceId });
      if (!done.ok) throw new Error(`완료 처리 실패 (${done.status})`);
      return;
    } catch (e) {
      if (e instanceof UploadClosedError) throw e;
      attempt++;
      if (attempt >= MAX_ATTEMPTS) throw e;
      await sleep(1000 * 3 ** (attempt - 1)); // 1s, 3s, 9s
    }
  }
}

/**
 * 사진을 고르자마자 한 장씩 변환해 미리보기(썸네일)를 만든다.
 * 원본을 화면에 직접 그리면 휴대폰 메모리가 부족해지고, HEIC는 안드로이드에서 보이지도 않기 때문.
 */
export async function prepareItems(
  items: UploadItem[],
  onChange: (key: string, patch: Partial<UploadItem>) => void,
) {
  for (const item of items) {
    onChange(item.key, { state: "converting", error: undefined });
    try {
      const prepared = await prepareImage(item.file);
      onChange(item.key, { state: "ready", prepared, thumbUrl: URL.createObjectURL(prepared.thumb) });
    } catch (e) {
      onChange(item.key, { state: "failed", error: (e as Error).message });
    }
  }
}

/**
 * 변환은 한 장씩(메모리 보호), 전송은 최대 2장 동시에.
 * 미리 변환된 사진은 그대로 쓰고, 전송이 끝나면 버려 메모리에 쌓이지 않게 한다.
 */
export async function runUploads(
  items: UploadItem[],
  meta: Omit<Meta, "deviceId">,
  onChange: (key: string, patch: Partial<UploadItem>) => void,
) {
  const deviceId = getDeviceId();
  const inflight = new Set<Promise<void>>();
  let closed = false;

  for (const item of items) {
    if (closed) {
      onChange(item.key, { state: "failed", error: "업로드가 중단되었습니다" });
      continue;
    }
    let prepared = item.prepared;
    if (!prepared) {
      onChange(item.key, { state: "converting", error: undefined });
      try {
        prepared = await prepareImage(item.file);
      } catch (e) {
        onChange(item.key, { state: "failed", error: (e as Error).message });
        continue;
      }
    }
    const ready = prepared;

    while (inflight.size >= MAX_PARALLEL_UPLOADS) await Promise.race(inflight);

    // 미리보기는 이미 만든 작은 썸네일을 재사용 (원본을 화면에 그리면 휴대폰 메모리가 부족해진다)
    onChange(item.key, {
      state: "uploading",
      error: undefined,
      prepared: ready, // 실패하면 다시 보낼 때 재사용
      thumbUrl: item.thumbUrl ?? URL.createObjectURL(ready.thumb),
    });
    const p: Promise<void> = uploadPrepared(ready, { ...meta, deviceId })
      .then(() => onChange(item.key, { state: "done", prepared: undefined }))
      .catch((e: Error) => {
        if (e instanceof UploadClosedError) closed = true;
        onChange(item.key, { state: "failed", error: e.message || "전송 실패" });
      })
      .finally(() => inflight.delete(p));
    inflight.add(p);
  }
  await Promise.all(inflight);
}
