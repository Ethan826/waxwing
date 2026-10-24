// The equations §13a's audit found unrecorded (O1, O2), added to §4 in
// revision 3.4: each case is judged with the new E1 (`current`) and
// without it (`earlier`, revision 3.3's obligations), beside a control.
// Translated BY HAND, as derived.mjs: which obligations a program
// records is our reading of the cited compiler files, not generator
// output (U6), and only obligations touching the handler's rows and
// marks are translated (the `handle`, `h0` and perform-site obligations
// are left out). A handler image's shape is fixed by the translation;
// its rows (flexible tails the package binds) and mark come from the
// package. Console labels are N (§2).
import { combine, consumption, empty, flex, label, resolve, rigid, row }
  from './rows.mjs';
import { handler, installation } from './handlers.mjs';

// E4 for a literal with one clause row c (Clauses.purs `consumeBare`,
// Frames `aborting`): c into R ignoring marks, into C with marks (C bare;
// these labels carry no arguments beyond a Fail head); a c holding Fail
// gives M ⊑ m. No clause here ends in a rigid row.
const literalE4 = (lit, clause) => [
  consumption({ source: clause, target: lit.inference, marks: false }),
  consumption({ source: clause, target: lit.clauses, marks: true }),
  pkg => ({ ...empty, edges: resolve(clause, pkg).labels
    .some(l => l.eff === 'Fail') ? [['M', lit.mark]] : [] })
];
const literal = handler('Log', 'm', row([], flex('r')), row([], flex('c')));
const clause = row([], flex('c1'));
const main = row([label('Console', 'N')], rigid('amb'));
const fail = mark => label('Fail', mark, ['E']);
const console = label('Console', 'N');

// O1 (§4; ClauseBody.purs:52, `instantiateType`):
//   effect Get(a) { fn get(): a; };
//   fn main(): Unit with Console =
//     with handler Get(Handler(Log with Console)) {
//       get() => handler Log { log(n) => Fail.fail(E) } } {
//       with Get.get() { Log.log(1) } };
// The clause body's type (the literal's) against W, the operation's
// result with the label's arguments, rows closed: `Handler(Log with
// Console)`, handled mark M, R = Console closed, no C. The installation
// reads W (the perform's result type). Control: the inner clause
// `log(n) => Console.print(n)`.
const written = handler('Log', 'M', row([console]));
const clauseResult = deps => ({
  current: combine([...literalE4(literal, clause),
    ...deps.handlerEquality(literal, written),
    ...installation({ handler: written, current: main, frame: 'f' })]),
  earlier: combine([...literalE4(literal, clause),
    ...installation({ handler: written, current: main, frame: 'f' })])
});
const literalRows = labels => ({ c1: row(labels), r: row(labels),
  c: row(labels) });

// O2 (§4; Install.purs:73; Generate/Effect.purs E21):
//   fn main(): Unit with Console = {
//     let h0 = handler Tick { tick() => () };
//     let h = with h0 { handler Log { log(n) => Fail.fail(E) } };
//     with h { Log.log(1) } };
// The `with` node's variable, image I (h shares it: `let` is
// monomorphic), against the body's type (the literal's). The outer
// installation reads I. Control: `log(n) => Console.print(n)`.
const image = handler('Log', 'mi', row([], flex('ri')), row([], flex('ci')));
const withNode = deps => ({
  current: combine([...literalE4(literal, clause),
    ...deps.handlerEquality(image, literal),
    ...installation({ handler: image, current: main, frame: 'f' })]),
  earlier: combine([...literalE4(literal, clause),
    ...installation({ handler: image, current: main, frame: 'f' })])
});
const imageRows = labels => ({ ...literalRows(labels), ri: row(labels),
  ci: row(labels) });

export const equationCases = [
  { name: 'O1 clause body against the operation result',
    obligations: clauseResult,
    packages: {
      honest: { marks: { m: 'M', f: 'M' }, rows: literalRows([fail('N')]) },
      forged: { marks: { m: 'M', f: 'M' }, rows: { c1: row([fail('N')]),
        r: row([console]), c: row([console]) } } },
    expect: { honest: false, honestEarlier: true, forged: false,
      forgedEarlier: false } },
  { name: 'O1 control (clause prints)', obligations: clauseResult,
    packages: { honest: { marks: { m: 'M', f: 'M' },
      rows: literalRows([console]) } },
    expect: { honest: true, honestEarlier: true } },
  { name: 'O2 with node against its body',
    obligations: withNode,
    packages: {
      honest: { marks: { m: 'M', mi: 'M', f: 'M' },
        rows: imageRows([fail('N')]) },
      forged: { marks: { m: 'M', mi: 'N', f: 'N' },
        rows: literalRows([fail('N')]) } },
    expect: { honest: false, honestEarlier: false, forged: false,
      forgedEarlier: true } },
  { name: 'O2 control (clause prints)', obligations: withNode,
    packages: { honest: { marks: { m: 'N', mi: 'N', f: 'N' },
      rows: imageRows([console]) } },
    expect: { honest: true, honestEarlier: true } }
];
