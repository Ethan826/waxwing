// R0 a-min tranche 1 regression probes for opened rows and indexed
// handled-label positions (Task 18, R033), spread into
// test/regression-r0-amin.mjs. Each reads the recorded effects of a small
// program from the compiler under test.
import { fail, passed, toolkit } from './regression-r0-amin-support.mjs';

const keyOf = JSON.stringify;
const source = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Tick { fn tick(): Unit; }; effect Ask { fn ask(): Unit; }; '
  + 'fn mk(a: Handler(Log), b: Handler(Tick)): Handler(nofail Ask) '
  + 'with pure = handler Ask { ask() => () }; '
  + 'fn one(n: Int): Int with pure = n; '
  + 'fn f(): Unit = { let r = mk; let s = one; let t = one(1); () }; '
  + 'fn main(): Unit = ();';

// Item `item`'s `let` value path, as shaped.
const pathAt = item => keyOf({ root: { InBody: [] }, steps: [
  { Named: ['Block'] }, { Named: ['items'] }, { Index: [item] },
  { Named: ['Let'] }, { Named: ['value'] }] });

const at = (pairs, item) => pairs.find(([path]) =>
  keyOf(path) === pathAt(item))[1];
const recorded = async context => {
  const { entries, fieldsOf } = await toolkit(context);
  const effects = fieldsOf(source, 'f').effects;
  return { instances: entries(effects.instances),
    nodes: entries(effects.nodes) };
};
const lastRow = mty => {
  let rest = mty;
  let row;
  while (rest.MArrow) {
    row = rest.MArrow[1];
    rest = rest.MArrow[2];
  }
  return row;
};
const markOf = mty => keyOf(mty.MHandler[0].mark);

export const openedProbes = {
  // Task 18: a closed own row stays closed at the use (the live checker
  // gives it a fresh tail, `openedRow`).
  'r0-amin-opened-row': async context => {
    const { instances } = await recorded(context);
    const { tail } = at(instances, 2).row;
    if (!tail.Just) fail(`a closed callee row stays ${keyOf(tail)} at a use`);
    passed(context);
  },
  // Task 18: the handled labels of two parameters and the result are
  // three positions (`Opened p i`), not the written marks and not one.
  'r0-amin-opened-indexed': async context => {
    const { instances } = await recorded(context);
    const sig = at(instances, 0);
    const marks = [...sig.parameters, sig.result].map(markOf);
    if (marks.some(mark => !mark.includes('Opened')))
      fail(`a handled label is not opened: ${marks.join(' ')}`);
    if (new Set(marks).size !== 3)
      fail(`three handled labels share Opened positions: ${marks.join(' ')}`);
    passed(context);
  },
  // Task 18: the reference's last stage is the instance's own opened
  // row, not a fresh variable.
  'r0-amin-opened-reused-across-stages': async context => {
    const { instances, nodes } = await recorded(context);
    const same = keyOf(lastRow(at(nodes, 1))) === keyOf(at(instances, 1).row);
    if (!same) fail('the reference\'s last stage is not the instance\'s row');
    passed(context);
  }
};
