// Edits typed in the inspector's PropertyGrid, by what is selected. `key` is
// the row's key: a param name, or one of the special "__..." rows.
import { ctx } from "../context.js";
import { asNumber } from "../format.js";
import { allNames, assignToEntry, assignToField, parseIdList, renameLoadCase, unassignFromField } from "../model/index.js";
import { UI } from "../ui.js";
import { applyTypedTo } from "./typed.js";

const mapAt = (list, index, fn) => list.map((e, i) => (i === index ? fn(e) : e));

// Loads shown on a point or line: __load:<index>:<param>
function editLoadParam(app, key, value, coalesceKey) {
  const [, i, param] = key.split(":");
  const v = asNumber(value);
  if (v === null) return;
  app.commit({ ...app.model, loads: mapAt(app.model.loads, Number(i), (e) => ({ ...e, params: { ...e.params, [param]: v } })) }, coalesceKey);
}

function editPoint(app, p, key, value, coalesceKey) {
  if (key === "__support") return applyTypedTo(app, "supports", "point-support", "point", [p.id], value);
  const axis = { __x: 0, __y: 1, __z: 2 }[key];
  const v = asNumber(value);
  if (axis === undefined || v === null) return;
  const points = app.model.points.map(([id, pt]) => [id, id === p.id ? pt.map((c, i) => (i === axis ? v : c)) : pt]);
  app.commit({ ...app.model, points }, coalesceKey);
}

// A design member for one line or polygon; "" removes it
function editDesign(app, kind, id, value) {
  const { model, commit } = app;
  if (value === "") return commit(unassignFromField(model, "design", [id], kind, ctx.kindOf));
  commit(assignToEntry(model, "design", Number(value), [id], kind, ctx.kindOf, true).model);
}

function editLineEnds(app, p, key, value) {
  const pid = Number(value);
  const line = app.model.lines.find(([id]) => id === p.id)?.[1];
  if (!line) return;
  const next = key === "__start" ? [pid, line[1]] : [line[0], pid];
  if (next[0] === next[1]) return;
  app.commit({ ...app.model, lines: app.model.lines.map(([id, l]) => [id, id === p.id ? next : l]) });
}

function editLineMesh(app, p, value, coalesceKey) {
  const n = asNumber(value);
  if (n === null || n < 1) return;
  const spec = { templateId: "line-mesh", params: { divisions: Math.round(n) }, ids: [p.id], kind: "line", exclusive: true, name: "Line mesh", paramsOf: ctx.paramsOf };
  app.commit(assignToField(app.model, "mesh", spec, ctx.kindOf).model, coalesceKey);
}

function editLine(app, p, key, value, coalesceKey) {
  if (key === "__start" || key === "__end") editLineEnds(app, p, key, value);
  else if (key === "__design") editDesign(app, "line", p.id, value);
  else if (key === "__release") applyTypedTo(app, "releases", "releases", "line", [p.id], value);
  else if (key === "__mesh") editLineMesh(app, p, value, coalesceKey);
}

function editPolygonRing(app, p, value, coalesceKey) {
  const valid = new Set(app.model.points.map(([id]) => id));
  const ring = String(value).split(/[\s,;]+/).filter(Boolean).map(Number);
  if (ring.length < 3 || ring.some((id) => !valid.has(id)) || new Set(ring).size !== ring.length) return;
  app.commit({ ...app.model, polygons: app.model.polygons.map(([id, r]) => [id, id === p.id ? ring : r]) }, coalesceKey);
}

function editPolygon(app, p, key, value, coalesceKey) {
  if (key === "__polygon") editPolygonRing(app, p, value, coalesceKey);
  else if (key === "__design") editDesign(app, "polygon", p.id, value);
}

// Renaming a case or combination changes its tree id under the cursor
function followRename(app, p, name, prefix) {
  if (app.activeLoad === p.name) app.setActiveLoad(name);
  app.inspector.current.renaming = true;
  app.setSelId(prefix + name);
}

function rename(app, p, value, coalesceKey) {
  const name = String(value).trim();
  const { model, commit } = app;
  if (!name) return;
  if (p.kind === "case" && !allNames(model).includes(name)) {
    commit(renameLoadCase(model, p.name, name), coalesceKey + name);
    followRename(app, p, name, "case-");
  } else if (p.kind === "combo" && !allNames(model).includes(name)) {
    commit({ ...model, loadCombinations: model.loadCombinations.map((c) => (c.name === p.name ? { ...c, name } : c)) }, coalesceKey + name);
    followRename(app, p, name, "combo-");
  } else if (p.kind === "entry") {
    commit({ ...model, [p.field]: mapAt(model[p.field], p.index, (e) => ({ ...e, name })) }, coalesceKey);
  }
}

function editFactor(app, p, key, value, coalesceKey) {
  const v = asNumber(value);
  if (v === null) return;
  const loadCombinations = app.model.loadCombinations.map((c) => (c.name === p.name ? { ...c, factors: { ...c.factors, [key]: v } } : c));
  app.commit({ ...app.model, loadCombinations }, coalesceKey);
}

// A different kind of geometry cannot keep the ids
function changeTemplate(app, p, entry, templateId) {
  if (templateId === entry.templateId) return;
  const sameKind = ctx.kindOf({ templateId }) === ctx.kindOf(entry);
  const swap = (e) => ({ ...e, templateId, params: ctx.primitiveDefaults(templateId), geometry: sameKind ? e.geometry : [] });
  app.commit({ ...app.model, [p.field]: mapAt(app.model[p.field], p.index, swap) });
}

// The entry with one field changed, or null when the value is invalid
function editedEntry(model, entry, key, value) {
  if (key === "loadCase") return { ...entry, loadCase: value };
  if (key === "__geometry") {
    const valid = model[ctx.kindOf(entry) + "s"].map(([id]) => id);
    return { ...entry, geometry: parseIdList(value, valid).ids };
  }
  const withParam = (v) => ({ ...entry, params: { ...entry.params, [key]: v } });
  if (typeof ctx.paramsOf(entry)[key] !== "number") return withParam(value);
  const v = asNumber(value);
  return v === null ? null : withParam(v);
}

function editEntry(app, p, key, value, coalesceKey) {
  const entry = app.model[p.field][p.index];
  if (!entry) return;
  if (key === "__template") return changeTemplate(app, p, entry, value);
  const next = editedEntry(app.model, entry, key, value);
  if (next) app.commit({ ...app.model, [p.field]: mapAt(app.model[p.field], p.index, () => next) }, coalesceKey);
}

const BY_KIND = { point: editPoint, line: editLine, polygon: editPolygon };

export function onInspectorChange(app, key, value) {
  const p = UI.parseId(app.selId);
  if (!p) return;
  const coalesceKey = app.selId + "|" + key;
  if (key.startsWith("__load:")) return editLoadParam(app, key, value, coalesceKey);
  if (BY_KIND[p.kind]) return BY_KIND[p.kind](app, p, key, value, coalesceKey);
  if (key === "__name") return rename(app, p, value, coalesceKey);
  if (p.kind === "combo") return editFactor(app, p, key, value, coalesceKey);
  if (p.kind === "entry") editEntry(app, p, key, value, coalesceKey);
}
