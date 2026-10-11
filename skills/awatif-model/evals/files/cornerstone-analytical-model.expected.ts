import type { AppConfig } from "awatif/templates";

// Analytical model of the Cornerstone Pressure Washing truss building, read
// from its analysis screenshot (dimensions in metres, XZ plane at y = 0):
// 21.438 m between column bases, columns with nodes at 4.572 m and 4.822 m,
// 4:12 pitched Warren truss with 1.695 m chord panels, 0.250 m left and
// 1.520 m right overhangs. The 10" x 1/2" plate (R1) links each bottom chord
// end to the column. Sections (W8x48, HSS) are not supported by Awatif, so
// every line uses a generic-member placeholder.
export const cornerstoneAnalyticalModel: AppConfig = {
  points: [
    [0, 0, 0], // 1 base left (A)
    [0, 0, 4.572], // 2 left column, 4.572 m
    [0, 0, 4.822], // 3 left column, bottom chord link level
    [0, 0, 5.465], // 4 left top chord at column
    [21.438, 0, 0], // 5 base right (B)
    [21.438, 0, 4.572], // 6 right column, 4.572 m
    [21.438, 0, 4.822], // 7 right column, bottom chord link level
    [21.438, 0, 5.465], // 8 right top chord at column
    [-0.25, 0, 5.382], // 9 left overhang tip (0.250 m)
    [22.958, 0, 4.958], // 10 right overhang tip (1.520 m)
    [1.608, 0, 6.001], // 11 top chord left 1
    [3.216, 0, 6.537], // 12 top chord left 2
    [4.824, 0, 7.073], // 13 top chord left 3
    [6.432, 0, 7.609], // 14 top chord left 4
    [8.04, 0, 8.145], // 15 top chord left 5
    [9.648, 0, 8.681], // 16 top chord left 6
    [10.719, 0, 9.038], // 17 ridge, top chord
    [10.719, 0, 8.165], // 18 ridge, bottom chord
    [1.07, 0, 4.949], // 19 bottom chord left 1
    [2.678, 0, 5.485], // 20 bottom chord left 2
    [4.286, 0, 6.021], // 21 bottom chord left 3
    [5.894, 0, 6.557], // 22 bottom chord left 4
    [7.502, 0, 7.093], // 23 bottom chord left 5
    [9.11, 0, 7.629], // 24 bottom chord left 6
    [19.83, 0, 6.001], // 25 top chord right 1
    [18.222, 0, 6.537], // 26 top chord right 2
    [16.614, 0, 7.073], // 27 top chord right 3
    [15.006, 0, 7.609], // 28 top chord right 4
    [13.398, 0, 8.145], // 29 top chord right 5
    [11.79, 0, 8.681], // 30 top chord right 6
    [20.368, 0, 4.949], // 31 bottom chord right 1
    [18.76, 0, 5.485], // 32 bottom chord right 2
    [17.152, 0, 6.021], // 33 bottom chord right 3
    [15.544, 0, 6.557], // 34 bottom chord right 4
    [13.936, 0, 7.093], // 35 bottom chord right 5
    [12.328, 0, 7.629], // 36 bottom chord right 6
  ],
  lines: [
    [1, 2], // 1 left column
    [2, 3], // 2 left column
    [3, 4], // 3 left column
    [5, 6], // 4 right column
    [6, 7], // 5 right column
    [7, 8], // 6 right column
    [4, 9], // 7 left overhang
    [8, 10], // 8 right overhang
    [4, 11], // 9 left top chord 1
    [11, 12], // 10 left top chord 2
    [12, 13], // 11 left top chord 3
    [13, 14], // 12 left top chord 4
    [14, 15], // 13 left top chord 5
    [15, 16], // 14 left top chord 6
    [16, 17], // 15 left top chord 7
    [19, 20], // 16 left bottom chord 1
    [20, 21], // 17 left bottom chord 2
    [21, 22], // 18 left bottom chord 3
    [22, 23], // 19 left bottom chord 4
    [23, 24], // 20 left bottom chord 5
    [24, 18], // 21 left bottom chord 6
    [3, 19], // 22 left R1 link plate
    [4, 19], // 23 left web
    [19, 11], // 24 left web
    [11, 20], // 25 left web
    [20, 12], // 26 left web
    [12, 21], // 27 left web
    [21, 13], // 28 left web
    [13, 22], // 29 left web
    [22, 14], // 30 left web
    [14, 23], // 31 left web
    [23, 15], // 32 left web
    [15, 24], // 33 left web
    [24, 16], // 34 left web
    [16, 18], // 35 left web
    [8, 25], // 36 right top chord 1
    [25, 26], // 37 right top chord 2
    [26, 27], // 38 right top chord 3
    [27, 28], // 39 right top chord 4
    [28, 29], // 40 right top chord 5
    [29, 30], // 41 right top chord 6
    [30, 17], // 42 right top chord 7
    [31, 32], // 43 right bottom chord 1
    [32, 33], // 44 right bottom chord 2
    [33, 34], // 45 right bottom chord 3
    [34, 35], // 46 right bottom chord 4
    [35, 36], // 47 right bottom chord 5
    [36, 18], // 48 right bottom chord 6
    [7, 31], // 49 right R1 link plate
    [8, 31], // 50 right web
    [31, 25], // 51 right web
    [25, 32], // 52 right web
    [32, 26], // 53 right web
    [26, 33], // 54 right web
    [33, 27], // 55 right web
    [27, 34], // 56 right web
    [34, 28], // 57 right web
    [28, 35], // 58 right web
    [35, 29], // 59 right web
    [29, 36], // 60 right web
    [36, 30], // 61 right web
    [30, 18], // 62 right web
    [17, 18], // 63 ridge vertical
  ],

  gridLines: [
    {
      name: "Frame Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "X1", ordinate: 0, visible: true, bubble: "end" },
          { id: "X2", ordinate: 21.438, visible: true, bubble: "end" },
        ],
        y: [{ id: "1", ordinate: 0, visible: true, bubble: "start" }],
        z: [
          { id: "Z1", ordinate: 0, visible: true, bubble: "end" },
          { id: "Z2", ordinate: 4.572, visible: true, bubble: "end" },
          { id: "Z3", ordinate: 4.822, visible: true, bubble: "end" },
          { id: "Z4", ordinate: 5.465, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [1, 5],
      params: { type: "pinned" },
    },
  ],

  design: [
    {
      name: "R4 Columns (placeholder)",
      templateId: "generic-member",
      geometry: [1, 2, 3, 4, 5, 6],
    },
    {
      name: "R2 Chords (placeholder)",
      templateId: "generic-member",
      geometry: [
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 48,
      ],
    },
    {
      name: "R3/R5 Webs (placeholder)",
      templateId: "generic-member",
      geometry: [
    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 50, 51, 52, 53, 54,
    55, 56, 57, 58, 59, 60, 61, 62, 63,
      ],
    },
    {
      name: "R1 Link Plates (placeholder)",
      templateId: "generic-member",
      geometry: [22, 49],
    },
  ],
};
