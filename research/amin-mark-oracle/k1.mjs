// K1 cases (statements §13b K1; dossier §18.85; §R6 S2-2): each program's
// obligations are built from recorded inputs (signatures, handler
// literals with flexible R, C and m, clause rows, ambient rows) by the
// builders in handlers.mjs, which pass the injected E2 rigid rule to
// every consumption. `current` is judged under that rule (K1 as adopted,
// rows.mjs `exactRigid`); `earlier` under the withdrawn rule
// (`withdrawnRigid`, revision 3.4's "ρ ends in ϱ"). Translated BY HAND,
// as derived.mjs: our reading of the cited compiler files, not
// generator output (U6); `handle` nodes contribute only their ambient
// row (E11), and the frames' Console handlers are not translated.
import { combine, consumption, flex, label, rigid, row, rowEquality,
  withdrawnRigid } from './rows.mjs';
import { deferral, handler, installation, instantiate, literalE4,
  withFrame } from './handlers.mjs';

const both = build => deps => ({ current: build(deps.rigidRule),
  earlier: build(withdrawnRigid) });
const console = label('Console', 'N');
const fail = label('Fail', 'N', ['E']);

// A handler literal n with flexible R (`r<n>`), C (`k<n>`) and m
// (`m<n>`), one clause row `cl<n>`; `clauseRows` is the honest binding
// of all three rows to the clause's labels (E4's least choice).
const literal = (n, eff, args = []) => ({
  type: handler(eff, `m${n}`, row([], flex(`r${n}`)), row([], flex(`k${n}`)),
    args),
  clause: row([], flex(`cl${n}`)) });
const clauseRows = (n, labels) => ({ [`cl${n}`]: row(labels),
  [`r${n}`]: row(labels), [`k${n}`]: row(labels) });
// E4 for a literal, then E5 installing it under `current`; returns the
// obligations and the body's ambient row (E11).
const installed = (lit, frame, current, rule) => ({
  obligations: [...literalE4(lit.type, [lit.clause], rule),
    ...installation({ handler: lit.type, current, frame, rule })],
  body: withFrame(lit.type, frame, current) });

// A call stage (p7, p6, c3): `fn a(q: Int -> Int with Q + ...e, x: Int):
// Int with A + ...e = q(x)`, called in `main` under literal 1 (outer)
// and literal 2 (inner) with a lambda whose body the case gives. Callee:
// the apply q(x) consumes q's row into a's own row (E2, marks); this is
// where K1 bites (s = Q + e, ρ = A + e). Caller: a instantiated (e
// becomes ε); a's own row consumed into the inner body row; the
// lambda's row λ equals the parameter's row (E1); the lambda body's
// obligations read λ's row.
const callStage = ({ q, own, outer, inner, base, lambdaBody }) => rule => {
  const sig = { params: [{ arrow: row(q, rigid('e')) }],
    own: row(own, rigid('e')), result: { eff: 'Int' } };
  const use = instantiate(sig, { rows: { e: 'ε' } });
  const first = installed(outer, 'f1', base, rule);
  const second = installed(inner, 'f2', first.body, rule);
  const lambda = row([], flex('λ'));
  return combine([
    consumption({ source: sig.params[0].arrow, target: sig.own,
      marks: true, rule }),
    ...first.obligations, ...second.obligations,
    consumption({ source: use.own, target: second.body, marks: true, rule }),
    rowEquality({ left: lambda, right: use.params[0].arrow, marks: true,
      args: true }),
    ...lambdaBody(lambda, rule)]);
};
// `handle { … } { fail(error: E) => … }` in `main: Unit with Console`.
const handled = row([fail, console], rigid('main'));
const deferLog = (lambda, rule) => deferral({ deferred: row([], flex('d')),
  current: lambda, rule });

// p7 (research/amin-k1-probes/p7-call-mark.wxw.txt): Q empty, A = plain Log;
// outer printing Log, inner failing Log; the lambda defers Log.log(7).
// The callee's apply consumes `...e` into `Log + ...e`: K1 refuses it
// whatever the package (rows rigid, no positions). Under the withdrawn
// rule the honest package passes every edge: ε's copy of the outer Log
// (c1, N) is what the deferred Log pairs with, while at run time it
// reaches the inner, failing frame (sim7: `fail(E): E`, exit 1).
const p7 = callStage({ q: [], own: [label('Log', 'M')],
  outer: literal(1, 'Log'), inner: literal(2, 'Log'), base: handled,
  lambdaBody: deferLog });
const callRows = (q, copies, lambdaBodyRows) => ({
  ε: row(copies, rigid('main')), λ: row(q, flex('ε')), ...lambdaBodyRows });
