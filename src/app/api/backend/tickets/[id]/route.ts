import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { deleteTicket, getTicket, updateTicket } from "@/lib/server/ticketStore";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const t = getTicket(id);
  if (!t) return jsonError("ticket_not_found", undefined, 404);
  return jsonOk(t);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as typeof patch;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const updated = updateTicket(id, patch);
  if (!updated) return jsonError("ticket_not_found", undefined, 404);
  return jsonOk(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = deleteTicket(id);
  if (!ok) return jsonError("ticket_not_found", undefined, 404);
  return jsonOk({ deleted: true });
}
