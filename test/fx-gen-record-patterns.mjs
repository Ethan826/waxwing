// Programs with record patterns for the reference-execution comparison
// (R004 Task 4). Every match is built as an ordered partition of its
// scrutinee's type, so it is exhaustive with no redundant arm by
// construction: a type's split is a list of patterns that, taken in order,
// cover every value and each match something the earlier ones do not;
// the split of a product (a constructor's or a record's fields) is the
// lexicographic product of its parts' splits. Shares no code with the
// compiler, and none with the coverage oracle.
import { rng } from './fx-gen-rng.mjs';

const record = (fields, open = false) => ({ record: fields, open });
const person = record([['name', 'Text'], ['age', 'Int'], ['vip', 'Bool']]);
const adts = {
  Opt: [['None', []], ['Some', ['Int']]],
  Person: [['Person', [person]]],
  Shape: [['Dot', []], ['Box', [record([['w', 'Int'], ['h', 'Bool']])]],
    ['Tag', ['Person', 'Opt']]],
  Node: [['Leaf', []], ['Link',
    [record([['val', 'Int'], ['rest', 'Node'], ['tag', 'Opt']])]]]
};
export const prelude = 'type Opt = None | Some(Int); '
  + 'type Person = Person({ name: Text, age: Int, vip: Bool }); '
  + 'type Shape = Dot | Box({ w: Int, h: Bool }) | Tag(Person, Opt); '
  + 'type Node = Leaf | Link({ val: Int, rest: Node, tag: Opt }); ';
const labels = ['a', 'b', 'c', 'd', 'n', 'm', 'k', 'name', 'age', 'vip',
  'w', 'h', 'val', 'rest', 'tag', 'left', 'right'];
const extras = ['ex1', 'ex2'];
const maximumDepth = 3;
const armBudget = 8;

export const typeText = ty => {
  if (typeof ty === 'string') return ty;
  const fields = ty.record.map(([label, field]) =>
    `${label}: ${typeText(field)}`);
  return `{ ${[...fields, ...(ty.open ? ['...r'] : [])].join(', ')} }`;
};

const textValues = ['"a"', '"b"', '""'];
const value = (r, ty, depth) => {
  if (ty === 'Int') return String(r.int(4));
  if (ty === 'Bool') return r.pick(['true', 'false']);
  if (ty === 'Text') return r.pick(textValues);
  if (typeof ty === 'string') {
    const [name, fields] = depth >= maximumDepth ? adts[ty][0]
      : r.pick(adts[ty]);
    const args = fields.map(field => value(r, field, depth + 1));
    return args.length === 0 ? name : `${name}(${args.join(', ')})`;
  }
  const own = ty.record.map(([label, field]) =>
    [label, value(r, field, depth + 1)]);
  const more = ty.open ? extras.slice(0, r.int(3))
    .map(label => [label, value(r, r.pick(['Int', 'Bool']), depth)]) : [];
  return `{ ${r.shuffle([...own, ...more])
    .map(([label, text]) => `${label}: ${text}`).join(', ')} }`;
};

const typeOf = (r, depth) => {
  const roll = r.int(100);
  if (roll < 25) return 'Int';
  if (roll < 40) return 'Bool';
  if (roll < 50) return 'Text';
  if (roll < 75 || depth >= 2) return r.pick(Object.keys(adts));
  return recordOf(r, depth + 1);
};
const recordOf = (r, depth) => record(r.shuffle(labels)
  .slice(0, 2 + r.int(3)).map(label => [label, typeOf(r, depth)]));
const scrutinee = r => {
  const roll = r.int(100);
  if (roll < 25) return { ...recordOf(r, 1), open: true };
  if (roll < 40) return 'Shape';
  if (roll < 55) return 'Node';
  return recordOf(r, 0);
};

// One pattern: its text, the binders it makes, and the name when the whole
// pattern is a single binder (a field then puns).
const pattern = (text, binders = [], bind = null) =>
  ({ text, binders, bind });
const join = (parts, make) => make(parts.flatMap(part => part.binders),
  parts);

