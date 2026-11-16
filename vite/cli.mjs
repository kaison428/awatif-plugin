// Command-line helpers shared by serve.mjs, analyze.mjs and export.mjs.
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { pluginRoot } from "./paths.mjs";

// Removes `--name` from args and returns whether it was there
export function takeFlag(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? false : (args.splice(i, 1), true);
}

// Removes `--name value` from args and returns the value
export function takeOption(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
}

export function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

// An existing model file, resolved, or exit with the usage
export function requireModel(arg, usage) {
  const modelPath = arg && resolve(arg);
  if (!modelPath || !existsSync(modelPath)) fail(usage);
  return modelPath;
}

// models/<name>/model.ts -> <name>; other files -> their base name
export function modelNameOf(modelPath, exportName) {
  if (exportName) return exportName;
  const stem = basename(modelPath).replace(/\.[^.]+$/, "");
  return stem === "model" ? basename(dirname(modelPath)) : stem;
}

// Vite (and the plugin's other dependencies) come from the plugin's node_modules.
// A "native binding" error means node_modules was installed on another OS.
export async function importDependency(name) {
  try {
    return await import(name);
  } catch (e) {
    fail(`Cannot load ${name}: ${e.message}\nRun \`npm install\` in ${pluginRoot} on the OS that runs this script.`);
  }
}
