import { getStore } from "@/lib/server/store";
import { error, json, requireAdmin, toDTO } from "@/lib/server/http";

/**
 * 운영자 화면: 대기·승인·거절 사진 전체 (업로드 중인 것은 제외).
 * ?v=<이전 version> 이 지금과 같으면 사진 목록 없이 짧게 응답한다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { code } = await params;
  const store = getStore();
  const ev = await store.getEvent(code);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");
  if (new URL(req.url).searchParams.get("v") === ev.changed_at) {
    return json({ unchanged: true, version: ev.changed_at });
  }
  const photos = await store.listPhotos(code, ["pending", "approved", "rejected"]);
  return json({ version: ev.changed_at, event: ev, photos: photos.map((p) => toDTO(store, p)) });
}
