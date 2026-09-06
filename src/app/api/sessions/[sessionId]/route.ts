import { jsonError, jsonOk } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const snapshot = sessionService.snapshot(sessionId);
  if (!snapshot) return jsonError("session_not_found", undefined, 404);
  return jsonOk({ snapshot });
}
