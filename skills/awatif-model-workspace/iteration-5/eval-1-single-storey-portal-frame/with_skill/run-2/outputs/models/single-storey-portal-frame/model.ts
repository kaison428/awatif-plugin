import type { AppConfig } from "awatif/templates";

// Single-storey steel portal frame: 6 m span, 3 m tall, fixed connections,
// in the XZ work plane. No loads were specified, so none are defined.
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

  // Placeholder: steel section not specified, so default generic properties
  design: [
    {
      name: "Frame Members",
      templateId: "generic-member",
      geometry: [1, 2, 3],
    },
  ],
};
