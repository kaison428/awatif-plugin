#!/usr/bin/env node
// Exports models as shareable, self-contained pages: the built app shell
// (skills/awatif-model/dist/index.html, made by `npm run build`) with each
// model stamped in. The analysis runs in the browser, so nothing else is needed.
//
// Usage: node export.mjs <model.ts>... [--export <name>] [--out <dir>]
//
// For each models/<name>/model.ts it writes models/<name>/share/:
//   index.html             upload as a Claude artifact, or open it from disk
//   .openai/hosting.json   deploy the share/ folder with ChatGPT Sites (static)
// Edits in model.live.json, if there is one, are included.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fail, importDependency, modelNameOf, takeOption } from "../../../vite/cli.mjs";
import { appShell } from "../../../vite/paths.mjs";
import { loadConfig } from "./lib/load-model.mjs";
import { MAX_ARTIFACT_BYTES, plainConfig, stamp } from "./lib/stamp.mjs";

const USAGE = "Usage: node export.mjs <model.ts>... [--export <name>] [--out <dir>]";
const HOSTING = { static: { directory: "." } };

const args = process.argv.slice(2);
const exportName = takeOption(args, "--export");
const outOption = takeOption(args, "--out");
if (!args.length) fail(USAGE);
if (outOption && args.length > 1) fail("--out takes one model; leave it out to write each model's share/ folder.");
if (!existsSync(appShell)) fail(`No app shell at ${appShell}. Run \`npm run build\` in the plugin root first.`);

const { runnerImport } = await importDependency("vite");
const shell = readFileSync(appShell, "utf8");

function readLive(modelPath) {
  const live = join(dirname(modelPath), "model.live.json");
  return existsSync(live) ? JSON.parse(readFileSync(live, "utf8")) : null;
}

function writeShare(outDir, html) {
  mkdirSync(join(outDir, ".openai"), { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  writeFileSync(join(outDir, ".openai/hosting.json"), JSON.stringify(HOSTING, null, 2) + "\n");
}

async function exportModel(arg) {
  const modelPath = resolve(arg);
  if (!existsSync(modelPath)) throw new Error(`${arg} does not exist`);
  const name = modelNameOf(modelPath, exportName);
  const config = plainConfig(await loadConfig(runnerImport, modelPath, exportName), readLive(modelPath));
  const html = stamp(shell, { name, config });
  const outDir = outOption ? resolve(outOption) : join(dirname(modelPath), "share");
  writeShare(outDir, html);
  const mb = (Buffer.byteLength(html) / 1e6).toFixed(2);
  const warning = Buffer.byteLength(html) > MAX_ARTIFACT_BYTES ? "  (over 16 MB: too big for a Claude artifact)" : "";
  console.log(`${name}: ${join(outDir, "index.html")} (${mb} MB)${warning}`);
}

let failed = 0;
for (const arg of args) {
  try {
    await exportModel(arg);
  } catch (e) {
    failed++;
    console.error(`${arg}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
