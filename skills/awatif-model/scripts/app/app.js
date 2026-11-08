// The live Awatif app: the awatif-ui design system (StructViewer components,
// AwatifUI helpers, the three.js AwatifViewer) on top of Awatif's analysis
// engine (`createEngine`). Nothing here uses awatif's own UI (`@awatif/ui`,
// `createApp`); awatif only runs the mesh -> solve -> design pipeline.
//
// The app edits the authored model (plain AppConfig shape). Every edit
// re-runs the analysis and is autosaved to model.live.json.
import "./globals.js";
import "../../../awatif-ui/assets/tokens.css";
import "../../../awatif-ui/assets/components/bundle.css";
import "../../../awatif-ui/assets/components/bundle.js";
import "../../../awatif-ui/assets/awatif-ui.js";
import logoUrl from "../../../awatif-ui/assets/logo.svg?url";
import { createViewer } from "../../../awatif-ui/assets/awatif-viewer.js";
import { createRoot } from "react-dom/client";
import { ComponentsType, initTriangleMesh } from "@awatif/components";
import { createEngine } from "../engine.ts";
import { modelModule, exportName, modelName } from "virtual:awatif-app-config";
import {
  COMPONENT_FIELDS,
  FIELD_LABELS,
  allNames,
  applyEdit,
  assignGeometry,
  normalize,
  pickConfig,
  renameLoadCase,
  summarize,
  uniqueName,
  utilizationStatus,
} from "./model.js";

const React = window.React;
const SV = window.StructViewer;
const UI = window.AwatifUI;
const h = React.createElement;
const F = React.Fragment;
const { useState, useEffect, useRef, useMemo } = React;

const FIELD_TYPE = {
  gridLines: ComponentsType.GRID_LINES,
  loads: ComponentsType.LOADS,
  supports: ComponentsType.SUPPORTS,
  releases: ComponentsType.RELEASES,
  localAxes: ComponentsType.LOCAL_AXES,
  imperfections: ComponentsType.IMPERFECTIONS,
  mesh: ComponentsType.MESH,
  design: ComponentsType.DESIGN,
};

// ---------- engine ----------

const config = pickConfig(modelModule, exportName);
// Polygons drawn in the app need the Triangle mesher even if the file has none
await initTriangleMesh();
const initialModel = normalize(config);
const engine = await createEngine({ ...config, ...initialModel });
const extra = config.extraComponents ? { extraComponents: config.extraComponents } : {};
const workPlane = config.display?.workPlane ?? "XZ";
const workPlaneOffset = config.display?.workPlaneOffset ?? 0;

const templatesOf = (field) => engine.templates.get(FIELD_TYPE[field]) ?? new Map();
const templateById = new Map();
COMPONENT_FIELDS.forEach((f) => templatesOf(f).forEach((t, id) => templateById.set(id, t)));
const templateLabel = (id) => UI.TEMPLATE_NAMES[id] ?? templateById.get(id)?.name ?? id;

// Which geometry an entry's ids refer to, from its template
function kindOf(entry) {
  if (entry.templateId === "grid-system") return null;
  return templateById.get(entry.templateId)?.geometryKind ?? "line";
}

function primitiveDefaults(templateId) {
  const out = {};
  Object.entries(templateById.get(templateId)?.defaultParams ?? {}).forEach(([k, v]) => {
    if (["number", "string", "boolean"].includes(typeof v)) out[k] = v;
  });
  return out;
}

// The model as the inspector shows it: template defaults filled in, so every param is editable
function withDefaults(model) {
  const out = { ...model };
  COMPONENT_FIELDS.forEach((f) => {
    out[f] = model[f].map((e) =>
      e.templateId === "grid-system" ? e : { ...e, params: { ...primitiveDefaults(e.templateId), ...e.params } },
    );
  });
  return out;
}

// ---------- autosave ----------

let saveTimer;
function save(model) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/__awatif/live", { method: "POST", body: JSON.stringify(model) }).catch(() => {});
  }, 500);
}

// ---------- formatting ----------

const num = (v, d = 2) => (v == null || Number.isNaN(v) ? "" : (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d).replace("-", "−"));
const KIND_LABEL = { point: "Points", line: "Lines", polygon: "Polygons" };

