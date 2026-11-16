// The inspector (right region, bottom): the selected item's header, actions and editable properties.
import { deleteSelected } from "../../actions/items.js";
import { onInspectorChange } from "../../actions/inspector-edit.js";
import { EMPTY_SELECTION, KIND_LABEL, KINDS } from "../../constants.js";
import { ctx } from "../../context.js";
import { duplicateEntry, formatIdList } from "../../model/index.js";
import { F, SV, UI, h } from "../../ui.js";
import { GridEditor } from "../GridEditor.js";
import { Heading, Hint, Message } from "../primitives.js";
import { inspectorGroups } from "./groups.js";

function MultiSelection({ app }) {
  const parts = KINDS.filter((k) => app.selection[k].length).map((k) => `${KIND_LABEL[k]}: ${formatIdList(app.selection[k])}`);
  return h(
    F,
    null,
    h(Heading, { title: app.selCount + " items selected", sub: parts.join(" · ") }),
    h(Message, null, "Use the Assign panel to give the selection loads, supports, sections, releases or mesh."),
  );
}

function duplicate(app, p) {
  const r = duplicateEntry(app.model, p.field, p.index);
  app.commit(r.model);
  app.select(p.field + "-" + r.index);
}

function ItemActions({ app, p, entry, kind }) {
  const assigning = app.mode.mode === "assign" && app.mode.entry === app.selId;
  const caseInUse = p.kind === "case" && app.model.loads.some((e) => e.loadCase === p.name);
  const togglePick = () => app.setMode(assigning ? { mode: "view", entry: null } : { mode: "assign", entry: app.selId });
  return h(
    "div",
    { style: { display: "flex", flexWrap: "wrap", gap: "var(--space-2)", padding: "var(--space-3)", borderBottom: "1px solid var(--border)" } },
    kind ? h(SV.Button, { size: "sm", variant: assigning ? "primary" : "secondary", pressed: assigning, onClick: togglePick }, assigning ? "Done" : "Pick " + KIND_LABEL[kind].toLowerCase()) : null,
    kind && entry.geometry.length
      ? h(SV.Button, { size: "sm", variant: "secondary", title: "Select this entry's geometry, to assign more to it", onClick: () => app.changeSelection({ ...EMPTY_SELECTION, [kind]: [...entry.geometry] }) }, "Select geometry")
      : null,
    p.kind === "entry" ? h(SV.Button, { size: "sm", variant: "secondary", onClick: () => duplicate(app, p) }, "Duplicate") : null,
    h(SV.Button, { size: "sm", variant: "danger", disabled: caseInUse, title: caseInUse ? "Remove or move its loads first" : undefined, onClick: () => deleteSelected(app) }, "Delete"),
  );
}

function SelectedItem({ app }) {
  const { model, selId } = app;
  const ins = UI.inspector(ctx.withDefaults(model), selId);
  const p = UI.parseId(selId);
  if (!p || !ins.groups) return null;
  if (ins.title === "Nothing selected") return h(Message, null, "This item no longer exists.");
  const entry = p.kind === "entry" ? model[p.field]?.[p.index] : null;
  const kind = entry && ctx.kindOf(entry);
  const groups = inspectorGroups(app, p, ins).map((g) => ({ ...g, collapsible: true, open: app.groupOpen("i:" + g.title) }));
  const assigning = app.mode.mode === "assign" && app.mode.entry === selId;
  const remount = app.inspector.current.n + ":" + app.version;
  const onGridChange = (params, key) => app.commit({ ...model, [p.field]: model[p.field].map((e, i) => (i === p.index ? { ...e, params } : e)) }, key && selId + "|" + key);
  return h(
    F,
    null,
    h(Heading, { title: ins.title, sub: ins.sub }),
    h(ItemActions, { app, p, entry, kind }),
    assigning ? h(Hint, null, `Drag left to right to add ${KIND_LABEL[kind].toLowerCase()}, right to left to remove. Click toggles one. Right-click or Esc to finish.`) : null,
    h(SV.PropertyGrid, { key: remount, groups, onChange: (key, value) => onInspectorChange(app, key, value), onGroupToggle: (title, open) => app.setGroup("i:" + title, open) }),
    entry?.templateId === "grid-system" ? h(GridEditor, { key: "grid:" + remount, entry, onChange: onGridChange }) : null,
  );
}

function InspectorBody({ app }) {
  if (app.selId) return h(SelectedItem, { app });
  if (app.selCount) return h(MultiSelection, { app });
  return h(Message, null, "Select an item in the model tree or the viewport.");
}

export function InspectorPanel({ app }) {
  return h(
    SV.Panel,
    { title: "Inspector", flush: true, collapsible: true, open: app.layout.panels.inspector, onToggle: (v) => app.setPanel("inspector", v) },
    h(InspectorBody, { app }),
  );
}
