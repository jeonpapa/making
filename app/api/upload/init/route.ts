import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/server/store";
import { cleanText, clientIpHash, error, isValidCode, json, readJson } from "@/lib/server/http";
import { LIMITS, type UploadInitResponse } from "@/lib/types";

interface Body {
  code: string;
  deviceId: string;
  name: string;
  caption: string;
}

/**
 * 업로드 1장 시작: 업로드 가능 여부·분당 제한을 확인하고,
 * 원본/썸네일 서명 업로드 URL을 발급한다. 파일은 클라이언트가 스토리지로 직접 보낸다.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const code = typeof body.code === "string" ? body.code : "";
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.slice(0, 64) : "";
  if (!isValidCode(code) || !deviceId) return error(400, "잘못된 요청입니다.");

  const store = getStore();
  const ev = await store.getEvent(code);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");
  if (!ev.upload_enabled) return error(403, "지금은 업로드가 중단되었습니다.", { reason: "upload_disabled" });

  const ipHash = clientIpHash(req);
  const since = new Date(Date.now() - 60_000).toISOString();
  const [byDevice, byIp] = await Promise.all([
    store.countRecentUploads(code, { deviceId }, since),
    store.countRecentUploads(code, { ipHash }, since),
  ]);
  if (byDevice >= LIMITS.perDevicePerMinute || byIp >= LIMITS.perIpPerMinute) {
    return error(429, "잠시 후 다시 시도합니다.", { retryAfter: 8 });
  }

  const id = randomUUID();
  const storage_path = `${code}/${id}.jpg`;
  const thumb_path = `${code}/${id}_t.jpg`;
  await store.createPhoto({
    id,
    event_code: code,
    storage_path,
    thumb_path,
    caption: cleanText(body.caption, LIMITS.captionMax),
    uploader_name: cleanText(body.name, LIMITS.nameMax),
    device_id: deviceId,
    ip_hash: ipHash,
  });

  const [main, thumb] = await Promise.all([
    store.createUploadTarget(storage_path),
    store.createUploadTarget(thumb_path),
  ]);
  const res: UploadInitResponse = { photoId: id, main, thumb };
  return json(res);
}
