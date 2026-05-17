import { corsHeaders } from "./cors.ts";

type JsonBody = Record<string, unknown> | unknown[];

export function jsonResponse(body: JsonBody, init: ResponseInit = {}, origin = "*"): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function errorResponse(message: string, status: number, origin: string): Response {
  return jsonResponse({ error: message }, { status }, origin);
}
