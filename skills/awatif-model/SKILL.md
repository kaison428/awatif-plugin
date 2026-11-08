---
name: awatif-model
description: Use only for creating structural models and running structural analysis. Do not use for design tasks.
---

# Awatif

## Workflow

1. Create a `/models` folder in the project root if it does not exist.
2. Create a subfolder named after the model (e.g. `/models/2-storey-portal-frame`).
3. In that subfolder, create `model.ts` exporting the `AppConfig`. See `references/data-model.md` for awatif data-model definitions.
4. Check the model headlessly with the engine (`createEngine`, see `references/engine.md`):

   ```
   node <this skill's directory>/scripts/analyze.mjs models/<model-name>/model.ts
   ```

   It runs every load case and load combination, prints displacements, reactions and line force envelopes, and writes `results.json` next to the model. `results.json` is for inspection (yours and the user's); it is not the deliverable. Pass `--export <name>` if the file exports more than one config.

5. Check the results before handing over: the run succeeded, no line is listed without a design entry, and the reaction sums balance the applied loads. Fix the model and rerun if not.
6. Launch the live app, which is the deliverable. Run it in the background and give the user the URL:

   ```
   node <this skill's directory>/scripts/serve.mjs models/<model-name>/model.ts
   ```

   The app mounts the model with Awatif's `createApp`, so the analysis runs in the browser with Awatif as the engine and re-runs on every change. Pass `--port <n>` if 5173 is taken, `--open` to open the browser, `--export <name>` for a multi-config file. The server keeps running, so start it as a background process, and stop it when the user is done.

7. Report the key results (max displacement, reactions, governing forces per member) with units, and say how to work in the app (see "The live app").

## The live app

Everything is interactive and analysed in real time; the user never needs `results.json`.

- **Select by dragging.** Open a component in the bottom bar (Supports, Loads, Design, Special) and activate an entry in its list. The viewer enters selection mode: drag a box **left to right** to add the points, lines and polygons it touches to the entry, **right to left** to remove them. Right-click in the viewer to leave selection mode.
- **Edit the geometry.** With no entry active, drag a point to move it, click empty space to add a point, click a point, then click where the line should end (on a point or in empty space), right-click a point to delete it. Ctrl+Z undoes.
- **Change parameters** (load magnitude, support type, section, mesh divisions) in the panel that opens beside the entry.
- **Switch load case or combination** and linear/nonlinear analysis from the bottom bar; the **Report** button shows the design report.
- **Edits are autosaved** to `model.live.json` next to the model (points, lines, polygons and component entries, with component types by name). `model.ts` is never overwritten.
- **`model.ts` is the starting point.** Saving it reloads the app from the file, which discards in-app edits. Before changing `model.ts` for the user, read `model.live.json` and fold in any edits they made in the app.
- To answer questions about what the user sees in the app, read `model.live.json`, or rerun `analyze.mjs` after folding the edits into `model.ts`.

## Rules

- Do not invent loads, load cases or load combinations. Add them only when the user asks or the source gives explicit values.
- Every line needs a design entry for the model to run.
  - Known section and material supported by Awatif: use the matching template (`steel-member`, `concrete-member`, `timber-member`) with the actual section.
  - Unknown or unsupported section or material (e.g. HSS, W shapes): use a `generic-member` placeholder. Omit `params` for defaults, or set `elasticity`, `area`, `momentInertiaZ`, `momentInertiaY`, `shearModulus`, `torsionalConstant`. State in the design member name that it is a `placeholder`.
  - Do not size or check members.
- Always define `gridLines` (a `grid-system` entry) before modelling, at the column lines, load positions, major transitions, lines of symmetry and floor/eaves levels, so the geometry follows the intended layout.
- For 3D models, use the XY workplane.
- For building foundations, use fixed supports unless the user specifies otherwise.
- Always run the analysis with `scripts/analyze.mjs` or the live app (`scripts/serve.mjs`); never compute or estimate results by hand. The user works in the live app, so always launch it; never hand over only `results.json` or a static viewer. A model without loads still runs and gives zero results; say so instead of adding loads.
- Loads act in the sign of their axis: gravity on `global-z` is a negative `w` or `Fz`.
- The solver is 3D: every rigid-body motion must be restrained, including rotation about a member's own axis. `Linear solver failed` usually means a mechanism (e.g. a beam on `pinned` + `x-roller` with a generic member); restrain it at a support rather than changing loads.

## Examples

- See `assets/templates` for built examples.
