// The app: gathers state from the hooks into one `app` object and lays out the
// six awatif-ui regions. Each region is its own component; actions live in ../actions.
import { ctx } from "../context.js";
import { useAnalysis } from "../hooks/useAnalysis.js";
import { useAssignForms } from "../hooks/useAssignForms.js";
import { useHistory } from "../hooks/useHistory.js";
import { useLayout } from "../hooks/useLayout.js";
import { useSelection } from "../hooks/useSelection.js";
import { useShortcuts } from "../hooks/useShortcuts.js";
import { useViewer } from "../hooks/useViewer.js";
import { summarize } from "../model/index.js";
import { F, SV, h, useMemo, useRef, useState } from "../ui.js";
import { AssignPanel } from "./assign/AssignPanel.js";
import { InspectorPanel } from "./inspector/InspectorPanel.js";
import { ModelTree } from "./ModelTree.js";
import { DEFAULT_DISPLAY, DisplayPanel } from "./panels/DisplayPanel.js";
import { lineResultLegend } from "./panels/Legend.js";
import { ViewPanel } from "./panels/ViewPanel.js";
import { ResultsDrawer } from "./ResultsDrawer.js";
import { StatusBar } from "./StatusBar.js";
import { Toolbar } from "./Toolbar.js";

// The inspector remounts (refreshing its inputs) on a new selection or an outside edit,
// but not when renaming a case or combination changes its id under the cursor
function useInspectorKey(selId) {
  const inspector = useRef({ sel: null, n: 0, renaming: false });
  if (selId !== inspector.current.sel) {
    if (!inspector.current.renaming) inspector.current.n++;
    inspector.current.sel = selId;
    inspector.current.renaming = false;
  }
  return inspector;
}

function useAppState() {
  const history = useHistory(ctx.initialModel);
  const selection = useSelection(history.model);
  const analysis = useAnalysis(history.model);
  const layout = useLayout();
  const forms = useAssignForms();
  const [display, setDisplay] = useState(DEFAULT_DISPLAY);
  const [view, setView] = useState(null); // null: 3D, else { plane, offset }
  const [tab, setTab] = useState("reactions");
  const inspector = useInspectorKey(selection.selId);
  const summary = useMemo(() => summarize(analysis.results, history.model), [analysis.results]);
  return { ...history, ...selection, ...analysis, ...layout, forms, display, setDisplay, view, setView, tab, setTab, inspector, summary };
}

function shellProps(app) {
  const { layout } = app;
  const px = (v) => (v ? v + "px" : undefined);
  const legend = lineResultLegend(app);
  return {
    toolbar: h(Toolbar, { app }),
    left: h(ModelTree, { app }),
    right: h(F, null, h(AssignPanel, { app }), h(InspectorPanel, { app })),
    bottom: h(ResultsDrawer, { app }),
    statusbar: h(StatusBar, { app }),
    bottomLabel: "Results",
    rightLabel: "Inspector",
    collapsed: layout.collapsed,
    onToggle: (r) => app.setCollapsed(r, !layout.collapsed[r]),
    onResize: app.setSize,
    leftWidth: px(layout.sizes.left),
    rightWidth: px(layout.sizes.right),
    bottomHeight: px(layout.sizes.bottom),
    overlays: { topLeft: h(ViewPanel, { app }), topRight: h(DisplayPanel, { app }), ...(legend ? { bottomLeft: legend } : {}) },
  };
}

export function App() {
  const app = useAppState();
  const { host, viewer, hoverId, diagram } = useViewer(app);
  Object.assign(app, { viewer, hoverId, diagram });
  useShortcuts(app);
  return h(SV.AppShell, shellProps(app), h("div", { id: "viewport", ref: host, style: { position: "absolute", inset: 0, background: "var(--viewport)" } }));
}
