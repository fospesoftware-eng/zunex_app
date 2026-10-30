// ---------------------------------------------------------------------------
// Support ticket store — backed by Supabase (public.tickets).
// If Supabase is not configured, functions degrade gracefully
// (empty lists / null / false).
// ---------------------------------------------------------------------------

import { getAdminSupabase } from "@/lib/server/supabase";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterName: string;
  requesterEmail: string;
  stationId: string | null;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  stationId?: string;
  search?: string;
}

function now(): number {
  return Date.now();
}

function newId(): string {
  return `tk_${now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

// ── Supabase row → Ticket ────────────────────────────────────────────────
function rowToTicket(row: Record<string, unknown>): Ticket {
  return {
    id: String(row.id),
    subject: String(row.subject ?? ""),
    description: String(row.description ?? ""),
    priority: (row.priority as TicketPriority) ?? "medium",
    status: (row.status as TicketStatus) ?? "open",
    requesterName: String(row.requester_name ?? ""),
    requesterEmail: String(row.requester_email ?? ""),
    stationId: row.station_id ? String(row.station_id) : null,
    assignee: row.assignee ? String(row.assignee) : null,
    createdAt: row.created_at ? Number(row.created_at) : 0,
    updatedAt: row.updated_at ? Number(row.updated_at) : 0,
    closedAt: row.closed_at ? Number(row.closed_at) : null,
  };
}

export async function listTickets(filter?: TicketFilter): Promise<Ticket[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  let query = sb.from("tickets").select("*");
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.priority) query = query.eq("priority", filter.priority);
  if (filter?.stationId) query = query.eq("station_id", filter.stationId);
  if (filter?.search) {
    // Strip characters that would break the PostgREST .or() filter syntax.
    const q = filter.search.replace(/[%,()]/g, " ").trim();
    if (q) {
      query = query.or(`subject.ilike.%${q}%,description.ilike.%${q}%`);
    }
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("[ticketStore] list error:", error);
    return [];
  }
  return (data ?? []).map(rowToTicket);
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("tickets").select("*").eq("id", id).single();
  if (error || !data) return null;
  return rowToTicket(data);
}

export async function createTicket(
  data: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "closedAt" | "status"> & { status?: TicketStatus },
): Promise<Ticket | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const t = now();
  const row = {
    id: newId(),
    subject: data.subject,
    description: data.description,
    priority: data.priority,
    status: data.status ?? "open",
    requester_name: data.requesterName,
    requester_email: data.requesterEmail,
    station_id: data.stationId,
    assignee: data.assignee,
    created_at: t,
    updated_at: t,
    closed_at: data.status === "closed" ? t : null,
  };
  const { data: result, error } = await sb.from("tickets").insert(row).select().single();
  if (error) {
    console.error("[ticketStore] insert error:", error);
    return null;
  }
  return rowToTicket(result);
}

export async function updateTicket(
  id: string,
  patch: Partial<Omit<Ticket, "id" | "createdAt">>,
): Promise<Ticket | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const existing = await getTicket(id);
  if (!existing) return null;
  const t = now();
  const update: Record<string, unknown> = { updated_at: t };
  if (patch.subject !== undefined) update.subject = patch.subject;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.requesterName !== undefined) update.requester_name = patch.requesterName;
  if (patch.requesterEmail !== undefined) update.requester_email = patch.requesterEmail;
  if (patch.stationId !== undefined) update.station_id = patch.stationId;
  if (patch.assignee !== undefined) update.assignee = patch.assignee;
  if (patch.closedAt !== undefined) update.closed_at = patch.closedAt;
  // closedAt management
  if (patch.status === "closed" && existing.status !== "closed" && !existing.closedAt) {
    update.closed_at = t;
  } else if (patch.status && patch.status !== "closed" && existing.status === "closed") {
    update.closed_at = null;
  }
  const { data, error } = await sb
    .from("tickets")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[ticketStore] update error:", error);
    return null;
  }
  return rowToTicket(data);
}

export async function deleteTicket(id: string): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { data, error } = await sb.from("tickets").delete().eq("id", id).select("id");
  if (error) {
    console.error("[ticketStore] delete error:", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
