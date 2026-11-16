// The live Awatif app: the awatif-ui design system (StructViewer components,
// AwatifUI helpers, the three.js AwatifViewer) on top of Awatif's analysis
// engine (`createEngine`). Nothing here uses awatif's own UI (`@awatif/ui`,
// `createApp`); awatif only runs the mesh -> solve -> design pipeline.
import "../../../awatif-ui/assets/tokens.css";
import "../../../awatif-ui/assets/components/bundle.css";
import { createRoot } from "react-dom/client";
import { h } from "./ui.js";
import { createContext } from "./context.js";
import { loadModel } from "./load-model.js";
import { App } from "./components/App.js";

function showError(error) {
  const p = document.createElement("p");
  p.className = "ui";
  p.style.cssText = "margin: 0; padding: var(--space-4, 16px);";
  p.textContent = `The app failed to load: ${error.message}`;
  document.getElementById("root").replaceChildren(p);
  console.error(error);
}

async function boot() {
  const source = loadModel();
  await createContext(source);
  document.title = source.name + " · Awatif";
  createRoot(document.getElementById("root")).render(h(App));
}

boot().catch(showError);
