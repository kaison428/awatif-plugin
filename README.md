# awatif-plugin

Claude Code plugin for Awatif.

## Install

On Claude Code 2.1.275 or later, install in one step from the marketplace:

```
/plugin install awatif-structural --marketplace kaison428/awatif-plugin
```

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
