// Loading a model.ts under Node with Vite's module runner (TypeScript, bare
// imports from the plugin's node_modules), shared by analyze.mjs and export.mjs.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pluginRoot } from "../../../../vite/paths.mjs";
import { pickConfig } from "../app/model/normalize.js";

const runnerConfig = { root: pluginRoot, configFile: false, logLevel: "error" };

export async function importModule(runnerImport, path) {
  const { module } = await runnerImport(path, runnerConfig);
  return module;
}

// The model file's AppConfig: `--export <name>`, the default export, or the only config
export async function loadConfig(runnerImport, modelPath, exportName) {
  return pickConfig(await importModule(runnerImport, modelPath), exportName);
}

// Under Node, Vite's `?url` imports (the Triangle mesher's wasm) are root-relative
// paths, so fetch serves them from the plugin's files
export function serveRootUrlsFromDisk() {
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const file = typeof input === "string" && input.startsWith("/") && join(pluginRoot, input);
    if (file && existsSync(file))
      return Promise.resolve(new Response(readFileSync(file), { headers: { "Content-Type": "application/wasm" } }));
    return nodeFetch(input, init);
  };
}
