// Normal forms of the compiler's messages, so that orders can be
// compared. An inferred type is compared up to renaming of its type
// variables and the order in which its constraints are printed (neither
// is part of the type): the variables of the body are renamed in order
// of first occurrence there (the body lists the metas in a fixed
// order), the others in order of first occurrence in the constraints
// sorted with those still unnamed masked; then the constraints are
// sorted. Labels are never renamed. Error texts have whitespace
// collapsed and the compiler's unknowns (`t12`) renamed by occurrence.
const squash = s => s.replace(/\s+/g, ' ').trim();
const word = v => new RegExp(`(?<![\\w"])${v}(?![\\w"])`, 'g');

function renamed(text, names) {
  let out = text;
  for (const [v, n] of names) out = out.replace(word(v), `#${n}`);
  return out.replace(/#/g, '');
}

export function normalType(message) {
  const m = /The inferred type of test was:([\s\S]*?)in value declaration/
    .exec(message);
  const ty = squash(m ? m[1] : message);
  const q = /^forall ([^.]*)\. (.*)$/.exec(ty);
  const vars = q ? q[1].split(' ') : [];
  const parts = (q ? q[2] : ty).split(' => ');
  const body = parts.pop();
  const names = new Map();
  const seen = text => (text.match(/[\w']+/g) ?? []).forEach(v => {
    if (vars.includes(v) && !names.has(v)) names.set(v, `v${names.size}`);
  });
  seen(body);
  const masked = c => vars.reduce((s, v) => (names.has(v) ? s
    : s.replace(word(v), '_')), renamed(c, names));
  [...parts].sort((a, b) => masked(a).localeCompare(masked(b)))
    .forEach(seen);
  const cs = parts.map(c => renamed(c, names)).sort();
  return [...cs, renamed(body, names)].join(' => ');
}

export function normalError(message) {
  const text = squash(message.replace(/See https[\s\S]*$/, ''));
  const names = new Map();
  return text.replace(/\bt\d+\b/g, v => {
    if (!names.has(v)) names.set(v, `t${names.size}`);
    return names.get(v);
  });
}
