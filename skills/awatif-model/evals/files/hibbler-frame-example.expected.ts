import type { AppConfig } from "awatif/templates";

// The Hibbler frame example: a beam A-B-C cantilevered from a wall at A and
// carried by two 16 ft columns at B (12 ft from A) and C (28 ft from A), with
// a 2 k/ft distributed load over A-B and a 10 k point load 8 ft from C.
// Imperial values converted to metres and kN (1 ft = 0.3048 m, 1 k = 4.4482 kN,
// 1 k/ft = 14.5939 kN/m); the XZ plane is the frame plane. Sections are not
// given, so every line uses a generic-member placeholder.
export const hibblerFrameExample: AppConfig = {
  points: [
    [0, 0, 4.8768], // 1 wall support (A)
    [3.6576, 0, 4.8768], // 2 beam-column joint (B), 12 ft
    [6.096, 0, 4.8768], // 3 point load, 20 ft
    [8.5344, 0, 4.8768], // 4 beam-column joint (C), 28 ft
    [3.6576, 0, 0], // 5 column base (E)
    [8.5344, 0, 0], // 6 column base (D)
  ],
  lines: [
    [1, 2], // 1 beam A-B
    [2, 3], // 2 beam B-load point
    [3, 4], // 3 beam load point-C
    [5, 2], // 4 left column E-B
    [6, 4], // 5 right column D-C
  ],

  gridLines: [
    {
      name: "Frame Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "X1", ordinate: 0, visible: true, bubble: "end" },
          { id: "X2", ordinate: 3.6576, visible: true, bubble: "end" },
          { id: "X3", ordinate: 6.096, visible: true, bubble: "end" },
          { id: "X4", ordinate: 8.5344, visible: true, bubble: "end" },
        ],
        y: [{ id: "1", ordinate: 0, visible: true, bubble: "start" }],
        z: [
          { id: "Z1", ordinate: 0, visible: true, bubble: "end" },
          { id: "Z2", ordinate: 4.8768, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  loadCases: ["Dead"],

  supports: [
    {
      name: "Wall Support",
      templateId: "point-support",
      geometry: [1],
      params: { type: "fixed" },
    },
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [5, 6],
      params: { type: "pinned" },
    },
  ],

  loads: [
    {
      name: "Distributed Load",
      templateId: "distributed-load",
      geometry: [1],
      params: { w: -29.188, direction: "global-z" },
      loadCase: "Dead",
    },
    {
      name: "Point Load",
      templateId: "point-load",
      geometry: [3],
      params: { Fx: 0, Fy: 0, Fz: -44.482, Mx: 0, My: 0, Mz: 0 },
      loadCase: "Dead",
    },
  ],

  mesh: [
    {
      name: "Frame Mesh",
      templateId: "line-mesh",
      geometry: [1, 2, 3, 4, 5],
      params: { divisions: 8 },
    },
  ],

  design: [
    {
      name: "Frame Members (placeholder)",
      templateId: "generic-member",
      geometry: [1, 2, 3, 4, 5],
    },
  ],
};
