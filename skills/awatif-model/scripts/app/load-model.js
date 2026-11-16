// Where the app's model comes from:
// - a hosted page (Claude artifact, ChatGPT Site) carries it as JSON in
//   <script type="application/json" id="awatif-model">, put there by export.mjs
// - the dev server (serve.mjs) provides `virtual:awatif-model`, the user's model.ts
import { modelModule, exportName, modelName } from "virtual:awatif-model";
import { pickConfig } from "./model/index.js";

export const EMBEDDED_ID = "awatif-model";

function readEmbedded() {
  const el = document.getElementById(EMBEDDED_ID);
  return el ? JSON.parse(el.textContent) : null;
}

// { name, config, hosted }: hosted pages have no backend to save to
export function loadModel() {
  const embedded = readEmbedded();
  if (embedded) return { name: embedded.name, config: embedded.config, hosted: true };
  if (!modelModule) throw new Error("No model: open a page made by export.mjs, or run serve.mjs.");
  return { name: modelName, config: pickConfig(modelModule, exportName), hosted: false };
}
