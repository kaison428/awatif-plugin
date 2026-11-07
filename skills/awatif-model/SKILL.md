---
name: awatif-model
description: Use only for creating structural models and running structural analysis. Do not use for design tasks.
---

# Awatif

## Workflow

1. Create a `/models` folder in the project root if it does not exist.
2. Create a subfolder named after the model (e.g. `/models/2-storey-portal-frame`).
3. In that subfolder, create `model.ts` exporting the `AppConfig`. See `references/data-model.md` for awatif data-model definitions.
4. Run the analysis with the engine (`createEngine`, see `references/engine.md`):

   ```
   node <this skill's directory>/scripts/analyze.mjs models/<model-name>/model.ts
   ```

   It runs every load case and load combination, prints displacements, reactions and line force envelopes, and writes `results.json` next to the model. Pass `--export <name>` if the file exports more than one config.

5. Check the results before reporting them: the run succeeded, no line is listed without a design entry, and the reaction sums balance the applied loads. Fix the model and rerun if not.
6. Report the key results (max displacement, reactions, governing forces per member) with units.
7. Use the `awatif-ui` skill to create a ui viewer for the model.

## Rules

- Do not invent loads, load cases or load combinations. Add them only when the user asks or the source gives explicit values.
- Every line needs a design entry for the model to run.
  - Known section and material supported by Awatif: use the matching template (`steel-member`, `concrete-member`, `timber-member`) with the actual section.
  - Unknown or unsupported section or material (e.g. HSS, W shapes): use a `generic-member` placeholder. Omit `params` for defaults, or set `elasticity`, `area`, `momentInertiaZ`, `momentInertiaY`, `shearModulus`, `torsionalConstant`. State in the design member name that it is a `placeholder`.
  - Do not size or check members.
- Always define `gridLines` (a `grid-system` entry) before modelling, at the column lines, load positions, major transitions, lines of symmetry and floor/eaves levels, so the geometry follows the intended layout.
- For 3D models, use the XY workplane.
- For building foundations, use fixed supports unless the user specifies otherwise.
- Always run the analysis with `scripts/analyze.mjs`; never compute or estimate results by hand. A model without loads still runs and gives zero results; say so instead of adding loads.
- Loads act in the sign of their axis: gravity on `global-z` is a negative `w` or `Fz`.
- The solver is 3D: every rigid-body motion must be restrained, including rotation about a member's own axis. `Linear solver failed` usually means a mechanism (e.g. a beam on `pinned` + `x-roller` with a generic member); restrain it at a support rather than changing loads.

## Examples

- See `assets/templates` for built examples.
