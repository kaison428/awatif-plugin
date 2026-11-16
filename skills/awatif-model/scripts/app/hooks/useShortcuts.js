// Ctrl+Z undoes and M maximises the view (outside text fields, which keep their own keys).
import { useEffect, useRef } from "../ui.js";

function isTyping(ev) {
  return /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName);
}

export function useShortcuts({ undo, toggleMaximise }) {
  const actions = useRef();
  actions.current = { undo, toggleMaximise };
  useEffect(() => {
    const onKey = (ev) => {
      if (isTyping(ev)) return;
      const key = ev.key.toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && key === "z" && !ev.shiftKey) {
        ev.preventDefault();
        actions.current.undo();
      } else if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && key === "m") {
        ev.preventDefault();
        actions.current.toggleMaximise();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
