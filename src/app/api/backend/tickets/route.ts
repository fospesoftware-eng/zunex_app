import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import {
  createTicket,
  listTickets,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/server/ticketStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const filter = {
    status: (url.searchParams.get("status") as TicketStatus | null) ?? undefined,
    priority: (url.searchParams.get("priority") as TicketPriority | null) ?? undefined,
    stationId: url.searchParams.get("stationId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  };
  return jsonOk(await listTickets(filter));
}

interface CreateBody {
  subject?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "open" | "in_progress" | "resolved" | "closed";
  requesterName?: string;
  requesterEmail?: string;
  stationId?: string | null;
  assignee?: string | null;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.subject || !body.description || !body.requesterName || !body.requesterEmail) {
    return jsonError("invalid_request", "subject, description, requesterName and requesterEmail are required");
  }
  const t = await createTicket({
    subject: body.subject,
    description: body.description,
    priority: body.priority ?? "medium",
    status: body.status,
    requesterName: body.requesterName,
    requesterEmail: body.requesterEmail,
    stationId: body.stationId ?? null,
    assignee: body.assignee ?? null,
  });
  if (!t) return jsonError("create_failed", "Failed to create ticket", 500);
  await logAudit(auth.admin.email, "ticket-created", `Ticket: ${t.subject}`, t.id);
  return jsonOk(t, { status: 201 });
}
