// Geometry and naming edits on the authored model. Pure: each returns a new model.
import { COMPONENT_FIELDS } from "./fields.js";
import { allNames, uniqueName } from "./names.js";

const nextId = (pairs) => pairs.reduce((m, [id]) => Math.max(m, id), 0) + 1;

// Drop geometry ids of `kind` from every entry that refers to that kind
function dropFromEntries(model, kind, ids, kindOf) {
  const out = { ...model };
  for (const field of COMPONENT_FIELDS)
    out[field] = model[field].map((e) =>
      kindOf(e) === kind && e.geometry.some((g) => ids.has(g))
        ? { ...e, geometry: e.geometry.filter((g) => !ids.has(g)) }
        : e,
    );
  return out;
}

// Geometry edits from the viewer's edit mode. Returns the new model, and the
// id of what was created, if anything.
export function applyEdit(model, op, kindOf) {
  switch (op.type) {
    case "move-point":
      return {
        model: { ...model, points: model.points.map(([id, p]) => [id, id === op.id ? op.xyz : p]) },
      };
    case "add-point": {
      const id = nextId(model.points);
      return { model: { ...model, points: [...model.points, [id, op.xyz]] }, created: "point-" + id };
    }
    case "add-line": {
      let points = model.points;
      let to = op.to;
      if (to === undefined) {
        to = nextId(points);
        points = [...points, [to, op.xyz]];
      }
      if (to === op.from) return { model };
      const exists = model.lines.some(
        ([, [a, b]]) => (a === op.from && b === to) || (a === to && b === op.from),
      );
      if (exists) return { model: { ...model, points } };
      const id = nextId(model.lines);
      return {
        model: { ...model, points, lines: [...model.lines, [id, [op.from, to]]] },
        created: "line-" + id,
      };
    }
    case "delete-line": {
      const gone = new Set([op.id]);
      const next = { ...model, lines: model.lines.filter(([id]) => id !== op.id) };
      return { model: dropFromEntries(next, "line", gone, kindOf) };
    }
    case "delete-point": {
      const goneLines = new Set(
        model.lines.filter(([, l]) => l.includes(op.id)).map(([id]) => id),
      );
      const gonePolygons = new Set(
        model.polygons.filter(([, p]) => p.includes(op.id)).map(([id]) => id),
      );
      let next = {
        ...model,
        points: model.points.filter(([id]) => id !== op.id),
        lines: model.lines.filter(([id]) => !goneLines.has(id)),
        polygons: model.polygons.filter(([id]) => !gonePolygons.has(id)),
      };
      next = dropFromEntries(next, "point", new Set([op.id]), kindOf);
      next = dropFromEntries(next, "line", goneLines, kindOf);
      next = dropFromEntries(next, "polygon", gonePolygons, kindOf);
      return { model: next };
    }
    default:
      throw new Error(`Unknown edit "${op.type}"`);
  }
}

// Rename a load case everywhere it is referenced
export function renameLoadCase(model, from, to) {
  const out = {
    ...model,
    loadCases: model.loadCases.map((n) => (n === from ? to : n)),
    loadCombinations: model.loadCombinations.map((c) => {
      if (!(from in c.factors)) return c;
      const factors = {};
      Object.entries(c.factors).forEach(([k, v]) => (factors[k === from ? to : k] = v));
      return { ...c, factors };
    }),
  };
  for (const field of COMPONENT_FIELDS)
    out[field] = model[field].map((e) => (e.loadCase === from ? { ...e, loadCase: to } : e));
  return out;
}

// A copy of an entry under a new name, placed after it. Returns the model and the copy's index.
export function duplicateEntry(model, field, index) {
  const e = model[field][index];
  const copy = {
    ...e,
    name: uniqueName(allNames(model), e.name + " copy"),
    geometry: [...(e.geometry ?? [])],
    ...(e.params ? { params: JSON.parse(JSON.stringify(e.params)) } : {}),
  };
  const list = [...model[field]];
  list.splice(index + 1, 0, copy);
  return { model: { ...model, [field]: list }, index: index + 1 };
}
