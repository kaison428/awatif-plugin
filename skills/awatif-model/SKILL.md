---
name: awatif-model
description: Use only for creating structural models and running structural analysis. Do not use for design tasks.
---

# Awatif

## Workflow

1. Create a `/models` folder in the project root if it does not exist.
2. Create a subfolder named after the model (e.g. `/models/2-storey-portal-frame`).
3. In that subfolder, create `model.ts` defining the `AppConfig`.
4. Place `platform.html`, `platform.ts`, `platform.css` and `vite-env.d.ts` in the project root.
5. Run `bash scripts/run.sh` to start `platform.html`.

## Rules

- Do not invent loads, load cases or load combinations. Add them only when the user asks or the source gives explicit values.
- Every line needs a design entry for the model to run.
  - Known section and material supported by Awatif: use the matching template (`steel-member`, `concrete-member`, `timber-member`) with the actual section.
  - Unknown or unsupported section or material (e.g. HSS, W shapes): use a `generic-member` placeholder. Omit `params` for defaults, or set `elasticity`, `area`, `momentInertiaZ`, `momentInertiaY`, `shearModulus`, `torsionalConstant`. State in the reply that it is a placeholder.
  - Do not size or check members.

## Tips

- For complex buildings, define the major gridlines before modelling, so the geometry follows the intended layout.

## Examples

- See `assets/templates` for built examples.

## Evals

`evals/evals.json` contains test prompts and expectations for this skill.
