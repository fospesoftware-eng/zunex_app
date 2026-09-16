import { adminConfig, newId, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(adminConfig().partners);
}

interface CreatePartner {
  name?: string;
  type?: "merchant" | "enterprise" | "fleet" | "institution";
  contactName?: string;
  contactEmail?: string;
  stationsOwned?: number;
  commissionRatePct?: number;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreatePartner;
  try {
    body = (await req.json()) as CreatePartner;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.name || !body.type) return jsonError("invalid_request", "name and type are required");
  const cfg = adminConfig();
  const partner = {
    id: newId("partner"),
    name: body.name,
    type: body.type,
    contactName: body.contactName ?? "",
    contactEmail: body.contactEmail ?? "",
    stationsOwned: body.stationsOwned ?? 0,
    commissionRatePct: body.commissionRatePct ?? cfg.settings.commissionRatePct,
    active: true,
    joinedAt: Date.now(),
  };
  cfg.partners.push(partner);
  saveAdminConfig(cfg);
  return jsonOk(partner, { status: 201 });
}
