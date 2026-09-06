import { jsonError, jsonOk } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  // Rate-limit snapshot reads to make session-id enumeration impractical.
  const blocked = rateLimitOrResponse(req, 60, 60_000, "sessions:read");
  if (blocked) return blocked;

  const { sessionId } = await params;
  const snapshot = sessionService.snapshot(sessionId);
  if (!snapshot) return jsonError("session_not_found", undefined, 404);
  return jsonOk({ snapshot });
}
