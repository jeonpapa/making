import { getStore } from "@/lib/server/store";
import { memoryState } from "@/lib/server/store-memory";
import { error } from "@/lib/server/http";
import { LIMITS } from "@/lib/types";

/** 메모리 모드 전용 스토리지. Supabase 모드에서는 404. */

function objectPath(parts: string[]) {
  const path = parts.join("/");
  return /^[a-z0-9-]+\/[0-9a-f-]{36}(_t)?\.jpg$/.test(path) ? path : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (getStore().mode !== "memory") return error(404, "not found");
  const path = objectPath((await params).path);
  const data = path ? memoryState().objects.get(path) : undefined;
  if (!data) return error(404, "not found");
  return new Response(Buffer.from(data), {
    headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const store = getStore();
  if (store.mode !== "memory") return error(404, "not found");
  const path = objectPath((await params).path);
  if (!path) return error(400, "bad path");
  const s = memoryState();
  const id = path.split("/")[1].replace(/(_t)?\.jpg$/, "");
  const photo = s.photos.get(id);
  if (!photo || photo.status !== "uploading") return error(403, "no upload slot");
  if (s.objects.has(path)) return error(409, "already exists");

  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > LIMITS.storedFileBytes) return error(413, "too large");
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return error(415, "jpeg only");
  s.objects.set(path, buf);
  return new Response(null, { status: 200 });
}
