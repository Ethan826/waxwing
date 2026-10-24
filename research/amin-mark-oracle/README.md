# U1's bounded oracle: mark terms against FX008's path criterion

Evidence for U1 of docs/plans/r0-amin-statements.md (§5): on
mark-constraint graphs of FX008's shape, a package of normalized mark
terms passing `holds` on every edge, with equalities taken as classes,
exists exactly when FX008's step-5 path criterion accepts. **Bounded
evidence, not a proof**; it does not test that generation produces
FX008's graph (U6).

- `oracle.mjs`: three verdicts per graph: `path` (FX008 step 5 after
  merging equalities; two different constants in one class clash),
  `sem` (for every valuation of the rigid marks, a two-point assignment
  satisfying every edge exists, by brute force) and `least` (the least
  term per equality class, then `holds`), the last built from an
  injected construction and `holds`.
- `families.mjs`: the graph families, each run against injected
  implementations.
- `cases.mjs`: the forgery cases of §12, translated by hand into their
  mark obligations, each judged under revision 3.2's obligations and
  under the earlier set that had the hole, beside an honest control.
  It also runs the derived cases, with the constructions injected.
- `rows.mjs`: recorded rows as small data (labels with marks, tails
  closed, rigid or a flexible variable the package binds), and the
  obligations on them: E1 row equality, E2 consumption (with the
  rigid-tail rule) and the keys-only inclusion it replaces.
