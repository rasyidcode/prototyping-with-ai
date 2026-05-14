import { app, env } from "./app.ts";

console.log(`Jojoify backend listening on http://localhost:${env.port}`);

Deno.serve({ port: env.port }, app);
