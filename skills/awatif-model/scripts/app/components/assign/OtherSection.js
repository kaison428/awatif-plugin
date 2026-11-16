// Assign panel, "Mesh and other" group: mesh, local axes or imperfections with their parameters.
import { applyOther, otherState } from "../../actions/assign-other.js";
import { KIND_LABEL } from "../../constants.js";
import { ctx } from "../../context.js";
import { FIELD_LABELS } from "../../model/index.js";
import { SV, UI, h } from "../../ui.js";
import { Actions, Row, Section, TextInput } from "../primitives.js";

function ParamControl({ k, d, state, other, setOther }) {
  const enumValues = UI.ENUMS[state.template + "." + k];
  const set = (v) => setOther({ field: state.field, templateId: state.template, params: { ...(other.templateId === state.template ? other.params : {}), [k]: v } });
  if (typeof d === "boolean") return h(SV.Checkbox, { checked: !!state.value(k), onChange: set });
  if (enumValues)
    return h(SV.Select, {
      "aria-label": k,
      options: enumValues.map((v) => ({ value: v, label: UI.humanize(v) })),
      value: String(state.value(k)),
      onChange: (v) => set(typeof d === "number" ? Number(v) : v),
    });
  return h(TextInput, { numeric: typeof d === "number", label: k, value: String(state.value(k)), onChange: set });
}

function Pickers({ state, setOther }) {
  const fieldSelect = h(SV.Select, { "aria-label": "Component", options: state.fields.map((f) => ({ value: f, label: FIELD_LABELS[f] })), value: state.field, onChange: (v) => setOther({ field: v, templateId: "", params: {} }) });
  const templateSelect = h(SV.Select, { "aria-label": "Template", options: state.templates.map((id) => ({ value: id, label: ctx.templateLabel(id) })), value: state.template, onChange: (v) => setOther({ field: state.field, templateId: v, params: {} }) });
  return [h(Row, { key: "field", label: "Component" }, fieldSelect), state.templates.length > 1 ? h(Row, { key: "template", label: "Template" }, templateSelect) : null];
}

export function OtherSection({ app }) {
  const { other, setOther } = app.forms;
  const state = otherState(other);
  if (!state.field) return null;
  const count = state.kind ? app.selection[state.kind].length : 0;
  return h(
    Section,
    { title: "Mesh and other", open: app.groupOpen("a:other"), onToggle: (v) => app.setGroup("a:other", v) },
    Pickers({ state, setOther }),
    Object.entries(state.defaults).map(([k, d]) =>
      h(Row, { key: state.template + k, label: UI.humanize(k), unit: UI.UNITS[k] }, h(ParamControl, { k, d, state, other, setOther })),
    ),
    h(
      Actions,
      null,
      h(SV.Button, { size: "sm", variant: "primary", disabled: !count, onClick: () => applyOther(app, other, false) }, "Assign to " + (state.kind ? count + " " + KIND_LABEL[state.kind].toLowerCase() : "")),
      h(SV.Button, { size: "sm", variant: "ghost", disabled: !count, onClick: () => applyOther(app, other, true) }, "Remove"),
    ),
  );
}
