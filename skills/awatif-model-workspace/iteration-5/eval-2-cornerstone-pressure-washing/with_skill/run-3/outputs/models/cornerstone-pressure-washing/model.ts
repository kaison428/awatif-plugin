import type { AppConfig } from "awatif/templates";

// Cornerstone Pressure Washing: 70'-0" clear span steel truss building,
// section in the XZ work plane (metres). 4:12 roof slope, parallel-chord
// truss sitting on two steel columns. No loads are given on the drawing.
const ft = 0.3048;
const span = 70 * ft; // 21.336 (column centrelines A to B)
const columnTop = 16 * ft + 8 * 0.0254; // 16'-8" T.O.F. to U/S of truss = 5.080
const trussDepth = 3 * ft + 1 * 0.0254; // 3'-1" = 0.940
const rise = (span / 2) * (4 / 12); // 4:12 slope
const bays = 8; // bays per half truss (Warren pattern with verticals)

const points: [number, number, number][] = [];
const lines: [number, number][] = [];

// Columns (points 1-2 left, 3-4 right): base on floor, top at truss underside
points.push([0, 0, 0], [0, 0, columnTop], [span, 0, 0], [span, 0, columnTop]);
lines.push([1, 2], [3, 4]);
const columnLines = [1, 2];

// Bottom chord nodes then top chord nodes, left eave -> apex -> right eave
const n = 2 * bays + 1;
const zBottom = (x: number) =>
  columnTop + (x <= span / 2 ? x : span - x) * (rise / (span / 2));
const bottom: number[] = [];
const top: number[] = [];
for (let i = 0; i < n; i++) {
  const x = (span * i) / (n - 1);
  points.push([x, 0, zBottom(x)]);
  bottom.push(points.length);
}
for (let i = 0; i < n; i++) {
  const x = (span * i) / (n - 1);
  points.push([x, 0, zBottom(x) + trussDepth]);
  top.push(points.length);
}

const chordLines: number[] = [];
const webLines: number[] = [];
const add = (a: number, b: number, bucket: number[]) => {
  lines.push([a, b]);
  bucket.push(lines.length);
};

// Column tops meet the left/right ends of the bottom chord
lines.push([2, bottom[0]]);
columnLines.push(lines.length);
lines.push([4, bottom[n - 1]]);
columnLines.push(lines.length);

for (let i = 0; i < n - 1; i++) {
  add(bottom[i], bottom[i + 1], chordLines);
  add(top[i], top[i + 1], chordLines);
}
for (let i = 0; i < n; i++) add(bottom[i], top[i], webLines); // verticals
for (let i = 0; i < n - 1; i++) {
  // diagonals alternate direction either side of the apex
  if ((i < bays) === (i % 2 === 0)) add(bottom[i], top[i + 1], webLines);
  else add(top[i], bottom[i + 1], webLines);
}

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
          { id: "FFL", ordinate: 0, visible: true, bubble: "end" },
          { id: "U/S Truss", ordinate: columnTop, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [1, 3],
      params: { type: "fixed" },
    },
  ],

  mesh: [
    {
      name: "Frame Mesh",
      templateId: "line-mesh",
      geometry: lines.map((_, i) => i + 1),
      params: { divisions: 1 },
    },
  ],

  design: [
    {
      // Placeholder: W16x67 is not a supported section
      name: "Steel Columns (W16x67 placeholder)",
      templateId: "generic-member",
      geometry: columnLines,
    },
    {
      // Placeholder: HSS chords are not a supported section
      name: "HSS Truss Chords (placeholder)",
      templateId: "generic-member",
      geometry: chordLines,
    },
    {
      // Placeholder: HSS webs, size not given on the drawing
      name: "HSS Truss Webs (placeholder)",
      templateId: "generic-member",
      geometry: webLines,
    },
  ],
};
