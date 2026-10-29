import QRCode from "qrcode";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getHardware } from "@/lib/server/hardwareStore";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const h = await getHardware(id);
  if (!h) return new Response(JSON.stringify({ ok: false, message: "Hardware not found" }), { status: 404 });

  // QR payload — structured JSON for device provisioning
  const payload = JSON.stringify({
    d: h.deviceId,
    s: h.stationId,
    b: h.brokerUrl,
    t: h.mqttTopic,
    p: h.mqttPort,
    c: h.clientId,
    l: h.useTls ? "tls" : "tcp",
    f: h.firmwareVersion,
  });

  // Generate PNG QR code with transparent background, dark modules
  const png = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#e8edff", light: "#0b1024" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="hardware-${h.deviceId}.png"`,
    },
  });
}
