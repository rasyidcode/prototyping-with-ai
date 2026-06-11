import { jsonResponse } from "../http/json.ts";

export function health(origin: string): Response {
  return jsonResponse(
    {
      ok: true,
      service: "jojoify-backend",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
    origin,
  );
}