function App() {
  const [model, setModelState] = useState(initialModel);
  const [results, setResults] = useState(() => engine.getAll());
  const [pending, setPending] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [selId, setSelId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [mode, setMode] = useState({ mode: "view", entry: null });
  const [activeLoad, setActiveLoad] = useState(() => engine.getAll().activeLoad);
  const [analysis, setAnalysis] = useState(() => engine.getAll().analysis);
  const [tab, setTab] = useState("reactions");
  const [display, setDisplay] = useState({ deformed: true, reactions: true, loads: true, scale: 1 });
  const [version, setVersion] = useState(0);

  const host = useRef(null);
  const viewer = useRef(null);
  const modelRef = useRef(model);
  const history = useRef([]);
  const coalesce = useRef(null);
  const activeLoadRef = useRef(activeLoad);
  activeLoadRef.current = activeLoad;
  const latest = useRef({});
  // The inspector remounts (refreshing its inputs) on a new selection or an outside edit,
  // but not when renaming a case or combination changes its id under the cursor
  const inspector = useRef({ sel: null, n: 0, renaming: false });
  if (selId !== inspector.current.sel) {
    if (!inspector.current.renaming) inspector.current.n++;
    inspector.current.sel = selId;
    inspector.current.renaming = false;
  }

  // Record an edit. Edits with a coalesce key (typing in the inspector) merge into one undo step.
  function commit(next, key) {
    const now = Date.now();
    const merge = key && coalesce.current && coalesce.current.key === key && now - coalesce.current.t < 1500;
    if (!merge) history.current.push(modelRef.current);
    if (history.current.length > 200) history.current.shift();
    coalesce.current = key ? { key, t: now } : null;
    modelRef.current = next;
    setModelState(next);
    if (!key) setVersion((v) => v + 1);
  }

  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    coalesce.current = null;
    modelRef.current = prev;
    setModelState(prev);
    setVersion((v) => v + 1);
  }

  function select(id) {
    setSelId(id);
    if (mode.mode === "assign" && id !== mode.entry) setMode({ mode: "view", entry: null });
  }

  latest.current = { model, mode, commit, select };

  // ---------- viewer ----------
  useEffect(() => {
    viewer.current = createViewer(host.current, initialModel, {
      geometryKind: kindOf,
      workPlane,
      workPlaneOffset,
      onSelect: (id) => latest.current.select(id),
      onHover: setHoverId,
      onModeExit: () => setMode({ mode: "view", entry: null }),
      onAssign: (ids, add) => {
        const { model, mode, commit } = latest.current;
        const p = mode.entry && UI.parseId(mode.entry);
        if (!p || p.kind !== "entry") return;
        commit(assignGeometry(model, p.field, p.index, ids, add));
      },
      onEdit: (op) => {
        const { model, commit } = latest.current;
        const { model: next, created } = applyEdit(model, op, kindOf);
        commit(next);
        if (created) setSelId(created);
        else if (op.type === "move-point") setSelId("point-" + op.id);
      },
    });
    viewer.current.setLoadSelection(activeLoadRef.current);
    if (window.onViewerReady) window.onViewerReady(host.current, viewer.current);
    const unsubscribe = engine.subscribe((r) => {
      setResults(r);
      setPending(false);
    });
    return () => {
      unsubscribe();
      viewer.current.dispose();
    };
  }, []);

  // Every model change: redraw, re-run the analysis, autosave
  const firstRun = useRef(true);
  useEffect(() => {
    viewer.current?.setModel(model);
    save(model);
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    // The toolbar's load selection is the source of truth; it falls back to all
    // loads when its case or combination was deleted
    let want = activeLoadRef.current;
    if (want && !model.loadCases.includes(want) && !model.loadCombinations.some((c) => c.name === want)) {
      want = null;
      setActiveLoad(null);
    }
    try {
      engine.setModel({ ...model, ...extra });
      engine.setActiveLoad(want);
      setEngineError(null);
      setPending(true);
    } catch (e) {
      setEngineError(e instanceof Error ? e.message : String(e));
    }
  }, [model]);

  useEffect(() => viewer.current?.select(mode.mode === "assign" ? mode.entry : selId), [selId, mode]);
  useEffect(() => {
    const p = mode.entry && UI.parseId(mode.entry);
    const entry = p && p.kind === "entry" ? model[p.field]?.[p.index] : null;
    viewer.current?.setMode(mode.mode, { kind: entry ? kindOf(entry) : undefined });
  }, [mode]);
  useEffect(() => viewer.current?.setLoadSelection(activeLoad), [activeLoad]);
  useEffect(() => viewer.current?.setDisplay({ loads: display.loads }), [display.loads]);
  useEffect(() => {
    const ok = results.status?.success;
    viewer.current?.setResults(
      ok ? { nodes: results.nodes, elements: results.elements, displacements: results.displacements, reactions: results.reactions } : null,
      { deformed: display.deformed, reactions: display.reactions, scale: display.scale },
    );
  }, [results, display.deformed, display.reactions, display.scale]);

  // Ctrl+Z undoes (outside text fields, which keep their own undo); Escape leaves edit mode
  useEffect(() => {
    const onKey = (ev) => {
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName);
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z" && !ev.shiftKey && !typing) {
        ev.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const summary = useMemo(() => summarize(results, model), [results]);

  // ---------- load selection and analysis ----------
  function chooseLoad(value) {
    const name = value || null;
    try {
      engine.setActiveLoad(name);
      setActiveLoad(name);
      setPending(true);
    } catch (e) {
      setEngineError(e instanceof Error ? e.message : String(e));
    }
  }

  function chooseAnalysis(value) {
    engine.setAnalysis(value);
    setAnalysis(value);
    setPending(true);
  }

  // ---------- creating and deleting ----------
  function addItem(value) {
    if (!value) return;
    if (value === "case") {
      const name = uniqueName(allNames(model), "Case");
      commit({ ...model, loadCases: [...model.loadCases, name] });
      setSelId("case-" + name);
      return;
    }
    if (value === "combo") {
      const name = uniqueName(allNames(model), "Combination");
      const factors = Object.fromEntries(model.loadCases.map((n) => [n, 1]));
      commit({ ...model, loadCombinations: [...model.loadCombinations, { name, factors }] });
      setSelId("combo-" + name);
      return;
    }
    const [field, templateId] = value.split("|");
    const entry = {
      name: uniqueName(allNames(model), templateLabel(templateId)),
      templateId,
      geometry: [],
      params: templateId === "grid-system" ? { x: [], y: [], z: [] } : primitiveDefaults(templateId),
    };
    if (field === "loads") {
      const loadCase = model.loadCases.includes(activeLoad) ? activeLoad : model.loadCases[0];
      if (loadCase) entry.loadCase = loadCase;
    }
    const next = { ...model, [field]: [...model[field], entry] };
    commit(next);
    const id = field + "-" + (next[field].length - 1);
    setSelId(id);
    if (kindOf(entry)) setMode({ mode: "assign", entry: id });
  }

  function deleteSelected() {
    const p = UI.parseId(selId);
    if (!p) return;
    if (p.kind === "entry") commit({ ...model, [p.field]: model[p.field].filter((_, i) => i !== p.index) });
    else if (p.kind === "combo") commit({ ...model, loadCombinations: model.loadCombinations.filter((c) => c.name !== p.name) });
    else if (p.kind === "case")
      commit({
        ...model,
        loadCases: model.loadCases.filter((n) => n !== p.name),
        loadCombinations: model.loadCombinations.map((c) => {
          const factors = { ...c.factors };
          delete factors[p.name];
          return { ...c, factors };
        }),
      });
    else if (p.kind === "point") commit(applyEdit(model, { type: "delete-point", id: p.id }, kindOf).model);
    else if (p.kind === "line") commit(applyEdit(model, { type: "delete-line", id: p.id }, kindOf).model);
    else if (p.kind === "polygon") commit({ ...model, polygons: model.polygons.filter(([id]) => id !== p.id) });
    setSelId(null);
    setMode({ mode: "view", entry: null });
  }

  // ---------- inspector edits ----------
  function onInspectorChange(key, value) {
    const p = UI.parseId(selId);
    if (!p) return;
    const coalesceKey = selId + "|" + key;
    const asNumber = (v) => (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

    if (p.kind === "point") {
      const axis = { __x: 0, __y: 1, __z: 2 }[key];
      const v = asNumber(value);
      if (axis === undefined || v === null) return;
      commit(
        { ...model, points: model.points.map(([id, pt]) => [id, id === p.id ? pt.map((c, i) => (i === axis ? v : c)) : pt]) },
        coalesceKey,
      );
      return;
    }

    if (key === "__name") {
      const name = String(value).trim();
      if (!name) return;
      if (p.kind === "case") {
        if (allNames(model).includes(name)) return;
        commit(renameLoadCase(model, p.name, name), coalesceKey + name);
        if (activeLoad === p.name) setActiveLoad(name);
        inspector.current.renaming = true;
        setSelId("case-" + name);
      } else if (p.kind === "combo") {
        if (allNames(model).includes(name)) return;
        commit(
          { ...model, loadCombinations: model.loadCombinations.map((c) => (c.name === p.name ? { ...c, name } : c)) },
          coalesceKey + name,
        );
        if (activeLoad === p.name) setActiveLoad(name);
        inspector.current.renaming = true;
        setSelId("combo-" + name);
      } else if (p.kind === "entry") {
        commit({ ...model, [p.field]: model[p.field].map((e, i) => (i === p.index ? { ...e, name } : e)) }, coalesceKey);
      }
      return;
    }

    if (p.kind === "combo") {
      const v = asNumber(value);
      if (v === null) return;
      commit(
        {
          ...model,
          loadCombinations: model.loadCombinations.map((c) =>
            c.name === p.name ? { ...c, factors: { ...c.factors, [key]: v } } : c,
          ),
        },
        coalesceKey,
      );
      return;
    }

    if (p.kind !== "entry") return;
    const entry = model[p.field][p.index];
    if (!entry) return;
    let next;
    if (key === "loadCase") next = { ...entry, loadCase: value };
    else {
      const current = { ...primitiveDefaults(entry.templateId), ...entry.params }[key];
      let v = value;
      if (typeof current === "number") {
        v = asNumber(value);
        if (v === null) return;
      }
      next = { ...entry, params: { ...entry.params, [key]: v } };
    }
    commit({ ...model, [p.field]: model[p.field].map((e, i) => (i === p.index ? next : e)) }, coalesceKey);
  }

  // ---------- regions ----------
  const dim = { color: "var(--ink-muted)" };
  const loadOptions = [{ value: "", label: "All loads" }, ...UI.loadSelectionOptions(model)];
  const editing = mode.mode === "edit";

  const toolbar = h(
    F,
    null,
    h("img", { src: logoUrl, alt: "", style: { height: "var(--space-5)", width: "auto" } }),
    h("span", { className: "h3" }, modelName),
    h("span", { className: "sv-toolbar__sep" }),
    h(SV.Button, { size: "sm", variant: "ghost", pressed: analysis === "linear", onClick: () => chooseAnalysis("linear") }, "Linear"),
    h(SV.Button, { size: "sm", variant: "ghost", pressed: analysis === "nonlinear", onClick: () => chooseAnalysis("nonlinear") }, "Nonlinear"),
    h(SV.Select, { "aria-label": "Load selection", options: loadOptions, value: activeLoad ?? "", onChange: chooseLoad }),
    h("span", { className: "sv-toolbar__sep" }),
    h(SV.Button, { size: "sm", variant: "ghost", pressed: !editing, onClick: () => setMode({ mode: "view", entry: null }) }, "Select"),
    h(SV.Button, { size: "sm", variant: "ghost", pressed: editing, onClick: () => setMode({ mode: editing ? "view" : "edit", entry: null }) }, "Edit geometry"),
    h("span", { className: "sv-toolbar__spacer" }),
    h(SV.Button, { size: "sm", variant: "ghost", disabled: !history.current.length, onClick: undo }, "Undo"),
    h(SV.Button, { size: "sm", variant: "ghost", onClick: () => viewer.current?.fit() }, "Fit view"),
    h(
      SV.Button,
      {
        size: "sm",
        variant: "ghost",
        onClick: () => {
          const r = document.documentElement;
          r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
        },
      },
      "Theme",
    ),
  );

  // Model tree, with an "Add" menu for load cases, combinations and component entries
  const tree = UI.buildTree(model);
  const addOptions = [
    { value: "", label: "Add" },
    { label: "Loading", options: [{ value: "case", label: "Load case" }, ...(model.loadCases.length ? [{ value: "combo", label: "Load combination" }] : [])] },
    ...COMPONENT_FIELDS.map((f) => ({
      label: FIELD_LABELS[f],
      options: [...templatesOf(f).keys()].map((id) => ({ value: f + "|" + id, label: templateLabel(id) })),
    })).filter((g) => g.options.length),
  ];
  const left = h(
    SV.Panel,
    { title: "Model", flush: true, actions: h(SV.Select, { "aria-label": "Add to model", options: addOptions, value: "", onChange: addItem }) },
    h(SV.TreeView, {
      key: tree.map((g) => g.id).join(","),
      nodes: tree,
      selectedId: mode.mode === "assign" ? mode.entry : selId,
      defaultExpanded: tree.map((g) => g.id).filter((id) => id !== "geometry"),
      onSelect: (id) => select(id),
    }),
  );

  const right = h(SV.Panel, { title: "Inspector", flush: true }, inspectorBody());

  function inspectorBody() {
    if (!selId) return h("p", { className: "ui", style: { margin: 0, padding: "var(--space-3)", ...dim } }, "Select an item in the model tree or the viewport.");
    const ins = UI.inspector(withDefaults(model), selId);
    const p = UI.parseId(selId);
    if (!p || !ins.groups) return null;
    if (ins.title === "Nothing selected") return h("p", { className: "ui", style: { margin: 0, padding: "var(--space-3)", ...dim } }, "This item no longer exists.");
    let groups = ins.groups.map((g) => ({ ...g, rows: [...g.rows] }));
    const nameRow = { label: "Name", value: ins.title, control: "input", key: "__name" };
    let entry = null;
    let kind = null;

    if (p.kind === "point") {
      groups[0].rows = groups[0].rows.map((r) => ({ ...r, control: "input", key: "__" + r.label }));
      const d = summary?.displacements.find((x) => x.point === p.id);
      if (d) groups.push({ title: "Displacement", rows: ["ux", "uy", "uz"].map((k) => ({ label: k, value: num(d[k], 5), unit: "m", numeric: true })) });
      const r = summary?.reactions.find((x) => x.point === p.id);
      if (r)
        groups.push({
          title: "Reaction",
          rows: [
            ...["Fx", "Fy", "Fz"].map((k) => ({ label: k, value: num(r[k]), unit: "kN", numeric: true })),
            ...["Mx", "My", "Mz"].map((k) => ({ label: k, value: num(r[k]), unit: "kN·m", numeric: true })),
          ],
        });
    } else if (p.kind === "line") {
      const f = summary?.lines.find((x) => x.line === p.id);
      if (f)
        groups.push({
          title: "Internal forces (governing)",
          rows: [
            ...["N", "Vy", "Vz"].map((k) => ({ label: k, value: num(f[k]), unit: "kN", numeric: true })),
            ...["Mx", "My", "Mz"].map((k) => ({ label: k, value: num(f[k]), unit: "kN·m", numeric: true })),
          ],
        });
      const d = summary?.designs.find((x) => x.line === p.id);
      groups.push({ title: "Design", rows: designRows(d && d.design, model.design.find((e) => e.geometry.includes(p.id))) });
    } else if (p.kind === "case" || p.kind === "combo") {
      groups.unshift({ title: "General", rows: [nameRow] });
    } else if (p.kind === "entry") {
      entry = model[p.field]?.[p.index];
      kind = entry && kindOf(entry);
      let assign = groups.find((g) => g.title === "Assignment");
      if (!assign) {
        assign = { title: "Assignment", rows: [] };
        groups.unshift(assign);
      }
      if (kind && !entry.geometry.length) assign.rows.unshift({ label: KIND_LABEL[kind], value: "None" });
      assign.rows.unshift(nameRow);
      if (p.field === "design" && summary) {
        const ds = summary.designs.filter((x) => entry.geometry.includes(x.line) && kind === "line");
        const worst = ds.reduce((w, x) => (utilizationStatus(x.design).u ?? -1) > (utilizationStatus(w?.design).u ?? -1) ? x : w, null);
        groups.push({ title: "Design", rows: designRows(worst && worst.design, entry, worst && worst.line) });
      }
    }

    const assigning = mode.mode === "assign" && mode.entry === selId;
    const caseInUse = p.kind === "case" && model.loads.some((e) => e.loadCase === p.name);
    const actions = h(
      "div",
      { style: { display: "flex", flexWrap: "wrap", gap: "var(--space-2)", padding: "var(--space-3)", borderBottom: "1px solid var(--border)" } },
      kind
        ? h(SV.Button, { size: "sm", variant: assigning ? "primary" : "secondary", pressed: assigning, onClick: () => setMode(assigning ? { mode: "view", entry: null } : { mode: "assign", entry: selId }) }, assigning ? "Done" : "Select " + KIND_LABEL[kind].toLowerCase())
        : null,
      h(SV.Button, { size: "sm", variant: "danger", disabled: caseInUse, title: caseInUse ? "Remove or move its loads first" : undefined, onClick: deleteSelected }, "Delete"),
    );

    return h(
      F,
      null,
      h(
        "div",
        { style: { padding: "var(--space-3)", borderBottom: "1px solid var(--border)" } },
        h("div", { className: "h3" }, ins.title),
        h("div", { className: "caption", style: dim }, ins.sub),
      ),
      actions,
      assigning
        ? h(
            "p",
            { className: "caption", style: { margin: 0, padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border)", ...dim } },
            `Drag left to right to add ${KIND_LABEL[kind].toLowerCase()}, right to left to remove. Click toggles one. Right-click or Esc to finish.`,
          )
        : null,
      h(SV.PropertyGrid, { key: inspector.current.n + ":" + version, groups, onChange: onInspectorChange }),
    );
  }

  function designRows(design, entry, line) {
    const st = utilizationStatus(design);
    const rows = [];
    if (entry) rows.push({ label: "Member", value: entry.name });
    if (line != null) rows.push({ label: "Governing line", value: "Line " + line });
    rows.push({ label: "Utilization", value: st.u === null ? "–" : num(st.u), numeric: true });
    rows.push({ label: "Status", value: h(SV.StatusBadge, { status: st.status }, st.word) });
    return rows;
  }

  // Results drawer
  const designEntryOf = (line) => model.design.find((e) => kindOf(e) === "line" && e.geometry.includes(line));
  const tabs = [
    { id: "reactions", label: "Reactions", meta: summary?.reactions.length ?? 0 },
    { id: "displacements", label: "Displacements", meta: summary?.displacements.length ?? 0 },
    { id: "forces", label: "Line forces", meta: summary?.lines.length ?? 0 },
    { id: "design", label: "Design", meta: summary?.designs.length ?? 0 },
  ];
  const kN = (key) => ({ key, label: key, unit: "kN", numeric: true, render: (v) => num(v) });
  const kNm = (key) => ({ key, label: key, unit: "kN·m", numeric: true, render: (v) => num(v) });
  const m = (key) => ({ key, label: key, unit: "m", numeric: true, render: (v) => num(v, 5) });
  let table;
  if (!summary)
    table = h("p", { className: "ui", style: { margin: 0, padding: "var(--space-3)", ...dim } }, results.status?.error ? "No results: " + results.status.error : "No results yet.");
  else if (tab === "reactions")
    table = h(SV.DataTable, {
      density: "compact",
      columns: [{ key: "label", label: "Point" }, kN("Fx"), kN("Fy"), kN("Fz"), kNm("Mx"), kNm("My"), kNm("Mz")],
      rows: summary.reactions.map((r) => ({ ...r, id: "point-" + r.point, label: "Point " + r.point })),
      selectedId: selId,
      onSelect: select,
    });
  else if (tab === "displacements")
    table = h(SV.DataTable, {
      density: "compact",
      columns: [{ key: "label", label: "Point" }, m("ux"), m("uy"), m("uz")],
      rows: summary.displacements.map((r) => ({ ...r, id: "point-" + r.point, label: "Point " + r.point })),
      selectedId: selId,
      onSelect: select,
    });
  else if (tab === "forces")
    table = h(SV.DataTable, {
      density: "compact",
      columns: [{ key: "label", label: "Line" }, kN("N"), kN("Vy"), kN("Vz"), kNm("Mx"), kNm("My"), kNm("Mz")],
      rows: summary.lines.map((r) => ({ ...r, id: "line-" + r.line, label: "Line " + r.line })),
      selectedId: selId,
      onSelect: select,
    });
  else
    table = h(SV.DataTable, {
      density: "compact",
      columns: [
        { key: "label", label: "Line" },
        { key: "member", label: "Member" },
        { key: "template", label: "Template" },
        { key: "u", label: "Utilization", numeric: true, render: (v) => (v === null ? "–" : num(v)) },
        { key: "status", label: "Status", render: (_, r) => h(SV.StatusBadge, { status: r.st.status }, r.st.word) },
      ],
      rows: summary.designs.map(({ line, design }) => {
        const e = designEntryOf(line);
        const st = utilizationStatus(design);
        return { id: "line-" + line, label: "Line " + line, member: e?.name ?? "", template: e ? templateLabel(e.templateId) : "", u: st.u, st };
      }),
      selectedId: selId,
      onSelect: select,
    });
  const bottom = h(
    F,
    null,
    h(SV.Tabs, { tabs, value: tab, onChange: setTab }),
    h("div", { style: { flex: 1, minHeight: 0, overflow: "auto" } }, table),
  );

  // Display options, floating over the viewport
  const toggle = (key, text) => h(SV.Checkbox, { checked: display[key], onChange: (v) => setDisplay((d) => ({ ...d, [key]: v })) }, text);
  const scale = viewer.current?.deformationScale() ?? 0;
  const overlay = h(
    "div",
    {
      className: "ui",
      style: { display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: "var(--space-3)", background: "var(--surface-raised)", boxShadow: "var(--shadow-float)", borderRadius: "var(--radius-lg)", color: "var(--ink)" },
    },
    h("span", { className: "overline sv-caps", style: dim }, "Display"),
    toggle("deformed", "Deformed shape"),
    toggle("reactions", "Reactions"),
    toggle("loads", "Loads"),
    display.deformed
      ? h(SV.Select, {
          "aria-label": "Deformation scale",
          options: [0.5, 1, 2, 5, 10].map((v) => ({ value: String(v), label: "Scale ×" + v })),
          value: String(display.scale),
          onChange: (v) => setDisplay((d) => ({ ...d, scale: Number(v) })),
        })
      : null,
    display.deformed && scale ? h("span", { className: "caption", style: dim }, "Displacements drawn ×" + num(scale, 0)) : null,
  );

  // Status bar: status = icon + word + color
  const status = results.status ?? {};
  let badge;
  if (engineError) badge = h(SV.StatusBadge, { status: "fail" }, "Failed: " + engineError);
  else if (pending || status.loading) badge = h(SV.StatusBadge, { status: "info" }, "Running");
  else if (!status.success) badge = h(SV.StatusBadge, { status: "fail" }, "Failed: " + (status.error ?? "analysis error"));
  else badge = h(SV.StatusBadge, { status: "ok" }, "Analysed" + (status.iterations ? ` (${status.iterations} iterations)` : ""));
  const hint =
    mode.mode === "assign"
      ? "Box left to right adds, right to left removes; right-click or Esc to finish"
      : editing
        ? "Drag a point to move it, click to add a point, click a point then a target to draw a line, right-click to delete"
        : "Drag to orbit, right-drag to pan, scroll to zoom, double-click to fit";
  const maxU = summary?.maxDisplacement;
  const statusbar = h(
    F,
    null,
    badge,
    status.unassignedLines?.length && !engineError
      ? h(SV.StatusBadge, { status: "warn" }, "No design entry: lines " + status.unassignedLines.join(", "))
      : null,
    maxU && maxU.u > 0 ? h("span", { className: "data" }, "Max displacement " + num(maxU.u, 5) + " m") : null,
    h("span", null, selId ? "Selected: " + selId : "Nothing selected"),
    hoverId ? h("span", { style: dim }, "Hover: " + hoverId) : null,
    h("span", { style: { flex: 1 } }),
    h("span", { style: dim }, hint),
    h("span", null, "Units: m, kN"),
  );

  return h(
    SV.AppShell,
    { toolbar, left, right, bottom, statusbar, overlays: { topRight: overlay } },
    h("div", { id: "viewport", ref: host, style: { position: "absolute", inset: 0, background: "var(--viewport)" } }),
  );
}

document.title = modelName + " · Awatif";
createRoot(document.getElementById("root")).render(h(App));
