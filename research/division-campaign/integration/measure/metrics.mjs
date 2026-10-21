// One function's logged atoms turned into the sizes a signature checker
// faces. Counts are log2 of the number of cases each enumeration tries.
//
// Variables are nodes: `R<i>` a rigid record row, `T<i>` a rigid type
// variable, `m<i>` a record-row meta, `t<i>` a type meta. Each atom is cut
// into groups (one per record level met in step on both sides, the rest
// joined coarsely); a group joins its variables and carries its labels.
// Coarse joining only merges components, so the sliced counts are upper
// bounds on what that slicing gives (a measurement, not a proved lemma).

const kind = value => value?.constructor?.name;

const flexNode = (flex, row) => {
  const index = flex.value0;
  if (kind(flex) === 'Rigid') return `${row ? 'R' : 'T'}${index}`;
  return `${row ? 'm' : 't'}${index}`;
};

// Every variable and record label inside a type, at any depth.
const everything = (ty, into) => {
  switch (kind(ty)) {
    case 'TVar': into.vars.add(flexNode(ty.value0, false)); break;
    case 'TRecord':
      for (const tail of ty.value0.tails) into.vars.add(flexNode(tail, true));
      for (const field of ty.value0.fields) {
        into.labels.add(field.value0);
        everything(field.value1, into);
      }
      break;
    case 'TFun':
      everything(ty.value0, into);
      effectRow(ty.value1, into);
      everything(ty.value2, into);
      break;
    case 'TData':
      ty.value1.forEach(argument => everything(argument, into));
      ty.value2.forEach(row => effectRow(row, into));
      break;
    case 'THandler':
      labelArguments(ty.value0, into);
      effectRow(ty.value1.inference, into);
      if (kind(ty.value1.clauses) === 'Just') {
        effectRow(ty.value1.clauses.value0, into);
      }
      break;
    default: break;
  }
  return into;
};

// An effect row's label arguments may hold records; its tail does not.
const effectRow = (row, into) => {
  for (const label of row.value0) labelArguments(label, into);
};
const labelArguments = (label, into) => {
  for (const argument of label.value1) everything(argument, into);
};

const fresh = () => ({ vars: new Set(), labels: new Set() });

// Groups of an equation: shapes met in step are cut apart; anything
// else is one coarse group of both sides.
const equation = (left, right, groups) => {
  const a = kind(left);
  const b = kind(right);
  if (a === 'TFun' && b === 'TFun') {
    equation(left.value0, right.value0, groups);
    equation(left.value2, right.value2, groups);
    const rows = fresh();
    effectRow(left.value1, rows);
    effectRow(right.value1, rows);
    groups.push(rows);
  } else if (a === 'TRecord' && b === 'TRecord') {
    recordLevel([left.value0, right.value0], groups);
  } else if (a === 'TData' && b === 'TData' && left.value0 === right.value0 &&
    left.value1.length === right.value1.length) {
    left.value1.forEach((argument, index) =>
      equation(argument, right.value1[index], groups));
    const rows = fresh();
    left.value2.forEach(row => effectRow(row, rows));
    right.value2.forEach(row => effectRow(row, rows));
    groups.push(rows);
  } else if (a === b && ['TInt', 'TBool', 'TUnit', 'TText'].includes(a)) {
    // ground and equal: no group
  } else {
    const both = everything(left, fresh());
    everything(right, both);
    groups.push(both);
  }
};

// Record levels in step: one group of every label and tail at this level;
// a label on every side has its field types in step, a label missing on
// some side lands in a tail, so its field type joins the level's group.
const recordLevel = (rows, groups) => {
  const level = fresh();
  const byLabel = new Map();
  for (const row of rows) {
    for (const tail of row.tails) level.vars.add(flexNode(tail, true));
    for (const field of row.fields) {
      level.labels.add(field.value0);
      if (!byLabel.has(field.value0)) byLabel.set(field.value0, []);
      byLabel.get(field.value0).push(field.value1);
    }
  }
  for (const types of byLabel.values()) {
    if (types.length === rows.length && rows.length === 2) {
      equation(types[0], types[1], groups);
    } else {
      types.forEach(type => everything(type, level));
    }
  }
  groups.push(level);
};

// The groups of one atom, each tagged D (the body's hypotheses: a fact
// seeded on rigid tails) or B (everything else).
const atomGroups = (atom, keysOf) => {
  const groups = [];
  switch (atom.kind) {
    case 'eq': equation(atom.left, atom.right, groups); break;
    case 'lacks': {
      const group = fresh();
      group.vars.add(flexNode(atom.tail, true));
      const labels = atom.table ? keysOf(atom.table) : atom.labels;
      labels.forEach(label => group.labels.add(label));
      groups.push(group);
      break;
    }
    case 'apart': {
      const group = fresh();
      group.vars.add(flexNode(atom.one, true));
      group.vars.add(flexNode(atom.other, true));
      groups.push(group);
      break;
    }
    case 'merge':
      recordLevel([atom.left, atom.right, atom.result], groups);
      break;
    default: break;
  }
  return groups;
};

const isD = atom => atom.origin === 'seed' &&
  (atom.kind === 'lacks' ? kind(atom.tail) === 'Rigid'
    : kind(atom.one) === 'Rigid' && kind(atom.other) === 'Rigid');

