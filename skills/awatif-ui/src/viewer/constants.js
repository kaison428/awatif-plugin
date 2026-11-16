// Fixed values of the viewer: template kinds, pick tolerances, plane axes, diagram axes.

/* Which geometry an entry's ids refer to, by template. Unknown templates default to lines. */
export const POINT_TEMPLATES = new Set(['point-load', 'point-support']);
export const POLYGON_TEMPLATES = new Set(['triangle-mesh', 'generic-shell']);
export const COMPONENT_FIELDS = ['gridLines', 'loads', 'supports', 'releases', 'localAxes', 'imperfections', 'mesh', 'design'];
export const KINDS = ['point', 'line', 'polygon'];
export const PICK_PX = 8;
export const DRAG_PX = 4;
export const GHOST = 0.15;
export const PLANE_NORMAL_AXIS = { XY: 'z', XZ: 'y', YZ: 'x' };
export const PLANE_AXES = { XY: ['x', 'y'], XZ: ['x', 'z'], YZ: ['y', 'z'] };

/* Line result diagrams: the local axis each force is drawn along. Bending lands on the tension side
 * (My along +z, Mz along -y, since sagging is negative); each shear is drawn on the side of its moment's slope. */
export const DIAGRAM_AXIS = { N: ['z', 1], Vy: ['y', 1], Vz: ['z', 1], Mx: ['z', 1], My: ['z', 1], Mz: ['y', -1] };
export const DIV_STOPS = ['div-neg-2', 'div-neg-1', 'div-mid', 'div-pos-1', 'div-pos-2'];
