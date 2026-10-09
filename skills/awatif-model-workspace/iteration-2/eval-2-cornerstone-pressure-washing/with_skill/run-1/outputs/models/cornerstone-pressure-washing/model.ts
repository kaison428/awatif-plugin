import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" clear span steel truss building,
// section in the XZ work plane (units: m). 4:12 roof pitch, W16x67 columns
// 5.963 m (19'-6 3/4") high, truss underside at 5.080 m (16'-8").
const FT = 0.3048;
const span = 70 * FT; // 21.336
const colH = 19.5625 * FT; // 5.963 top of column / top chord at eaves
const trussUnderside = (16 + 8 / 12) * FT; // 5.080
const depth = colH - trussUnderside; // truss depth at eaves
const pitch = 4 / 12;
const bays = 8; // panels per roof side
const n = bays * 2; // panel count across the span

const topZ = (x: number) => colH + pitch * Math.min(x, span - x);

// Points: 1,2 column bases; 3..19 top chord (t0..t16); 20..36 bottom chord
const xs = Array.from({ length: n + 1 }, (_, i) => (i * span) / n);
const T = (i: number) => 3 + i;
const B = (i: number) => 3 + (n + 1) + i;

const points: [number, number, number][] = [
  [0, 0, 0], // 1 base A
  [span, 0, 0], // 2 base B
  ...xs.map((x): [number, number, number] => [x, 0, topZ(x)]),
  ...xs.map((x): [number, number, number] => [x, 0, topZ(x) - depth]),
];

const lines: [number, number][] = [
  [1, B(0)], // left column (below truss)
  [B(0), T(0)], // left column (truss depth)
  [2, B(n)], // right column
  [B(n), T(n)],
];
const topChordStart = lines.length + 1;
for (let i = 0; i < n; i++) lines.push([T(i), T(i + 1)]);
const topChordEnd = lines.length;
const bottomChordStart = lines.length + 1;
for (let i = 0; i < n; i++) lines.push([B(i), B(i + 1)]);
const bottomChordEnd = lines.length;
const webStart = lines.length + 1;
for (let i = 1; i < n; i++) lines.push([B(i), T(i)]); // verticals
for (let i = 0; i < n; i++)
  lines.push(i < bays ? [B(i), T(i + 1)] : [T(i), B(i + 1)]); // diagonals
const webEnd = lines.length;

const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);

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
        z: [
          { id: "Floor", ordinate: 0, visible: true, bubble: "end" },
          { id: "U/S Truss", ordinate: trussUnderside, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  loadCases: ["Dead", "Snow", "Wind"],
  loadCombinations: [
    { name: "ULS-1", factors: { Dead: 1.25, Snow: 1.5, Wind: 0.4 } },
    { name: "ULS-2", factors: { Dead: 1.25, Snow: 0.5, Wind: 1.4 } },
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [1, 2],
      params: { type: "fixed" },
    },
  ],

  loads: [
    {
      name: "Roof Dead (deck, rafters, ceiling)",
      templateId: "distributed-load",
      geometry: range(topChordStart, topChordEnd),
      params: { w: -2, direction: "global-z" },
      loadCase: "Dead",
    },
    {
      name: "Roof Snow",
      templateId: "distributed-load",
      geometry: range(topChordStart, topChordEnd),
      params: { w: -4, direction: "global-z" },
      loadCase: "Snow",
    },
    {
      name: "Wind on Left Column",
      templateId: "distributed-load",
      geometry: [1],
      params: { w: 3, direction: "global-x" },
      loadCase: "Wind",
    },
  ],

  mesh: [
    {
      name: "Frame Mesh",
      templateId: "line-mesh",
      geometry: range(1, webEnd),
      params: { divisions: 1 },
    },
  ],
};