const splitter = (r, features) => {
  const used = new Set();
  let fresh = 0;
  const catchall = (ty, label) => {
    if (r.chance(40)) return pattern('_');
    const pun = label && !used.has(label) && r.chance(50);
    const name = pun ? label : `v${fresh++}`;
    used.add(name);
    if (pun) features.add('pun');
    return pattern(name, [[name, ty]], name);
  };
  // The ordered products of the parts' splits, each part given the budget
  // its predecessors left.
  const product = (parts, budget) => {
    let rows = [[]];
    let left = budget;
    for (const [ty, label] of parts) {
      const found = split(ty, left, label);
      rows = rows.flatMap(row => found.map(one => [...row, one]));
      left = Math.max(1, Math.floor(left / found.length));
    }
    return rows;
  };
  const integers = (ty, budget, label) => {
    const [one, two] = r.shuffle([0, 1, 2]);
    const roll = r.int(10);
    if (budget < 2 || roll < 4) return [catchall(ty, label)];
    const lits = budget < 3 || roll < 8 ? [one] : [one, two];
    return [...lits.map(lit => pattern(String(lit))),
      catchall(ty, label)];
  };
  const bools = (ty, budget, label) => {
    const roll = r.int(10);
    if (budget < 2 || roll < 3) return [catchall(ty, label)];
    const first = r.pick(['true', 'false']);
    const second = first === 'true' ? 'false' : 'true';
    return roll < 6 ? [pattern(first), catchall(ty, label)]
      : [pattern(first), pattern(second)];
  };
  const constructors = (ty, budget, label) => {
    const all = adts[ty];
    const listed = budget < 2 && all.length > 1 ? 0
      : all.length === 1 ? (r.chance(60) ? 1 : 0) : 1 + r.int(all.length);
    if (listed === 0) return [catchall(ty, label)];
    const sub = Math.max(1, Math.floor(budget / listed));
    const arms = r.shuffle(all).slice(0, listed).flatMap(([name, fields]) =>
      product(fields.map(field => [field, null]), sub).map(row =>
        join(row, (binders, parts) => pattern(fields.length === 0 ? name
          : `${name}(${parts.map(part => part.text).join(', ')})`,
        binders))));
    if (listed < all.length) arms.push(catchall(ty, label));
    return arms;
  };
  const records = (ty, budget, label) => {
    if (r.chance(15) && !ty.open) return [catchall(ty, label)];
    const chosen = ty.record.filter(() => r.chance(65));
    const named = chosen.length > 0 ? chosen : [r.pick(ty.record)];
    const dots = ty.open || named.length < ty.record.length || r.chance(15);
    if (dots && named.length < ty.record.length) features.add('rest');
    return product(named.map(([name, field]) => [field, name]), budget)
      .map(row => join(row, (binders, parts) => pattern(`{ ${parts.map(
        (part, at) => (part.bind === named[at][0] ? part.text
          : `${named[at][0]}: ${part.text}`)).concat(dots ? ['...'] : [])
        .join(', ')} }`, binders)));
  };
  const split = (ty, budget, label) => {
    if (ty === 'Int') return integers(ty, budget, label);
    if (ty === 'Bool') return bools(ty, budget, label);
    if (ty === 'Text') return [catchall(ty, label)];
    if (typeof ty === 'string') return constructors(ty, budget, label);
    return records(ty, budget, label);
  };
  return split;
};

const body = (index, binders) => `"A${index}${binders.map(
  ([name]) => ` \${show(${name})}`).join('')}"`;

const holds = (text, pattern) => pattern.test(text);

// { source, features }: the features are read from the generated arms.
export const generate = seed => {
  const r = rng(seed);
  const features = new Set();
  const count = 1 + r.int(3);
  const functions = [];
  const calls = [];
  for (let at = 0; at < count; at++) {
    const ty = scrutinee(r);
    const arms = splitter(r, features)(ty, armBudget, null);
    const text = arms.map((arm, index) => `${arm.text} => `
      + body(index, arm.binders)).join(', ');
    if (arms.some(arm => arm.binders.length > 0)) features.add('binders');
    if (holds(text, /\w\(\{/)) features.add('record-in-ctor');
    if (holds(text, /: [A-Z]\w*\(/)) features.add('ctor-in-record');
    if (holds(text, /\{ [^}]*\{/)) features.add('nested-record');
    if (ty.open) features.add('open-row');
    functions.push(`fn f${at}(x: ${typeText(ty)}): Text = `
      + `match x { ${text} };`);
    for (let call = 0; call < 6; call++) {
      calls.push(`Console.print(f${at}(${value(r, ty, 0)}));`);
    }
  }
  const main = `fn main(): Unit with Console = { ${calls.join(' ')} };`;
  return { source: `${prelude}${functions.join(' ')} ${main}`, features };
};