const p7Honest = {
  marks: { m1: 'N', f1: 'N', m2: 'M', f2: 'M', c1: 'N', y: 'N' },
  rows: { ...clauseRows(1, [console]), ...clauseRows(2, [fail]),
    ...callRows([], [label('Log', 'c1'), fail, console],
      { d: row([label('Log', 'y')]) }) } };

// c3 (c3-call-mark-swapped.wxw, accepted today, prints 7 then 1): Q = A
// = `nofail Log`, outer failing, inner printing. The apply's s and ρ are
// equal rows, so K1 holds; the deferred Log pairs with λ's first Log, N.
const c3 = callStage({ q: [label('Log', 'N')], own: [label('Log', 'N')],
  outer: literal(1, 'Log'), inner: literal(2, 'Log'), base: handled,
  lambdaBody: deferLog });
const c3Honest = {
  marks: { m1: 'M', f1: 'M', m2: 'N', f2: 'N', c1: 'M', y: 'N' },
  rows: { ...clauseRows(1, [fail]), ...clauseRows(2, [console]),
    ...callRows([label('Log', 'N')], [label('Log', 'c1'), fail, console],
      { d: row([label('Log', 'y')]) }) } };

// p6 (p6-call-payload.wxw): Q empty, A = Out(Int); outer Out(Text),
// inner Out(Int), both printing; `main` has no `handle`; the lambda
// performs Out.out("hi"), a perform site consuming `Out(Text)` into λ's
// row, where it pairs with ε's copy of the outer Out(Text) (arguments
// equal). K1 refuses the apply; the withdrawn rule accepts, and at run
// time the Text payload reaches the Out(Int) frame (sim6: Go panic).
const outText = mark => label('Out', mark, ['Text']);
const p6 = callStage({ q: [], own: [label('Out', 'M', ['Int'])],
  outer: literal(1, 'Out', ['Text']), inner: literal(2, 'Out', ['Int']),
  base: row([console], rigid('main')),
  lambdaBody: (lambda, rule) => [consumption({ source: row([outText('p')]),
    target: lambda, marks: true, rule })] });
const p6Honest = {
  marks: { m1: 'N', f1: 'N', m2: 'N', f2: 'N', c1: 'N', p: 'N' },
  rows: { ...clauseRows(1, [console]), ...clauseRows(2, [console]),
    ...callRows([], [outText('c1'), console], {}) } };

// The closed-R inclusion control (§R6 S2-2; §18.85 ruling 5):
//   fn st(): Int with Log =
//     with handler State(Int) { get() => 1, put(v) => () } {
//       Log.log(1); State.get() };
// Accepted today (emit exit 0; README). The literal's R, C and m are the
// package's; its two clause rows (`cg`, `cp`) perform nothing. E4 each
// clause into R and C; E5 R into ρ = Log + st's rigid ambient; the
// body's two performs consume `Log` and `State(Int)` into `f State + ρ`.
// With R closed, E5 is an inclusion (no tail condition), so ρ's extra
// Log is allowed: the inclusion K1 leaves. Near miss: R bound to the
// ambient (as N4's written R), refused by K1, accepted by the withdrawn
// rule.
const state = handler('State', 'm', row([], flex('r')), row([], flex('c')),
  ['Int']);
const closedR = rule => {
  const rho = row([label('Log', 'M')], rigid('amb'));
  const body = withFrame(state, 'f', rho);
  const perform = l => consumption({ source: row([l]), target: body,
    marks: true, rule });
  return combine([
    ...literalE4(state, [row([], flex('cg')), row([], flex('cp'))], rule),
    ...installation({ handler: state, current: rho, frame: 'f', rule }),
    perform(label('Log', 'x')), perform(label('State', 'z', ['Int']))]);
};
const closedRows = { cg: row([]), cp: row([]), r: row([]), c: row([]) };
const closedMarks = { m: 'N', f: 'N', x: 'M', z: 'N' };

export const k1Cases = [
  { name: 'closed-R inclusion (S2-2)', obligations: both(closedR),
    packages: { honest: { marks: closedMarks, rows: closedRows },
      forged: { marks: closedMarks,
        rows: { ...closedRows, r: row([], rigid('amb')) } } },
    expect: { honest: true, honestEarlier: true, forged: false,
      forgedEarlier: true } },
  { name: 'call stage, deferred Log (K1, p7)', obligations: both(p7),
    packages: { honest: p7Honest },
    expect: { honest: false, honestEarlier: true } },
  { name: 'call stage control (c3, equal rows)', obligations: both(c3),
    packages: { honest: c3Honest },
    expect: { honest: true, honestEarlier: true } },
  { name: 'call stage, payload (K1, p6)', obligations: both(p6),
    packages: { honest: p6Honest },
    expect: { honest: false, honestEarlier: true } }
];
