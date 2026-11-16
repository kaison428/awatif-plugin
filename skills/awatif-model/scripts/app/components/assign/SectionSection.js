// Assign panel, Section group: a design member for the selected lines or polygons.
import { applySection, sectionState } from "../../actions/assign-section.js";
import { KIND_LABEL } from "../../constants.js";
import { F, SV, h } from "../../ui.js";
import { Actions, Hint, Row, Section } from "../primitives.js";

export function SectionSection({ app }) {
  const { section, setSection } = app.forms;
  const { sectionKind, sectionOptions, sectionValue } = sectionState(app.model, app.selection, section);
  const body = sectionKind
    ? h(
        F,
        null,
        h(Row, { label: "Design member" }, h(SV.Select, { "aria-label": "Design member", options: sectionOptions, value: sectionValue, onChange: setSection })),
        h(Actions, null, h(SV.Button, { size: "sm", variant: "primary", onClick: () => applySection(app, section, setSection) }, `Assign to ${app.selection[sectionKind].length} ${KIND_LABEL[sectionKind].toLowerCase()}`)),
        h(Hint, null, "Each line has one design member: assigning moves it from its current one. Edit the member's properties by selecting it in the tree."),
      )
    : h(Hint, null, "Select lines or polygons to assign a section.");
  return h(Section, { title: "Section", open: app.groupOpen("a:section"), onToggle: (v) => app.setGroup("a:section", v) }, body);
}
