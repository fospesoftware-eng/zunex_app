// ---------------------------------------------------------------------------
// Audit trail — service-role writes to public.audit_log.
// Fire-and-forget: audit failures must never break the main request.
// ---------------------------------------------------------------------------

import { getAdminSupabase } from "@/lib/server/supabase";

export type AuditAction =
  | "login"
  | "config-change"
  | "ticket-created"
  | "ticket-resolved"
  | "station-started"
  | "station-stopped"
  | "station-created"
  | "station-updated"
  | "station-offline"
  | "hardware-added"
  | "hardware-updated"
  | "hardware-deleted"
  | "hardware-imported"
  | "plan-updated"
  | "strategy-created"
  | "strategy-updated"
  | "strategy-deleted"
  | "partner-created"
  | "partner-updated"
  | "partner-deleted"
  | "user-created"
  | "user-updated"
  | "apikey-created"
  | "apikey-revoked"
  | "media-created"
  | "media-deleted"
  | "playlist-created"
  | "playlist-updated"
  | "playlist-assigned"
  | "payment";

/**
 * Append an audit entry. Safe to call without awaiting from route handlers.
 */
export async function logAudit(
  actor: string | null | undefined,
  action: AuditAction | string,
  description: string,
  target?: string,
): Promise<void> {
  try {
    const sb = getAdminSupabase();
    if (!sb) return;
    await sb.from("audit_log").insert({
      actor: actor ?? "system",
      action,
      description,
      target: target ?? null,
    });
  } catch (e) {
    console.error("[audit] write failed:", e);
  }
}
