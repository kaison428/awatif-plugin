import type { AppConfig } from "awatif/templates/data-model";

// Single-storey steel portal frame: 6 m span, 3 m eaves height, fixed bases.
// Frame lies in the XZ work plane (Z is up). Units: m and kN.
export const model: AppConfig = {
  points: [
    [0, 0, 0], // 1 base left
    [0, 0, 3], // 2 eaves left
    [6, 0, 3], // 3 eaves right
    [6, 0, 0], // 4 base right
  ],
  lines: [
    [1, 2], // left column
    [2, 3], // rafter/beam
    [3, 4], // right column
  ],

  gridLines: [
    {
      name: "Frame Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "A", ordinate: 0, visible: true, bubble: "end" },
          { id: "B", ordinate: 6, visible: true, bubble: "end" },
        ],
        y: [{ id: "1", ordinate: 0, visible: true, bubble: "start" }],
        z: [
          { id: "Z1", ordinate: 0, visible: true, bubble: "end" },
          { id: "Z2", ordinate: 3, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  loadCases: ["Dead", "Live", "Wind"],
  loadCombinations: [
    { name: "ULS-1", factors: { Dead: 1.35, Live: 1.5, Wind: 0.9 } },
    { name: "ULS-2", factors: { Dead: 1.35, Live: 1.05, Wind: 1.5 } },
  ],

  // Fixed connections at the bases (column-beam joints are continuous by default)
  supports: [
    {
      name: "Fixed Bases",
      templateId: "point-support",
      geometry: [1, 4],
      params: { type: "fixed" },
    },
  ],

  loads: [
    {
      name: "Roof Dead Load",
      templateId: "distributed-load",
      geometry: [2],
      params: { w: 10, direction: "global-z" },
      loadCase: "Dead",
    },
    {
      name: "Roof Live Load",
      templateId: "distributed-load",
      geometry: [2],
      params: { w: 6, direction: "global-z" },
      loadCase: "Live",
    },
    {
      name: "Wind Pressure",
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
      geometry: [1, 2, 3],
      params: { divisions: 8 },
    },
  ],

  design: [
    {
      name: "Steel Columns",
      templateId: "steel-member",
      geometry: [1, 3],
      params: { profile: "HEA 200", steelGrade: "S355", lengthFactor: 1 },
    },
    {
      name: "Steel Beam",
      templateId: "steel-member",
      geometry: [2],
      params: { profile: "IPE 300", steelGrade: "S355", lengthFactor: 1 },
    },
  ],

  display: { workPlane: "XZ", view2D: true },
};

export default model;
