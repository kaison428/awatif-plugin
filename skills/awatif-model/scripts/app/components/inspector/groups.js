// The inspector's PropertyGrid groups for each kind of item. AwatifUI.inspector
// gives the base groups; these add editable keys, assignments and results.
import { KIND_LABEL, RELEASE_TYPES, SUPPORT_TYPES, humanOptions } from "../../constants.js";
import { ctx } from "../../context.js";
import { num } from "../../format.js";
import { formatIdList, utilizationStatus } from "../../model/index.js";
import { designMemberRow, designRows, forceRows, loadRows, noneOption } from "./rows.js";

const typeRow = (label, key, entry, types) => ({
  label,
  value: entry ? ctx.paramsOf(entry).type ?? "" : "",
  control: "select",
  key,
  options: [noneOption, ...humanOptions(types)],
});

function pointGroups(app, p, groups) {
  const { model, summary } = app;
  groups[0].rows = groups[0].rows.map((r) => ({ ...r, control: "input", key: "__" + r.label }));
  const support = model.supports.find((e) => ctx.kindOf(e) === "point" && e.geometry.includes(p.id));
  groups.push({ title: "Assigned", rows: [typeRow("Support", "__support", support, SUPPORT_TYPES), ...loadRows(model, "point", p.id)] });
  const d = summary?.displacements.find((x) => x.point === p.id);
  if (d) groups.push({ title: "Displacement", rows: ["ux", "uy", "uz"].map((k) => ({ label: k, value: num(d[k], 5), unit: "m", numeric: true })) });
  const r = summary?.reactions.find((x) => x.point === p.id);
  if (r) groups.push({ title: "Reaction", rows: forceRows(r, ["Fx", "Fy", "Fz"], ["Mx", "My", "Mz"]) });
  return groups;
}

function lineEndRows(model, rows) {
  const pointOptions = model.points.map(([id]) => ({ value: String(id), label: "Point " + id }));
  const keys = { "Start point": "__start", "End point": "__end" };
  return rows.map((r) => (keys[r.label] ? { ...r, control: "select", key: keys[r.label], options: pointOptions } : r));
}

function meshRow(model, id) {
  if (!ctx.templateById.has("line-mesh")) return [];
  const mesh = model.mesh.find((e) => e.templateId === "line-mesh" && e.geometry.includes(id));
  return [{ label: "Mesh divisions", value: mesh ? String(ctx.paramsOf(mesh).divisions ?? "") : "", placeholder: "1", numeric: true, control: "input", key: "__mesh" }];
}

function lineGroups(app, p, groups) {
  const { model, summary } = app;
  groups[0].rows = lineEndRows(model, groups[0].rows);
  const { designIndex, row } = designMemberRow(model, "line", p.id);
  const release = model.releases.find((e) => ctx.kindOf(e) === "line" && e.geometry.includes(p.id));
  groups.push({ title: "Assigned", rows: [row, typeRow("Release", "__release", release, RELEASE_TYPES), ...meshRow(model, p.id), ...loadRows(model, "line", p.id)] });
  const f = summary?.lines.find((x) => x.line === p.id);
  if (f) groups.push({ title: "Internal forces (governing)", rows: forceRows(f, ["N", "Vy", "Vz"], ["Mx", "My", "Mz"]) });
  const d = summary?.designs.find((x) => x.line === p.id);
  groups.push({ title: "Design", rows: designRows(d && d.design, designIndex === -1 ? null : model.design[designIndex]) });
  return groups;
}

function polygonGroups(app, p, groups) {
  groups[0].rows = groups[0].rows.map((r) => (r.label === "Points" ? { ...r, control: "input", key: "__polygon" } : r));
  groups.push({ title: "Assigned", rows: [designMemberRow(app.model, "polygon", p.id).row] });
  return groups;
}

// The worst-utilized line of a design entry
function governingDesign(summary, entry, kind) {
  const ds = summary.designs.filter((x) => entry.geometry.includes(x.line) && kind === "line");
  const u = (x) => utilizationStatus(x?.design).u ?? -1;
  return ds.reduce((w, x) => (u(x) > u(w) ? x : w), null);
}

function assignmentRows(p, entry, kind, nameRow, rows) {
  const out = rows.filter((r) => r.key !== "__geometry");
  if (kind) out.unshift({ label: KIND_LABEL[kind], value: formatIdList(entry.geometry), control: "input", key: "__geometry", placeholder: "None, e.g. 1, 3, 5-8" });
  const isGrid = entry.templateId === "grid-system";
  const templates = [...ctx.templatesOf(p.field).keys()].filter((id) => (id === "grid-system") === isGrid);
  if (templates.length > 1) out.unshift({ label: "Template", value: entry.templateId, control: "select", key: "__template", options: templates.map((id) => ({ value: id, label: ctx.templateLabel(id) })) });
  out.unshift(nameRow);
  return out;
}

function entryGroups(app, p, groups, nameRow) {
  const entry = app.model[p.field]?.[p.index];
  const kind = entry && ctx.kindOf(entry);
  if (entry?.templateId === "grid-system") groups = groups.filter((g) => !["X", "Y", "Z"].includes(g.title));
  let assign = groups.find((g) => g.title === "Assignment");
  if (!assign) {
    assign = { title: "Assignment", rows: [] };
    groups.unshift(assign);
  }
  assign.rows = assignmentRows(p, entry, kind, nameRow, assign.rows);
  if (p.field === "design" && app.summary) {
    const worst = governingDesign(app.summary, entry, kind);
    groups.push({ title: "Design", rows: designRows(worst && worst.design, entry, worst && worst.line) });
  }
  return groups;
}

// The groups for selected item `p` (parsed tree id) from the base inspector `ins`
export function inspectorGroups(app, p, ins) {
  const groups = ins.groups.map((g) => ({ ...g, rows: [...g.rows] }));
  const nameRow = { label: "Name", value: ins.title, control: "input", key: "__name" };
  switch (p.kind) {
    case "point":
      return pointGroups(app, p, groups);
    case "line":
      return lineGroups(app, p, groups);
    case "polygon":
      return polygonGroups(app, p, groups);
    case "case":
    case "combo":
      return [{ title: "General", rows: [nameRow] }, ...groups];
    case "entry":
      return entryGroups(app, p, groups, nameRow);
    default:
      return groups;
  }
}
