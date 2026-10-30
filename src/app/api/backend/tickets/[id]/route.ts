import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { deleteTicket, getTicket, updateTicket } from "@/lib/server/ticketStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const t = await getTicket(id);
  if (!t) return jsonError("ticket_not_found", undefined, 404);
  return jsonOk(t);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as typeof patch;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const updated = await updateTicket(id, patch);
  if (!updated) return jsonError("ticket_not_found", undefined, 404);
  if (patch.status === "resolved" || patch.status === "closed") {
    await logAudit(auth.admin.email, "ticket-resolved", `Ticket: ${updated.subject}`, updated.id);
  }
  return jsonOk(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteTicket(id);
  if (!ok) return jsonError("ticket_not_found", undefined, 404);
  return jsonOk({ deleted: true });
}
