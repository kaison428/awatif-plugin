import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" span steel truss building (section A-B)
// Units: metres, XZ work plane. 1 ft = 0.3048 m.
const ft = 0.3048;
const span = 70 * ft; // 21.336 m between column lines A and B
const colTop = (19 + 6.75 / 12) * ft; // 19'-6 3/4" height of column = 5.963 m
const trussSoffit = (16 + 8 / 12) * ft; // 16'-8" T.O.F. to U/S of truss = 5.080 m
const slope = 4 / 12; // 4:12 roof pitch
const panels = 7; // truss panels per half span
const dx = span / 2 / panels;

const points: [number, number, number][] = [];
const lines: [number, number][] = [];
const id = (p: [number, number, number]) => points.push(p); // returns 1-based id

// Columns (base + top)
const baseA = id([0, 0, 0]);
const baseB = id([span, 0, 0]);

// Top chord nodes (0..2*panels) and bottom chord nodes (0..2*panels)
const top: number[] = [];
const bot: number[] = [];
for (let i = 0; i <= 2 * panels; i++) {
  const x = i * dx;
  const run = i <= panels ? x : span - x;
  top.push(id([x, 0, colTop + slope * run]));
  bot.push(id([x, 0, trussSoffit + slope * run]));
}

// Steel columns
const colA = lines.push([baseA, bot[0]]); // column A (to underside of truss)
lines.push([bot[0], top[0]]); // column top / bearing stub
const colB = lines.push([baseB, bot[2 * panels]]);
lines.push([bot[2 * panels], top[2 * panels]]);

// Chords
const chordStart = lines.length + 1;
for (let i = 0; i < 2 * panels; i++) {
  lines.push([top[i], top[i + 1]]); // HSS top chord
  lines.push([bot[i], bot[i + 1]]); // HSS bottom chord
}
const chordEnd = lines.length;

// Webs: verticals at interior nodes + diagonals falling towards the ridge
const webStart = lines.length + 1;
for (let i = 1; i < 2 * panels; i++) lines.push([bot[i], top[i]]);
for (let i = 0; i < 2 * panels; i++) {
  if (i < panels) lines.push([bot[i], top[i + 1]]);
  else lines.push([top[i], bot[i + 1]]);
}
const webEnd = lines.length;

const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, k) => a + k);

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
          { id: "U/S Truss", ordinate: trussSoffit, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [baseA, baseB],
      params: { type: "fixed" },
    },
  ],

  mesh: [
    {
      name: "Truss Mesh",
      templateId: "line-mesh",
      geometry: range(1, lines.length),
      params: { divisions: 1 },
    },
  ],

  // Placeholder sections: W16x67 columns and HSS chords/webs are not in the
  // Awatif catalogue, so dummy profiles are used. No sizing or checks intended.
  design: [
    {
      name: "Steel Columns (W16x67 placeholder)",
      templateId: "steel-member",
      geometry: [colA, colA + 1, colB, colB + 1].filter((v, i, a) => a.indexOf(v) === i),
      params: { profile: "IPE 300", steelGrade: "S235", lengthFactor: 1 },
    },
    {
      name: "HSS Chords (placeholder)",
      templateId: "steel-member",
      geometry: range(chordStart, chordEnd),
      params: { profile: "IPE 300", steelGrade: "S235", lengthFactor: 1 },
    },
    {
      name: "HSS Webs (placeholder)",
      templateId: "steel-member",
      geometry: range(webStart, webEnd),
      params: { profile: "IPE 300", steelGrade: "S235", lengthFactor: 1 },
    },
  ],
};
