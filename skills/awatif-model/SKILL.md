---
name: awatif-model
description: Use only for creating structural models and performing structural analysis. Do not use this skill for any design relevant task.
---

# Awatif

## Workflow

1. Create a /models folder in the project root directory if not yet exists.
2. Create subfolder under /models with the model name (e.g. /models/2-storey-portal-frame)
3. Within each subfolder, create a `model.ts` file with the `AppConfig` for how the config is defined.
4. Place the assets `platform.html`, `platform.ts`, `platform.css` and `vite-env.d.ts` in the root directory.
5. Run `bash scripts/run.sh` to spin up `platform.html`.

## Rules

- Do not invent loads, load cases or load combinations. Only add them when the user asks for them or the source gives explicit values.
- Every line must have a design entry, so the model runs. If the section and material are known and Awatif supports them, use the matching member template (`steel-member`, `concrete-member`, `timber-member`) with the actual section. If the section or material is unknown or unsupported (e.g. HSS or W shapes), use a `generic-member` entry as a placeholder (omit `params` to take its defaults, or set `elasticity`, `area`, `momentInertiaZ`, `momentInertiaY`, `shearModulus`, `torsionalConstant`) and say in the reply that it is a placeholder. Do not size or check members.

## Examples

- See `assets/templates` for built examples.

## Evals

`evals/evals.json` — test prompts and expectations for this skill.
