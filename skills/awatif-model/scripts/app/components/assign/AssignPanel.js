// The Assign panel (right region, top): the selection, then what to give it.
import { F, SV, h } from "../../ui.js";
import { CollapseButton } from "../primitives.js";
import { LoadSection } from "./LoadSection.js";
import { OtherSection } from "./OtherSection.js";
import { SectionSection } from "./SectionSection.js";
import { SelectionSection } from "./SelectionSection.js";
import { TypedSection } from "./TypedSection.js";

export function AssignPanel({ app }) {
  const { supportType, setSupportType, releaseType, setReleaseType } = app.forms;
  const hide = h(CollapseButton, { dir: "right", label: "Hide inspector", onClick: () => app.setCollapsed("right", true) });
  return h(
    SV.Panel,
    { title: "Assign", flush: true, collapsible: true, open: app.layout.panels.assign, onToggle: (v) => app.setPanel("assign", v), actions: hide },
    h(
      F,
      null,
      h(SelectionSection, { app }),
      h(LoadSection, { app }),
      h(TypedSection, { app, which: "support", type: supportType, setType: setSupportType }),
      h(SectionSection, { app }),
      h(TypedSection, { app, which: "release", type: releaseType, setType: setReleaseType }),
      h(OtherSection, { app }),
    ),
  );
}
