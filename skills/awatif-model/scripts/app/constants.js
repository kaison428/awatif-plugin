// Fixed vocabularies of the app: geometry kinds, plane axes, load keys, line results.
import { UI } from "./ui.js";

export const KINDS = ["point", "line", "polygon"];
export const KIND_LABEL = { point: "Points", line: "Lines", polygon: "Polygons" };
export const EMPTY_SELECTION = { point: [], line: [], polygon: [] };
export const PLANE_NORMAL = { XY: "z", XZ: "y", YZ: "x" };
export const AXIS = { x: 0, y: 1, z: 2 };
export const POINT_LOAD_KEYS = ["Fx", "Fy", "Fz", "Mx", "My", "Mz"];
export const SUPPORT_TYPES = UI.ENUMS["point-support.type"];
export const RELEASE_TYPES = UI.ENUMS["releases.type"];
export const UDL_DIRECTIONS = UI.ENUMS["distributed-load.direction"];
export const dim = { color: "var(--ink-muted)" };

// Line results drawn on the members (brand book: Display options > Line results)
export const LINE_RESULTS = [
  { value: "N", label: "Axial", unit: "kN", note: "Compression is positive" },
  { value: "Vy", label: "Shear Y", unit: "kN", note: "Signed with Bending Z" },
  { value: "Vz", label: "Shear Z", unit: "kN", note: "Signed with Bending Y" },
  { value: "Mx", label: "Torsion", unit: "kN·m" },
  { value: "My", label: "Bending Y", unit: "kN·m", note: "Sagging is negative; drawn on the tension side" },
  { value: "Mz", label: "Bending Z", unit: "kN·m", note: "Sagging is negative; drawn on the tension side" },
];

export const humanOptions = (values) => values.map((v) => ({ value: v, label: UI.humanize(v) }));
