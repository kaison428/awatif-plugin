// Typed id lists ("1, 3, 5-8").

// Parse typed ids: numbers and ranges separated by commas or spaces. `valid` (a Set or
// array of existing ids) rejects the rest. Returns sorted unique ids and the bad tokens.
export function parseIdList(text, valid) {
  const ok = valid ? new Set(valid) : null;
  const ids = new Set();
  const bad = [];
  String(text ?? "")
    .split(/[\s,;]+/)
    .filter(Boolean)
    .forEach((token) => {
      const m = /^(\d+)(?:\s*[-–…]\s*|\.\.)?(\d+)?$/.exec(token);
      if (!m) return bad.push(token);
      const a = Number(m[1]);
      const b = m[2] === undefined ? a : Number(m[2]);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      if (hi - lo > 100000) return bad.push(token);
      let any = false;
      for (let i = lo; i <= hi; i++) {
        if (ok && !ok.has(i)) continue;
        ids.add(i);
        any = true;
      }
      if (!any) bad.push(token);
    });
  return { ids: [...ids].sort((x, y) => x - y), bad };
}

// [1, 3, 5, 6, 7, 8] -> "1, 3, 5–8"
export function formatIdList(ids) {
  const s = [...new Set(ids)].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j - i >= 2 ? `${s[i]}–${s[j]}` : j > i ? `${s[i]}, ${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(", ");
}
