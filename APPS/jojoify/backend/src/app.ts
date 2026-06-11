import { loadEnv } from "./config/env.ts";
import { handleOptions } from "./http/cors.ts";
import { errorResponse } from "./http/json.ts";
import { health } from "./routes/health.ts";
import { BadRequestError, transform } from "./routes/transform.ts";

const env = loadEnv();

export async function app(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = env.corsOrigin;

  if (request.method === "OPTIONS") {
    return handleOptions(origin);
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return health(origin);
    }

    if (request.method === "POST" && url.pathname === "/api/transform") {
      return await transform(request, {
        geminiApiKey: env.geminiApiKey,
        origin,
      });
    }

    return errorResponse("Not found", 404, origin);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return errorResponse(error.message, 400, origin);
    }

    console.error(error);
    return errorResponse("Internal server error", 500, origin);
  }
}

export { env };
