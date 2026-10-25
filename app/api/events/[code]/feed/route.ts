import { getStore } from "@/lib/server/store";
import { error, isValidCode, json, toDTO } from "@/lib/server/http";
import type { FeedResponse, UnchangedResponse } from "@/lib/types";

/**
 * 대형 화면용: 승인된 사진만 (승인 순서, 최신이 아래) + 고정 사진.
 * ?v=<이전 version> 이 지금과 같으면 사진 목록 없이 짧게 응답한다 (2.5초 폴링의 데이터 사용량 절감).
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidCode(code)) return error(404, "행사를 찾을 수 없습니다.");
  const store = getStore();
  const ev = await store.getEvent(code);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");

  const version = ev.changed_at;
  if (new URL(req.url).searchParams.get("v") === version) {
    return json({ unchanged: true, version } satisfies UnchangedResponse);
  }

  const photos = await store.listPhotos(code, ["approved"]);
  const pinned = photos.some((p) => p.id === ev.pinned_photo_id) ? ev.pinned_photo_id : null;
  const body: FeedResponse = {
    version,
    title: ev.title,
    uploadEnabled: ev.upload_enabled,
    pinnedPhotoId: pinned,
    photos: photos.map((p) => toDTO(store, p)),
  };
  return json(body);
}
