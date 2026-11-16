// `vite build` (npm run build) builds the live app shell; see vite/app.config.mjs.
// The dev server is started by skills/awatif-model/scripts/serve.mjs, which
// passes the model to vite/app.config.mjs's devConfig.
import { defineConfig } from "vite";
import { buildConfig } from "./vite/app.config.mjs";

export default defineConfig(buildConfig());
