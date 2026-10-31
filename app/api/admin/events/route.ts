import { getStore } from "@/lib/server/store";
import { cleanText, error, json, newEventCode, readJson, requireAdmin } from "@/lib/server/http";
import { LIMITS } from "@/lib/types";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return json({ events: await getStore().listEvents() });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { title } = await readJson<{ title: string }>(req);
  const clean = cleanText(title, LIMITS.titleMax);
  if (!clean) return error(400, "행사 이름을 입력하세요.");
  const event = await getStore().createEvent(newEventCode(), clean);
  return json({ event });
}
