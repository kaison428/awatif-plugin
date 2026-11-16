// Small form pieces, built from the design system's classes.
import { dim } from "../constants.js";
import { formatIdList, parseIdList } from "../model/index.js";
import { h, useEffect, useRef, useState } from "../ui.js";

const ROTATION = { right: 0, down: 90, left: 180, up: 270 };
const bar = { display: "flex", flexWrap: "wrap", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border)" };

export function Chevron({ dir = "right" }) {
  const svg = { width: 12, height: 12, viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  return h("svg", { ...svg, style: { transform: `rotate(${ROTATION[dir]}deg)` } }, h("path", { d: "M4.2 2.4L7.8 6L4.2 9.6" }));
}

export function CollapseButton({ dir, label, onClick }) {
  return h("button", { type: "button", className: "sv-collapse-btn", title: label, "aria-label": label, onClick }, h(Chevron, { dir }));
}

export function Row({ label, unit, children }) {
  return h(
    "div",
    { className: "sv-props__row" },
    h("span", { className: "ui sv-props__label" }, label),
    h("span", { className: "sv-props__valuewrap" }, children, unit ? h("span", { className: "caption sv-props__unit" }, unit) : null),
  );
}

export function Section({ title, open, onToggle, children }) {
  const toggle = { type: "button", className: "sv-props__title sv-props__toggle overline sv-caps", "aria-expanded": open, onClick: () => onToggle(!open) };
  return h("div", { className: "sv-props__group" }, h("button", toggle, h(Chevron, { dir: open ? "down" : "right" }), title), open ? children : null);
}

export function Actions({ children }) {
  return h("div", { style: bar }, children);
}

export function Hint({ children }) {
  return h("p", { className: "caption", style: { margin: 0, padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border)", ...dim } }, children);
}

export function Message({ children }) {
  return h("p", { className: "ui", style: { margin: 0, padding: "var(--space-3)", ...dim } }, children);
}

export function Heading({ title, sub }) {
  return h(
    "div",
    { style: { padding: "var(--space-3)", borderBottom: "1px solid var(--border)" } },
    h("div", { className: "h3" }, title),
    h("div", { className: "caption", style: dim }, sub),
  );
}

// A panel floating over the viewport
export function Floating({ children }) {
  return h("div", { className: "ui", style: { boxShadow: "var(--shadow-float)", borderRadius: "var(--radius-md)", minWidth: 200, maxWidth: 280 } }, children);
}

export function TextInput({ value, onChange, numeric, label, placeholder, invalid, wide }) {
  return h("input", {
    className: "sv-input " + (numeric ? "data is-num" : "ui"),
    style: { ...(wide ? { maxWidth: "none" } : {}), ...(invalid ? { borderColor: "var(--status-fail)" } : {}) },
    value,
    placeholder,
    "aria-label": label,
    "aria-invalid": invalid || undefined,
    onChange: (e) => onChange(e.target.value),
  });
}

// Typed geometry ids ("1, 3, 5-8"), kept in step with ids picked in the viewer
export function IdsInput({ ids, valid, onChange, label }) {
  const [text, setText] = useState(formatIdList(ids));
  const [bad, setBad] = useState([]);
  const key = ids.join(",");
  const last = useRef(key);
  useEffect(() => {
    if (key === last.current) return;
    last.current = key;
    setText(formatIdList(ids));
    setBad([]);
  }, [key]);
  const onType = (v) => {
    setText(v);
    const r = parseIdList(v, valid);
    setBad(r.bad);
    last.current = r.ids.join(",");
    onChange(r.ids);
  };
  return h(
    "span",
    { title: bad.length ? "Not in the model: " + bad.join(", ") : undefined, style: { display: "flex", flex: 1 } },
    h(TextInput, { value: text, label, wide: true, placeholder: "e.g. 1, 3, 5-8", invalid: bad.length > 0, onChange: onType }),
  );
}
