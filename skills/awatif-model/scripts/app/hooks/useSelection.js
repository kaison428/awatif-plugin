// The shared selection: one item (`selId`, a tree id) and the multi-selection
// of geometry ids. Tree, viewport, tables and inspector all read these.
import { EMPTY_SELECTION, KINDS } from "../constants.js";
import { UI, useEffect, useState } from "../ui.js";

function existingIds(model) {
  return {
    point: new Set(model.points.map(([id]) => id)),
    line: new Set(model.lines.map(([id]) => id)),
    polygon: new Set(model.polygons.map(([id]) => id)),
  };
}

export function useSelection(model) {
  const [selId, setSelId] = useState(null);
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [filter, setFilter] = useState({ point: true, line: true, polygon: true });
  const [mode, setMode] = useState({ mode: "view", entry: null });

  // One item (tree, table, viewer click): a geometry item also becomes the multi-selection
  function select(id) {
    setSelId(id);
    const p = id && UI.parseId(id);
    setSelection(p && KINDS.includes(p.kind) ? { ...EMPTY_SELECTION, [p.kind]: [p.id] } : EMPTY_SELECTION);
    if (mode.mode === "assign" && id !== mode.entry) setMode({ mode: "view", entry: null });
  }

  // The multi-selection (Shift+click / Shift+drag in the viewer, typed ids in the Assign panel)
  function changeSelection(next) {
    const sel = { ...EMPTY_SELECTION, ...next };
    setSelection(sel);
    const all = KINDS.flatMap((k) => sel[k].map((id) => k + "-" + id));
    setSelId(all.length === 1 ? all[0] : null);
  }

  // Drop selected ids that no longer exist (deleted geometry, undo)
  useEffect(() => {
    const exists = existingIds(model);
    if (KINDS.some((k) => selection[k].some((id) => !exists[k].has(id))))
      setSelection((s) => Object.fromEntries(KINDS.map((k) => [k, s[k].filter((id) => exists[k].has(id))])));
  }, [model]);

  const selCount = KINDS.reduce((n, k) => n + selection[k].length, 0);
  return { selId, setSelId, selection, select, changeSelection, selCount, filter, setFilter, mode, setMode };
}
