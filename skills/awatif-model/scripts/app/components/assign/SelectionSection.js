// Assign panel, Selection group: typed ids per kind, pick filter, select all, clear, delete.
import { deleteSelection } from "../../actions/items.js";
import { KINDS, KIND_LABEL } from "../../constants.js";
import { SV, h } from "../../ui.js";
import { Actions, Hint, IdsInput, Row, Section } from "../primitives.js";

export const validIds = (model) => ({
  point: model.points.map(([id]) => id),
  line: model.lines.map(([id]) => id),
  polygon: model.polygons.map(([id]) => id),
});

export const kindsShown = (model) => KINDS.filter((k) => k !== "polygon" || model.polygons.length);

function PickFilter({ app, kinds }) {
  return h(
    "span",
    { style: { display: "flex", flexWrap: "wrap", gap: "var(--space-2)", justifyContent: "flex-end" } },
    kinds.map((k) => h(SV.Checkbox, { key: k, checked: app.filter[k], onChange: (v) => app.setFilter((f) => ({ ...f, [k]: v })) }, KIND_LABEL[k])),
  );
}

function SelectionActions({ app, valid }) {
  const none = !app.selCount;
  return h(
    Actions,
    null,
    h(SV.Button, { size: "sm", variant: "secondary", onClick: () => app.changeSelection({ point: valid.point, line: [], polygon: [] }) }, "All points"),
    h(SV.Button, { size: "sm", variant: "secondary", onClick: () => app.changeSelection({ point: [], line: valid.line, polygon: [] }) }, "All lines"),
    h(SV.Button, { size: "sm", variant: "ghost", disabled: none, onClick: () => app.select(null) }, "Clear"),
    h(SV.Button, { size: "sm", variant: "danger", disabled: none, onClick: () => deleteSelection(app) }, "Delete"),
  );
}

export function SelectionSection({ app }) {
  const valid = validIds(app.model);
  const kinds = kindsShown(app.model);
  const idsRow = (k) =>
    h(Row, { key: k, label: KIND_LABEL[k] }, h(IdsInput, { ids: app.selection[k], valid: valid[k], label: KIND_LABEL[k] + " ids", onChange: (ids) => app.changeSelection({ ...app.selection, [k]: ids }) }));
  return h(
    Section,
    { title: "Selection", open: app.groupOpen("a:selection"), onToggle: (v) => app.setGroup("a:selection", v) },
    kinds.map(idsRow),
    h(Row, { label: "Pick in view" }, h(PickFilter, { app, kinds })),
    h(SelectionActions, { app, valid }),
    h(Hint, null, "Shift+click toggles an item in the view; Shift+drag left to right adds, right to left removes. Or type ids."),
  );
}
