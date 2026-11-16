// What analyze.mjs reports: results per authored point and line in the
// model's own ids (results.json), and the printed summary.

function displacementsOf(results) {
  const out = [];
  results.geometryMapping.pointToNodes.forEach((nodes, point) => {
    const node = nodes[0];
    const d = results.displacements.slice(node * 3, node * 3 + 3);
    if (d.length === 3) out.push({ point, ux: d[0], uy: d[1], uz: d[2] });
  });
  return out;
}

function reactionsOf(results, config) {
  const supported = new Set((config.supports ?? []).flatMap((s) => s.geometry));
  const out = [];
  results.geometryMapping.pointToNodes.forEach((nodes, point) => {
    const r = supported.has(point) && results.reactions[nodes[0]];
    if (!r) return;
    const [Fx, Fy, Fz, Mx, My, Mz] = r;
    out.push({ point, Fx, Fy, Fz, Mx, My, Mz });
  });
  return out;
}

// min / max of each internal force along each line
function lineEnvelopesOf(results) {
  const out = [];
  results.geometryMapping.lineToElements.forEach((elements, line) => {
    const forces = elements.map((e) => results.internalForces.get(e)).filter(Boolean);
    if (!forces.length) return;
    const envelope = {};
    for (const key of ["N", "Vy", "Vz", "Mx", "My", "Mz"]) {
      const values = forces.flatMap((f) => f[key]);
      envelope[key] = { min: Math.min(...values), max: Math.max(...values) };
    }
    out.push({ line, ...envelope });
  });
  return out;
}

// Over every mesh node, since peaks fall between authored points
function maxDisplacementOf(results) {
  const max = { position: null, u: 0 };
  results.nodes.forEach((position, node) => {
    const [ux, uy, uz] = results.displacements.slice(node * 3, node * 3 + 3);
    const u = Math.hypot(ux, uy, uz);
    if (u > max.u) Object.assign(max, { position, u, ux, uy, uz });
  });
  return max;
}

export function summarize(results, config) {
  const designs = [];
  results.designs.forEach((design, line) => designs.push({ line, ...design }));
  return {
    load: results.activeLoad,
    analysis: results.analysis,
    status: results.status,
    maxDisplacement: maxDisplacementOf(results),
    reactions: reactionsOf(results, config),
    displacements: displacementsOf(results),
    lines: lineEnvelopesOf(results),
    designs,
  };
}

const f = (n) => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(3);

function printMaxDisplacement(m) {
  console.log(
    m.position === null
      ? "Max displacement: 0 mm"
      : `Max displacement: ${(m.u * 1000).toFixed(2)} mm at (${m.position.map((c) => c.toFixed(2)).join(", ")}) m`,
  );
}

function printReactions(reactions) {
  console.log("Reactions [kN, kNm]:");
  const sum = [0, 0, 0];
  for (const r of reactions) {
    console.log(`  Point ${r.point}: Fx ${f(r.Fx)}  Fy ${f(r.Fy)}  Fz ${f(r.Fz)}  Mx ${f(r.Mx)}  My ${f(r.My)}  Mz ${f(r.Mz)}`);
    sum[0] += r.Fx;
    sum[1] += r.Fy;
    sum[2] += r.Fz;
  }
  console.log(`  Sum: Fx ${f(sum[0])}  Fy ${f(sum[1])}  Fz ${f(sum[2])}`);
}

function printLines(lines) {
  console.log("Line force envelopes [kN, kNm] (min / max):");
  for (const l of lines) {
    const cell = (k) => `${k} ${f(l[k].min)}/${f(l[k].max)}`;
    console.log(`  Line ${l.line}: ${["N", "Vz", "My", "Vy", "Mz", "Mx"].map(cell).join("  ")}`);
  }
}

function printRun(run) {
  const label = run.load ?? "All loads";
  if (!run.status.success) return console.log(`\n## ${label}: FAILED - ${run.status.error}`);
  console.log(`\n## ${label} (${run.analysis})`);
  if (run.status.unassignedLines?.length) console.log(`Warning: lines without a design entry: ${run.status.unassignedLines.join(", ")}`);
  printMaxDisplacement(run.maxDisplacement);
  printReactions(run.reactions);
  printLines(run.lines);
}

export function print(runs, out) {
  runs.forEach(printRun);
  console.log(`\nFull results: ${out}`);
}
