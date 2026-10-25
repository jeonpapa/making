import { getStore } from "@/lib/server/store";
import { error, isUuid, json, readJson } from "@/lib/server/http";

/** 업로드 1장 완료: 두 파일이 실제로 올라갔는지 확인한 뒤 승인 대기열(pending)에 넣는다. */
export async function POST(req: Request) {
  const body = await readJson<{ photoId: string; deviceId: string }>(req);
  if (!isUuid(body.photoId) || typeof body.deviceId !== "string") return error(400, "잘못된 요청입니다.");

  const store = getStore();
  const photo = await store.getPhoto(body.photoId);
  if (!photo || photo.device_id !== body.deviceId) return error(404, "업로드를 찾을 수 없습니다.");
  if (photo.status !== "uploading") return json({ ok: true });

  const [main, thumb] = await Promise.all([
    store.objectExists(photo.storage_path),
    store.objectExists(photo.thumb_path),
  ]);
  if (!main || !thumb) return error(409, "파일 전송이 끝나지 않았습니다.");

  await store.updatePhoto(photo.id, { status: "pending" });
  return json({ ok: true });
}
