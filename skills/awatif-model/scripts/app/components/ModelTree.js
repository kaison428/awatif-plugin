// The model tree (left region), with an "Add" menu for load cases, combinations and component entries.
import { addItem } from "../actions/items.js";
import { ctx } from "../context.js";
import { COMPONENT_FIELDS, FIELD_LABELS } from "../model/index.js";
import { F, SV, UI, h } from "../ui.js";
import { CollapseButton } from "./primitives.js";

function addOptions(model) {
  const loading = [{ value: "case", label: "Load case" }, ...(model.loadCases.length ? [{ value: "combo", label: "Load combination" }] : [])];
  const fields = COMPONENT_FIELDS.map((f) => ({
    label: FIELD_LABELS[f],
    options: [...ctx.templatesOf(f).keys()].map((id) => ({ value: f + "|" + id, label: ctx.templateLabel(id) })),
  })).filter((g) => g.options.length);
  return [{ value: "", label: "Add" }, { label: "Loading", options: loading }, ...fields];
}

export function ModelTree({ app }) {
  const tree = UI.buildTree(app.model);
  const actions = h(
    F,
    null,
    h(SV.Select, { "aria-label": "Add to model", options: addOptions(app.model), value: "", onChange: (v) => addItem(app, v) }),
    h(CollapseButton, { dir: "left", label: "Hide model tree", onClick: () => app.setCollapsed("left", true) }),
  );
  return h(
    SV.Panel,
    { title: "Model", flush: true, actions },
    h(SV.TreeView, {
      key: tree.map((g) => g.id).join(","),
      nodes: tree,
      selectedId: app.mode.mode === "assign" ? app.mode.entry : app.selId,
      defaultExpanded: tree.map((g) => g.id).filter((id) => id !== "geometry"),
      onSelect: (id) => app.select(id),
    }),
  );
}
