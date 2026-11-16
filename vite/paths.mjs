// Fixed locations inside the plugin, shared by the Vite config and the scripts.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const appDir = join(pluginRoot, "skills/awatif-model/scripts/app");
export const appHtml = join(appDir, "index.html");
export const distDir = join(pluginRoot, "skills/awatif-model/dist");
// The built, model-agnostic app that export.mjs stamps models into
export const appShell = join(distDir, "index.html");
export const viewerSrc = join(pluginRoot, "skills/awatif-ui/src/viewer/index.js");
export const viewerAsset = join(pluginRoot, "skills/awatif-ui/assets/awatif-viewer.js");

export const toUrl = (path) => path.replaceAll("\\", "/");
