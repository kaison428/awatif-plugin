// Eval inspector: serves the workspace runs with Vite and a small UI to switch between them.
import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = path.join(root, "skills", "awatif-model");
const workspace = path.join(root, "skills", "awatif-model-workspace");

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};
const dirs = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
const byNumber = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const rel = (p) => path.relative(root, p).split(path.sep).join("/");

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? listFiles(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );
}

function scan() {
  const evalDefs =
    readJson(path.join(skillDir, "evals", "evals.json"))?.evals ?? [];
  const iterations = dirs(workspace)
    .filter((n) => n.startsWith("iteration"))
    .sort(byNumber)
    .reverse()
    .map((iteration) => {
      const itDir = path.join(workspace, iteration);
      const benchmark = path.join(itDir, "benchmark.md");
      const evals = dirs(itDir)
        .filter((n) => n.startsWith("eval-"))
        .sort(byNumber)
        .map((evalDir) => {
          const evalPath = path.join(itDir, evalDir);
          const meta =
            readJson(path.join(evalPath, "eval_metadata.json")) ?? {};
          const def = evalDefs.find((e) => e.id === meta.eval_id);
          const runs = dirs(evalPath).flatMap((config) =>
            dirs(path.join(evalPath, config))
              .filter((n) => n.startsWith("run-"))
              .sort(byNumber)
              .map((run) => {
                const runPath = path.join(evalPath, config, run);
                const outputs = path.join(runPath, "outputs");
                const html = path.join(outputs, "platform.html");
                return {
                  id: `${config}/${run}`,
                  grading: readJson(path.join(runPath, "grading.json")),
                  html: fs.existsSync(html) ? "/" + rel(html) : null,
                  files: listFiles(path.join(outputs, "models")).map(rel),
                };
              }),
          );
          return {
            id: evalDir,
            name: meta.eval_name ?? evalDir,
            prompt: def?.prompt ?? "",
            files: (def?.files ?? []).map((f) => "skills/awatif-model/" + f),
            runs,
          };
        });
      return {
        id: iteration,
        benchmark: fs.existsSync(benchmark) ? rel(benchmark) : null,
        evals,
      };
    });
  return { iterations };
}

const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.mjs"),
  server: { open: process.env.NO_OPEN ? false : "/inspector/index.html" },
  plugins: [
    {
      name: "eval-inspector-api",
      configureServer(s) {
        s.middlewares.use("/api/runs", (_req, res) => {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(scan()));
        });
        // Raw text of a file under /skills, for the source and expected panes
        s.middlewares.use("/api/file", (req, res) => {
          const p = new URL(req.url, "http://x").searchParams.get("p") ?? "";
          const full = path.resolve(root, p);
          if (
            !full.startsWith(path.join(root, "skills") + path.sep) ||
            !fs.existsSync(full)
          ) {
            res.statusCode = 404;
            return res.end("not found");
          }
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(fs.readFileSync(full, "utf8"));
        });
      },
    },
  ],
});
await server.listen();
server.printUrls();
