#!/usr/bin/env node
// Runs a model through the Awatif engine for every load case and load
// combination, prints a summary and writes results.json next to the model.
//
// Usage: node analyze.mjs <path/to/model.ts> [--export <name>] [--out <file>]
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { importDependency, requireModel, takeOption } from "../../../vite/cli.mjs";
import { pluginRoot } from "../../../vite/paths.mjs";
import { importModule, loadConfig, serveRootUrlsFromDisk } from "./lib/load-model.mjs";
import { print, summarize } from "./lib/report.mjs";

const USAGE = "Usage: node analyze.mjs <model.ts> [--export <name>] [--out <file>]";

const { runnerImport } = await importDependency("vite");
const args = process.argv.slice(2);
const exportName = takeOption(args, "--export");
const outOption = takeOption(args, "--out");
const modelPath = requireModel(args[0], USAGE);

serveRootUrlsFromDisk();
const { createEngine } = await importModule(runnerImport, join(pluginRoot, "skills/awatif-model/scripts/engine.ts"));
const config = await loadConfig(runnerImport, modelPath, exportName);
const engine = await createEngine(config);

// Every load case and combination by name; a model without either still runs
// once with every load applied
function loadNamesOf(config) {
  const names = [...(config.loadCases ?? []), ...(config.loadCombinations ?? []).map((c) => c.name)];
  return names.length ? names : [null];
}

function setAndWait(engine, name) {
  const next = engine.next();
  engine.setActiveLoad(name);
  return next;
}

const runs = [];
for (const name of loadNamesOf(config)) {
  const current = engine.getAll();
  const results = current.activeLoad === name ? current : await setAndWait(engine, name);
  runs.push(summarize(results, config));
}

const out = outOption ? resolve(outOption) : join(dirname(modelPath), "results.json");
writeFileSync(out, JSON.stringify({ model: modelPath, runs }, null, 2));
print(runs, out);
process.exit(runs.every((r) => r.status.success) ? 0 : 1);
