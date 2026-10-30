// Device-facing proof-of-play endpoint — the Zunex Plus player reports
// start/complete/error events for each ad it plays.
import { jsonError, jsonOk } from "@/lib/server/http";
import { getMediaServerConfig, logPlayback } from "@/lib/server/mediaStore";

export const dynamic = "force-dynamic";

const VALID_EVENTS = new Set(["start", "complete", "error", "skip"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const cfg = await getMediaServerConfig();
  if (cfg.apiKey && req.headers.get("x-device-key") !== cfg.apiKey) {
    return jsonError("unauthorized", "Invalid device key", 401);
  }
  const { deviceId } = await params;
  let body: { playlistId?: string; mediaId?: string; event?: string };
  try {
    body = (await req.json()) as { playlistId?: string; mediaId?: string; event?: string };
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.event || !VALID_EVENTS.has(body.event)) {
    return jsonError("invalid_request", "event must be one of start|complete|error|skip");
  }
  const ok = await logPlayback({
    deviceId,
    playlistId: body.playlistId ?? null,
    mediaId: body.mediaId ?? null,
    event: body.event,
  });
  if (!ok) return jsonError("db_error", "Failed to record playback", 500);
  return jsonOk({ recorded: true });
}