// log2 of a sum of powers of two given by their exponents.
const log2Sum = exponents => {
  if (exponents.length === 0) return null;
  const top = Math.max(...exponents);
  return top + Math.log2(exponents.reduce((sum, e) => sum + 2 ** (e - top), 0));
};

// For one label: how many subsets of the rigid rows `rows` hold it
// consistently with D (no row lacking it, no two declared-disjoint rows).
const consistentCount = (rows, label, lacks, disjoint) => {
  const allowed = rows.filter(row => !lacks.get(row)?.has(label));
  if (allowed.length > 20) return 2 ** allowed.length;
  let count = 0;
  for (let mask = 0; mask < 2 ** allowed.length; mask++) {
    const chosen = allowed.filter((_, index) => mask & (1 << index));
    const clash = chosen.some(one => chosen.some(other =>
      one < other && disjoint.has(`${one}|${other}`)));
    if (!clash) count++;
  }
  return count;
};

class Components {
  constructor() { this.parent = new Map(); }
  find(node) {
    if (!this.parent.has(node)) this.parent.set(node, node);
    const up = this.parent.get(node);
    if (up === node) return node;
    const top = this.find(up);
    this.parent.set(node, top);
    return top;
  }
  join(nodes) {
    const [first, ...rest] = nodes;
    for (const node of rest) this.parent.set(this.find(node), this.find(first));
  }
}

export const measureFunction = (definition, atoms, keysOf) => {
  const sorts = definition.sorts.map(sort => kind(sort));
  const rigidRows = sorts.flatMap((sort, index) =>
    sort === 'RecordSort' ? [`R${index}`] : []);
  const rigidTypes = sorts.filter(sort => sort === 'TypeSort').length;
  const groups = [];
  const lacks = new Map();
  const disjoint = new Set();
  const counts = { eq: 0, lacks: 0, apart: 0, merge: 0, D: 0 };
  const merges = new Set();
  for (const atom of atoms) {
    // Seeding passes every tail a table, empty when its types imply none.
    if (atom.kind === 'lacks' && atom.table &&
      keysOf(atom.table).length === 0) continue;
    // Chain.purs:49 and :60 apply `predicateFor` twice per predicate and
    // keep one: the same Merge is logged twice, with the same result meta.
    if (atom.kind === 'merge') {
      const key = atom.result.tails.map(tail => flexNode(tail, true)).join();
      if (merges.has(key)) continue;
      merges.add(key);
    }
    counts[atom.kind]++;
    const made = atomGroups(atom, keysOf);
    groups.push(...made);
    if (!isD(atom)) continue;
    counts.D++;
    if (atom.kind === 'lacks') {
      const node = flexNode(atom.tail, true);
      if (!lacks.has(node)) lacks.set(node, new Set());
      made[0].labels.forEach(label => lacks.get(node).add(label));
    } else {
      const pair =
        [flexNode(atom.one, true), flexNode(atom.other, true)].sort();
      disjoint.add(pair.join('|'));
    }
  }
  const labels = new Set(groups.flatMap(group => [...group.labels]));
  const vars = new Set(groups.flatMap(group => [...group.vars]));
  const mentioned = [...vars].filter(node => node.startsWith('R'));
  const flexRows = [...vars].filter(node => node.startsWith('m')).length;
  const flexTypes = [...vars].filter(node => node.startsWith('t')).length;
  const R = rigidRows.length;
  const L = labels.size;
  const consistent = R === 0 ? 0 : [...labels].reduce((sum, label) =>
    sum + Math.log2(consistentCount(rigidRows, label, lacks, disjoint)), 0);

  const parts = new Components();
  for (const group of groups) if (group.vars.size) parts.join([...group.vars]);
  const sliced = new Map();
  for (const group of groups) {
    if (group.vars.size === 0) continue;
    const top = parts.find([...group.vars][0]);
    if (!sliced.has(top)) sliced.set(top, fresh());
    group.vars.forEach(node => sliced.get(top).vars.add(node));
    group.labels.forEach(label => sliced.get(top).labels.add(label));
  }
  const slices = [...sliced.values()].map(slice => ({
    rows: [...slice.vars].filter(node => node.startsWith('R')),
    flex: [...slice.vars].filter(node => node.startsWith('m')).length,
    labels: [...slice.labels]
  })).filter(slice => slice.rows.length > 0);
  const relevant = new Set(slices.flatMap(slice => slice.labels));
  const largest = slices.reduce((top, slice) =>
    Math.max(top, slice.rows.length * slice.labels.length), 0);

  return {
    R, rigidTypes, Rm: mentioned.length, L, Lrelevant: relevant.size,
    flexRows, flexTypes, atoms: counts, slices: slices.length,
    log2: {
      patterns: R * L,
      consistent,
      bitCheck: mentioned.length + flexRows,
      writtenCheck: (mentioned.length + flexRows) * L,
      slicedPatterns: log2Sum(slices.map(s => s.rows.length * s.labels.length)),
      slicedConsistent: log2Sum(slices.map(s => s.labels.reduce(
        (sum, label) => sum +
          Math.log2(consistentCount(s.rows, label, lacks, disjoint)), 0))),
      slicedBitCheck: log2Sum(slices.map(s => s.rows.length + s.flex)),
      slicedWritten: log2Sum(slices.map(s =>
        (s.rows.length + s.flex) * s.labels.length)),
      largestSlice: largest
    }
  };
};
