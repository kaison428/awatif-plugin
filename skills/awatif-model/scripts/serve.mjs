#!/usr/bin/env node
// Serves a model as the live Awatif app on Vite's dev server (config:
// vite/app.config.mjs). Every edit re-runs the analysis in the browser and is
// saved to model.live.json next to the model; saving model.ts reloads the app.
//
// Usage: node serve.mjs <path/to/model.ts> [--export <name>] [--port <n>] [--open]
import { dirname, join } from "node:path";
import { devConfig } from "../../../vite/app.config.mjs";
import { importDependency, modelNameOf, requireModel, takeFlag, takeOption } from "../../../vite/cli.mjs";

const USAGE = "Usage: node serve.mjs <model.ts> [--export <name>] [--port <n>] [--open]";

const { createServer } = await importDependency("vite");
// The viewer is three.js and the UI is React; both are required
for (const dep of ["three", "react", "react-dom"]) await importDependency(dep);

const args = process.argv.slice(2);
const open = takeFlag(args, "--open");
const exportName = takeOption(args, "--export");
const port = Number(takeOption(args, "--port") ?? 5173);
const modelPath = requireModel(args[0], USAGE);
const livePath = join(dirname(modelPath), "model.live.json");
const model = { modelPath, exportName, modelName: modelNameOf(modelPath, exportName), livePath };

const server = await createServer(devConfig(model, { port, open }));
await server.listen();
const [url] = server.resolvedUrls.local;
console.log(`Awatif app for ${modelPath}\n  ${url}\nEdits in the app are saved to ${livePath}\nPress Ctrl+C to stop.`);
