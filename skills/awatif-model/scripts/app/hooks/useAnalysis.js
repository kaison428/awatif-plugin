// The analysis side: engine results, the active load and analysis type, and
// re-running the engine whenever the model changes.
import { ctx } from "../context.js";
import { useEffect, useRef, useState } from "../ui.js";

const message = (e) => (e instanceof Error ? e.message : String(e));

function loadExists(model, name) {
  return model.loadCases.includes(name) || model.loadCombinations.some((c) => c.name === name);
}

export function useAnalysis(model) {
  const { engine } = ctx;
  const [results, setResults] = useState(() => engine.getAll());
  const [pending, setPending] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [activeLoad, setActiveLoad] = useState(() => engine.getAll().activeLoad);
  const [analysis, setAnalysis] = useState(() => engine.getAll().analysis);
  const activeLoadRef = useRef(activeLoad);
  activeLoadRef.current = activeLoad;

  useEffect(
    () =>
      engine.subscribe((r) => {
        setResults(r);
        setPending(false);
      }),
    [],
  );

  // Every model change: autosave and re-run. The toolbar's load selection is the
  // source of truth; it falls back to all loads when its case was deleted.
  const firstRun = useRef(true);
  useEffect(() => {
    ctx.save(model);
    if (firstRun.current) return void (firstRun.current = false);
    let want = activeLoadRef.current;
    if (want && !loadExists(model, want)) {
      want = null;
      setActiveLoad(null);
    }
    try {
      engine.setModel({ ...model, ...ctx.extra });
      engine.setActiveLoad(want);
      setEngineError(null);
      setPending(true);
    } catch (e) {
      setEngineError(message(e));
    }
  }, [model]);

  function chooseLoad(value) {
    const name = value || null;
    try {
      engine.setActiveLoad(name);
      setActiveLoad(name);
      setPending(true);
    } catch (e) {
      setEngineError(message(e));
    }
  }

  function chooseAnalysis(value) {
    engine.setAnalysis(value);
    setAnalysis(value);
    setPending(true);
  }

  return { results, pending, engineError, activeLoad, setActiveLoad, analysis, chooseLoad, chooseAnalysis };
}
