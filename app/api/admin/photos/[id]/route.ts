import { getStore } from "@/lib/server/store";
import { error, isUuid, json, readJson, requireAdmin } from "@/lib/server/http";

/** 승인 / 거절 (거절 시 고정 중이면 고정 해제) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return error(400, "잘못된 사진입니다.");
  const { status } = await readJson<{ status: string }>(req);
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return error(400, "잘못된 상태입니다.");
  }

  const store = getStore();
  const photo = await store.getPhoto(id);
  if (!photo || photo.status === "uploading") return error(404, "사진을 찾을 수 없습니다.");

  const updated = await store.updatePhoto(id, {
    status,
    // 다시 승인하면 피드 맨 아래로 간다 (채팅처럼 '방금 올라온' 사진)
    approved_at: status === "approved" ? (photo.approved_at ?? new Date().toISOString()) : null,
  });
  if (status !== "approved") await unpinIf(photo.event_code, id);
  return json({ ok: true, status: updated?.status });
}

/** 삭제: DB 행과 파일 모두 제거 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return error(400, "잘못된 사진입니다.");
  const store = getStore();
  const photo = await store.getPhoto(id);
  if (!photo) return json({ ok: true });
  await unpinIf(photo.event_code, id);
  await store.deletePhoto(id);
  await store.removeObjects([photo.storage_path, photo.thumb_path]);
  return json({ ok: true });
}

async function unpinIf(code: string, photoId: string) {
  const store = getStore();
  const ev = await store.getEvent(code);
  if (ev?.pinned_photo_id === photoId) await store.updateEvent(code, { pinned_photo_id: null });
}
