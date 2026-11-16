// The hover tooltip at the cursor (view mode), from options.hoverInfo.

export function hideTip(v) {
  v.tip.style.display = 'none';
}

export function showTip(v, id, ev) {
  const { tip, element } = v;
  const text = id && v.state.mode === 'view' ? v.on.hoverInfo(id) : null;
  if (!text) return hideTip(v);
  if (tip.textContent !== text) tip.textContent = text;
  tip.style.display = 'block';
  const rect = element.getBoundingClientRect();
  const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
  // Below right of the cursor, flipped to stay inside the viewport
  const left = x + 14 + tip.offsetWidth > rect.width ? x - 10 - tip.offsetWidth : x + 14;
  const top = y + 18 + tip.offsetHeight > rect.height ? y - 8 - tip.offsetHeight : y + 18;
  tip.style.left = Math.max(0, left) + 'px';
  tip.style.top = Math.max(0, top) + 'px';
}
