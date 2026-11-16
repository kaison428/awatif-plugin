// The Assign panel's Section group: a design member for the selected lines or polygons.
import { ctx } from "../context.js";
import { allNames, assignToEntry, uniqueName } from "../model/index.js";

// { sectionKind, sectionOptions, sectionValue } for the selection and the form's choice
export function sectionState(model, selection, section) {
  const sectionKind = selection.line.length ? "line" : selection.polygon.length ? "polygon" : null;
  if (!sectionKind) return { sectionKind, sectionOptions: [], sectionValue: "" };
  const existing = model.design
    .map((e, i) => (ctx.kindOf(e) === sectionKind ? { value: String(i), label: e.name } : null))
    .filter(Boolean);
  const templates = [...ctx.templatesOf("design").keys()].filter((id) => ctx.kindOf({ templateId: id }) === sectionKind);
  const sectionOptions = [...existing, ...templates.map((id) => ({ value: "new|" + id, label: "New " + ctx.templateLabel(id) + "…" }))];
  const sectionValue = sectionOptions.some((o) => o.value === section) ? section : sectionOptions[0]?.value ?? "";
  return { sectionKind, sectionOptions, sectionValue };
}

function addDesignEntry(model, templateId) {
  const entry = { name: uniqueName(allNames(model), ctx.templateLabel(templateId)), templateId, geometry: [], params: ctx.primitiveDefaults(templateId) };
  return { ...model, design: [...model.design, entry] };
}

export function applySection(app, section, setSection) {
  const { sectionKind, sectionValue } = sectionState(app.model, app.selection, section);
  if (!sectionKind || !sectionValue) return;
  let next = app.model;
  let index;
  if (sectionValue.startsWith("new|")) {
    next = addDesignEntry(next, sectionValue.slice(4));
    index = next.design.length - 1;
    setSection(String(index));
  } else index = Number(sectionValue);
  app.commit(assignToEntry(next, "design", index, app.selection[sectionKind], sectionKind, ctx.kindOf, true).model);
}
