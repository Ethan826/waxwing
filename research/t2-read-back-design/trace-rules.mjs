// The design's read-back rules for traced roles (§C's table), as the
// research probe applies them: a recorded variable or position at path
// p is read from the trace entry whose key is the span of the raw body
// node at p (ReadBack/Walk.purs `nodeAt`), then resolved through the
// final substitution and mark store. Research only.
//   EffInst v      use entry: meta base + v (Scheme `instantiate`)
//   Instantiated k use entry: mark meta base + variables + index of k
//   OpenedRow      use entry: `row`'s tail, when `openedRow` minted it
//   Opened i       use entry: field i's (i = count: the result's) mark
//   Stage k        use node: `rows[k]` (k < count − 1, `stages`);
//                  Apply node: the k-th applied stage's consumed row;
//                  Pipe node: the row the left operand's stage consumed
import { load } from '../../test/r0-generate-support.mjs';
import { markText, rowText } from '../t2-read-back-inventory/match.mjs';
import { named } from '../t2-read-back-inventory/shape.mjs';

const Walk = await load('Features.Check.Strategy.ReadBack.Walk');
const Scheme = await load('Features.Check.Scheme');
const Type = await load('Domain.Type.Core');
const Row = await load('Domain.Row');
const Checked = await load('Domain.Checked.Internal');
const Holes = await load('Features.Check.Holes');
const { Just } = await load('Data.Maybe');

const useKinds = new Set(['Call', 'Construct', 'FunctionRef', 'CtorRef',
  'OperationRef', 'Perform']);
const spanKey = span => `${span.start.offset}-${span.end.offset}`;

const push = (map, key, value) => {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
};

export const indexOf = entries => {
  const index = { uses: new Map(), applies: new Map(), pipes: new Map() };
  for (const e of entries) {
    if (e.site === 'use') push(index.uses, e.span, e);
    if (e.site === 'apply') push(index.applies, e.span, e.row);
    if (e.site === 'pipe') push(index.pipes, e.span, e.row);
  }
  return index;
};

const rowValue = (item, row) => {
  const resolved = Scheme.resolved(item.live.state.subst)(
    new Type.TFun(Type.TUnit.value, row, Type.TUnit.value)).value1;
  return rowText(item.live.state.subst.marks, resolved.value0,
    resolved.value1);
};
const rowRead = (item, row) => ({ text: rowValue(item, row), row });
const tailRow = meta => new Row.Row([], new Just(new Checked.Hole(meta)));
const markValue = (item, mark) => markText(item.live.state.subst.marks, mark);

const nodeOf = (item, path) => {
  if (named(path.root) !== 'InBody') return null;
  const found = Walk.nodeAt(new Walk.AtExpr(item.live.raw))(path.steps);
  if (named(found) !== 'Just' || !(found.value0 instanceof Walk.AtExpr))
    return null;
  return found.value0.value0.value0;
};

const none = (why, mechanism = 'none') => ({ why, mechanism });
const one = (list, why) => (list === undefined ? none(`${why}: no entry`)
  : list.length > 1 ? none(`${why}: ${list.length} entries`) : list[0]);

const fromUse = (item, use, subject) => {
  const role = named(subject) === 'EffFresh' ? named(subject.value1)
    : named(subject);
  const { scheme, row, rows, fields, result } = use.use;
  const marks = scheme.base + use.variables;
  switch (role) {
  case 'EffInst':
    return rowRead(item, tailRow(scheme.base + subject.value1.value0));
  case 'Instantiated': {
    const at = use.markNames.indexOf(subject.value1);
    return at < 0 ? none('mark name absent') : { text: markValue(item,
      new Row.MarkMeta(marks + at)) };
  }
  case 'OpenedRow': {
    const tail = row.value1;
    const opened = marks + use.markNames.length;
    return named(tail) === 'Just' && tail.value0 instanceof Checked.Hole
      && tail.value0.value0 === opened
      ? rowRead(item, tailRow(opened)) : none('row not opened');
  }
  case 'Opened': {
    const ty = subject.value1 < fields.length ? fields[subject.value1]
      : result;
    return named(ty) === 'THandler' ? { text: markValue(item,
      ty.value0.value2) } : none('not a handler type');
  }
  default: {
    const k = subject.value1.value0;
    return k < rows.length - 1 ? { ...rowRead(item, rows[k]),
      mechanism: 'use stages' } : none('stage past the use', 'use stages');
  }
  }
};

// The k-th arrow row of a callee's type, resolved (a cross-check only).
const calleeRow = (item, ty, k) => {
  let at = Scheme.resolved(item.live.state.subst)(ty);
  for (let i = 0; i < k && named(at) === 'TFun'; i += 1) at = at.value2;
  return named(at) === 'TFun' ? rowValue(item, at.value1) : null;
};
const crossed = (item, ty, k, text) => {
  const expected = calleeRow(item, ty, k);
  return expected === null ? 'callee row: no arrow'
    : expected === text ? 'callee row: equal' : 'callee row: differs';
};

// Stage k at an Apply or Pipe node: the consumed row of that stage,
// checked against the k-th row of the applied value's type.
const fromApplied = (item, index, node, k) => {
  if (named(node.node) === 'Pipe') {
    const rows = index.pipes.get(spanKey(node.node.value0.value0.span));
    if (rows === undefined || rows.length !== 1)
      return none('pipe: no single entry', 'pipe row');
    const text = rowValue(item, rows[0]);
    return { text, row: rows[0], mechanism: 'pipe row',
      cross: `pipe ${crossed(item, node.node.value1.value0.ty, 0, text)}` };
  }
  const rows = index.applies.get(spanKey(node.span));
  if (rows === undefined || k >= rows.length)
    return none('apply: no entry', 'apply rows');
  const text = rowValue(item, rows[k]);
  return { text, row: rows[k], mechanism: 'apply rows',
    cross: `apply ${crossed(item, node.node.value0.value0.ty, k, text)}` };
};

// The metas of a raw row after the final substitution: its tail's and
// those in its labels' arguments (Holes.purs `foldHoles`'s order).
export const rowMetas = (item, row) => {
  const resolved = Scheme.resolved(item.live.state.subst)(
    new Type.TFun(Type.TUnit.value, row, Type.TUnit.value));
  return Holes.foldHoles(found => meta => [...found, meta])([])(resolved);
};

export const readRole = (item, index, subject) => {
  const node = nodeOf(item, subject.value0);
  if (node === null) return none('no body node');
  const kind = named(node.node);
  const stage = named(subject) === 'EffFresh'
    && named(subject.value1) === 'Stage';
  if (stage && kind === 'Lambda') return none('lambda', 'lambda type');
  if (stage && (kind === 'Apply' || kind === 'Pipe'))
    return fromApplied(item, index, node, subject.value1.value0);
  if (!useKinds.has(kind) && kind !== 'Apply')
    return none(`node ${kind}`, `node ${kind}`);
  const found = one(index.uses.get(spanKey(node.span)), 'use');
  if (found.why !== undefined) return found;
  const read = fromUse(item, found, subject);
  return { mechanism: 'use', ...read };
};
