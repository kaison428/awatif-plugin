// Turning an AppConfig into the authored model the app edits (what model.live.json holds).
import { COMPONENT_FIELDS } from "./fields.js";

// The exported AppConfig: `--export <name>`, the default export, or the only config
export function pickConfig(module, name) {
  if (name) {
    if (!(name in module)) throw new Error(`"${name}" is not exported by the model`);
    return module[name];
  }
  if (module.default) return module.default;
  const configs = Object.values(module).filter(
    (v) => v && typeof v === "object" && ("points" in v || "lines" in v),
  );
  if (configs.length !== 1)
    throw new Error(
      `Expected one exported AppConfig, found ${configs.length}; pass --export <name>`,
    );
  return configs[0];
}

// Ided<T> -> [id, T][] (a plain list gets 1-based ids, like awatif's toIdedMap)
export function toPairs(ided) {
  if (!ided) return [];
  if (ided instanceof Map) return [...ided.entries()];
  const pairs =
    ided.length > 0 && ided.every((e) => Array.isArray(e) && e.length === 2 && Array.isArray(e[1]));
  return pairs ? ided.map(([id, v]) => [id, [...v]]) : ided.map((v, i) => [i + 1, [...v]]);
}

// The authored model the app edits: geometry as [id, value] pairs, component
// entries with load case names. It is what model.live.json holds.
export function normalize(config) {
  const model = {
    points: toPairs(config.points),
    lines: toPairs(config.lines),
    polygons: toPairs(config.polygons),
    loadCases: [...(config.loadCases ?? [])],
    loadCombinations: (config.loadCombinations ?? []).map((c) => ({
      name: c.name,
      factors: { ...c.factors },
    })),
  };
  for (const field of COMPONENT_FIELDS)
    model[field] = (config[field] ?? []).map((e) => ({
      ...e,
      geometry: [...(e.geometry ?? [])],
      ...(e.params ? { params: { ...e.params } } : {}),
    }));
  return model;
}
