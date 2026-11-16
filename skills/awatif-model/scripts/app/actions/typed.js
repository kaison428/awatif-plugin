// Supports and releases: one type per item; an empty type removes it.
import { ctx } from "../context.js";
import { assignToField, unassignFromField } from "../model/index.js";
import { UI } from "../ui.js";

export function applyTypedTo(app, field, templateId, kind, ids, type) {
  const { model, commit } = app;
  if (!type) return commit(unassignFromField(model, field, ids, kind, ctx.kindOf, (e) => e.templateId === templateId));
  const name = UI.humanize(type) + (field === "supports" ? " support" : " release");
  const spec = { templateId, params: { type }, ids, kind, exclusive: true, name, paramsOf: ctx.paramsOf };
  commit(assignToField(model, field, spec, ctx.kindOf).model);
}
