import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" span steel building in the XZ work
// plane (units: m). Gable roof 4:12, parallel-chord truss spanning between two
// steel columns. Dimensions from the section drawing, converted from feet.
const FT = 0.3048;
const span = 70 * FT; // 21.336 m, column to column
const columnH = (16 + 8 / 12) * FT; // 5.080 m, floor to U/S of truss
const rise = (span / 2) * (4 / 12); // 3.556 m, apex above eaves
const depth = 3.083 * FT; // 3'-1" truss depth
const panels = 8; // panels per half truss (about 4'-9" web bay)
const midX = span / 2;

// Points: 1 base left, 2 base right, then bottom chord nodes, then top chord nodes
const points: [number, number, number][] = [
  [0, 0, 0],
  [span, 0, 0],
];
const n = 2 * panels + 1; // nodes per chord
const bottom: number[] = [];
const top: number[] = [];
for (let i = 0; i < n; i++) {
  const x = (i * span) / (n - 1);
  const z = columnH + rise * (1 - Math.abs(x - midX) / midX);
  points.push([x, 0, z]);
  bottom.push(points.length);
}
for (let i = 0; i < n; i++) {
  const [x, , z] = points[bottom[i] - 1];
  points.push([x, 0, z + depth]);
  top.push(points.length);
}

const lines: [number, number][] = [];
const colL = lines.push([1, bottom[0]]); // 1 left column
const colR = lines.push([2, bottom[n - 1]]); // 2 right column
const topChord: number[] = [];
const botChord: number[] = [];
const webs: number[] = [];
for (let i = 0; i < n - 1; i++) {
  topChord.push(lines.push([top[i], top[i + 1]]));
  botChord.push(lines.push([bottom[i], bottom[i + 1]]));
}
for (let i = 0; i < n; i++) {
  // verticals at every node; diagonals form a Warren pattern per half truss
  webs.push(lines.push([bottom[i], top[i]]));
  if (i < n - 1) {
    const rising = i < panels ? i % 2 === 0 : i % 2 === 1;
    webs.push(
      lines.push(rising ? [bottom[i], top[i + 1]] : [top[i], bottom[i + 1]]),
    );
  }
}
const columns = [colL, colR];
const all = lines.map((_, i) => i + 1);

export const cornerstonePressureWashing: AppConfig = {
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
          { id: "Floor", ordinate: 0, visible: true, bubble: "end" },
          { id: "U/S Truss", ordinate: columnH, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  // No loads given on the drawing, so none are defined
  loadCases: [],
  loadCombinations: [],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [1, 2],
      params: { type: "pinned" },
    },
  ],

  loads: [],

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
      name: "Steel Columns (W16x67 placeholder)",
      templateId: "generic-member",
      geometry: columns,
    },
    {
      name: "HSS Chords (placeholder)",
      templateId: "generic-member",
      geometry: [...topChord, ...botChord],
    },
    {
      name: "HSS Webs (placeholder)",
      templateId: "generic-member",
      geometry: webs,
    },
  ],
};
