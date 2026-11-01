// A2 Task 13, M-B: recorded marked types read under a settled completed
// package P_c, for the collector (test/r0-a2-mb-collector.mjs; split
// from it for the line limit, and written, like it, without reading
// src/Features/Check/Strategy/Effects/*.purs). Spec §2.2: a recorded
// mark `Written FixedN ↦ N`, `FixedM ↦ M`, `FixedRigid k ↦ J {k}`,
// `At pos` the position's own node (pinned to `marks[pos]` later); a
// label inside a binding carries its term as a constant. A flexible
// variable reads its binding; a row's tail variable appends its
// binding's labels (statements §4, "Tails"); a record-row tail unfolds
// (O6). Output: plain objects, `{ t, ... }` types and `{ labels, tail }`
// rows, a label `{ effect, args, mark }` with `mark` a graph node.
import { shape } from './regression-r0-amin-support.mjs';
import { constant } from './r0-a2-mb-graph.mjs';

const name = value => JSON.stringify(shape(value));
const kind = value => value.constructor.name;
const fixed = { FixedN: () => 'N', FixedM: () => 'M',
  FixedRigid: value => [value.value0] };

export const reader = (m, pc, gap) => {
  const lookup = (ord, key, map) => {
    const found = m.Maps.lookup(ord)(key)(map);
    return kind(found) === 'Just' ? found.value0 : undefined;
  };
  const term = value => kind(value) === 'TermN' ? 'N'
    : kind(value) === 'TermM' ? 'M'
      : m.Sets.toUnfoldable(m.Unfoldable.unfoldableArray)(value.value0);
  const effect = ref => kind(ref) === 'UserEffect' ? `e${ref.value0}`
    : kind(ref) === 'FailEffect' ? 'Fail' : 'Console';
  const markAt = position => `p:${name(position)}`;
  const markNode = ref => kind(ref) === 'At' ? markAt(ref.value0)
    : constant(fixed[kind(ref.value0)](ref.value0));
  const base = value => kind(value) === 'DataBase'
    ? { t: 'data', id: value.value0, args: [], rows: [] }
    : { t: 'base', b: kind(value) };
  const pRow = row => ({ labels: row.labels.map(pLabel),
    tail: kind(row.tail) === 'Nothing' ? null
      : kind(row.tail.value0) === 'PTailRigid'
        ? `r${row.tail.value0.value0}` : 'hole' });
  const tailRow = tail => {
    if (tail === undefined) return { labels: [], tail: null };
    if (kind(tail) === 'EffRigid')
      return { labels: [], tail: `r${tail.value0}` };
    const bound = lookup(m.Effect.ordEVar, tail, pc.effects);
    if (bound !== undefined) return pRow(bound);
    gap(`unbound ${name(tail)}`);
    return { labels: [], tail: 'unbound' };
  };
  const mRow = row => {
    const rest = tailRow(kind(row.tail) === 'Just' ? row.tail.value0
      : undefined);
    return { labels: [...row.labels.map(mLabel), ...rest.labels],
      tail: rest.tail };
  };
  const mLabel = item => ({ effect: effect(item.effect),
    args: item.args.map(mTy), mark: markNode(item.mark) });
  const pLabel = item => ({ effect: effect(item.effect),
    args: item.args.map(pTy), mark: constant(term(item.mark)) });
  const fieldsOf = (fields, read) => fields.map(pair =>
    [pair.value0, read(pair.value1)]);
  const record = (fields, tails) => tails.reduce((made, variable) => {
    const bound = lookup(m.Atom.ordVar, variable, pc.rows);
    if (bound === undefined)
      return { ...made, tails: [...made.tails, name(variable)] };
    const inner = record(fieldsOf(bound.fields, pTy), bound.tails);
    return { t: 'record', fields: [...made.fields, ...inner.fields],
      tails: [...made.tails, ...inner.tails] };
  }, { t: 'record', fields, tails: [] });
  const handler = (item, rows, label, row) => ({ t: 'handler',
    label: label(item), inference: row(rows.inference),
    clauses: kind(rows.clauses) === 'Just' ? row(rows.clauses.value0)
      : null });
  const variable = value => {
    const bound = lookup(m.Atom.ordVar, value, pc.types);
    return bound === undefined ? { t: 'var', v: name(value) } : pTy(bound);
  };
  const mTy = ty => ({
    MBase: () => base(ty.value0),
    MVar: () => variable(ty.value0),
    MArrow: () => ({ t: 'arrow', a: mTy(ty.value0), row: mRow(ty.value1),
      r: mTy(ty.value2) }),
    MRecord: () => record(fieldsOf(ty.value0, mTy), ty.value1),
    MData: () => ({ t: 'data', id: ty.value0, args: ty.value1.map(mTy),
      rows: ty.value2.map(mRow) }),
    MHandler: () => handler(ty.value0, ty.value1, mLabel, mRow)
  })[kind(ty)]();
  const pTy = ty => ({
    PBase: () => base(ty.value0),
    PVar: () => ({ t: 'var', v: name(ty.value0) }),
    PArrow: () => ({ t: 'arrow', a: pTy(ty.value0), row: pRow(ty.value1),
      r: pTy(ty.value2) }),
    PRecord: () => record(fieldsOf(ty.value0.fields, pTy), ty.value0.tails),
    PData: () => ({ t: 'data', id: ty.value0, args: ty.value1.map(pTy),
      rows: ty.value2.map(pRow) }),
    PHandler: () => handler(ty.value0, ty.value1, pLabel, pRow)
  })[kind(ty)]();
  // A position's term in P_c, if it has one.
  const termAt = position => {
    const found = lookup(m.Effect.ordPosition, position, pc.marks);
    return found === undefined ? undefined : term(found);
  };
  return { mTy, mRow, tailRow, markAt, termAt };
};
