#!/usr/bin/env node
// Serves a model as the live Awatif app: the model is mounted with `createApp`,
// so the analysis runs in the browser with Awatif as the engine. Every edit
// (dragging a point, assigning a load or support, changing a parameter) re-runs
// the mesh -> solve -> design pipeline. Saving model.ts reloads the app.
//
// Usage: node serve.mjs <path/to/model.ts> [--export <name>] [--port <n>] [--open]
//
// Edits made in the app are saved to `model.live.json` next to the model
// (geometry and component entries), so they can be inspected or folded back
// into model.ts. They do not overwrite model.ts.
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const { createServer } = await import("vite").catch(() => {
  console.error(`Missing dependencies: run \`npm install\` in ${pluginRoot}`);
  process.exit(2);
});

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? false : (args.splice(i, 1), true);
};
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const open = flag("--open");
const exportName = option("--export");
const port = Number(option("--port") ?? 5173);
const modelPath = args[0] && resolve(args[0]);
if (!modelPath || !existsSync(modelPath)) {
  console.error("Usage: node serve.mjs <model.ts> [--export <name>] [--port <n>] [--open]");
  process.exit(2);
}
const livePath = join(dirname(modelPath), "model.live.json");

const VIRTUAL = "virtual:awatif-app";
const toUrl = (path) => path.replaceAll("\\", "/");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Awatif</title>
  </head>
  <body>
    <script type="module">import "${VIRTUAL}";</script>
  </body>
</html>`;

// The app entry: createApp on the model's config, then autosave the edits
const entry = `
import van from "vanjs-core";
import { createApp } from "awatif/templates";
import { ComponentsType } from "@awatif/components";
import * as modelModule from ${JSON.stringify(toUrl(modelPath))};

const exportName = ${JSON.stringify(exportName ?? null)};
const config = pick(modelModule, exportName);
const app = await createApp(config);
window.awatif = app;

// Persist edits made in the viewer, debounced
let timer;
const save = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const live = {
      points: [...app.geometry.points.val],
      lines: [...app.geometry.lines.val],
      polygons: [...app.geometry.polygons.val],
      components: Object.fromEntries(
        [...app.components.val].map(([type, entries]) => [ComponentsType[type] ?? type, entries]),
      ),
    };
    fetch("/__awatif/live", { method: "POST", body: JSON.stringify(live) }).catch(() => {});
  }, 500);
};
van.derive(() => {
  app.geometry.points.val;
  app.geometry.lines.val;
  app.geometry.polygons.val;
  app.components.val;
  save();
});

function pick(module, name) {
  if (name) {
    if (!(name in module)) throw new Error('"' + name + '" is not exported by the model');
    return module[name];
  }
  if (module.default) return module.default;
  const configs = Object.values(module).filter(
    (v) => v && typeof v === "object" && ("points" in v || "lines" in v),
  );
  if (configs.length !== 1)
    throw new Error("Expected one exported AppConfig, found " + configs.length + "; pass --export <name>");
  return configs[0];
}
`;

const awatifApp = {
  name: "awatif-app",
  enforce: "pre",
  // The model lives in the user's project, which has no node_modules of its own:
  // resolve its bare imports (awatif, vanjs-core, ...) from the plugin
  async resolveId(source, importer, options) {
    if (source === VIRTUAL) return "\0" + VIRTUAL;
    const bare = !/^([./\\]|\0|[a-zA-Z]:|\/)/.test(source) && !source.startsWith("virtual:");
    if (
      bare &&
      importer &&
      !importer.startsWith("\0") &&
      !toUrl(importer).startsWith(toUrl(pluginRoot))
    )
      return this.resolve(source, join(pluginRoot, "package.json"), { ...options, skipSelf: true });
  },
  load(id) {
    if (id === "\0" + VIRTUAL) return entry;
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url?.split("?")[0];
      if (req.method === "POST" && url === "/__awatif/live") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        writeFileSync(livePath, JSON.stringify(JSON.parse(Buffer.concat(chunks).toString()), null, 2));
        res.statusCode = 204;
        return res.end();
      }
      if (url === "/" || url === "/index.html") {
        res.setHeader("Content-Type", "text/html");
        return res.end(await server.transformIndexHtml(req.url, html));
      }
      next();
    });
    // Reload when the model changes, even though it sits outside the plugin root
    server.watcher.add(modelPath);
  },
};

const server = await createServer({
  root: pluginRoot,
  configFile: join(pluginRoot, "vite.config.mjs"),
  logLevel: "error",
  plugins: [awatifApp],
  server: { port, strictPort: false, open, fs: { allow: [pluginRoot, dirname(modelPath)] } },
});
await server.listen();
const [url] = server.resolvedUrls.local;
console.log(`Awatif app for ${modelPath}\n  ${url}\nEdits in the app are saved to ${livePath}\nPress Ctrl+C to stop.`);
