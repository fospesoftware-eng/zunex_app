import type { NextRequest } from "next/server";
import { FRIENDLY_ERRORS, friendlyError } from "@/lib/core/types";
import { scenarioFromRequest } from "@/lib/server/demo";

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(code: string, message?: string, status = 400): Response {
  const friendly = friendlyError(code);
  return Response.json(
    {
      ok: false,
      code,
      message: message ?? friendly?.title ?? "Something went wrong",
      friendly: friendly ?? FRIENDLY_ERRORS.invalid_request,
    },
    { status },
  );
}

export { scenarioFromRequest };
export type { NextRequest };