- `handlers.mjs`: handler types, and the two constructions a-min's
  trusted code performs, each written once and injected:
  `handlerEquality` (E1 on two handler types, dossier §18.82 condition
  1, from Unify.purs `unifyHeads` and `unifyInference` and
  UnifyParts.purs `handledMarks` and `unifyClauses`) and `derivedC` (the
  ResultC, from ResultClauses.purs `ownClauses`); also `instantiate` (a
  callee's signature at one use, with MarkUse `openHandlers`), E5's
  `installation` and E6's `deferral`.
- `derived.mjs`: cases whose obligations are built from recorded inputs
  by `handlerEquality` and `derivedC` (§R5 F1 and S3): attempts A and
  B with controls, E2's rigid-tail rule, and N4 rebuilt from rows.
- `equations.mjs`: the E1s revision 3.4 adds (statements §4, O1 and
  O2 of §13a): a clause body against the operation's result, and a
  `with` node against its body, each judged with and without the
  equation, beside a control.
- `run.mjs`: the real implementations; must show no disagreement.
- `u7.mjs`: U7's own correspondence check (statements §11), run on its
  own (`node u7.mjs`, about 7 s): the as-built alias of a written
  handler type against FX008's structural-copy C, over a grammar fixed
  before the first run (in the file's header), with O4's rule K as a
  variant and two mutants. Result (2026-10-24): rule J agrees with the
  design on all 4,327,668 pair-package evaluations of 197,676 pairs;
  rule K is wider on 12,024 evaluations (3,741 pairs, none with E4′'s
  recorded C shape); both mutants detected. Bounded; the agreement is
  close to definitional, so the mutants carry its power.
- `mutants.mjs`: five wrong implementations injected into the same
  families and cases; each must be detected.

## Result (2026-10-24, `node run.mjs`, about 83 s)

```text
pairs36: {"pairs":36}, 0 disagreements
one: {"graphs":5242880,"accepted":5248}, 0 disagreements
two: {"graphs":12058624,"accepted":102752}, 0 disagreements
random: {"graphs":200000,"accepted":7690}, 0 disagreements
sound: {"refusedGraphs":2562208,"refusedTried":17776800,
  "refusedPassing":0,"acceptedGraphs":59232,"acceptedTried":573280,
  "acceptedPassing":93696}, 0 disagreements
case cleanup (§7a): {"honest":false,"honestEarlier":false,
  "forged":false,"forgedEarlier":true}
case cleanup control (nofail Log): {"honest":true,"honestEarlier":true}
case owned C forged empty (N1): {"honest":false,"honestEarlier":false,
  "forged":false,"forgedEarlier":true}
case owned C control (caller nofail Log): {"honest":true,
  "honestEarlier":true}
case owned C, m Opened (N1): {"honest":false,"honestEarlier":false,
  "forged":false,"forgedEarlier":true}
case owned C, m Opened, control: {"honest":true,"honestEarlier":true}
case let-bound failing handler (N5): {"honest":false,
  "honestEarlier":false,"forged":false,"forgedEarlier":true}
case let-bound handler control (no fail): {"honest":true,
  "honestEarlier":true}
case inclusion with extra effects (N4): {"honest":true,
  "honestEarlier":false}
case attempt A (F1: R marks, no C): {"honest":false,"honestEarlier":true,
  "forged":false,"forgedEarlier":false}
case attempt A control (h2 plain Log): {"honest":true,
  "honestEarlier":true}
case attempt B (F1: C ≡ C tail): {"honest":false,"honestEarlier":false,
  "forged":false,"forgedEarlier":true}
case attempt B control (no rigid tail): {"honest":true,
  "honestEarlier":true}
case rigid tail into a lambda row (E2): {"honest":true,
  "honestEarlier":true,"forged":false,"forgedEarlier":true}
case O1 clause body against the operation result: {"honest":false,
  "honestEarlier":true,"forged":false,"forgedEarlier":false}
case O1 control (clause prints): {"honest":true,"honestEarlier":true}
case O2 with node against its body: {"honest":false,
  "honestEarlier":false,"forged":false,"forgedEarlier":true}
case O2 control (clause prints): {"honest":true,"honestEarlier":true}
no disagreement
```

(Long lines are wrapped here; the program prints each on one line.)
In a case line, `honest` and `forged` are the packages' verdicts under
the current obligations, and the `Earlier` keys their verdicts under
the earlier set: revision 3 or 3.1 for the first cases, revision 3.2's
E1 (marks ignored on every R, no C ≡ C) for attempts A and B, the
keys-only inclusion for the rigid-tail case, and revision 3.3's
obligations (no O1 or O2 equation) for the O1 and O2 cases.

Derived cases (each obligation built from recorded inputs):
- attempt A: `f(h: Handler(nofail Ask with Log))` called with
  `h2: Handler(nofail Ask with nofail Log)`. Neither parameter type
  owns a C, so R is compared with marks and Log M against N refuses the
  honest package; revision 3.2's E1 accepts it. The forged package
  (f's instantiated ambient bound to the closed row) is refused under
  both. Control: h2 written with a plain `Log`, accepted.
- attempt B: `let h = if b then mk() else g`, `mk():
  Handler(nofail Ask with ...s)`, `g: Handler(nofail Ask with ...r)`,
  then `with h { defer Ask.ask(); () }` in a function `with ...r`.
  `derivedC` gives mk()'s C a tail of the use's own, and C ≡ C makes
  that tail `...r`, so the frame is M (FrameRigid) and the `defer`'s
  demand refuses the honest package. A ResultC tail left unbound
  (closed) is refused by C ≡ C; revision 3.2's E1 accepts it. Control:
  g and the function `with pure`, accepted.
- rigid tail: `fn st(h: Handler(State(Int))): Int = { let k = fn(u:
  Unit) => with h { State.get() }; k(()) }`. R ends in st's rigid
  ambient row, so the lambda's row must too: honest accepted, a lambda
  row bound to the closed row refused, and accepted by the keys-only
  inclusion.
- N4 now consumes R into `Log + ...` through E5's rows (the old set
  test never read a tail).
- O1: `with handler Get(Handler(Log with Console)) { get() => handler
  Log { log(n) => Fail.fail(E) } } { with Get.get() { Log.log(1) } }`
  in `main`. The literal's R and C hold `Fail(E)` (E4); the new E1
  equates its type with `Handler(Log with Console)`, rows closed, which
  the installation reads. The honest package is refused with the
  equation and accepted without it; a package hiding `Fail(E)` from R
  is refused by E4 either way. Control: the clause prints.
- O2: `let h = with h0 { handler Log { log(n) => Fail.fail(E) } }; with
  h { Log.log(1) }` in `main`. The image of the `with` node (shared by
  h) forged with R and C closed and m N passes without the new E1 and
  is refused with it; the honest image is refused either way (R's
  `Fail(E)` is not in main's row). Control: the clause prints.
- `owned C, m Opened`: the N1 graph with the handled mark as the
  `Opened` position o (E3) instead of the constant N; same verdicts.
  The N1 graph keeps its hard-coded derived C, as the author asked
  (§18.82 condition 5).

Families:
- `pairs36`: all 36 ordered pairs of the six spellings over two rigid
  marks (`J ∅` included): `holds` against the meaning over all four
  valuations (the author's check of §18.78, now in the repository).
- `one`: one flexible position, every subset of the 20 directed edges
  among it and the atoms N, M, k1, k2 (atom-to-atom included), times no
  equality or an equality with each atom.
- `two`: two flexible positions, every subset of the 18 edges touching
  them, times none, one or two of the nine single equalities (46
  options).
- `random`: 200,000 seeded graphs with three or four positions, edges
  among all nodes, and up to four equalities (constant clashes
  included).
- `sound`: on the two-position family with at most one equality, every
  term assignment (five terms per free class): on graphs whose meaning
  fails, assignments tried and passing (must be 0); on graphs whose
  meaning holds, assignments tried and passing, reported separately.

## Detection (`node mutants.mjs`, about 74 s)

```text
ground: pairs36 10, one 281472, cases 0 (detected)
unnormalized: pairs36 1 (detected)
perPosition: two 6240, random 120 (detected)
noClauseEq: cases 1 (detected)
rMarksIgnored: cases 1 (detected)
```

(Only the summary lines are shown; the program also prints each case
line for the mutants that run cases, marking a changed verdict
`UNEXPECTED`.)

`ground` reads every rigid mark as N; `unnormalized` omits `norm`;
`perPosition` computes least terms per position instead of per class
(review 3's T1-a). The forgery cases hold no rigid marks, so `ground`
does not change them; the families detect it. `noClauseEq` drops
C ≡ C from `handlerEquality`: attempt B's forgery passes. `rMarksIgnored`
ignores R's marks when neither type owns a C: attempt A's honest
package passes.

Limits: two rigid marks; at most four flexible positions. The cases,
derived ones included, are hand translations of programs into
obligations, not compiler output: which obligations a program records
is our reading of the cited compiler files, and only the obligations
touching the marks and tails in question are translated. `derivedC`
and `handlerEquality` are translations of the compiler's code, checked
here only on these few cases. E2 is judged on fully resolved rows, as
the statements' §4 now states it (revision 3.4, K4): a binding of a
source's tail variable contributes labels of the completed source,
matched like the rest; no remainder equation is checked. Bounded
evidence about these graphs and cases only.
