import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" span steel truss building, section in
// the XZ plane. Units: m. Columns W16x67 (placeholder generic member), HSS
// truss chords/webs (placeholder generic members). No loads given.
const ft = 0.3048;
const span = 70 * ft; // 21.336
const colH = (16 + 8 / 12) * ft; // floor to underside of truss = 5.080
const colTop = (19 + 6.75 / 12) * ft; // height of column = 5.963
const depth = colTop - colH; // vertical truss depth at eaves
const rise = (span / 2) * (4 / 12); // 4:12 roof slope
const n = 8; // panels per half span

const points: [number, number, number][] = [];
const lines: [number, number][] = [];
const add = (p: [number, number, number]) => points.push(p) && points.length;

// Columns
const baseL = add([0, 0, 0]);
const baseR = add([span, 0, 0]);
// Bottom chord nodes b[0..2n], top chord nodes t[0..2n]
const b: number[] = [];
const t: number[] = [];
for (let i = 0; i <= 2 * n; i++) {
  const x = (span * i) / (2 * n);
  const z = colH + rise * (1 - Math.abs(x - span / 2) / (span / 2));
  b.push(add([x, 0, z]));
  t.push(add([x, 0, z + depth]));
}
lines.push([baseL, b[0]], [baseR, b[2 * n]]); // columns (lines 1-2)
const columnCount = lines.length;
for (let i = 0; i < 2 * n; i++) {
  lines.push([b[i], b[i + 1]]); // bottom chord
  lines.push([t[i], t[i + 1]]); // top chord
}
const chordEnd = lines.length;
// Warren webs (diagonals) plus end and ridge verticals
for (let i = 0; i < 2 * n; i += 2) {
  lines.push([b[i], t[i + 1]], [t[i + 1], b[i + 2]]);
}
for (const i of [0, n, 2 * n]) lines.push([b[i], t[i]]);
const ids = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, k) => from + k + 1);

export const cornerstonePressureWashing: AppConfig = {
  points,
  lines,

  gridLines: [
    {
      name: "Section Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "A", ordinate: 0, visible: true, bubble: "end" },
          { id: "B", ordinate: span, visible: true, bubble: "end" },
        ],
        y: [{ id: "1", ordinate: 0, visible: true, bubble: "start" }],
        z: [{ id: "Z1", ordinate: 0, visible: true, bubble: "end" }],
      },
    },
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [baseL, baseR],
      params: { type: "fixed" },
    },
  ],

  mesh: [
    {
      name: "Member Mesh",
      templateId: "line-mesh",
      geometry: ids(0, lines.length),
      params: { divisions: 1 },
    },
  ],

  design: [
    // Placeholder: W16x67 is not a supported section
    {
      name: "W16x67 Columns (placeholder)",
      templateId: "generic-member",
      geometry: ids(0, columnCount),
    },
    // Placeholder: HSS sizes not given on the drawing
    {
      name: "HSS Truss Chords (placeholder)",
      templateId: "generic-member",
      geometry: ids(columnCount, chordEnd),
    },
    {
      name: "HSS Truss Webs (placeholder)",
      templateId: "generic-member",
      geometry: ids(chordEnd, lines.length),
    },
  ],
};
