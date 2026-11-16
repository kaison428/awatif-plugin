// Assign panel, Support and Release groups: one type per point (support) or line (release).
import { applyTypedTo } from "../../actions/typed.js";
import { RELEASE_TYPES, SUPPORT_TYPES, humanOptions } from "../../constants.js";
import { SV, h } from "../../ui.js";
import { Actions, Row, Section } from "../primitives.js";

const KINDS = {
  support: { title: "Support", group: "a:support", field: "supports", templateId: "point-support", kind: "point", things: "points", types: SUPPORT_TYPES, label: "Support type" },
  release: { title: "Release", group: "a:release", field: "releases", templateId: "releases", kind: "line", things: "lines", types: RELEASE_TYPES, label: "Release type" },
};

// `which`: "support" or "release"; `type`/`setType`: the form's value
export function TypedSection({ app, which, type, setType }) {
  const k = KINDS[which];
  const ids = app.selection[k.kind];
  const apply = (value) => ids.length && applyTypedTo(app, k.field, k.templateId, k.kind, ids, value);
  return h(
    Section,
    { title: k.title, open: app.groupOpen(k.group), onToggle: (v) => app.setGroup(k.group, v) },
    h(Row, { label: "Type" }, h(SV.Select, { "aria-label": k.label, options: humanOptions(k.types), value: type, onChange: setType })),
    h(
      Actions,
      null,
      h(SV.Button, { size: "sm", variant: "primary", disabled: !ids.length, onClick: () => apply(type) }, `Assign to ${ids.length} ${k.things}`),
      h(SV.Button, { size: "sm", variant: "ghost", disabled: !ids.length, onClick: () => apply("") }, "Remove"),
    ),
  );
}
