# awatif-plugin

Claude Code plugin for Awatif.

## Install

On Claude Code 2.1.275 or later, install in one step from the marketplace:

```
/plugin install awatif-structural --marketplace kaison428/awatif-plugin
```

## Live model app

The `awatif-model` skill builds a model and launches it as an interactive app. The interface is the `awatif-ui` design system (React components and a three.js viewer); Awatif only runs the analysis (`createEngine`) in the browser. Awatif's own bundled UI is never loaded.

```
node skills/awatif-model/scripts/serve.mjs models/<name>/model.ts
```

Box-select nodes and members for loads and supports, draw and move geometry, edit parameters in the inspector, and the analysis re-runs on every change; reactions, displacements, line forces and design utilization show in the results drawer. Edits are autosaved to `model.live.json` (in `AppConfig` shape) next to the model. `scripts/analyze.mjs` runs the same model headlessly and writes `results.json` for inspection.

## Layout

- `.claude-plugin/plugin.json` – manifest
- `skills/` – skills (`<name>/SKILL.md`)
- `commands/` – slash commands
- `agents/` – subagents
- `hooks/hooks.json` – hooks

## Dev

```
claude --plugin-dir .
```
