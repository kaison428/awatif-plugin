# awatif-plugin

Claude Code (and Codex) plugin for Awatif structural analysis.

## Install

On Claude Code 2.1.275 or later, install in one step from the marketplace:

```
/plugin install awatif-structural --marketplace kaison428/awatif-plugin
```

The scripts need the plugin's own dependencies: run `npm install` in the plugin root once.

## Skills

| Skill | Use it for |
| --- | --- |
| `awatif-model` | Building a structural model, running the analysis and launching it as a live app. |
| `awatif-ui` | The design system (tokens, React components, three.js viewer) that the live app and any custom viewer are built with. |

Awatif itself is only the analysis engine (`createEngine`). Its bundled UI (`createApp`, `@awatif/ui`) is never used.

## What `awatif-model` produces

For a request like "model a 6 m portal frame", the skill creates one folder per model:

```
models/<model-name>/
  model.ts         written by Claude: exports the AppConfig; the source of truth
  results.json     written by analyze.mjs: headless results, for checking only
  model.live.json  written by the live app: the model as edited in the browser
  share/           written by export.mjs, only when asked: the app as one shareable page
```

and hands over a URL to the live app. Nothing else is written (no `models/index.ts`, no static images).

1. **Author** `model.ts` (see `skills/awatif-model/references/data-model.md`).
2. **Check** it headlessly. Runs every load case and combination and writes `results.json` next to the model:
   ```
   node skills/awatif-model/scripts/analyze.mjs models/<name>/model.ts [--export <name>] [--out <file>]
   ```
3. **Launch** the live app, the deliverable:
   ```
   node skills/awatif-model/scripts/serve.mjs models/<name>/model.ts [--port <n>] [--open] [--export <name>]
   ```
   Box-select nodes and members for loads and supports, draw and move geometry, edit parameters in the inspector; the analysis re-runs on every change and reactions, displacements, line forces and design utilization show in the results drawer, and the Display panel draws internal force diagrams (N, V, M) on the members. Edits are autosaved to `model.live.json`; `model.ts` is never overwritten, and saving `model.ts` reloads the app from it (discarding in-app edits).

4. **Share** it (on request): one self-contained `index.html` per model, the same live app with the analysis in the browser:
   ```
   node skills/awatif-model/scripts/export.mjs models/<name>/model.ts [more models...]
   ```
   Upload `models/<name>/share/index.html` as a **Claude artifact**, or deploy the `share/` folder as a static **ChatGPT Site** (its `.openai/hosting.json` points Sites at the folder). Exporting takes milliseconds per model, so many variants are one command.

## How it is built

Vite does everything: the dev server and its one backend route (`serve.mjs`, saving `model.live.json`), the build of the app and the viewer (`npm run build`), and loading `model.ts` under Node (`analyze.mjs`, `export.mjs`). The build makes one model-agnostic page with everything inlined (React, three.js, the solver WASM, the font), `skills/awatif-model/dist/index.html`. `export.mjs` copies it with a model's JSON put in. The page reads that JSON when it has one, and otherwise asks the dev server for `model.ts`.

| Command | What it does |
| --- | --- |
| `npm run dev -- <model.ts>` | Live app on Vite's dev server (`serve.mjs`) |
| `npm run build` | Rebuilds `skills/awatif-ui/assets/dist/awatif-viewer.js` and `skills/awatif-model/dist/index.html` from source |
| `npm run export -- <model.ts>...` | Shareable pages (`export.mjs`) |
| `npm run analyze -- <model.ts>` | Headless results (`analyze.mjs`) |
| `npm run check` | Fails on source files over 500 lines |

Coding rules for agents and people are in [`AGENTS.md`](AGENTS.md) (Claude Code reads it through `CLAUDE.md`).

## Layout

- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: Claude Code manifest and marketplace
- `.codex-plugin/plugin.json`: Codex manifest (keep its version in step with the Claude one)
- `vite/`: the Vite config (dev and build), the app's Vite plugin and dev backend, CLI helpers
- `skills/awatif-model/`: `SKILL.md`, `references/` (data model, engine), `scripts/` (`serve.mjs`, `analyze.mjs`, `export.mjs`, `engine.ts`, `lib/`, the live app in `app/`), `dist/` (the built app shell), `assets/templates/` (example models)
- `skills/awatif-ui/`: design system (`assets/`, `references/`, `scripts/scaffold.py`); the viewer's source is `src/viewer/`, and `assets/dist/awatif-viewer.js` is built from it
- `evals/`: plugin eval cases (`prompt.md` + `graders/`, image cases add `case.yaml`, `fixture.sh`, `resources/`)
- `scripts/`: eval helpers (below)
- `agents/`, `commands/`: placeholder examples only; `hooks/hooks.json` is empty

`skills/awatif-model/references/data-model.md` and `skills/awatif-ui/references/awatif-data-model.md` are the same file, so each skill is self-contained. Edit both together.

## Dev

```
claude --plugin-dir .
```

## Evals

Each case in `evals/` checks the files above (`model.ts`, `results.json`) and the final reply; the negative cases check that no `models/` folder is created.

Run evals on Linux or macOS. On Windows, run them in WSL, since the shell sandbox needs Linux.

```
npm run eval           # run every case
npm run eval:collect   # copy the kept sandbox dirs into evals/results/<timestamp>/runs
npm run eval:inspect   # browse collected runs
```

`node_modules` holds native binaries for the OS that installed it (Vite's Rolldown, lightningcss). On Windows, install it from WSL and never from PowerShell or cmd in the same folder. Otherwise the sandbox can't load Vite and no `results.json` is written. If that happens, delete `node_modules` and run `npm install` again from WSL. For speed, clone the repo inside the WSL filesystem (e.g. `~/code/awatif-plugin`) rather than under `/mnt/c`.
