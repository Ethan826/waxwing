// A recorded marked type (Domain/Recorded/Effect.purs `MTy`) laid over a
// live checked type (Domain/Type/Core.purs `Ty Open`), part by part, so
// that each recorded effect variable and mark position meets the live
// row or mark at the same place. Research only: this is the matching
// the inventory measures with, not a read-back design.
//
// Rows: each recorded label takes the first unused live label of the
// same effect (a Fail label also by its payload's head), so same-key
// order is kept; the live labels left over and the live tail are the
// value of the recorded tail. A closed or rigid recorded tail expects no
// leftover. Marks are read through the final mark store (`markText`).
import { load } from '../../test/r0-generate-support.mjs';
import { keyOf, named } from './shape.mjs';

const { resolveMark } = await load('Features.Check.MarkStore');

// A live mark as text, after the store's bindings: N, M, a rigid
// `k:name`, a meta `m:n` (its class representative) or U (`Unmarked`).
export const markText = (store, mark) => {
  const found = resolveMark(store)(mark);
  switch (named(found)) {
  case 'NoFail': return 'N';
  case 'Plain': return 'M';
  case 'MarkVariable': return `k:${found.value0}`;
  case 'MarkMeta': return `m:${found.value0}`;
  default: return 'U';
  }
};

const tailText = tail => {
  if (named(tail) === 'Nothing') return 'closed';
  const open = tail.value0;
  return named(open) === 'Rigid' ? `rigid:${open.value0}`
    : `meta:${open.value0}`;
};

// A live label as text: effect, arguments, mark.
const labelText = (store, label) => `${keyOf(label.value0)}`
  + `(${label.value1.map(keyOf).join(',')})@${markText(store,
    label.value2)}`;

export const rowText = (store, labels, tail) =>
  `[${labels.map(label => labelText(store, label)).join(' ')}|`
  + `${tailText(tail)}]`;

const sameEffect = (recorded, live) => {
  const effect = recorded.effect;
  if (named(effect) !== named(live.value0)) return false;
  if (named(effect) === 'UserEffect')
    return effect.value0 === live.value0.value0;
  if (named(effect) !== 'FailEffect') return true;
  return headOf(recorded.args[0]) === liveHead(live.value1[0]);
};
const headOf = ty => (ty === undefined ? '?' : named(ty) === 'MBase'
  ? named(ty.value0) : named(ty));
const liveHead = ty => (ty === undefined ? '?' : {
  TInt: 'IntBase', TBool: 'BoolBase', TUnit: 'UnitBase',
  TText: 'TextBase', TData: 'MData', TRecord: 'MRecord',
  TFun: 'MArrow', THandler: 'MHandler', TVar: 'MVar' }[named(ty)]);

// `seen` receives { kind: 'var' | 'pos' | 'rigid' | 'written' | 'miss',
// ... } facts; `where` names the source for every fact.
export const matcher = (store, seen, where) => {
  const fact = item => seen.push({ ...item, where });
  // A recorded part with no live counterpart: its variables and
  // positions are noted as unread here.
  const unread = recorded => {
    if (recorded === null || typeof recorded !== 'object') return;
    if (Array.isArray(recorded)) return recorded.forEach(unread);
    if (named(recorded) === 'EffFresh')
      return fact({ kind: 'unread', variable: recorded });
    if (named(recorded) === 'At')
      return fact({ kind: 'unread', position: recorded.value0 });
    Object.values(recorded).forEach(unread);
  };
  const mark = (recorded, live) => {
    const text = markText(store, live);
    if (named(recorded) === 'At')
      return fact({ kind: 'pos', position: recorded.value0, text });
    fact({ kind: 'written', fixed: recorded.value0, text });
  };
  const row = (recorded, live) => {
    if (live === null) return unread(recorded);
    const labels = live.value0;
    const used = new Set();
    for (const label of recorded.labels) {
      const index = labels.findIndex((each, i) => !used.has(i)
        && sameEffect(label, each));
      if (index < 0) { fact({ kind: 'miss', why: 'label absent' }); continue; }
      used.add(index);
      mark(label.mark, labels[index].value2);
      label.args.forEach((arg, i) => type(arg, labels[index].value1[i]));
    }
    const rest = labels.filter((_, i) => !used.has(i));
    const tail = recorded.tail;
    const text = rowText(store, rest, live.value1);
    if (named(tail) === 'Nothing') {
      if (text !== '[|closed]') fact({ kind: 'miss', why: 'closed vs '
        + text });
      return;
    }
    const variable = tail.value0;
    if (named(variable) === 'EffRigid')
      return fact({ kind: 'rigid', id: variable.value0, text });
    fact({ kind: 'var', variable, text });
  };
  const handler = (recorded, live) => {
    const [label, rows] = [recorded.value0, recorded.value1];
    const [liveLabel, liveRows] = [live.value0, live.value1];
    if (!sameEffect(label, liveLabel))
      return fact({ kind: 'miss', why: 'handler effect' });
    mark(label.mark, liveLabel.value2);
    label.args.forEach((arg, i) => type(arg, liveLabel.value1[i]));
    row(rows.inference, liveRows.inference);
    if (named(rows.clauses) === 'Nothing') return;
    const liveC = named(liveRows.clauses) === 'Just'
      ? liveRows.clauses.value0 : null;
    if (liveC === null) fact({ kind: 'cFromR' });
    row(rows.clauses.value0, liveC ?? liveRows.inference);
  };
  const type = (recorded, live) => {
    if (live === null) return unread(recorded);
    if (recorded === undefined || live === undefined)
      return fact({ kind: 'miss', why: 'arity' });
    switch (named(recorded)) {
    case 'MBase': case 'MVar': return;
    case 'MArrow':
      if (named(live) !== 'TFun') return fact({ kind: 'miss', why: 'arrow' });
      type(recorded.value0, live.value0);
      row(recorded.value1, live.value1);
      return type(recorded.value2, live.value2);
    case 'MRecord':
      if (named(live) !== 'TRecord') return;
      for (const field of recorded.value0) {
        const found = live.value0.fields.find(each =>
          each.value0 === field.value0);
        if (found !== undefined) type(field.value1, found.value1);
      }
      return;
    case 'MData':
      if (named(live) !== 'TData') return fact({ kind: 'miss', why: 'data' });
      recorded.value1.forEach((arg, i) => type(arg, live.value1[i]));
      return recorded.value2.forEach((each, i) => (live.value2[i] === undefined
        ? fact({ kind: 'miss', why: 'data row' }) : row(each, live.value2[i])));
    default:
      if (named(live) !== 'THandler')
        return fact({ kind: 'miss', why: 'handler' });
      return handler(recorded, live);
    }
  };
  return { type, row, mark };
};
