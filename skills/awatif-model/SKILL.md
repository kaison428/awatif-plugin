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

## Examples

- See `assets/templates` for built examples.

## Evals

`evals/evals.json` — test prompts and expectations for this skill.
