import { isAdmin } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { json } from "@/lib/server/http";

export async function GET() {
  return json({ admin: await isAdmin(), mode: getStore().mode });
}
