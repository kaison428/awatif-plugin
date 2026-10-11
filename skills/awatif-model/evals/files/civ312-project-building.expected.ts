import type { AppConfig } from "awatif/templates";

// The CIV312 project building: a 4-storey steel frame, 3 bays of 7.0 m north-south
// (rows A to D, A at the north) by 4 bays of 7.0 m east-west (lines 1 to 5), with
// 3.7 m storeys. Storeys 1 and 2 span all five lines; storeys 3 and the roof
// span lines 2 to 4 only. X runs west to east, Y south to north, Z up.
// Modelled: every column, every floor and roof beam, and the chevron braces of
// the CBF on row D between lines 2 and 4 (the MRF on line 2 and the gravity
// frames are the same beams and columns, with no connection release or section
// given). The images give no sections, supports or loads: every line is a
// generic-member placeholder, column bases are pinned, and there are no loads.
export const civ312ProjectBuilding: AppConfig = {
  points: [
    [0, 21, 0], // 1 A1 L0
    [7, 21, 0], // 2 A2 L0
    [14, 21, 0], // 3 A3 L0
    [21, 21, 0], // 4 A4 L0
    [28, 21, 0], // 5 A5 L0
    [0, 14, 0], // 6 B1 L0
    [7, 14, 0], // 7 B2 L0
    [14, 14, 0], // 8 B3 L0
    [21, 14, 0], // 9 B4 L0
    [28, 14, 0], // 10 B5 L0
    [0, 7, 0], // 11 C1 L0
    [7, 7, 0], // 12 C2 L0
    [14, 7, 0], // 13 C3 L0
    [21, 7, 0], // 14 C4 L0
    [28, 7, 0], // 15 C5 L0
    [0, 0, 0], // 16 D1 L0
    [7, 0, 0], // 17 D2 L0
    [14, 0, 0], // 18 D3 L0
    [21, 0, 0], // 19 D4 L0
    [28, 0, 0], // 20 D5 L0
    [0, 21, 3.7], // 21 A1 L1
    [7, 21, 3.7], // 22 A2 L1
    [14, 21, 3.7], // 23 A3 L1
    [21, 21, 3.7], // 24 A4 L1
    [28, 21, 3.7], // 25 A5 L1
    [0, 14, 3.7], // 26 B1 L1
    [7, 14, 3.7], // 27 B2 L1
    [14, 14, 3.7], // 28 B3 L1
    [21, 14, 3.7], // 29 B4 L1
    [28, 14, 3.7], // 30 B5 L1
    [0, 7, 3.7], // 31 C1 L1
    [7, 7, 3.7], // 32 C2 L1
    [14, 7, 3.7], // 33 C3 L1
    [21, 7, 3.7], // 34 C4 L1
    [28, 7, 3.7], // 35 C5 L1
    [0, 0, 3.7], // 36 D1 L1
    [7, 0, 3.7], // 37 D2 L1
    [14, 0, 3.7], // 38 D3 L1
    [21, 0, 3.7], // 39 D4 L1
    [28, 0, 3.7], // 40 D5 L1
    [0, 21, 7.4], // 41 A1 L2
    [7, 21, 7.4], // 42 A2 L2
    [14, 21, 7.4], // 43 A3 L2
    [21, 21, 7.4], // 44 A4 L2
    [28, 21, 7.4], // 45 A5 L2
    [0, 14, 7.4], // 46 B1 L2
    [7, 14, 7.4], // 47 B2 L2
    [14, 14, 7.4], // 48 B3 L2
    [21, 14, 7.4], // 49 B4 L2
    [28, 14, 7.4], // 50 B5 L2
    [0, 7, 7.4], // 51 C1 L2
    [7, 7, 7.4], // 52 C2 L2
    [14, 7, 7.4], // 53 C3 L2
    [21, 7, 7.4], // 54 C4 L2
    [28, 7, 7.4], // 55 C5 L2
    [0, 0, 7.4], // 56 D1 L2
    [7, 0, 7.4], // 57 D2 L2
    [14, 0, 7.4], // 58 D3 L2
    [21, 0, 7.4], // 59 D4 L2
    [28, 0, 7.4], // 60 D5 L2
    [7, 21, 11.1], // 61 A2 L3
    [14, 21, 11.1], // 62 A3 L3
    [21, 21, 11.1], // 63 A4 L3
    [7, 14, 11.1], // 64 B2 L3
    [14, 14, 11.1], // 65 B3 L3
    [21, 14, 11.1], // 66 B4 L3
    [7, 7, 11.1], // 67 C2 L3
    [14, 7, 11.1], // 68 C3 L3
    [21, 7, 11.1], // 69 C4 L3
    [7, 0, 11.1], // 70 D2 L3
    [14, 0, 11.1], // 71 D3 L3
    [21, 0, 11.1], // 72 D4 L3
    [7, 21, 14.8], // 73 A2 L4
    [14, 21, 14.8], // 74 A3 L4
    [21, 21, 14.8], // 75 A4 L4
    [7, 14, 14.8], // 76 B2 L4
    [14, 14, 14.8], // 77 B3 L4
    [21, 14, 14.8], // 78 B4 L4
    [7, 7, 14.8], // 79 C2 L4
    [14, 7, 14.8], // 80 C3 L4
    [21, 7, 14.8], // 81 C4 L4
    [7, 0, 14.8], // 82 D2 L4
    [14, 0, 14.8], // 83 D3 L4
    [21, 0, 14.8], // 84 D4 L4
  ],
  lines: [
    [1, 21], // 1 column A1 storey 1
    [2, 22], // 2 column A2 storey 1
    [3, 23], // 3 column A3 storey 1
    [4, 24], // 4 column A4 storey 1
    [5, 25], // 5 column A5 storey 1
    [6, 26], // 6 column B1 storey 1
    [7, 27], // 7 column B2 storey 1
    [8, 28], // 8 column B3 storey 1
    [9, 29], // 9 column B4 storey 1
    [10, 30], // 10 column B5 storey 1
    [11, 31], // 11 column C1 storey 1
    [12, 32], // 12 column C2 storey 1
    [13, 33], // 13 column C3 storey 1
    [14, 34], // 14 column C4 storey 1
    [15, 35], // 15 column C5 storey 1
    [16, 36], // 16 column D1 storey 1
    [17, 37], // 17 column D2 storey 1
    [18, 38], // 18 column D3 storey 1
    [19, 39], // 19 column D4 storey 1
    [20, 40], // 20 column D5 storey 1
    [21, 41], // 21 column A1 storey 2
    [22, 42], // 22 column A2 storey 2
    [23, 43], // 23 column A3 storey 2
    [24, 44], // 24 column A4 storey 2
    [25, 45], // 25 column A5 storey 2
    [26, 46], // 26 column B1 storey 2
    [27, 47], // 27 column B2 storey 2
    [28, 48], // 28 column B3 storey 2
    [29, 49], // 29 column B4 storey 2
    [30, 50], // 30 column B5 storey 2
    [31, 51], // 31 column C1 storey 2
    [32, 52], // 32 column C2 storey 2
    [33, 53], // 33 column C3 storey 2
    [34, 54], // 34 column C4 storey 2
    [35, 55], // 35 column C5 storey 2
    [36, 56], // 36 column D1 storey 2
    [37, 57], // 37 column D2 storey 2
    [38, 58], // 38 column D3 storey 2
    [39, 59], // 39 column D4 storey 2
    [40, 60], // 40 column D5 storey 2
    [42, 61], // 41 column A2 storey 3
    [43, 62], // 42 column A3 storey 3
    [44, 63], // 43 column A4 storey 3
    [47, 64], // 44 column B2 storey 3
    [48, 65], // 45 column B3 storey 3
    [49, 66], // 46 column B4 storey 3
    [52, 67], // 47 column C2 storey 3
    [53, 68], // 48 column C3 storey 3
    [54, 69], // 49 column C4 storey 3
    [57, 70], // 50 column D2 storey 3
    [58, 71], // 51 column D3 storey 3
    [59, 72], // 52 column D4 storey 3
    [61, 73], // 53 column A2 storey 4
    [62, 74], // 54 column A3 storey 4
    [63, 75], // 55 column A4 storey 4
    [64, 76], // 56 column B2 storey 4
    [65, 77], // 57 column B3 storey 4
    [66, 78], // 58 column B4 storey 4
    [67, 79], // 59 column C2 storey 4
    [68, 80], // 60 column C3 storey 4
    [69, 81], // 61 column C4 storey 4
    [70, 82], // 62 column D2 storey 4
    [71, 83], // 63 column D3 storey 4
    [72, 84], // 64 column D4 storey 4
    [21, 22], // 65 E-W beam A1-2 L1
    [22, 23], // 66 E-W beam A2-3 L1
    [23, 24], // 67 E-W beam A3-4 L1
    [24, 25], // 68 E-W beam A4-5 L1
    [26, 27], // 69 E-W beam B1-2 L1
    [27, 28], // 70 E-W beam B2-3 L1
    [28, 29], // 71 E-W beam B3-4 L1
    [29, 30], // 72 E-W beam B4-5 L1
    [31, 32], // 73 E-W beam C1-2 L1
    [32, 33], // 74 E-W beam C2-3 L1
    [33, 34], // 75 E-W beam C3-4 L1
    [34, 35], // 76 E-W beam C4-5 L1
    [36, 37], // 77 E-W beam D1-2 L1
    [37, 38], // 78 E-W beam D2-3 L1
    [38, 39], // 79 E-W beam D3-4 L1
    [39, 40], // 80 E-W beam D4-5 L1
    [41, 42], // 81 E-W beam A1-2 L2
    [42, 43], // 82 E-W beam A2-3 L2
    [43, 44], // 83 E-W beam A3-4 L2
    [44, 45], // 84 E-W beam A4-5 L2
    [46, 47], // 85 E-W beam B1-2 L2
    [47, 48], // 86 E-W beam B2-3 L2
    [48, 49], // 87 E-W beam B3-4 L2
    [49, 50], // 88 E-W beam B4-5 L2
    [51, 52], // 89 E-W beam C1-2 L2
    [52, 53], // 90 E-W beam C2-3 L2
    [53, 54], // 91 E-W beam C3-4 L2
    [54, 55], // 92 E-W beam C4-5 L2
    [56, 57], // 93 E-W beam D1-2 L2
    [57, 58], // 94 E-W beam D2-3 L2
    [58, 59], // 95 E-W beam D3-4 L2
    [59, 60], // 96 E-W beam D4-5 L2
    [61, 62], // 97 E-W beam A2-3 L3
    [62, 63], // 98 E-W beam A3-4 L3
    [64, 65], // 99 E-W beam B2-3 L3
    [65, 66], // 100 E-W beam B3-4 L3
    [67, 68], // 101 E-W beam C2-3 L3
    [68, 69], // 102 E-W beam C3-4 L3
    [70, 71], // 103 E-W beam D2-3 L3
    [71, 72], // 104 E-W beam D3-4 L3
    [73, 74], // 105 E-W beam A2-3 L4
    [74, 75], // 106 E-W beam A3-4 L4
    [76, 77], // 107 E-W beam B2-3 L4
    [77, 78], // 108 E-W beam B3-4 L4
    [79, 80], // 109 E-W beam C2-3 L4
    [80, 81], // 110 E-W beam C3-4 L4
    [82, 83], // 111 E-W beam D2-3 L4
    [83, 84], // 112 E-W beam D3-4 L4
    [21, 26], // 113 N-S beam 1A-B L1
    [26, 31], // 114 N-S beam 1B-C L1
    [31, 36], // 115 N-S beam 1C-D L1
    [22, 27], // 116 N-S beam 2A-B L1
    [27, 32], // 117 N-S beam 2B-C L1
    [32, 37], // 118 N-S beam 2C-D L1
    [23, 28], // 119 N-S beam 3A-B L1
    [28, 33], // 120 N-S beam 3B-C L1
    [33, 38], // 121 N-S beam 3C-D L1
    [24, 29], // 122 N-S beam 4A-B L1
    [29, 34], // 123 N-S beam 4B-C L1
    [34, 39], // 124 N-S beam 4C-D L1
    [25, 30], // 125 N-S beam 5A-B L1
    [30, 35], // 126 N-S beam 5B-C L1
    [35, 40], // 127 N-S beam 5C-D L1
    [41, 46], // 128 N-S beam 1A-B L2
    [46, 51], // 129 N-S beam 1B-C L2
    [51, 56], // 130 N-S beam 1C-D L2
    [42, 47], // 131 N-S beam 2A-B L2
    [47, 52], // 132 N-S beam 2B-C L2
    [52, 57], // 133 N-S beam 2C-D L2
    [43, 48], // 134 N-S beam 3A-B L2
    [48, 53], // 135 N-S beam 3B-C L2
    [53, 58], // 136 N-S beam 3C-D L2
    [44, 49], // 137 N-S beam 4A-B L2
    [49, 54], // 138 N-S beam 4B-C L2
    [54, 59], // 139 N-S beam 4C-D L2
    [45, 50], // 140 N-S beam 5A-B L2
    [50, 55], // 141 N-S beam 5B-C L2
    [55, 60], // 142 N-S beam 5C-D L2
    [61, 64], // 143 N-S beam 2A-B L3
    [64, 67], // 144 N-S beam 2B-C L3
    [67, 70], // 145 N-S beam 2C-D L3
    [62, 65], // 146 N-S beam 3A-B L3
    [65, 68], // 147 N-S beam 3B-C L3
    [68, 71], // 148 N-S beam 3C-D L3
    [63, 66], // 149 N-S beam 4A-B L3
    [66, 69], // 150 N-S beam 4B-C L3
    [69, 72], // 151 N-S beam 4C-D L3
    [73, 76], // 152 N-S beam 2A-B L4
    [76, 79], // 153 N-S beam 2B-C L4
    [79, 82], // 154 N-S beam 2C-D L4
    [74, 77], // 155 N-S beam 3A-B L4
    [77, 80], // 156 N-S beam 3B-C L4
    [80, 83], // 157 N-S beam 3C-D L4
    [75, 78], // 158 N-S beam 4A-B L4
    [78, 81], // 159 N-S beam 4B-C L4
    [81, 84], // 160 N-S beam 4C-D L4
    [17, 38], // 161 brace D2-D3 storey 1
    [19, 38], // 162 brace D4-D3 storey 1
    [57, 38], // 163 brace D2-D3 storey 2
    [59, 38], // 164 brace D4-D3 storey 2
    [57, 71], // 165 brace D2-D3 storey 3
    [59, 71], // 166 brace D4-D3 storey 3
    [82, 71], // 167 brace D2-D3 storey 4
    [84, 71], // 168 brace D4-D3 storey 4
  ],

  gridLines: [
    {
      name: "Building Grid",
      templateId: "grid-system",
      geometry: [],
      params: {
        x: [
          { id: "1", ordinate: 0, visible: true, bubble: "end" },
          { id: "2", ordinate: 7, visible: true, bubble: "end" },
          { id: "3", ordinate: 14, visible: true, bubble: "end" },
          { id: "4", ordinate: 21, visible: true, bubble: "end" },
          { id: "5", ordinate: 28, visible: true, bubble: "end" },
        ],
        y: [
          { id: "D", ordinate: 0, visible: true, bubble: "start" },
          { id: "C", ordinate: 7, visible: true, bubble: "start" },
          { id: "B", ordinate: 14, visible: true, bubble: "start" },
          { id: "A", ordinate: 21, visible: true, bubble: "start" },
        ],
        z: [
          { id: "Base", ordinate: 0, visible: true, bubble: "end" },
          { id: "L1", ordinate: 3.7, visible: true, bubble: "end" },
          { id: "L2", ordinate: 7.4, visible: true, bubble: "end" },
          { id: "L3", ordinate: 11.1, visible: true, bubble: "end" },
          { id: "Roof", ordinate: 14.8, visible: true, bubble: "end" },
        ],
      },
    },
  ],

  supports: [
    {
      name: "Column Bases",
      templateId: "point-support",
      geometry: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      params: { type: "pinned" },
    },
  ],

  mesh: [
    {
      name: "Frame Mesh",
      templateId: "line-mesh",
      geometry: Array.from({ length: 168 }, (_, i) => i + 1),
      params: { divisions: 8 },
    },
  ],

  design: [
    {
      name: "Members (placeholder)",
      templateId: "generic-member",
      geometry: Array.from({ length: 168 }, (_, i) => i + 1),
    },
  ],
};
