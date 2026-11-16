// Panel layout state: collapsed regions, sizes, open panels and groups.
import { loadLayout, saveLayout } from "../layout.js";
import { useEffect, useState } from "../ui.js";

export function useLayout() {
  const [layout, setLayout] = useState(loadLayout);
  useEffect(() => saveLayout(layout), [layout]);

  const update = (key, name, value) => setLayout((l) => ({ ...l, [key]: { ...l[key], [name]: value } }));
  const maximised = layout.collapsed.left && layout.collapsed.right && layout.collapsed.bottom;

  return {
    layout,
    maximised,
    setCollapsed: (region, value) => update("collapsed", region, value),
    setPanel: (name, value) => update("panels", name, value),
    setGroup: (name, value) => update("groups", name, value),
    setSize: (region, px) => update("sizes", region, px),
    groupOpen: (name) => layout.groups[name] !== false,
    toggleMaximise: () => setLayout((l) => ({ ...l, collapsed: { left: !maximised, right: !maximised, bottom: !maximised } })),
  };
}
