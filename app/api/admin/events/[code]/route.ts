import { getStore } from "@/lib/server/store";
import { cleanText, error, isUuid, json, readJson, requireAdmin } from "@/lib/server/http";
import { LIMITS } from "@/lib/types";

interface Patch {
  title: string;
  uploadEnabled: boolean;
  /** 고정할 사진 id. null이면 고정 해제 */
  pinnedPhotoId: string | null;
}

/** 행사 이름, 업로드 on/off, 대형 화면 고정 사진 변경 */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { code } = await params;
  const body = await readJson<Patch>(req);
  const store = getStore();
  const patch: { title?: string; upload_enabled?: boolean; pinned_photo_id?: string | null } = {};

  if (body.title !== undefined) {
    const title = cleanText(body.title, LIMITS.titleMax);
    if (!title) return error(400, "행사 이름을 입력하세요.");
    patch.title = title;
  }
  if (typeof body.uploadEnabled === "boolean") patch.upload_enabled = body.uploadEnabled;

  if (body.pinnedPhotoId === null) {
    patch.pinned_photo_id = null;
  } else if (body.pinnedPhotoId !== undefined) {
    if (!isUuid(body.pinnedPhotoId)) return error(400, "잘못된 사진입니다.");
    const photo = await store.getPhoto(body.pinnedPhotoId);
    if (!photo || photo.event_code !== code) return error(404, "사진을 찾을 수 없습니다.");
    if (photo.status !== "approved") return error(409, "승인된 사진만 고정할 수 있습니다.");
    patch.pinned_photo_id = photo.id;
  }

  const ev = await store.updateEvent(code, patch);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");
  return json({ event: ev });
}
