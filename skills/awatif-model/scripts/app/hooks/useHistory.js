// The model with undo. Edits with a coalesce key (typing in the inspector)
// merge into one undo step; others bump `version`, which remounts the inspector.
import { useRef, useState } from "../ui.js";

const MAX_STEPS = 200;
const COALESCE_MS = 1500;

export function useHistory(initialModel) {
  const [model, setModel] = useState(initialModel);
  const [version, setVersion] = useState(0);
  const modelRef = useRef(model);
  const history = useRef([]);
  const coalesce = useRef(null);

  function commit(next, key) {
    const now = Date.now();
    const merge = key && coalesce.current && coalesce.current.key === key && now - coalesce.current.t < COALESCE_MS;
    if (!merge) history.current.push(modelRef.current);
    if (history.current.length > MAX_STEPS) history.current.shift();
    coalesce.current = key ? { key, t: now } : null;
    modelRef.current = next;
    setModel(next);
    if (!key) setVersion((v) => v + 1);
  }

  function undo() {
    const prev = history.current.pop();
    if (!prev) return;
    coalesce.current = null;
    modelRef.current = prev;
    setModel(prev);
    setVersion((v) => v + 1);
  }

  return { model, version, commit, undo, canUndo: history.current.length > 0 };
}
