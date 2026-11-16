// The Assign panel's "Mesh and other" group: any template of mesh, local axes or
// imperfections, with its parameters.
import { ctx } from "../context.js";
import { asNumber } from "../format.js";
import { assignToField, unassignFromField } from "../model/index.js";

const OTHER = ["mesh", "localAxes", "imperfections"];

// The form resolved against the available templates
export function otherState(other) {
  const fields = OTHER.filter((f) => ctx.templatesOf(f).size);
  const field = fields.includes(other.field) ? other.field : fields[0];
  const templates = field ? [...ctx.templatesOf(field).keys()] : [];
  const template = templates.includes(other.templateId) ? other.templateId : templates[0];
  const kind = template ? ctx.kindOf({ templateId: template }) : null;
  const defaults = template ? ctx.primitiveDefaults(template) : {};
  const value = (k) => (other.templateId === template && other.params[k] !== undefined ? other.params[k] : defaults[k]);
  return { fields, field, templates, template, kind, defaults, value };
}

// The form's params typed like the template's defaults, or null while a number is invalid
function typedParams(state) {
  const params = {};
  for (const [k, d] of Object.entries(state.defaults)) {
    const v = state.value(k);
    if (typeof d === "number") {
      const n = asNumber(String(v));
      if (n === null) return null;
      params[k] = n;
    } else params[k] = typeof d === "boolean" ? !!v : v;
  }
  return params;
}

export function applyOther(app, other, remove) {
  const state = otherState(other);
  const ids = state.kind ? app.selection[state.kind] : [];
  if (!ids.length) return;
  const { model, commit } = app;
  if (remove) return commit(unassignFromField(model, state.field, ids, state.kind, ctx.kindOf, (e) => e.templateId === state.template));
  const params = typedParams(state);
  if (!params) return;
  const spec = { templateId: state.template, params, ids, kind: state.kind, exclusive: true, name: ctx.templateLabel(state.template), paramsOf: ctx.paramsOf };
  commit(assignToField(model, state.field, spec, ctx.kindOf).model);
}
