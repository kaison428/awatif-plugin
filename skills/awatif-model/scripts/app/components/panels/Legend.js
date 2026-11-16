// Legend of the drawn line result: diverging, symmetric about zero; the extremes go in the note.
import { LINE_RESULTS } from "../../constants.js";
import { num } from "../../format.js";
import { SV, h } from "../../ui.js";

// The legend element, or null when no line result is drawn
export function lineResultLegend({ display, summary, diagram }) {
  const lineResult = LINE_RESULTS.find((r) => r.value === display.diagram);
  if (!lineResult || !summary || diagram?.key !== lineResult.value || !(diagram.min || diagram.max)) return null;
  const span = Math.max(Math.abs(diagram.min), Math.abs(diagram.max));
  return h(SV.ContourLegend, {
    title: lineResult.label,
    unit: lineResult.unit,
    scale: "diverging",
    min: -span,
    max: span,
    decimals: 2,
    height: 112,
    note: [lineResult.note, `Min ${num(diagram.min)}, max ${num(diagram.max)}`].filter(Boolean).join("\n"),
  });
}
