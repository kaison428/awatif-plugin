// Creating and deleting load cases, combinations, component entries and geometry.
// Each action takes `app` (the App's state and setters, see components/App.js).
import { ctx } from "../context.js";
import { allNames, applyEdit, uniqueName } from "../model/index.js";
import { UI } from "../ui.js";

function addLoadCase(app) {
  const name = uniqueName(allNames(app.model), "Case");
  app.commit({ ...app.model, loadCases: [...app.model.loadCases, name] });
  app.select("case-" + name);
}

function addCombination(app) {
  const { model } = app;
  const name = uniqueName(allNames(model), "Combination");
  const factors = Object.fromEntries(model.loadCases.map((n) => [n, 1]));
  app.commit({ ...model, loadCombinations: [...model.loadCombinations, { name, factors }] });
  app.select("combo-" + name);
}

function newEntry(app, field, templateId) {
  const { model, activeLoad, selection } = app;
  const entry = {
    name: uniqueName(allNames(model), ctx.templateLabel(templateId)),
    templateId,
    geometry: [],
    params: templateId === "grid-system" ? { x: [], y: [], z: [] } : ctx.primitiveDefaults(templateId),
  };
  if (field === "loads") {
    const loadCase = model.loadCases.includes(activeLoad) ? activeLoad : model.loadCases[0];
    if (loadCase) entry.loadCase = loadCase;
  }
  // Start with what is selected, when it is the geometry the entry takes
  const kind = ctx.kindOf(entry);
  if (kind && selection[kind].length) entry.geometry = [...selection[kind]];
  return entry;
}

function addEntry(app, field, templateId) {
  const entry = newEntry(app, field, templateId);
  const next = { ...app.model, [field]: [...app.model[field], entry] };
  app.commit(next);
  const id = field + "-" + (next[field].length - 1);
  app.select(id);
  if (ctx.kindOf(entry) && !entry.geometry.length) app.setMode({ mode: "assign", entry: id });
}

// From the tree's "Add" menu: "case", "combo" or "<field>|<templateId>"
export function addItem(app, value) {
  if (!value) return;
  if (value === "case") return addLoadCase(app);
  if (value === "combo") return addCombination(app);
  const [field, templateId] = value.split("|");
  addEntry(app, field, templateId);
}

function withoutLoadCase(model, name) {
  return {
    ...model,
    loadCases: model.loadCases.filter((n) => n !== name),
    loadCombinations: model.loadCombinations.map((c) => {
      const factors = { ...c.factors };
      delete factors[name];
      return { ...c, factors };
    }),
  };
}

const withoutPolygon = (model, id) => ({ ...model, polygons: model.polygons.filter(([g]) => g !== id) });

function withoutItem(model, p) {
  switch (p.kind) {
    case "entry":
      return { ...model, [p.field]: model[p.field].filter((_, i) => i !== p.index) };
    case "combo":
      return { ...model, loadCombinations: model.loadCombinations.filter((c) => c.name !== p.name) };
    case "case":
      return withoutLoadCase(model, p.name);
    case "point":
      return applyEdit(model, { type: "delete-point", id: p.id }, ctx.kindOf).model;
    case "line":
      return applyEdit(model, { type: "delete-line", id: p.id }, ctx.kindOf).model;
    case "polygon":
      return withoutPolygon(model, p.id);
    default:
      return model;
  }
}

// Delete the selected item (Delete in the inspector)
export function deleteSelected(app) {
  const p = UI.parseId(app.selId);
  if (!p) return;
  app.commit(withoutItem(app.model, p));
  app.select(null);
  app.setMode({ mode: "view", entry: null });
}

// Delete every selected point, line and polygon (with what hangs off them)
export function deleteSelection(app) {
  const { selection } = app;
  const { kindOf } = ctx;
  let next = app.model;
  selection.polygon.forEach((id) => (next = withoutPolygon(next, id)));
  selection.line.forEach((id) => (next = applyEdit(next, { type: "delete-line", id }, kindOf).model));
  selection.point.forEach((id) => (next = applyEdit(next, { type: "delete-point", id }, kindOf).model));
  app.commit(next);
  app.select(null);
}
