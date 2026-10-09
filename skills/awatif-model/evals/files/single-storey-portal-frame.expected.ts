import type { AppConfig } from "awatif/templates";

// A single-storey steel portal frame: 3 m tall, 6 m span, fixed bases
export const singleStoreyPortalFrame: AppConfig = {
  points: [
    [0, 0, 0], // 1 base left
    [0, 0, 3], // 2 eaves left
    [6, 0, 3], // 3 eaves right
    [6, 0, 0], // 4 base right
  ],
  lines: [
    [1, 2], // left column
    [2, 3], // beam
    [3, 4], // right column
  ],

  supports: [
    {
      name: "Fixed Bases",
      templateId: "point-support",
      geometry: [1, 4],
      params: { type: "fixed" },
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
      name: "Steel Frame",
      templateId: "steel-member",
      geometry: [1, 2, 3],
      params: { profile: "IPE 300", steelGrade: "S235", lengthFactor: 1 },
    },
  ],
};
