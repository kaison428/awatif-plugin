# Working on this plugin

Rules for any agent (Claude Code, Codex) changing code in this repository. `CLAUDE.md` imports this file, so both read the same rules. They apply to every skill (`skills/awatif-model`, `skills/awatif-ui`), the Vite setup (`vite/`) and the helper scripts (`scripts/`).

## Keep it modular

- **One file, one concern, about 500 lines at most.** `npm run check` fails over 500 lines. Long before that, when a file holds two concerns, split it. Logic becomes sub-modules and UI becomes components, in a folder named after the feature with an `index.js` that re-exports when callers need one entry point. See `skills/awatif-model/scripts/app/model/` for the pattern.
- **One purpose per function.** Its name says what it does (`loadFormState`, `drawSupports`, `planeLocations`). If you need "and" to describe it, or it passes about 50 lines, split it into named steps and compose them.
- **Pure logic apart from side effects.** Model edits, geometry and formatting are pure functions with no DOM, React or three.js (`app/model/`, `app/planes.js`, `viewer/screen.js`). React state lives in hooks (`app/hooks/`), user actions in `app/actions/`, and drawing in the viewer's `draw-*.js`.
- **Reuse before you write.** Check `app/model/`, `app/format.js`, `app/constants.js`, `components/primitives.js` and the viewer's `util.js`, `materials.js` and `picking.js` first. Constants live in one place (`constants.js`), not repeated across files.
- **No dead code or commented-out code.** Comments say why or what something is for, in a line or two.

## Where things live

| Path | What | Notes |
| --- | --- | --- |
| `vite/` | Vite config (`app.config.mjs`, `viewer.config.mjs`), the app's Vite plugin and dev backend (`awatif-plugin.mjs`, `live-save.mjs`), CLI helpers (`cli.mjs`) | One config serves dev and build. |
| `skills/awatif-model/scripts/app/` | The live app (React, awatif-ui) | `main.js` boots it; `components/` holds regions, panels and the inspector; `hooks/` holds state; `actions/` holds user actions; `model/` holds pure model edits. |
| `skills/awatif-model/scripts/*.mjs` | `serve.mjs` (dev server), `analyze.mjs` (headless results), `export.mjs` (shareable pages) | Shared code is in `scripts/lib/`. |
| `skills/awatif-model/scripts/engine.ts` | `createEngine`: awatif's analysis without UI | |
| `skills/awatif-model/dist/index.html` | **Generated.** The model-agnostic app shell that `export.mjs` stamps models into | Committed, so exports work without a build. |
| `skills/awatif-ui/src/viewer/` | The three.js viewer's source, one module per concern | |
| `skills/awatif-ui/assets/awatif-viewer.js` | **Generated** from `src/viewer/` | Never edit by hand. |
| `skills/awatif-ui/assets/` | Design system: tokens, component bundle, AwatifUI helpers, fonts | `tokens.css` is generated from `tokens.json` (`scripts/build_tokens_css.py`). |

## Workflow

1. **Change the source** (never a generated file).
2. **Try it live:** `npm run dev -- <path/to/model.ts>` (Vite dev server; edits reload instantly).
3. **Rebuild the generated files:** `npm run build`. It writes `awatif-viewer.js` and `dist/index.html`, both in about a second. Commit them with the source.
4. **Check:**
   - `npm run check` (file sizes);
   - `node skills/awatif-model/scripts/analyze.mjs skills/awatif-model/assets/templates/portalFrame.ts` (the engine still runs);
   - `npm run export -- <model.ts>` and open `share/index.html` from disk (the shareable page works offline).

## Shipping models

`npm run export -- models/*/model.ts` stamps each model (with its `model.live.json` edits) into the built shell. It takes milliseconds per model, so any number of variants is one command. Each `models/<name>/share/` holds:
- `index.html`: one self-contained file (about 2 MB, no network needed). Upload it as a **Claude artifact**.
- `.openai/hosting.json`: lets the same folder deploy as a static **ChatGPT Site**.

A model whose config holds code (custom plugins) cannot be exported as data; share it with `serve.mjs`.

## Conventions

- ES modules everywhere (`"type": "module"`). Browser code in the app imports React, `StructViewer` and `AwatifUI` through `app/ui.js`, never from `window` directly.
- Styling comes from awatif-ui tokens only (`var(--space-3)`, `var(--ink)`); no hex values or arbitrary px.
- awatif is the analysis engine only. Never import its UI (`@awatif/ui`, `createApp`); type imports use `import type`. `vite/ui-guard.mjs` enforces this.
- Keep `skills/awatif-model/references/data-model.md` and `skills/awatif-ui/references/awatif-data-model.md` identical.
- Keep the versions in `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` in step.
