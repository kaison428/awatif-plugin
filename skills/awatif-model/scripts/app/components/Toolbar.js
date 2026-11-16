// The toolbar: model name, analysis and load selection, modes, undo, panels, theme.
import logoUrl from "../../../../awatif-ui/assets/logo.svg?url";
import { ctx } from "../context.js";
import { downloadModel } from "../persistence.js";
import { F, SV, UI, h } from "../ui.js";

const sep = () => h("span", { className: "sv-toolbar__sep" });

function toolButton(pressed, onClick, label, title) {
  return h(SV.Button, { size: "sm", variant: "ghost", pressed, title, onClick }, label);
}

function toggleTheme() {
  const r = document.documentElement;
  r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
}

function AnalysisControls({ app }) {
  const loadOptions = [{ value: "", label: "All loads" }, ...UI.loadSelectionOptions(app.model)];
  return h(
    F,
    null,
    toolButton(app.analysis === "linear", () => app.chooseAnalysis("linear"), "Linear"),
    toolButton(app.analysis === "nonlinear", () => app.chooseAnalysis("nonlinear"), "Nonlinear"),
    h(SV.Select, { "aria-label": "Load selection", options: loadOptions, value: app.activeLoad ?? "", onChange: app.chooseLoad }),
  );
}

function ModeControls({ app }) {
  const editing = app.mode.mode === "edit";
  return h(
    F,
    null,
    toolButton(!editing, () => app.setMode({ mode: "view", entry: null }), "Select"),
    toolButton(editing, () => app.setMode({ mode: editing ? "view" : "edit", entry: null }), "Edit geometry"),
  );
}

function PanelControls({ app }) {
  const { collapsed } = app.layout;
  const flip = (region) => app.setCollapsed(region, !collapsed[region]);
  return h(
    F,
    null,
    toolButton(!collapsed.left, () => flip("left"), "Tree", "Show or hide the model tree"),
    toolButton(!collapsed.bottom, () => flip("bottom"), "Results", "Show or hide the results"),
    toolButton(!collapsed.right, () => flip("right"), "Inspector", "Show or hide the assign panel and inspector"),
    toolButton(app.maximised, app.toggleMaximise, app.maximised ? "Restore" : "Maximise", "Hide every panel (M)"),
  );
}

export function Toolbar({ app }) {
  return h(
    F,
    null,
    h("img", { src: logoUrl, alt: "", style: { height: "var(--space-5)", width: "auto" } }),
    h("span", { className: "h3", style: { whiteSpace: "nowrap" } }, ctx.modelName),
    sep(),
    h(AnalysisControls, { app }),
    sep(),
    h(ModeControls, { app }),
    h("span", { className: "sv-toolbar__spacer" }),
    h(SV.Button, { size: "sm", variant: "ghost", disabled: !app.canUndo, onClick: app.undo }, "Undo"),
    toolButton(undefined, () => app.viewer.current?.fit(), "Fit view"),
    toolButton(undefined, () => downloadModel(app.model), "Download", "Download the edited model as model.live.json"),
    sep(),
    h(PanelControls, { app }),
    sep(),
    toolButton(undefined, toggleTheme, "Theme"),
  );
}
