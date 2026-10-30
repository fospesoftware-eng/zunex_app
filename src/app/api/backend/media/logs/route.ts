import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { listPlaybackLogs } from "@/lib/server/mediaStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId") ?? undefined;
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 100));
  return jsonOk(await listPlaybackLogs({ deviceId, limit }));
}
