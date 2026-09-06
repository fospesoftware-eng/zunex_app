import { sessionService } from "@/lib/server/sessionService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Real-time session stream (SSE). Server ticks the session once per second so
 * state changes (start confirmed, stop confirmed) push immediately. The client
 * falls back to polling if this connection fails.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  // Limit concurrent SSE connections per IP to avoid resource exhaustion.
  const blocked = rateLimitOrResponse(req, 10, 60_000, "sessions:events");
  if (blocked) return blocked;

  const { sessionId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const push = () => {
        if (closed) return;
        const snapshot = sessionService.snapshot(sessionId);
        try {
          if (snapshot) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
          } else {
            controller.enqueue(
              encoder.encode(`event: gone\ndata: {"sessionId":"${sessionId}"}\n\n`),
            );
            cleanup();
          }
        } catch {
          cleanup();
        }
      };

      push();
      const interval = setInterval(push, 1000);
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15_000);

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
