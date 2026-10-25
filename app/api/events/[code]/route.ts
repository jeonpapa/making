import { getStore } from "@/lib/server/store";
import { error, isValidCode, json } from "@/lib/server/http";

/** 게스트 업로드 페이지용: 행사가 있는지, 업로드가 열려 있는지 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidCode(code)) return error(404, "행사를 찾을 수 없습니다.");
  const ev = await getStore().getEvent(code);
  if (!ev) return error(404, "행사를 찾을 수 없습니다.");
  return json({ title: ev.title, uploadEnabled: ev.upload_enabled });
}
