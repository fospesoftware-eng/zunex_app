// Device-facing endpoint — polled by the Zunex Plus inbuilt video player.
// No admin JWT: devices authenticate with the optional media-server device key
// (x-device-key header) when one is configured in admin_config.media_server.
import { jsonError, jsonOk } from "@/lib/server/http";
import { getDevicePlayback, getMediaServerConfig } from "@/lib/server/mediaStore";

export const dynamic = "force-dynamic";

async function deviceKeyOk(req: Request): Promise<boolean> {
  const cfg = await getMediaServerConfig();
  if (!cfg.apiKey) return true; // no key configured → open (internal network expected)
  return req.headers.get("x-device-key") === cfg.apiKey;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  if (!(await deviceKeyOk(req))) {
    return jsonError("unauthorized", "Invalid device key", 401);
  }
  const { deviceId } = await params;
  const playback = await getDevicePlayback(deviceId);
  if (!playback) return jsonError("not_found", "Unknown device", 404);
  return jsonOk(playback);
}
