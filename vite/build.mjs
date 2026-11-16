#!/usr/bin/env node
// npm run build: the viewer asset (awatif-ui) and the live app shell (awatif-model).
import { build } from "vite";
import { statSync } from "node:fs";
import { buildConfig } from "./app.config.mjs";
import { appShell, viewerAsset } from "./paths.mjs";
import { viewerConfig } from "./viewer.config.mjs";

const mb = (file) => (statSync(file).size / 1e6).toFixed(2) + " MB";

await build(viewerConfig());
console.log(`viewer  ${viewerAsset} (${mb(viewerAsset)})`);
await build(buildConfig());
console.log(`app     ${appShell} (${mb(appShell)})`);
