import { getStore } from "@/lib/server/store";
import { error, isValidCode, json, toDTO } from "@/lib/server/http";
import type { FeedResponse } from "@/lib/types";

/** 대형 화면용: 승인된 사진만 (승인 순서, 최신이 아래) + 고정 사진 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidCode(code)) return error(404, "행사를 찾을 수 없습니다.");
  const store = getStore();
  const ev = await store.getEvent(code);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");

  const photos = await store.listPhotos(code, ["approved"]);
  const pinned = photos.some((p) => p.id === ev.pinned_photo_id) ? ev.pinned_photo_id : null;
  const body: FeedResponse = {
    title: ev.title,
    uploadEnabled: ev.upload_enabled,
    pinnedPhotoId: pinned,
    photos: photos.map((p) => toDTO(store, p)),
  };
  return json(body);
}
