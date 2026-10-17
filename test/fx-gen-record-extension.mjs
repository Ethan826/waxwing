// Programs with record extension, removal and named rests for the
// reference-execution comparison (R005 Task 3). Every record expression is
// built for a known label set, each label having one fixed type, so the
// program is well typed by construction: an extension spreads a base whose
// labels are disjoint from the fields written beside it; a removal drops
// labels the receiver has; a rest binder's body spreads it beside fields
// the remainder lacks; a generic function extends an open row by labels its
// `where` clause says the row lacks. Fields and spreads are effectful
// (`tick` prints), so the output checks evaluation order. Shares no code
// with the compiler.
import { rng } from './fx-gen-rng.mjs';

const kinds = { a: 'Int', b: 'Bool', c: 'Text', d: 'Opt', e: 'Int',
  f: 'Int', g: 'Bool', h: 'Text' };
const pool = Object.keys(kinds);
export const prelude = 'type Opt = None | Some(Int); '
  + 'fn tick(n: Int): Int with Console = { Console.print(n); n }; ';
const maximumDepth = 3;
const statements = 6;

export const typeText = labels => (labels.length === 0 ? '{}'
  : `{ ${labels.map(label => `${label}: ${kinds[label]}`).join(', ')} }`);

const generator = (seed, features) => {
  const r = rng(seed);
  const generics = new Map();
  let ticks = 0;
  let names = 0;
  const subset = (labels, percent) => labels.filter(() => r.chance(percent));
  const without = (labels, found) => labels.filter(
    label => !found.includes(label));
  const constant = label => ({ Int: String(r.int(5)),
    Bool: r.pick(['true', 'false']), Text: r.pick(['"x"', '"y"']),
    Opt: r.pick(['None', `Some(${r.int(5)})`]) })[kinds[label]];
  const value = label => {
    if (kinds[label] !== 'Int' || !r.chance(50)) return constant(label);
    features.add('effects');
    return `tick(${++ticks})`;
  };
  const literal = labels => `{ ${r.shuffle(labels).map(
    label => `${label}: ${value(label)}`).join(', ')} }`;
  const spreading = (given, base, depth) => {
    const items = [...given.map(label => `${label}: ${value(label)}`), null];
    const placed = r.shuffle(items).map(item => item
      ?? `...${record(base, depth + 1)}`);
    const at = placed.findIndex(item => item.startsWith('...'));
    features.add(at === 0 ? 'spread-first'
      : at === placed.length - 1 ? 'spread-last' : 'spread-middle');
    return `{ ${placed.join(', ')} }`;
  };
  const extension = (labels, depth) => {
    const given = subset(labels, 50);
    features.add('extension');
    return spreading(given, without(labels, given), depth);
  };
  const removal = (labels, depth) => {
    const spare = r.shuffle(without(pool, labels));
    const dropped = spare.slice(0, 1 + r.int(2));
    features.add('removal');
    return `(${record([...labels, ...dropped], depth + 1, true)} without { `
      + `${r.shuffle(dropped).join(', ')} })`;
  };
  // The rest binder: the remainder is the labels not given beside it.
  const restMatch = (labels, depth) => {
    const given = subset(labels, 40);
    const kept = without(labels, given);
    // A record pattern names at least one field (R004).
    const scanned = r.shuffle(without(pool, kept)).slice(0, 1 + r.int(2));
    const binders = scanned.map(label => [label,
      r.chance(50) ? label : `v${names++}`]);
    const name = `rest${names++}`;
    const fields = binders.map(([label, binder]) => (binder === label
      ? label : `${label}: ${binder}`)).concat(`...${name}`);
    const usable = ([label]) => given.some(
      own => kinds[own] === kinds[label]);
    if (binders.some(usable)) features.add('binder-used');
    const bodyValue = label => {
      const same = binders.filter(([found]) => kinds[found] === kinds[label]);
      return same.length > 0 && r.chance(50) ? r.pick(same)[1] : value(label);
    };
    const items = r.shuffle([`...${name}`, ...given.map(
      label => `${label}: ${bodyValue(label)}`)]);
    features.add('rest');
    return `(match ${record([...kept, ...scanned], depth + 1)} `
      + `{ { ${fields.join(', ')} } => { ${items.join(', ')} } })`;
  };
  const generic = (labels, depth) => {
    const chosen = subset(labels, 50);
    const added = chosen.length > 0 ? chosen : [r.pick(labels)];
    const known = subset(without(labels, added), 40);
    const key = `${known}|${added}`;
    if (!generics.has(key)) {
      const name = `g${generics.size}`;
      const param = [...known.map(label => `${label}: ${kinds[label]}`),
        '...r'].join(', ');
      const result = [...known, ...added].map(
        label => `${label}: ${kinds[label]}`).concat('...r').join(', ');
      generics.set(key, { name, text: `fn ${name}(p: { ${param} }): `
        + `{ ${result} } where r lacks { ${added.join(', ')} } = `
        + `{ ...p, ${added.map(label => `${label}: ${constant(label)}`)
          .join(', ')} };` });
    }
    features.add('generic');
    return `${generics.get(key).name}(${record(without(labels, added),
      depth + 1)})`;
  };
  const record = (labels, depth, plain = false) => {
    if (labels.length === 0) features.add('empty');
    if (depth >= maximumDepth || plain) {
      return labels.length > 0 ? literal(labels) : removal(labels, depth);
    }
    const roll = r.int(100);
    if (roll < 30 && labels.length > 0) return literal(labels);
    if (roll < 55) return extension(labels, depth);
    if (roll < 75) return removal(labels, depth);
    if (roll < 90) return restMatch(labels, depth);
    return labels.length > 0 ? generic(labels, depth)
      : extension(labels, depth);
  };
  const statement = () => {
    const labels = subset(pool, 30).slice(0, 4);
    if (r.chance(25)) {
      return `Console.print(${record(labels, 0)} == ${record(labels, 1)});`;
    }
    return `Console.print(${record(labels, 0)});`;
  };
  return { statement, generics };
};

// { source, features }: the features are read from the generated forms.
export const generate = seed => {
  const features = new Set();
  const { statement, generics } = generator(seed, features);
  const calls = Array.from({ length: statements }, statement);
  const main = `fn main(): Unit with Console = { ${calls.join(' ')} };`;
  const functions = [...generics.values()].map(({ text }) => text);
  return { source: `${prelude}${functions.join(' ')} ${main}`, features };
};
