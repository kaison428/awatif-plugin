// The dev server's only backend route: the app POSTs the edited model and it
// is written to model.live.json next to model.ts.
import { writeFileSync } from "node:fs";

export const LIVE_ROUTE = "/__awatif/live";

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

export function liveSaveMiddleware(livePath) {
  return async (req, res, next) => {
    if (req.method !== "POST" || req.url?.split("?")[0] !== LIVE_ROUTE) return next();
    const model = JSON.parse(await readBody(req));
    writeFileSync(livePath, JSON.stringify(model, null, 2));
    res.statusCode = 204;
    res.end();
  };
}
