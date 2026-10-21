// Stream 9: two slicings of one function's logged atoms, beside stream
// 7b's (metrics.mjs). Each is a measurement of what a slicing would
// leave; none is a proved lemma (dossier §18.20 item 4: S1 and S2 are
// proposed statements, definitions unreviewed).
//
//   rows    (i)  components over record row variables only: rigid rows
//                and row metas. Type variables connect nothing, nested
//                record levels are cut apart as in 7b, and a `disjoint`
//                clause of D joins nothing.
//   7b           metrics.mjs: row and type variables, nested levels cut
//                apart, D joins.
//   joined  (ii) row and type variables; a record is never cut, so a
//                nested field's variables join the enclosing record's;
//                D's clauses join. Arrows and data types are still
//                matched part by part.
//   solved  (ii) applied to B after the solver's substitution (the last
//                successful top-level `unify`, instrument.mjs): a type
//                meta solved to a ground type joins nothing, and a solved
//                row meta is replaced by its row. This is what a checker
//                of the solver's certificate would face, if slicing were
//                allowed after the certificate is applied.
//
// Groups that hold labels but no variable are ground checks: no slice
// owns them, and they are counted (§18.20 item 4: ground contradictions
// are retained), not dropped.
import { Components, consistentCount, log2Sum } from './counting.mjs';
import { atomGroups, everything, effectRow, fresh, hypotheses, isD, kind,
  keptAtoms } from './metrics.mjs';

const rowNode = node => node.startsWith('R') || node.startsWith('m');

// (i): 7b's groups, keeping only row variables; D's apart pairs split.
const rowGroups = (atom, keysOf) => {
  const groups = atomGroups(atom, keysOf).map(group => ({
    vars: new Set([...group.vars].filter(rowNode)), labels: group.labels
  }));
  if (!(isD(atom) && atom.kind === 'apart')) return groups;
  return [...groups[0].vars].map(node =>
    ({ vars: new Set([node]), labels: new Set() }));
};

// (ii): arrows and same-constructor data types are matched part by part;
// anything else, records included, is one group of both sides entire.
const joinedEquation = (left, right, groups) => {
  const a = kind(left);
  const b = kind(right);
  if (a === 'TFun' && b === 'TFun') {
    joinedEquation(left.value0, right.value0, groups);
    joinedEquation(left.value2, right.value2, groups);
    const rows = fresh();
    effectRow(left.value1, rows);
    effectRow(right.value1, rows);
    groups.push(rows);
  } else if (a === 'TData' && b === 'TData' && left.value0 === right.value0 &&
    left.value1.length === right.value1.length) {
    left.value1.forEach((argument, index) =>
      joinedEquation(argument, right.value1[index], groups));
    const rows = fresh();
    left.value2.forEach(row => effectRow(row, rows));
    right.value2.forEach(row => effectRow(row, rows));
    groups.push(rows);
  } else {
    const both = everything(left, fresh());
    everything(right, both);
    groups.push(both);
  }
};

const record = row => ({ constructor: { name: 'TRecord' }, value0: row });

const joinedGroups = (atom, keysOf) => {
  if (atom.kind === 'eq') {
    const groups = [];
    joinedEquation(atom.left, atom.right, groups);
    return groups;
  }
  if (atom.kind !== 'merge') return atomGroups(atom, keysOf);
  const all = fresh();
  [atom.left, atom.right, atom.result]
    .forEach(row => everything(record(row), all));
  return [all];
};

// (ii) after the substitution: every type of the atom resolved first.
const solvedGroups = (resolve, TVar) => (atom, keysOf) => {
  const ty = flex => resolve(new TVar(flex));
  const record = row => resolve({ constructor: { name: 'TRecord' },
    value0: row });
  if (atom.kind === 'eq') {
    return joinedGroups({ kind: 'eq', left: resolve(atom.left),
      right: resolve(atom.right) }, keysOf);
  }
  const group = fresh();
  if (atom.kind === 'merge') {
    [atom.left, atom.right, atom.result]
      .forEach(row => everything(record(row), group));
  } else if (atom.kind === 'lacks') {
    everything(ty(atom.tail), group);
    (atom.table ? keysOf(atom.table) : atom.labels)
      .forEach(label => group.labels.add(label));
  } else if (atom.kind === 'apart') {
    everything(ty(atom.one), group);
    everything(ty(atom.other), group);
  }
  return [group];
};

const variants = {
  rows: rowGroups,
  '7b': atomGroups,
  joined: joinedGroups
};

// The sliced counts (log2) of one variant: slices holding a rigid row,
// their patterns, consistent patterns, bitCheck and writtenCheck as in
// metrics.mjs; the
// largest flexible-only slice's written search (a call-site region);
// and the ground checks retained.
const sliceCounts = (groups, { lacks, disjoint }) => {
  const parts = new Components();
  for (const group of groups) if (group.vars.size) parts.join([...group.vars]);
  const sliced = new Map();
  let ground = 0;
  for (const group of groups) {
    if (group.vars.size === 0) {
      if (group.labels.size) ground++;
      continue;
    }
    const top = parts.find([...group.vars][0]);
    if (!sliced.has(top)) sliced.set(top, fresh());
    group.vars.forEach(node => sliced.get(top).vars.add(node));
    group.labels.forEach(label => sliced.get(top).labels.add(label));
  }
  const all = [...sliced.values()].map(slice => {
    const rows = [...slice.vars].filter(node => node.startsWith('R'));
    return {
      rows: rows.length,
      flex: [...slice.vars].filter(node => node.startsWith('m')).length,
      labels: slice.labels.size,
      consistent: [...slice.labels].reduce((sum, label) => sum +
        Math.log2(consistentCount(rows, label, lacks, disjoint)), 0)
    };
  });
  const rigid = all.filter(slice => slice.rows > 0);
  const flexOnly = all.filter(slice => slice.rows === 0);
  return {
    slices: rigid.length,
    patterns: log2Sum(rigid.map(s => s.rows * s.labels)) ?? 0,
    consistent: log2Sum(rigid.map(s => s.consistent)) ?? 0,
    bitCheck: log2Sum(rigid.map(s => s.rows + s.flex)) ?? 0,
    writtenCheck: log2Sum(rigid.map(s => (s.rows + s.flex) * s.labels)) ?? 0,
    largest: Math.max(0, ...rigid.map(s => s.rows * s.labels)),
    flexOnlyWritten: Math.max(0, ...flexOnly.map(s => s.flex * s.labels)),
    ground
  };
};

// `solver` = { solved, resolve, TVar }: the substitution and the
// compiler's own `resolve` (Check/Subst.purs:186); without a
// substitution the `solved` variant is left out.
export const measureVariants = (atoms, keysOf, solver) => {
  const kept = keptAtoms(atoms, keysOf);
  const facts = hypotheses(kept, keysOf);
  const chosen = { ...variants };
  if (solver?.solved) {
    chosen.solved = solvedGroups(
      ty => solver.resolve(solver.solved)(ty), solver.TVar);
  }
  return Object.fromEntries(Object.entries(chosen).map(([name, groupsOf]) =>
    [name, sliceCounts(kept.flatMap(atom => groupsOf(atom, keysOf)), facts)]));
};
