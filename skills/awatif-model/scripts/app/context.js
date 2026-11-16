// What every part of the app shares and never changes after boot: the engine,
// the templates it resolved, and helpers derived from them. Filled once by
// main.js (createContext) before the first render.
import { ComponentsType, initTriangleMesh } from "@awatif/components";
import { createEngine } from "../engine.ts";
import { COMPONENT_FIELDS, normalize } from "./model/index.js";
import { createSaver, readLocal } from "./persistence.js";
import { UI } from "./ui.js";

export const ctx = {};

const FIELD_TYPE = {
  gridLines: ComponentsType.GRID_LINES,
  loads: ComponentsType.LOADS,
  supports: ComponentsType.SUPPORTS,
  releases: ComponentsType.RELEASES,
  localAxes: ComponentsType.LOCAL_AXES,
  imperfections: ComponentsType.IMPERFECTIONS,
  mesh: ComponentsType.MESH,
  design: ComponentsType.DESIGN,
};

function indexTemplates(engine) {
  const templatesOf = (field) => engine.templates.get(FIELD_TYPE[field]) ?? new Map();
  const templateById = new Map();
  COMPONENT_FIELDS.forEach((f) => templatesOf(f).forEach((t, id) => templateById.set(id, t)));
  return { templatesOf, templateById };
}

function templateHelpers(templateById) {
  const templateLabel = (id) => UI.TEMPLATE_NAMES[id] ?? templateById.get(id)?.name ?? id;
  // Which geometry an entry's ids refer to, from its template
  const kindOf = (entry) =>
    entry.templateId === "grid-system" ? null : templateById.get(entry.templateId)?.geometryKind ?? "line";
  // A template's default params that are plain values (editable in a form)
  const primitiveDefaults = (templateId) => {
    const out = {};
    Object.entries(templateById.get(templateId)?.defaultParams ?? {}).forEach(([k, v]) => {
      if (["number", "string", "boolean"].includes(typeof v)) out[k] = v;
    });
    return out;
  };
  // An entry's params with template defaults filled in (how assignments compare entries)
  const paramsOf = (e) => ({ ...primitiveDefaults(e.templateId), ...e.params });
  // The model as the inspector shows it: template defaults filled in, so every param is editable
  const withDefaults = (model) => {
    const out = { ...model };
    COMPONENT_FIELDS.forEach((f) => {
      out[f] = model[f].map((e) => (e.templateId === "grid-system" ? e : { ...e, params: paramsOf(e) }));
    });
    return out;
  };
  return { templateLabel, kindOf, primitiveDefaults, paramsOf, withDefaults };
}

// `source`: { name, config, hosted } from load-model.js
export async function createContext({ name, config, hosted }) {
  // Polygons drawn in the app need the Triangle mesher even if the file has none
  await initTriangleMesh();
  const original = normalize(config);
  const initialModel = (hosted && readLocal(name, original)) || original;
  const engine = await createEngine({ ...config, ...initialModel });
  const { templatesOf, templateById } = indexTemplates(engine);
  Object.assign(ctx, {
    modelName: name,
    hosted,
    engine,
    initialModel,
    extra: config.extraComponents ? { extraComponents: config.extraComponents } : {},
    workPlane: config.display?.workPlane ?? "XZ",
    workPlaneOffset: config.display?.workPlaneOffset ?? 0,
    save: createSaver({ name, hosted, original }),
    templatesOf,
    templateById,
    ...templateHelpers(templateById),
  });
  return ctx;
}
