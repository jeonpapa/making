import { getStore } from "@/lib/server/store";
import { error, json, requireAdmin, toDTO } from "@/lib/server/http";

/** 운영자 화면: 대기·승인·거절 사진 전체 (업로드 중인 것은 제외) */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { code } = await params;
  const store = getStore();
  const ev = await store.getEvent(code);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");
  const photos = await store.listPhotos(code, ["pending", "approved", "rejected"]);
  return json({ event: ev, photos: photos.map((p) => toDTO(store, p)) });
}
