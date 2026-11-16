// Puts a model into the built app shell (skills/awatif-model/dist/index.html):
// the result is one self-contained page, the same file for a Claude artifact
// and a ChatGPT Site. Pure string work, so stamping is instant.
import { COMPONENT_FIELDS } from "../app/model/fields.js";
import { normalize } from "../app/model/normalize.js";

export const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;
const MARKER = "<!-- awatif-model: export.mjs puts the model here as JSON -->";

// Paths of values JSON cannot carry (functions, class instances other than Map)
function unserializable(value, path = "config", out = []) {
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") out.push(path);
  else if (value instanceof Map) [...value].forEach(([k, v]) => unserializable(v, `${path}[${k}]`, out));
  else if (Array.isArray(value)) value.forEach((v, i) => unserializable(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => unserializable(v, `${path}.${k}`, out));
  return out;
}

// The config as plain JSON: geometry as [id, value] pairs, then `live` edits (model.live.json) on top
export function plainConfig(config, live) {
  const bad = unserializable(config);
  if (bad.length) throw new Error(`cannot be exported as data (custom code at ${bad.slice(0, 3).join(", ")}); share it with serve.mjs instead`);
  const { points, lines, polygons, loadCases, loadCombinations, ...rest } = config;
  COMPONENT_FIELDS.forEach((f) => delete rest[f]);
  return { ...rest, ...normalize(config), ...(live ?? {}) };
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// JSON inside <script> must not close the tag
const scriptSafe = (json) => json.replace(/</g, "\\u003c");

export function stamp(shell, { name, config }) {
  if (!shell.includes(MARKER)) throw new Error("The app shell has no model marker; rebuild it with `npm run build`.");
  const data = `<script type="application/json" id="awatif-model">${scriptSafe(JSON.stringify({ name, config }))}</script>`;
  return shell.replace(MARKER, data).replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(name)} · Awatif</title>`);
}
