# awatif-plugin

Claude Code plugin for Awatif.

## Install

On Claude Code 2.1.275 or later, install in one step from the marketplace:

```
/plugin install awatif-structural --marketplace kaison428/awatif-plugin
```

## Live model app

The `awatif-model` skill builds a model and launches it as an interactive app, with Awatif as the engine in the browser:

```
node skills/awatif-model/scripts/serve.mjs models/<name>/model.ts
```

Select nodes and members by dragging in the viewer, edit loads, supports and geometry, and the analysis re-runs on every change. Edits are autosaved to `model.live.json` next to the model. `scripts/analyze.mjs` runs the same model headlessly and writes `results.json` for inspection.

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
