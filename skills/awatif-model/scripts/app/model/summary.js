// Results per authored point and line, and design status. Pure.

// Results per authored point and line, in the model's own ids (as analyze.mjs reports them)
export function summarize(results, model) {
  if (!results || !results.status?.success) return null;
  const { pointToNodes, lineToElements } = results.geometryMapping;
  const supported = new Set(model.supports.flatMap((s) => s.geometry));

  const displacements = [];
  const reactions = [];
  pointToNodes.forEach((nodes, point) => {
    const node = nodes[0];
    const d = results.displacements.slice(node * 3, node * 3 + 3);
    if (d.length === 3) displacements.push({ point, ux: d[0], uy: d[1], uz: d[2] });
    const r = results.reactions[node];
    if (supported.has(point) && r) {
      const [Fx, Fy, Fz, Mx, My, Mz] = r;
      reactions.push({ point, Fx, Fy, Fz, Mx, My, Mz });
    }
  });

  // Signed value of the largest magnitude along each line
  const lines = [];
  lineToElements.forEach((elements, line) => {
    const forces = elements.map((e) => results.internalForces.get(e)).filter(Boolean);
    if (!forces.length) return;
    const row = { line };
    for (const key of ["N", "Vy", "Vz", "Mx", "My", "Mz"]) {
      const values = forces.flatMap((f) => f[key] ?? []);
      row[key] = values.reduce((g, v) => (Math.abs(v) > Math.abs(g) ? v : g), 0);
    }
    lines.push(row);
  });

  const designs = [];
  results.designs?.forEach((design, line) => designs.push({ line, design }));

  let maxDisplacement = { u: 0, point: null };
  results.nodes.forEach((_, node) => {
    const [ux, uy, uz] = results.displacements.slice(node * 3, node * 3 + 3);
    const u = Math.hypot(ux, uy, uz);
    if (u > maxDisplacement.u) maxDisplacement = { u, node };
  });

  return { displacements, reactions, lines, designs, maxDisplacement };
}

// Pass / near limit / fail, from a design's utilization
export function utilizationStatus(design) {
  const u = design && typeof design.utilization === "number" ? design.utilization : null;
  if (u === null) return { status: "neutral", word: "No check", u };
  if (u > 1) return { status: "fail", word: "Fail", u };
  if (u > 0.9) return { status: "warn", word: "Near limit", u };
  return { status: "ok", word: "Pass", u };
}
