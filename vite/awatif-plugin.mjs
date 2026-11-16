// The Vite plugin behind the live app, in dev and build:
// - the awatif-ui guard (awatif's own UI never reaches the browser)
// - bare imports of a model outside the plugin resolve from the plugin's node_modules
// - dev only: `virtual:awatif-model`, the model-file watcher and the live-save route
import { join } from "node:path";
import { liveSaveMiddleware } from "./live-save.mjs";
import { MODEL_ID, devModelModule, emptyModelModule } from "./model-source.mjs";
import { pluginRoot, toUrl } from "./paths.mjs";
import { uiGuard } from "./ui-guard.mjs";

const isBare = (source) => !/^([./\\]|\0|[a-zA-Z]:|\/)/.test(source) && !source.startsWith("virtual:");
const isOutsidePlugin = (importer) =>
  importer && !importer.startsWith("\0") && !toUrl(importer).startsWith(toUrl(pluginRoot));

// `model` is { modelPath, exportName, modelName, livePath } in dev, null in a build
export function awatifPlugin(model = null) {
  return {
    name: "awatif-app",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (source === MODEL_ID) return "\0" + MODEL_ID;
      uiGuard.resolveId(source, importer);
      // The model lives in the user's project, which has no node_modules of its own
      if (isBare(source) && isOutsidePlugin(importer))
        return this.resolve(source, join(pluginRoot, "package.json"), { ...options, skipSelf: true });
    },
    load(id) {
      if (id === "\0" + MODEL_ID) return model ? devModelModule(model) : emptyModelModule;
    },
    configureServer(server) {
      if (!model) return;
      server.middlewares.use(liveSaveMiddleware(model.livePath));
      // Reload when the model changes, even though it sits outside the plugin root
      server.watcher.add(model.modelPath);
    },
  };
}
