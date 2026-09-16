import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { createTicket, listTickets } from "@/lib/server/ticketStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const filter = {
    status: (url.searchParams.get("status") as ReturnType<typeof listTickets>[number]["status"]) ?? undefined,
    priority: (url.searchParams.get("priority") as ReturnType<typeof listTickets>[number]["priority"]) ?? undefined,
    stationId: url.searchParams.get("stationId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  };
  return jsonOk(listTickets(filter));
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
  const auth = requireAdmin(req);
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
  const t = createTicket({
    subject: body.subject,
    description: body.description,
    priority: body.priority ?? "medium",
    status: body.status,
    requesterName: body.requesterName,
    requesterEmail: body.requesterEmail,
    stationId: body.stationId ?? null,
    assignee: body.assignee ?? null,
  });
  return jsonOk(t, { status: 201 });
}
