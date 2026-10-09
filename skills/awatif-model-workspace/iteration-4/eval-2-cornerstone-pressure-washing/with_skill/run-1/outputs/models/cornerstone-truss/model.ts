import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" clear span steel truss building,
// section in the XZ work plane (metres). Roof slope 4:12, two W16x67 columns,
// HSS top/bottom chord Warren truss with verticals.
const ft = 0.3048;
const span = 70 * ft; // 21.336
const colTop = (16 + 8 / 12) * ft; // U/S of truss at columns, 16'-8"
const rise = (span / 2) * (4 / 12); // 4:12 slope
const depth = (3 + 1 / 12) * ft; // truss depth 3'-1"
const panels = 6; // panels per rafter side
const half = span / 2;

const points: [number, number, number][] = [];
const lines: [number, number][] = [];
const bot: number[] = []; // point ids along bottom chord, left to right
const top: number[] = [];

const add = (x: number, z: number) => points.push([x, 0, z]) && points.length;

// column bases
const baseL = add(0, 0);
const baseR = add(span, 0);

for (let i = 0; i <= 2 * panels; i++) {
  const x = (i * span) / (2 * panels);
  const slope = i <= panels ? x : span - x;
  const zb = colTop + slope * (4 / 12);
  bot.push(add(x, zb));
  top.push(add(x, zb + depth));
}

// columns
lines.push([baseL, bot[0]], [baseR, bot[2 * panels]]);
// chords
for (let i = 0; i < 2 * panels; i++) {
  lines.push([bot[i], bot[i + 1]]);
  lines.push([top[i], top[i + 1]]);
}
// verticals and alternating diagonals (Warren with verticals)
for (let i = 0; i <= 2 * panels; i++) lines.push([bot[i], top[i]]);
for (let i = 0; i < 2 * panels; i++) {
  const leftHalf = i < panels;
  const up = (i % 2 === 0) === leftHalf;
  lines.push(up ? [bot[i], top[i + 1]] : [top[i], bot[i + 1]]);
}

const all = lines.map((_, i) => i + 1);
const colLines = [1, 2];
const trussLines = all.filter((id) => id > 2);

export const cornerstoneTruss: AppConfig = {
  points,
  lines,

  gridLines: [
    {
      name: "Frame Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "A", ordinate: 0, visible: true, bubble: "end" },
          { id: "B", ordinate: span, visible: true, bubble: "end" },
        ],
        y: [{ id: "1", ordinate: 0, visible: true, bubble: "start" }],
        z: [
          { id: "Z1", ordinate: 0, visible: true, bubble: "end" },
          { id: "Z2", ordinate: colTop, visible: true, bubble: "end" },
        ],
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
      name: "Frame Mesh",
      templateId: "line-mesh",
      geometry: all,
      params: { divisions: 1 },
    },
  ],

  // Placeholders: W16x67 columns and HSS chords/webs are not supported
  design: [
    {
      name: "W16x67 Columns (placeholder)",
      templateId: "generic-member",
      geometry: colLines,
    },
    {
      name: "HSS Truss Members (placeholder)",
      templateId: "generic-member",
      geometry: trussLines,
    },
  ],
};
