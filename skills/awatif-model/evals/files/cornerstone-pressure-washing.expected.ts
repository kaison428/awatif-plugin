import type { AppConfig } from "awatif/templates";

// A 70 ft (21.336 m) span steel truss building, read from the Cornerstone
// Pressure Washing section drawing: two steel columns 19'-6 3/4" tall with a
// 4:12 pitched HSS truss (3 ft deep at the eaves) between them. Imperial
// dimensions converted to metres; the XZ plane is the section plane.
export const cornerstonePressureWashing: AppConfig = {
  points: [
    [0, 0, 0], // 1 base left (A)
    [0, 0, 5.08], // 2 truss bottom chord, left
    [0, 0, 5.963], // 3 column top / truss top chord, left
    [21.336, 0, 0], // 4 base right (B)
    [21.336, 0, 5.08], // 5 truss bottom chord, right
    [21.336, 0, 5.963], // 6 column top / truss top chord, right
    [1.334, 0, 5.525], // bottom chord node 1
    [2.667, 0, 5.969], // bottom chord node 2
    [4.001, 0, 6.414], // bottom chord node 3
    [5.334, 0, 6.858], // bottom chord node 4
    [6.668, 0, 7.303], // bottom chord node 5
    [8.001, 0, 7.747], // bottom chord node 6
    [9.335, 0, 8.192], // bottom chord node 7
    [10.668, 0, 8.636], // bottom chord node 8
    [12.002, 0, 8.192], // bottom chord node 9
    [13.335, 0, 7.747], // bottom chord node 10
    [14.669, 0, 7.303], // bottom chord node 11
    [16.002, 0, 6.858], // bottom chord node 12
    [17.336, 0, 6.414], // bottom chord node 13
    [18.669, 0, 5.969], // bottom chord node 14
    [20.003, 0, 5.525], // bottom chord node 15
    [1.334, 0, 6.407], // top chord node 1
    [2.667, 0, 6.852], // top chord node 2
    [4.001, 0, 7.296], // top chord node 3
    [5.334, 0, 7.741], // top chord node 4
    [6.668, 0, 8.185], // top chord node 5
    [8.001, 0, 8.63], // top chord node 6
    [9.335, 0, 9.074], // top chord node 7
    [10.668, 0, 9.519], // top chord node 8
    [12.002, 0, 9.074], // top chord node 9
    [13.335, 0, 8.63], // top chord node 10
    [14.669, 0, 8.185], // top chord node 11
    [16.002, 0, 7.741], // top chord node 12
    [17.336, 0, 7.296], // top chord node 13
    [18.669, 0, 6.852], // top chord node 14
    [20.003, 0, 6.407], // top chord node 15
  ],
  lines: [
    [1, 2], // left column, base to truss
    [2, 3], // left column, truss depth
    [4, 5], // right column, base to truss
    [5, 6], // right column, truss depth
    [2, 7], // bottom chord 1
    [7, 8], // bottom chord 2
    [8, 9], // bottom chord 3
    [9, 10], // bottom chord 4
    [10, 11], // bottom chord 5
    [11, 12], // bottom chord 6
    [12, 13], // bottom chord 7
    [13, 14], // bottom chord 8
    [14, 15], // bottom chord 9
    [15, 16], // bottom chord 10
    [16, 17], // bottom chord 11
    [17, 18], // bottom chord 12
    [18, 19], // bottom chord 13
    [19, 20], // bottom chord 14
    [20, 21], // bottom chord 15
    [21, 5], // bottom chord 16
    [3, 22], // top chord 1
    [22, 23], // top chord 2
    [23, 24], // top chord 3
    [24, 25], // top chord 4
    [25, 26], // top chord 5
    [26, 27], // top chord 6
    [27, 28], // top chord 7
    [28, 29], // top chord 8
    [29, 30], // top chord 9
    [30, 31], // top chord 10
    [31, 32], // top chord 11
    [32, 33], // top chord 12
    [33, 34], // top chord 13
    [34, 35], // top chord 14
    [35, 36], // top chord 15
    [36, 6], // top chord 16
    [7, 22], // web vertical 1
    [8, 23], // web vertical 2
    [9, 24], // web vertical 3
    [10, 25], // web vertical 4
    [11, 26], // web vertical 5
    [12, 27], // web vertical 6
    [13, 28], // web vertical 7
    [14, 29], // web vertical 8
    [15, 30], // web vertical 9
    [16, 31], // web vertical 10
    [17, 32], // web vertical 11
    [18, 33], // web vertical 12
    [19, 34], // web vertical 13
    [20, 35], // web vertical 14
    [21, 36], // web vertical 15
    [2, 22], // web diagonal 1
    [22, 8], // web diagonal 2
    [8, 24], // web diagonal 3
    [24, 10], // web diagonal 4
    [10, 26], // web diagonal 5
    [26, 12], // web diagonal 6
    [12, 28], // web diagonal 7
    [28, 14], // web diagonal 8
    [14, 30], // web diagonal 9
    [30, 16], // web diagonal 10
    [16, 32], // web diagonal 11
    [32, 18], // web diagonal 12
    [18, 34], // web diagonal 13
    [34, 20], // web diagonal 14
    [20, 36], // web diagonal 15
    [36, 5], // web diagonal 16
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [1, 4],
      params: { type: "pinned" },
    },
  ],

  mesh: [
    {
      name: "Frame Mesh",
      templateId: "line-mesh",
      geometry: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
        39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
        57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67,
      ],
      params: { divisions: 2 },
    },
  ],

  design: [
    {
      name: "Steel Columns",
      templateId: "steel-member",
      geometry: [1, 2, 3, 4],
      params: { profile: "HEA 300", steelGrade: "S355", lengthFactor: 1 },
    },
    {
      name: "Steel Truss",
      templateId: "steel-member",
      geometry: [
        5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
        42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
        60, 61, 62, 63, 64, 65, 66, 67,
      ],
      params: { profile: "IPE 200", steelGrade: "S355", lengthFactor: 1 },
    },
  ],
};
