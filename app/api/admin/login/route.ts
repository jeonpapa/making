import { SESSION_COOKIE, adminPin, checkPin, createSessionToken } from "@/lib/server/auth";
import { error, json, readJson } from "@/lib/server/http";

export async function POST(req: Request) {
  if (!adminPin()) return error(503, "ADMIN_PIN 환경변수가 설정되지 않았습니다.");
  const { pin } = await readJson<{ pin: string }>(req);
  if (typeof pin !== "string" || !checkPin(pin.trim())) {
    // 무차별 대입 속도를 늦춘다
    await new Promise((r) => setTimeout(r, 800));
    return error(401, "PIN이 올바르지 않습니다.");
  }
  const { value, maxAge } = createSessionToken();
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return res;
}
