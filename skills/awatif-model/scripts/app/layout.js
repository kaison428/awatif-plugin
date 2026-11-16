// Panel layout, remembered per browser.

const LAYOUT_KEY = "awatif.layout";
const DEFAULT_LAYOUT = {
  collapsed: { left: false, right: false, bottom: false },
  sizes: {},
  panels: { view: true, display: true, assign: true, inspector: true },
  groups: {},
};

export function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
    return {
      collapsed: { ...DEFAULT_LAYOUT.collapsed, ...saved.collapsed },
      sizes: { ...saved.sizes },
      panels: { ...DEFAULT_LAYOUT.panels, ...saved.panels },
      groups: { ...saved.groups },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {}
}
