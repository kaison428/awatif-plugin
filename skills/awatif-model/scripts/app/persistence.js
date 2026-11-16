// Saving the edited model. On the dev server it goes to model.live.json (POST to
// vite/live-save.mjs); on a hosted page there is no backend, so it is kept in
// this browser's localStorage and can be downloaded as model.live.json.

const SAVE_DELAY_MS = 500;

function postToServer(model) {
  return fetch("/__awatif/live", { method: "POST", body: JSON.stringify(model) }).catch(() => {});
}

function storageKey(name) {
  return "awatif.live:" + name;
}

function writeLocal(name, model) {
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(model));
  } catch {}
}

// The edits a hosted page kept in this browser, if they belong to the same model
export function readLocal(name, original) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(name)) || "null");
    return saved && saved.base === JSON.stringify(original) ? saved.model : null;
  } catch {
    return null;
  }
}

// A debounced saver: save(model) after every edit
export function createSaver({ name, hosted, original }) {
  let timer;
  const base = JSON.stringify(original);
  const write = hosted ? (model) => writeLocal(name, { base, model }) : postToServer;
  return (model) => {
    clearTimeout(timer);
    timer = setTimeout(() => write(model), SAVE_DELAY_MS);
  };
}

// Hand the edited model to the user as model.live.json
export function downloadModel(model) {
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "model.live.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
