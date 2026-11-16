#!/usr/bin/env node
// npm run check: fails when a hand-written source file is over the size limit
// (AGENTS.md: about 500 lines per file; split bigger ones into sub-modules).
// Generated files (built assets, dist/) and data are skipped.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MAX_LINES = 500;
const SOURCE = /\.(m?js|ts|tsx|py)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "evals", "models"]);
// Built by `npm run build` or shipped prebuilt; their sources live elsewhere
const GENERATED = new Set(["skills/awatif-ui/assets/awatif-viewer.js", "skills/awatif-ui/assets/components/bundle.js"]);

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* sourceFiles(path);
    } else if (SOURCE.test(name)) yield path;
  }
}

const lineCount = (path) => readFileSync(path, "utf8").split("\n").length;

const tooBig = [...sourceFiles(ROOT)]
  .map((path) => ({ file: relative(ROOT, path).replaceAll("\\", "/"), lines: lineCount(path) }))
  .filter(({ file, lines }) => !GENERATED.has(file) && lines > MAX_LINES);

if (tooBig.length) {
  tooBig.forEach(({ file, lines }) => console.error(`${file}: ${lines} lines (limit ${MAX_LINES}); split it into sub-modules`));
  process.exit(1);
}
console.log(`All source files are within ${MAX_LINES} lines.`);
