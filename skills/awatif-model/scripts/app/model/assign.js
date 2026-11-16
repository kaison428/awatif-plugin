// Assigning component entries (loads, supports, sections...) to geometry. Pure.
import { allNames, uniqueName } from "./names.js";

// Add or remove geometry ids of one component entry (assign mode)
export function assignGeometry(model, field, index, ids, add) {
  const list = model[field].map((e, i) => {
    if (i !== index) return e;
    const set = new Set(e.geometry);
    ids.forEach((id) => (add ? set.add(id) : set.delete(id)));
    return { ...e, geometry: [...set].sort((a, b) => a - b) };
  });
  return { ...model, [field]: list };
}

function sameParams(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  return true;
}

// Fields whose entries are dropped once a reassignment or removal leaves them without geometry.
// Design entries (sections) and grid systems are kept: they are definitions, not assignments.
export const PRUNED_FIELDS = new Set(["loads", "supports", "releases", "localAxes", "imperfections", "mesh"]);

function unassign(model, field, ids, kind, kindOf, keep) {
  const gone = new Set(ids);
  const emptied = new Set();
  let list = model[field].map((e, i) => {
    if (!(keep(e, i) && kindOf(e) === kind && e.geometry.some((g) => gone.has(g)))) return e;
    const geometry = e.geometry.filter((g) => !gone.has(g));
    if (!geometry.length) emptied.add(i);
    return { ...e, geometry };
  });
  if (PRUNED_FIELDS.has(field)) list = list.filter((_, i) => !emptied.has(i));
  else emptied.clear();
  return { model: { ...model, [field]: list }, emptied };
}

// Remove geometry ids of `kind` from the entries of `field` that `keep(entry, index)` selects
export function unassignFromField(model, field, ids, kind, kindOf, keep = () => true) {
  return unassign(model, field, ids, kind, kindOf, keep).model;
}

// Add geometry ids to entry `index` of `field`. `exclusive` first removes them from the field's other
// entries of the same kind (a line has one design member, one support per point...). Returns the model
// and the entry's index (entries left empty before it may have been dropped).
export function assignToEntry(model, field, index, ids, kind, kindOf, exclusive) {
  let next = model;
  if (exclusive) {
    const r = unassign(model, field, ids, kind, kindOf, (_, i) => i !== index);
    next = r.model;
    index -= [...r.emptied].filter((i) => i < index).length;
  }
  return { model: assignGeometry(next, field, index, ids, true), index };
}

// Assign geometry to the entry of `field` with this template, params (compared with `paramsOf`, e.g.
// with template defaults filled in) and load case; a new entry named after `name` when none matches.
// Returns the model and the entry's index.
export function assignToField(model, field, spec, kindOf) {
  const { templateId, params = {}, ids, kind, exclusive, loadCase, name, paramsOf = (e) => e.params ?? {} } = spec;
  let index = model[field].findIndex(
    (e) =>
      e.templateId === templateId &&
      (field !== "loads" || e.loadCase === loadCase) &&
      sameParams(paramsOf(e), paramsOf({ templateId, params })),
  );
  let next = model;
  if (index === -1) {
    const entry = { name: uniqueName(allNames(model), name ?? templateId), templateId, geometry: [], params: { ...params } };
    if (field === "loads" && loadCase) entry.loadCase = loadCase;
    next = { ...model, [field]: [...model[field], entry] };
    index = next[field].length - 1;
  }
  return assignToEntry(next, field, index, ids, kind, kindOf, exclusive);
}

// Loads of one template in one load case are additive; `replace` first clears that template and
// case from the target geometry.
export function assignLoad(model, { templateId, loadCase, params, ids, replace, name, paramsOf }, kindOf) {
  const kind = templateId === "point-load" ? "point" : "line";
  let next = model;
  if (replace) next = removeLoads(next, { templateId, loadCase, ids }, kindOf);
  return assignToField(next, "loads", { templateId, loadCase, params, ids, kind, name, paramsOf }, kindOf);
}

export function removeLoads(model, { templateId, loadCase, ids }, kindOf) {
  const kind = templateId === "point-load" ? "point" : "line";
  return unassignFromField(
    model,
    "loads",
    ids,
    kind,
    kindOf,
    (e) => e.templateId === templateId && (!loadCase || e.loadCase === loadCase),
  );
}
