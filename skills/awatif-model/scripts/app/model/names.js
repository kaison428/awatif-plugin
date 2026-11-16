// Unique names across load cases, combinations and component entries.
import { COMPONENT_FIELDS } from "./fields.js";

export function uniqueName(taken, base) {
  const names = new Set(taken);
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`;
}

export function allNames(model) {
  return [
    ...model.loadCases,
    ...model.loadCombinations.map((c) => c.name),
    ...COMPONENT_FIELDS.flatMap((f) => model[f].map((e) => e.name)),
  ];
}
