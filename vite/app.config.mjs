// Vite config of the live app. One config serves both uses:
// - dev (serve.mjs): a model from the user's project, live-saved to model.live.json
// - build (`npm run build`): one self-contained, model-agnostic HTML file that
//   export.mjs stamps a model into, for Claude artifacts and ChatGPT Sites
import { dirname } from "node:path";
import glsl from "vite-plugin-glsl";
import { viteSingleFile } from "vite-plugin-singlefile";
import { awatifPlugin } from "./awatif-plugin.mjs";
import { appDir, distDir, pluginRoot } from "./paths.mjs";
import { uiGuard } from "./ui-guard.mjs";

const glslText = { ".glsl": "text" };

function sharedConfig(model) {
  return {
    root: appDir,
    configFile: false,
    base: "./",
    logLevel: "error",
    plugins: [glsl(), awatifPlugin(model)],
    optimizeDeps: {
      // React ships as CommonJS, so it is pre-bundled
      include: ["react", "react-dom", "react-dom/client"],
      rolldownOptions: { moduleTypes: glslText, plugins: [uiGuard] },
    },
  };
}

// `model`: { modelPath, exportName, modelName, livePath }
export function devConfig(model, { port = 5173, open = false } = {}) {
  const config = sharedConfig(model);
  return {
    ...config,
    server: { port, strictPort: false, open, fs: { allow: [pluginRoot, dirname(model.modelPath)] } },
  };
}

export function buildConfig() {
  const config = sharedConfig(null);
  return {
    ...config,
    logLevel: "warn",
    plugins: [...config.plugins, viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: distDir,
      emptyOutDir: true,
      target: "es2022",
      // Everything (JS, CSS, the Nunito font, the logo, the solver WASM) goes inline
      assetsInlineLimit: () => true,
      chunkSizeWarningLimit: 16000,
    },
  };
}
