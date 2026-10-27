// A marked type's erasure in canonical form (amin tranche 1, Task 3):
// marks, handler clauses and effect rows dropped, the rest as
// Generate/Elab/Recorded.purs records a type (test/r0-canonical.mjs):
// `MData t [] []` a base, any other `MData` an `app`, `MHandler` an
// `app (Handler e)` over its label's arguments, a record's fields in
// label order and its tails in `compareVar` order, an arrow the
// canonical spine (a loop, so a long spine costs no stack).
import { compareVar } from './r0-canonical.mjs';
import { decodePath, decodeType, decodeVar } from './r0-canonical-decode.mjs';

const load = name => import(`../output/${name}/index.js`);
const A = await load('Domain.Recorded.Atom');
const E = await load('Domain.Recorded.Effect');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const handlerHead = effect =>
  decodeType(new A.App(new A.HandlerHead(effect), [])).app.head;

const byLabel = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0);

export const erase = mty => {
  if (mty instanceof E.MBase) return decodeType(new A.Base(mty.value0));
  if (mty instanceof E.MVar) return { tvar: decodeVar(mty.value0) };
  if (mty instanceof E.MRecord) return { record: {
    fields: mty.value0.map(pair => [pair.value0, erase(pair.value1)])
      .sort(byLabel),
    tails: mty.value1.map(decodeVar).sort(compareVar) } };
  if (mty instanceof E.MData)
    return mty.value1.length === 0 && mty.value2.length === 0
      ? { base: { data: mty.value0 } }
      : { app: { head: { data: mty.value0 }, args: mty.value1.map(erase) } };
  if (mty instanceof E.MHandler) return { app: {
    head: handlerHead(mty.value0.effect),
    args: mty.value0.args.map(erase) } };
  if (mty instanceof E.MArrow) return spine(mty);
  throw new Error(`not a marked type: ${mty?.constructor?.name}`);
};

const spine = arrow => {
  const params = [];
  let rest = arrow;
  while (rest instanceof E.MArrow) {
    params.push(erase(rest.value0));
    rest = rest.value2;
  }
  return { fun: { params, result: erase(rest) } };
};

// `effects.nodes` as [canonical path, marked type] pairs.
export const nodesOf = nodes => Maps.toUnfoldable(Unfoldable.unfoldableArray)(
  nodes).map(pair => [decodePath(pair.value0), pair.value1]);
