import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" clear-span steel gable truss on two
// steel columns (gridlines A and B), 4:12 roof pitch. Units: m, kN.
// Model plane is XZ (y = 0). Z = 0 is the top of the column footing.
//
// Dimensions from the section drawing:
//   span 70'-0"            -> 21.336 m (column centreline to centreline)
//   column height 19'-6 3/4" -> 5.950 m (incl. 2'-0" below floor to footing)
//   pitch 4:12             -> 18.435 deg, ridge rise = 10.668 * 4/12 = 3.556 m
//   truss depth ~3'-1"     -> ~0.94 m (0.95 m vertical depth used)
//   Warren truss with verticals, 6 panels per half (~1.78 m horizontal,
//   ~1.87 m along slope; drawing shows ~12'-0" diagonal-bay dimension for the
//   HSS core, simplified to a denser web pattern).
// HSS shapes are not in Awatif's steel library, so HEA/HEB sections are used
// as stand-ins (chords HEA 200, webs HEA 100-class -> HEA 120, columns HEB 300
// for the W16x67).

const SPAN = 21.336;
const HALF = SPAN / 2;
const COL_H = 5.95; // column top = bottom chord at bearing
const PITCH = 4 / 12;
const DEPTH = 0.95; // vertical truss depth
const N = 6; // panels per half

const points: [number, number, number][] = [];
const lines: [number, number][] = [];
const id = (p: [number, number, number]) => points.push(p);

// 1 left base, 2 right base
id([0, 0, 0]);
id([SPAN, 0, 0]);

// Bottom chord nodes: x_i = i * SPAN/(2N), i = 0..2N
const M = 2 * N;
const dx = SPAN / M;
const zb = (x: number) => COL_H + PITCH * Math.min(x, SPAN - x);
const bot: number[] = [];
const top: number[] = [];
for (let i = 0; i <= M; i++) {
  const x = i * dx;
  bot.push(id([x, 0, zb(x)]));
}
for (let i = 0; i <= M; i++) {
  const x = i * dx;
  top.push(id([x, 0, zb(x) + DEPTH]));
}

const columns: number[] = [];
const bottomChord: number[] = [];
const topChord: number[] = [];
const verticals: number[] = [];
const diagonals: number[] = [];
const L = (a: number, b: number, group: number[]) => {
  lines.push([a, b]);
  group.push(lines.length);
};

L(1, bot[0], columns); // left column
L(2, bot[M], columns); // right column
for (let i = 0; i < M; i++) {
  L(bot[i], bot[i + 1], bottomChord);
  L(top[i], top[i + 1], topChord);
}
for (let i = 0; i <= M; i++) L(bot[i], top[i], verticals);
for (let i = 0; i < M; i++) {
  // diagonals slope toward the ridge in each half
  if (i < N) L(bot[i], top[i + 1], diagonals);
  else L(top[i], bot[i + 1], diagonals);
}

const chords = [...bottomChord, ...topChord];
const webs = [...verticals, ...diagonals];

export const cornerstonePressureWashing: AppConfig = {
  points,
  lines,

  gridLines: [
    {
      name: "Column Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "A", ordinate: 0, visible: true, bubble: "end" },
          { id: "B", ordinate: SPAN, visible: true, bubble: "end" },
        ],
        y: [{ id: "1", ordinate: 0, visible: true, bubble: "start" }],
        z: [
          { id: "Footing", ordinate: 0, visible: true, bubble: "end" },
          { id: "Floor", ordinate: 0.61, visible: true, bubble: "end" },
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

  // Pin-ended truss webs; chords continuous, columns rigid with the truss ends
  releases: [
    {
      name: "Pinned Webs",
      templateId: "releases",
      geometry: webs,
      params: { type: "both-ends" },
    },
  ],

  // Assumed trusses at 3.0 m spacing: dead 0.6 kPa, snow 1.5 kPa, wind 0.6 kPa
  loads: [
    {
      name: "Roof Dead",
      templateId: "distributed-load",
      geometry: topChord,
      params: { w: -1.8, direction: "global-z" },
      loadCase: "Dead",
    },
    {
      name: "Roof Snow",
      templateId: "distributed-load",
      geometry: topChord,
      params: { w: -4.5, direction: "global-z" },
      loadCase: "Snow",
    },
    {
      name: "Wind on Left Column",
      templateId: "distributed-load",
      geometry: [columns[0]],
      params: { w: 1.8, direction: "global-x" },
      loadCase: "Wind",
    },
  ],

  mesh: [
    {
      name: "Member Mesh",
      templateId: "line-mesh",
      geometry: lines.map((_, i) => i + 1),
      params: { divisions: 1 },
    },
  ],

  design: [
    {
      name: "Columns (W16x67 ~ HEB 300)",
      templateId: "steel-member",
      geometry: columns,
      params: { profile: "HEB 300", steelGrade: "S355", lengthFactor: 1 },
    },
    {
      name: "Truss Chords (HSS ~ HEA 200)",
      templateId: "steel-member",
      geometry: chords,
      params: { profile: "HEA 200", steelGrade: "S355", lengthFactor: 1 },
    },
    {
      name: "Truss Webs (HSS ~ HEA 120)",
      templateId: "steel-member",
      geometry: webs,
      params: { profile: "HEA 120", steelGrade: "S355", lengthFactor: 1 },
    },
  ],

  display: { workPlane: "XZ", view2D: true },
};
