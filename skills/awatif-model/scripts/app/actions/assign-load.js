// The Assign panel's Loads group: which load the form describes, and applying it.
import { POINT_LOAD_KEYS } from "../constants.js";
import { ctx } from "../context.js";
import { asNumber } from "../format.js";
import { allNames, assignLoad, removeLoads, uniqueName } from "../model/index.js";

// The load type follows the selection: points take point loads, lines distributed loads
function loadTypeOf(selection, formType) {
  if (selection.point.length && !selection.line.length) return "point-load";
  if (selection.line.length && !selection.point.length) return "distributed-load";
  return formType;
}

function loadCaseOf(model, formCase, activeLoad) {
  if (model.loadCases.includes(formCase)) return formCase;
  if (model.loadCases.includes(activeLoad)) return activeLoad;
  return model.loadCases[0] ?? "";
}

// { loadType, loadKind, loadCase, caseOptions } for the current form and selection
export function loadFormState(app, loadForm) {
  const { model, selection, activeLoad } = app;
  const loadType = loadTypeOf(selection, loadForm.type);
  return {
    loadType,
    loadKind: loadType === "point-load" ? "point" : "line",
    loadCase: loadCaseOf(model, loadForm.loadCase, activeLoad),
    caseOptions: [...model.loadCases.map((n) => ({ value: n, label: n })), { value: "__new", label: "New load case…" }],
  };
}

// The form's params as numbers, or null while one is not a number
export function loadParams(loadType, loadForm) {
  if (loadType !== "point-load") {
    const w = asNumber(loadForm.w);
    return w === null ? null : { w, direction: loadForm.direction };
  }
  const out = {};
  for (const k of POINT_LOAD_KEYS) {
    const v = asNumber(loadForm[k]);
    if (v === null) return null;
    out[k] = v;
  }
  return out;
}

export function chooseLoadCase(app, setLoadForm, value) {
  if (value !== "__new") return setLoadForm((f) => ({ ...f, loadCase: value }));
  const name = uniqueName(allNames(app.model), "Case");
  app.commit({ ...app.model, loadCases: [...app.model.loadCases, name] });
  setLoadForm((f) => ({ ...f, loadCase: name }));
}

// how: "add", "replace" or "remove"
export function applyLoad(app, loadForm, how) {
  const { loadType, loadKind, loadCase } = loadFormState(app, loadForm);
  const ids = app.selection[loadKind];
  if (!ids.length) return;
  let next = app.model;
  let lc = loadCase;
  if (!lc) {
    lc = uniqueName(allNames(next), "Case");
    next = { ...next, loadCases: [...next.loadCases, lc] };
  }
  if (how === "remove") return app.commit(removeLoads(next, { templateId: loadType, loadCase: lc, ids }, ctx.kindOf));
  const params = loadParams(loadType, loadForm);
  if (!params) return;
  const name = (loadType === "point-load" ? "Point load" : "Distributed load") + " " + lc;
  const spec = { templateId: loadType, loadCase: lc, params, ids, replace: how === "replace", name, paramsOf: ctx.paramsOf };
  app.commit(assignLoad(next, spec, ctx.kindOf).model);
}
