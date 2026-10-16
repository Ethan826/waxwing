// A brute-force coverage oracle over the all-inhabited type
// `type T = A | B(Bool) | C(T, Int);`, Bool, and the record type R below.
// Values are enumerated one level deeper than any pattern head; deeper
// subtrees are an opaque leaf. A record takes no level of its own: its
// fields sit at its level, in values and in patterns alike (R004).
export const declarations = 'type T = A | B(Bool) | C(T, Int);';
// R's fields in label order; S is open over a rigid tail, so a pattern on
// it always ends with `...` and its witness does too.
const recordFields = {
  R: [['k', 'Bool'], ['s', 'S'], ['t', 'T']],
  S: [['b', 'Bool'], ['i', 'Int']]
};
const openRecords = new Set(['S']);
export const recordText = '{ k: Bool, s: { b: Bool, i: Int, ...r }, t: T }';
export const literals = [0, 1, -1];
const maximumDepth = 2;
const opaque = { tag: 'opaque' };

export const generator = seed => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
  return seed;
};
// An LCG mod 2^32 has short-period low bits (bit 0 alternates), so choices
// come from the high half, whose bits have long periods.
const discardedLowBits = 16;
export const choose = (next, count) =>
  (next() >>> discardedLowBits) % count;

// A record pattern names a nonempty subset of the fields in label order,
// and ends with `...` when it leaves one out or its type is open.
const record = (next, type, level, names) => {
  const all = recordFields[type];
  const loose = openRecords.has(type) || choose(next, 2) === 0;
  const kept = all.filter(() => !loose || choose(next, 3) !== 0);
  const named = kept.length ? kept : all.slice(0, 1);
  return { tag: 'record', open: loose || named.length < all.length,
    labels: named.map(([label]) => label),
    fields: named.map(([, field]) => pattern(next, field, level, names)) };
};

// Heads appear only at levels 1..maximumDepth; below that, `_` or binders.
const head = (next, type, level, names) => {
  if (type in recordFields) return record(next, type, level, names);
  if (type === 'Int') return { tag: 'int', n: literals[choose(next, 3)] };
  if (type === 'Bool') return { tag: 'bool', b: choose(next, 2) === 0 };
  const choice = choose(next, 3);
  if (choice === 0) return { tag: 'A' };
  if (choice === 1) return {
    tag: 'B', fields: [pattern(next, 'Bool', level + 1, names)] };
  const left = pattern(next, 'T', level + 1, names);
  return { tag: 'C', fields: [left, pattern(next, 'Int', level + 1, names)] };
};
export const pattern = (next, type, level, names) => {
  const choice = level > maximumDepth ? choose(next, 2) : choose(next, 5);
  if (choice === 0) return { tag: '_' };
  if (choice === 1) return { tag: 'bind', name: `b${names.count++}` };
  return head(next, type, level, names);
};

export const print = p => {
  if (p.tag === '_') return '_';
  if (p.tag === 'bind') return p.name;
  if (p.tag === 'int') return String(p.n);
  if (p.tag === 'bool') return String(p.b);
  if (p.tag === 'A') return 'A';
  if (p.tag === 'record') return `{ ${p.labels.map((label, index) =>
    `${label}: ${print(p.fields[index])}`).concat(p.open ? ['...'] : [])
    .join(', ')} }`;
  return `${p.tag}(${p.fields.map(print).join(', ')})`;
};

const intsIn = p => {
  if (p.tag === 'int') return [p.n];
  return (p.fields ?? []).flatMap(intsIn);
};

// The present literals plus the smallest non-negative Int not among them,
// which is also the only fresh Int a canonical witness can name.
export const intDomain = patterns => {
  const present = [...new Set(patterns.flatMap(intsIn))];
  let fresh = 0;
  while (present.includes(fresh)) fresh++;
  return [...present, fresh];
};

const product = lists => lists.reduce((rows, list) =>
  rows.flatMap(row => list.map(item => [...row, item])), [[]]);

export const values = (type, depth, ints) => {
  if (depth === 0) return [opaque];
  if (type in recordFields) return product(recordFields[type].map(
    ([, field]) => values(field, depth, ints))).map(fields => ({
    tag: 'record', labels: recordFields[type].map(([label]) => label), fields
  }));
  if (type === 'Int') return ints.map(n => ({ tag: 'int', n }));
  if (type === 'Bool') return [true, false].map(b => ({ tag: 'bool', b }));
  const bools = values('Bool', depth - 1, ints);
  const trees = values('T', depth - 1, ints);
  const numbers = values('Int', depth - 1, ints);
  return [
    { tag: 'A', fields: [] },
    ...bools.map(b => ({ tag: 'B', fields: [b] })),
    ...trees.flatMap(t => numbers.map(n => ({ tag: 'C', fields: [t, n] })))
  ];
};
export const enumerate = (type, ints) => values(type, maximumDepth + 1, ints);

export const matches = (p, v) => {
  if (p.tag === '_' || p.tag === 'bind') return true;
  if (p.tag !== v.tag) return false;
  if (p.tag === 'int') return p.n === v.n;
  if (p.tag === 'bool') return p.b === v.b;
  if (p.tag === 'record') return p.labels.every((label, index) =>
    matches(p.fields[index], v.fields[v.labels.indexOf(label)]));
  return (p.fields ?? []).every((field, index) =>
    matches(field, v.fields[index]));
};

// Witness text grammar: `_`, true, false, -?digits, Name, Name(w, ...),
// and `{ label: w, ... }`, with a final `...` for an open record.
export const parseWitness = text => {
  let at = 0;
  const token = () => {
    const found = /^\s*(-?\d+|[A-Za-z_]\w*|\.\.\.|[(),{}:])/
      .exec(text.slice(at));
    if (!found) throw new Error(`bad witness ${text} at ${at}`);
    at += found[0].length;
    return found[1];
  };
  const peek = () => text.slice(at).trim()[0];
  const parse = () => {
    const word = token();
    if (word === '_') return { tag: '_' };
    if (word === 'true' || word === 'false') return {
      tag: 'bool', b: word === 'true' };
    if (/^-?\d/.test(word)) return { tag: 'int', n: Number(word) };
    if (word === '{') return parseRecord();
    const fields = [];
    if (peek() === '(') {
      token();
      do fields.push(parse()); while (token() === ',');
    }
    return { tag: word, fields };
  };
  const parseRecord = () => {
    const found = { tag: 'record', open: false, labels: [], fields: [] };
    for (let word = token(); word !== '}'; word = token()) {
      if (word === '...') found.open = true;
      else {
        found.labels.push(word);
        if (token() !== ':') throw new Error(`bad witness ${text}`);
        found.fields.push(parse());
      }
      if (peek() === ',') token();
    }
    return found;
  };
  const result = parse();
  if (text.slice(at).trim() !== '') throw new Error(`trailing witness ${text}`);
  return result;
};

// First-match semantics decide the expected outcome of a whole match.
export const expected = (patterns, domain) => {
  const firsts =
    new Set(domain.map(v => patterns.findIndex(p => matches(p, v))));
  const redundant = patterns.findIndex((_, index) => !firsts.has(index));
  if (redundant !== -1) return { code: 'E_REDUNDANT', arm: redundant };
  if (firsts.has(-1)) return { code: 'E_NON_EXHAUSTIVE' };
  return { code: null };
};
