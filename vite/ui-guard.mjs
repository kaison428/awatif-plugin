// The interface is awatif-ui only: awatif's bundled UI must never reach the
// browser. Type-only imports (`import type`) are erased before resolution, so
// they pass. Used on the app's modules and on pre-bundled dependencies.
import { toUrl } from "./paths.mjs";

export function isAwatifUi(source) {
  return (
    source === "@awatif/ui" ||
    source.startsWith("@awatif/ui/") ||
    source === "awatif/templates" ||
    /(^|\/)awatif\/templates\/(createApp|index)(\.ts)?$/.test(source) ||
    /\/awatif\/ui\//.test(toUrl(source))
  );
}

export const uiGuard = {
  name: "awatif-ui-guard",
  resolveId(source, importer) {
    if (!isAwatifUi(source)) return;
    throw new Error(
      `${importer ?? "The app"} imports awatif's UI (${source}). The live app uses the awatif-ui viewer and components; import awatif for analysis only (createEngine, @awatif/components), and import its types with \`import type\`.`,
    );
  },
};
