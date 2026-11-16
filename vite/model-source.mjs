// `virtual:awatif-model`: which model the dev server shows. In a build it is
// empty, and the page carries the model as JSON instead (see export.mjs).
import { toUrl } from "./paths.mjs";

export const MODEL_ID = "virtual:awatif-model";

export function devModelModule({ modelPath, exportName, modelName }) {
  return `
export * as modelModule from ${JSON.stringify(toUrl(modelPath))};
export const exportName = ${JSON.stringify(exportName ?? null)};
export const modelName = ${JSON.stringify(modelName)};
`;
}

export const emptyModelModule = `
export const modelModule = null;
export const exportName = null;
export const modelName = null;
`;
