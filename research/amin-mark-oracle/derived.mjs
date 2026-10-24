// Derivation cases (§R5 F1 and S3; dossier §18.82 condition 5): the
// obligations are built from recorded inputs (handler types, signatures,
// rows whose flexible tails a package binds) by the injected
// `handlerEquality` and `derivedC` (handlers.mjs), then judged as in
// cases.mjs. Each program is translated BY HAND: which obligations a
// program records is our reading of the cited compiler files, not
// generator output (that is U6), and only obligations touching the
// marks and tails in question are translated. Signature rows end in the
// declaration's implicit rigid ambient row unless written `pure` or with
// a spread (effects design, "Signatures"; Resolve/Row.purs `resolveRow`).
import { combine, consumption, flex, keysIncluded, label, rigid, row,
  rowEquality } from './rows.mjs';
import { deferral, handler, installation, instantiate,
  revision32Equality, withFrame } from './handlers.mjs';

// Attempt A: `fn f(h: Handler(nofail Ask with Log)): Unit with Log =
// with h { Ask.ask() }; fn g(h2: Handler(nofail Ask with nofail Log)):
// Unit with Log = f(h2);`. At the call: E1 between f's parameter type,
// instantiated (f's ambient becomes α; its handled label is written N,
// so not opened; no C: only a top-level result gets one) and h2's
// written type (g's ambient rigid `g`); E2 consumes f's own row into
// g's. Neither type owns a C, so R is compared with marks: Log M against
// N. Control: h2 written `Handler(nofail Ask with Log)`.
const fSig = {
  params: [handler('Ask', 'N', row([label('Log', 'M')], rigid('amb')))],
  own: row([label('Log', 'M')], rigid('amb')), result: { eff: 'Unit' } };
const attemptA = h2Log => deps => {
  const f = instantiate(fSig, { rows: { amb: 'α' } });
  const h2 = handler('Ask', 'N', row([label('Log', h2Log)], rigid('g')));
  const own = consumption({ source: f.own, marks: true,
    target: row([label('Log', 'M')], rigid('g')) });
  return {
    current: combine([...deps.handlerEquality(f.params[0], h2), own]),
    earlier: combine([...revision32Equality(f.params[0], h2), own])
  };
};
const aHonest = { marks: {}, rows: { α: row([], rigid('g')) } };

// Attempt B: `fn mk(): Handler(nofail Ask with ...s)`; `fn run(b: Bool,
// g: Handler(nofail Ask with ...r)): Unit with ...r = { let h = if b
// then mk() else g; with h { defer Ask.ask(); () } }`. At mk's use the
// ambient becomes β, s becomes σ, the result's handled label opens to o
// (E3), and `derivedC` gives C = [] + t, t the use's own variable (σ
// occurs in no parameter and not in mk's own row). The `if` result is
// bound to the first branch's type, so h's type is mk()'s and the second
// branch meets it by E1. The frame f; the deferred row d, its mark y.
// Control: g written `with pure`, run `with pure`.
const mkSig = { params: [], own: row([], rigid('amb')),
  result: handler('Ask', 'N', row([], rigid('s'))) };
const attemptB = gTail => deps => {
  const use = instantiate(mkSig, { rows: { amb: 'β', s: 'σ' },
    opened: { result: 'o' } });
  const mk = deps.derivedC(use, 't');
  const g = handler('Ask', 'N', row([], gTail));
  const rho = row([], gTail);
  const shared = [consumption({ source: use.own, target: rho, marks: true }),
    ...installation({ handler: mk, current: rho, frame: 'f' }),
    ...deferral({ deferred: row([], flex('d')),
      current: withFrame(mk, 'f', rho) })];
  return {
    current: combine([...deps.handlerEquality(mk, g), ...shared]),
    earlier: combine([...revision32Equality(mk, g), ...shared])
  };
};
const rTail = row([], rigid('r'));
const deferAsk = row([label('Ask', 'y')]);
const bHonest = { marks: { o: 'N', f: 'M', y: 'M' },
  rows: { β: rTail, σ: rTail, t: rTail, d: deferAsk } };
const bForged = { marks: { o: 'N', f: 'N', y: 'N' },
  rows: { β: rTail, σ: rTail, d: deferAsk } };
const bControl = { marks: { o: 'N', f: 'N', y: 'N' },
  rows: { β: row([]), σ: row([]), d: deferAsk } };

// E2's rigid-tail rule: `fn st(h: Handler(State(Int))): Int = { let k =
// fn(u: Unit) => with h { State.get() }; k(()) }`. h's R is st's rigid
// ambient alone; the lambda's row λ is the installation's ρ (E11). R
// consumed into λ needs λ to end in the ambient; k(()) consumes λ into
// st's row. Earlier: the keys-only inclusion the N4 translation checked.
const hState = handler('State', 'M', row([], rigid('amb')), null,
  ['Int']);
const rigidTail = deps => {
  const lambda = row([], flex('λ'));
  const call = consumption({ source: lambda, target: row([], rigid('amb')),
    marks: true });
  const [, ...frames] = installation({ handler: hState, current: lambda,
    frame: 'f' });
  return {
    current: combine([...installation({ handler: hState, current: lambda,
      frame: 'f' }), call]),
    earlier: combine([keysIncluded({ source: hState.inference,
      target: lambda }), ...frames, call])
  };
};

// N4 (replacing the set tautology): `fn st(h: Handler(State(Int))): Int
// with Log = with h { State.get() }`: R (the ambient alone) consumed into
// ρ = Log + the ambient, ignoring marks (E5, inclusion with the
// rigid-tail rule); revision 3.1 said R ≡ ρ ignoring marks.
export const inclusionN4 = (() => {
  const rho = row([label('Log', 'M')], rigid('amb'));
  const [, ...frames] = installation({ handler: hState, current: rho,
    frame: 'f' });
  return {
    current: combine(installation({ handler: hState, current: rho,
      frame: 'f' })),
    earlier: combine([rowEquality({ left: hState.inference, right: rho,
      marks: false, args: true }), ...frames])
  };
})();

export const derivedCases = [
  { name: 'attempt A (F1: R marks, no C)', obligations: attemptA('N'),
    packages: { honest: aHonest, forged: { marks: {}, rows: { α: row([]) } } },
    expect: { honest: false, honestEarlier: true, forged: false } },
  { name: 'attempt A control (h2 plain Log)', obligations: attemptA('M'),
    packages: { honest: aHonest }, expect: { honest: true } },
  { name: 'attempt B (F1: C ≡ C tail)', obligations: attemptB(rigid('r')),
    packages: { honest: bHonest, forged: bForged },
    expect: { honest: false, forged: false, forgedEarlier: true } },
  { name: 'attempt B control (no rigid tail)', obligations: attemptB(null),
    packages: { honest: bControl }, expect: { honest: true } },
  { name: 'rigid tail into a lambda row (E2)', obligations: rigidTail,
    packages: { honest: { marks: { f: 'M' },
      rows: { λ: row([], rigid('amb')) } },
    forged: { marks: { f: 'M' }, rows: { λ: row([]) } } },
    expect: { honest: true, forged: false, forgedEarlier: true } }
];
