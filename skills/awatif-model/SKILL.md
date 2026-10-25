---
name: awatif-model
description: Use only for creating structural models and running structural analysis. Do not use for design tasks.
---

# Awatif

## Workflow

1. Create a `/models` folder in the project root if it does not exist.
2. Create a subfolder named after the model (e.g. `/models/2-storey-portal-frame`).
3. In that subfolder, create `model.ts` defining the `AppConfig`. See `references/data-model.md` for awatif data-model definitions.
4. Run `createEngine` to create an `Engine` object. See `references/data-model.md`
5. Use the `awatif-ui` skill to create a ui viewer for the model.

## Rules

- Do not invent loads, load cases or load combinations. Add them only when the user asks or the source gives explicit values.
- Every line needs a design entry for the model to run.
  - Known section and material supported by Awatif: use the matching template (`steel-member`, `concrete-member`, `timber-member`) with the actual section.
  - Unknown or unsupported section or material (e.g. HSS, W shapes): use a `generic-member` placeholder. Omit `params` for defaults, or set `elasticity`, `area`, `momentInertiaZ`, `momentInertiaY`, `shearModulus`, `torsionalConstant`. State in the design member name that it is a `placeholder`.
  - Do not size or check members.
- Always define `gridLines` (a `grid-system` entry) before modelling, at the column lines, load positions, major transitions, lines of symmetry and floor/eaves levels, so the geometry follows the intended layout.
- For 3D models, use the XY workplane.
- For building foundations, use fixed supports unless the user specifies otherwise.

## Examples

- See `assets/templates` for built examples.
