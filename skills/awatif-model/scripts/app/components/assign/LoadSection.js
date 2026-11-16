// Assign panel, Loads group: a point or distributed load in a load case, added, replaced or removed.
import { applyLoad, chooseLoadCase, loadFormState, loadParams } from "../../actions/assign-load.js";
import { KIND_LABEL, POINT_LOAD_KEYS, UDL_DIRECTIONS, humanOptions } from "../../constants.js";
import { asNumber } from "../../format.js";
import { F, SV, h } from "../../ui.js";
import { Actions, Hint, Row, Section, TextInput } from "../primitives.js";

const TYPES_BY_KIND = [{ value: "point-load", label: "Point load (points)" }, { value: "distributed-load", label: "Distributed load (lines)" }];
const TYPES = [{ value: "point-load", label: "Point load" }, { value: "distributed-load", label: "Distributed load" }];

// The type is a choice only when the selection allows both, or nothing is selected
function TypeRow({ app, loadType, setLoadForm }) {
  const { selection } = app;
  const choose = (options) => h(SV.Select, { "aria-label": "Load type", options, value: loadType, onChange: (v) => setLoadForm((f) => ({ ...f, type: v })) });
  if (selection.point.length && selection.line.length) return h(Row, { label: "Type" }, choose(TYPES_BY_KIND));
  if (!app.selCount) return h(Row, { label: "Type" }, choose(TYPES));
  return h(Row, { label: "Type" }, h("span", { className: "ui sv-props__value" }, loadType === "point-load" ? "Point load" : "Distributed load (UDL)"));
}

function ValueRows({ loadType, loadForm, setLoadForm }) {
  const numberRow = (k, unit) =>
    h(Row, { key: k, label: k, unit }, h(TextInput, { numeric: true, label: k, value: loadForm[k], invalid: asNumber(loadForm[k]) === null, onChange: (v) => setLoadForm((f) => ({ ...f, [k]: v })) }));
  if (loadType === "point-load") return h(F, null, POINT_LOAD_KEYS.map((k) => numberRow(k, k.startsWith("F") ? "kN" : "kN·m")));
  return h(
    F,
    null,
    numberRow("w", "kN/m"),
    h(Row, { label: "Direction" }, h(SV.Select, { "aria-label": "Direction", options: humanOptions(UDL_DIRECTIONS), value: loadForm.direction, onChange: (v) => setLoadForm((f) => ({ ...f, direction: v })) })),
  );
}

function hintText(count, kind, loadType) {
  const things = KIND_LABEL[kind].toLowerCase();
  if (!count) return `Select ${things} to load.`;
  return `Applies to ${count} ${things}. Gravity is a negative ${loadType === "point-load" ? "Fz" : "w on global z"}.`;
}

export function LoadSection({ app }) {
  const { loadForm, setLoadForm } = app.forms;
  const { loadType, loadKind, loadCase, caseOptions } = loadFormState(app, loadForm);
  const count = app.selection[loadKind].length;
  const invalid = !count || !loadParams(loadType, loadForm);
  const kindWord = loadKind === "point" ? "point" : "distributed";
  return h(
    Section,
    { title: "Loads", open: app.groupOpen("a:loads"), onToggle: (v) => app.setGroup("a:loads", v) },
    h(TypeRow, { app, loadType, setLoadForm }),
    h(Row, { label: "Load case" }, h(SV.Select, { "aria-label": "Load case", options: caseOptions, value: loadCase || "__new", onChange: (v) => chooseLoadCase(app, setLoadForm, v) })),
    h(ValueRows, { loadType, loadForm, setLoadForm }),
    h(
      Actions,
      null,
      h(SV.Button, { size: "sm", variant: "primary", disabled: invalid, onClick: () => applyLoad(app, loadForm, "add") }, "Add"),
      h(SV.Button, { size: "sm", variant: "secondary", disabled: invalid, title: `Replace this case's ${kindWord} loads on the selection`, onClick: () => applyLoad(app, loadForm, "replace") }, "Replace"),
      h(SV.Button, { size: "sm", variant: "ghost", disabled: !count, title: "Remove this case's loads of this type from the selection", onClick: () => applyLoad(app, loadForm, "remove") }, "Remove"),
    ),
    h(Hint, null, hintText(count, loadKind, loadType)),
  );
}
