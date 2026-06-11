export type Env = {
  port: number;
  corsOrigin: string;
  geminiApiKey: string;
};

const DEFAULT_PORT = 8000;
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";

export function loadEnv(): Env {
  return {
    port: readPort(),
    corsOrigin: Deno.env.get("CORS_ORIGIN") ?? DEFAULT_CORS_ORIGIN,
    geminiApiKey: Deno.env.get("GEMINI_API_KEY") ?? "",
  };
}

function readPort(): number {
  const rawPort = Deno.env.get("PORT");
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}
