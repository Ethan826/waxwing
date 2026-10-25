# a-min: the ResultC tail claim (statements and argument)

Status: **statements and an informal argument only.** No proof, no
implementation, no new proof authorized (dossier §18.87 item 3). Drafted
for §14 decision 3 of docs/plans/r0-amin-statements.md (revision 3.5),
which the author kept open "until its exact claim and supporting
argument are written and reviewed", not settled by analogy with other
tails (§18.86 item 4). Not yet reviewed; §18.87 asks for a bounded
adversarial review next.

**Headline (run).** The claim as the code comment states it is
**false**. §4's program x1 is accepted by today's compiler, and its
compiled run ends a deferred expression in a typed abort, which escapes
the enclosing `handle` as a defect: FX008's abort safety fails on a
compiled program, not a simulation. The channel is a row variable that
occurs only in the result type, but inside the handled label's
arguments, so the caller supplies ϱ-typed values to the clauses as
operation arguments. §5 states a repaired claim with a stronger
hypothesis and §6 argues for it; §10 lists what that argument rests on.

Labels: **universal** (an argument for all inputs), **reasoned** (an
informal argument from the design or the code, checked by no run),
**read** (a fact read from the code at the cited place), **run** (a
verdict or output of today's compiler on the named scratch program),
**bounded** (a check over finite inputs, named), **open**, **proposed**.

Code facts are read at 7476097 (the branch is now 9f547d7, which adds
§18.87 and a test line; no src change). Runs used the worktree's
existing output/ build (no src file is newer than
output/Program.Main/index.js); scratch programs lived outside the
repository and are quoted in full or as a stated diff. The controller
later copied them, unchanged, to research/amin-resultc-probes/ as
`<name>.wxw.txt` (outside the pinned R0 corpus) and reran x1, x1d and
x1c with the same verdicts; x1 is filed as BACKLOG FX033.

## 1. Sources

Read for this document: r0-amin-statements.md §0-§4 (E1, Definition
4.1, E2, Definition 4.2, E4, E4′, E5, E10), §11 (U1-U8), §12, §13a (O1-
O7), §13b (K1, K2), §14; dossier §18.80-§18.87; FX008's design
(docs/plans/2026-10-10-abort-tracking-design.md) §3.1, §3.4, §5;
docs/language.md "Rows", "Handlers", "Cleanup", "Defects"; code:
ResultClauses.purs, Install.purs (`clausesOf`), Frames.purs (`framed`,
`aborting`), Lend.purs (`assume`, `partners`), TailPass.purs, Use.purs
(`openedUse`), DeclarationUse.purs, Stages.purs (`openedRow`),
Format/Go/Effect.purs (`perform`), Format/Go/Context.purs
(`waxwingFind`); research/amin-k1-probes/ (program shapes only).

Skimmed only where cited: Unify.purs, UnifyParts.purs and MarkUse.purs
were read through the statements' §4 and §13a citations, not re-read
line by line here.

Not read (cited for orientation only; nothing here depends on what they
say): Reynolds, "Types, abstraction and parametric polymorphism" (1983);
Wadler, "Theorems for free!" (1989); Biernacki, Piróg, Polesiuk,
Sieczkowski, "Abstracting algebraic effects", POPL 2019; Zhang and
Myers, "Abstraction-safe effect handlers via tunneling", POPL 2019.

## 2. What the rule decides

**The rule (read).** At a use of a top-level function f whose
instantiated result is a handler type `Handler(m L with R)` with no C of
its own, Use.purs `openedUse` calls ResultClauses `ownClauses` after
`openHandlers`. It gives the result a clause row C: R's labels, bare
(`bareLabel`), R's marks kept; C's tail is R's tail meta when that meta
occurs in an instantiated parameter or in the use's opened row (`occurs`
folds over `TFun TUnit row TUnit` and the parameters), otherwise a fresh
meta (`kept`), and closed when R is closed. The `occurs` test looks at
the parameters and the row only, never at the result type itself.
`functionUse` is the only caller (top-level functions, written
signatures); constructors keep their fields as written.

**What C's tail feeds (read).** At `with h { body }` under ρ:
- Frames `framed`: FrameOwn `m ⊑ f`; FrameOuter, for each non-`Fail`
  label of C (walked through its tail binding) paired with a ρ label by
  key and rank (Lend `partners`), `mark(partner) ⊑ f`; FrameRigid, when
  C's end is a rigid variable, `M ⊑ f`.
- The installed-C site (Lend `assume`, settling): for each C label and
  its ρ partner, `mark(ρ partner) ⊑ mark(C label)`. E4 gives
  `mark(C label) ⊑ mark(c_k label)` for each clause row c_k, so these
  edges are where a clause's **assumptions** about outer frames are met
  ([FX008-5] point 2: "a clause runs in its installation's outer
  context"). a-min keeps this site (§4 E2, "installed-C site").
- Definition 4.1(d): C ≡ C′ with marks and tails wherever the type meets
  another handler type.
- R is consumed into ρ ignoring marks (E5), so no mark of R, and none of
  R's tail binding, is compared with ρ's (FX008 §3.4: "R's marks are
  dead").

So a fresh closed tail drops, against R's tail: FrameOuter edges and
assumption edges for every ρ label after Ls's partners, and FrameRigid
when ρ ends in a rigid. The brief named only FrameOuter and FrameRigid;
the assumption edges are the ones §4's counterexample turns on.

**Runtime facts (read).** Dispatch is by effect key, innermost frame
first (Context.purs `waxwingFind`). A clause runs with the context
outside its own frame: `perform` calls the clause with `frame.outer`
(Go/Effect.purs), and `frame.outer` is the context at the `with`
(docs/language.md: "A clause runs in the context of its `with`, without
that handler"). Rows and marks are erased before Go. A typed abort in a
cleanup becomes a defect that no `handle` catches (emitted
`waxwingCleanup` panics `waxwingDefect`; docs/language.md "Defects").

## 3. The claim as written

The code comment: "C's tail is R's only when that variable occurs in a
parameter or in the function's own row, where a caller's handler can
fill it. Elsewhere it is a fresh meta of the callee's alone: by
parametricity its clauses reach nothing else through R's tail."

**Claim RC (the comment, made precise).** For every top-level f with
written signature `∀v̄. (τ_1, …, τ_n) → Handler(m L with Ls + ...ϱ)
with E`, where ϱ is a row variable of f's scheme, ϱ ∉ fv(τ_i) for every
i and ϱ ∉ fv(E); for every well-typed program P using f; for every run
of P, every value v returned by a call of f, and every installation
`with e { body }` at which e evaluates to v, under the static row ρ:

(RC-reach) every operation performed during a run of a clause of v,
dispatched to a frame of that clause run's starting context (the
installation's outer context), is dispatched to the k-th frame for its
key κ there with k ≤ count_κ(Ls).

**Licence claimed.** Given RC-reach and FX008 §3.1's positional
invariant, C = bare(Ls) + γ, γ fresh (closed unless an E1 merge binds
it), generates every frame edge and assumption edge the clauses need:
the FrameOuter, FrameRigid and installed-C edges for ρ's labels after
Ls's partners may be omitted.

**Kind of parametricity meant (reasoned).** Relational parametricity
over row variables (Reynolds, Wadler: not read): inside f, ϱ is a rigid
variable, so f's code is typed for every instantiation, and with rows
erased its code is the same for all of them. The intended free theorem:
a value of a type in which ϱ appears only in rows, built from inputs
whose types do not mention ϱ, performs nothing through ϱ. "Occurs
nowhere the caller supplies" is the comment's premise for "built from
inputs whose types do not mention ϱ".

## 4. Counterexample to RC (run)

**x1** (accepted today; ϱ = `s`, Ls = ∅; `s` is in no parameter and not
in mk's row, written `pure`):

```
type E = E;
effect Log { fn log(n: Int): Unit; };
effect Box(a) { fn put(x: a): Unit; };
fn mk(): Handler(Box(Unit -> Unit with ...s) with ...s) with pure =
  handler Box(Unit -> Unit with ...s) { put(x) => x(()) };
fn use(): Unit with Log = with mk() {
  Box.put(fn(u: Unit) => { defer Log.log(7); () })
};
fn main(): Unit with Console = handle {
  with handler Log { log(n) => Fail.fail(E) } { use() }
} { fail(error: E) => Console.print(99) };
```

- `waxwing emit`: exit 0 (accepted).
- `waxwing run`: `{"ok":false,"code":"E_TOOL","message":"fail(E):
  E\n",…}`, exit 1. The deferred `Log.log(7)` reaches the failing `Log`
  frame; the typed abort ends a deferred expression and escapes the
  `handle` as a defect.

**Controls (run).**
- x1d: x1 with the lambda `fn(u: Unit) => Log.log(7)` (no `defer`):
  accepted; run prints `99` (the abort reaches the `handle`).
- x1n: x1 with `use(): Unit with nofail Log` and a printing `Log`
  handler: accepted; run prints `7`.
- x1c: x1 with mk given a parameter `d: Unit -> Unit with ...s` (so `s`
  occurs and C's tail is R's) and `mk(fn(u: Unit) => ())` at the use:
  refused, E_EFFECT "defer must not fail, but it performs Log, whose
  handler may fail", related "the signature of use allows a failing Log
  handler; write with nofail Log".
- x1i: the literal installed directly in `use`,
  `handler Box(Unit -> Unit with Log) { put(x) => x(()) }`: refused,
  the same E_EFFECT, no related note.
- x1p: mk() passed to `fn run(h: Handler(Box(Unit -> Unit with Log +
  ...e) with Log + ...e)): Unit with Log + ...e`, which installs h around
  the same `Box.put`; `use(): Unit with Log = run(mk())`: refused, the
  same E_EFFECT (a written parameter type has no C; `clausesOf` links C
  to R's tail).
- x1l: x1 with `let h = if true then mk() else mk(); with h { … }`:
  accepted; run fails as x1 (`fail(E): E`, exit 1). Merging two
  ResultCs by C ≡ C keeps the fresh tails.

**Mechanism (reasoned from the code read in §2; consistent with the
runs).** Inside mk the clause row is `...s` (calling x), consumed into
R = `...s` and into C, which Definition 4.1(d) with rule J equates with
the written result's R; E4's own-abort rule gives `M ⊑ m` (a rigid
clause tail), so the Box frame is M by FrameOwn. At the use, R's tail is
a meta α, and α also sits in Box's argument; the performed lambda's type
equals that argument by E1, so α holds `nofail Log` (the `defer`'s
demand). R = α is consumed into ρ = `Log + …` ignoring marks, so α's N
is never compared with ρ's M. C = ∅ + γ, γ fresh and closed, so the
installed-C site pairs nothing and no assumption edge
`mark(ρ Log) ⊑ N` exists. In x1c, C's tail is α, C walks to α's `nofail
Log`, Lend `assume` gives `M ⊑ N`, and the program is refused.

**What fails in RC's argument.** RC-reach is false for x1: the clause
reaches the first `Log` frame of its starting context and count_Log(Ls)
= 0. The premise "occurs nowhere the caller supplies" is false: the
caller supplies operation arguments, whose types come from the handled
label's arguments, which are part of the result type `occurs` never
reads. A clause receives a ϱ-typed function as an argument and calls it.
Frame edges are not the problem here (FrameOwn already makes the frame
M); the missing edges are the installed-C site's assumption edges.

**Standing.** Today's checker: unsound acceptance, observed. a-min as
stated in revision 3.5 (E4′'s ResultC tail by `ownClauses`, E5 with
marks ignored, installed-C site from C) accepts x1 with an honest
package (reasoned, unrun: every obligation listed above holds on the
package that mirrors today's solution). This is a soundness defect in
the shipped FX008 checker and in E4′; it needs a BACKLOG item and the
author's decision (§11). The docs/language.md sentence "All are
conservative (a safe program may be rejected, an unsafe one never
accepted)" does not hold for this case.

## 5. Repaired claim RC′ (proposed)

**Hypothesis H′.** f as in RC, and ϱ occurs nowhere in f's signature
except as R's own tail: not in any τ_i, not in E, not in L's arguments,
not in any argument of a label of Ls (at any depth: nested arrows,
handler types, data row arguments, record fields).

**Claim RC′.** For every f satisfying H′ and the quantifiers of RC
(every well-typed P, every run, every v returned by f, every
installation of v under ρ): RC-reach holds, and every operation a clause
run of v dispatches to its starting context is typed, in the clause, by
an occurrence in some clause row c_j of v's literal that E4 matches to
an occurrence of Ls (so its assumption mark is bounded by C's label,
`mark(C label) ⊑ mark(c_j label)`).

**Licence.** Under H′ the validator may record the ResultC's tail as
the use's own `⟨p, result clauses⟩` (default closed): FrameOuter and
installed-C edges only for ρ's partners of Ls's labels (and of labels a
merge adds), no FrameRigid unless a merge binds the tail to a rigid.
Outside H′, C's tail is R's tail variable (today's occurs case).

**Proposed rule change (not adopted; for the author).** `occurs` folds
over the parameters, the row, and the result type with R's own tail
position excluded. Equivalently, E4′ records R's tail as the ResultC's
tail whenever ϱ occurs anywhere in f's signature other than as R's
tail. Alternative: treat a ResultC outside H′ as unsupported. The
own-row clause of today's rule is kept; §6 step P5 finds part of it
conservative, not wrong.

## 6. Argument for RC′

Each step names its label and what it rests on. "Inert" is defined in
P4.

- **P1 (read).** A clause of v runs with the installation's outer
  context (Go/Effect.purs `perform` passes `frame.outer`). Operations
  it dispatches to frames it installs itself never reach that context;
  only operations dispatched past them do.
- **P2 (reasoned).** Every handler value is made by a handler literal ℓ.
  Values reach f's result by `let`, binders, `if`/`match`/`handle`
  joins, data, records, parameters, results, `with` nodes and clause
  results; each copy of a type is an E1 equation, the same variable, or
  E2's construction (statements §2 "Copies through equations", reasoned
  from §13a's reading audit; O4 decided as rule J; rests on U8).
- **P3 (reasoned; open where ℓ lies in a callee).** At f's return the
  written result type has no C, so Definition 4.1(d) with rule J makes
  ℓ's C ≡ bare(Ls) + ϱ, ϱ rigid in f. E4 consumes each clause row c_j
  into C with Definition 4.2 for a rigid tail, so for every key κ,
  count_κ(c_j) ≤ count_κ(Ls), and c_j ends in ϱ or is closed. If ℓ was
  typed in another function g and reached f through g's instantiated
  result, this needs E4's conditions to survive the substitution of g's
  rigid variables at its use: a substitution property a-min does not
  have (O-SUB, §10; §R6: Definition 4.2's sufficiency is argued site by
  site, not by a substitution lemma).
- **P4 (reasoned; the parametricity step).** Call a function value
  *inert for ϱ* when every operation it dispatches to its call context
  is typed by a label of its row, never through ϱ. Inside a clause of ℓ
  at f's typing, the values a clause run can hold come from: (i) f's
  captured environment, built from f's parameters, from results of
  operations in E, and from global functions; (ii) operation arguments,
  typed by L's arguments; (iii) results of operations the clause
  performs, typed by labels of c_j, whose arguments E2 equates with
  Ls's; (iv) results of global functions applied to such values; (v)
  lambdas and handler literals built in the clause from such values.
  Under H′ the types in (i)-(iii) do not mention ϱ (a value whose type
  has no ϱ is vacuously inert). A lambda with ϱ in its row whose
  captures are inert is inert: a label it performs must be a label of
  its row (ϱ is rigid and has none). A global function's scheme
  instantiated at ϱ with inert arguments returns an inert value, by the
  same argument inside that function (an induction over the call tree,
  which needs O-SUB). So every ϱ-typed function a clause can call is
  inert. This is the free theorem §3 names; it is argued syntactically,
  not from a relational model.
- **P5 (reasoned).** Why each part of H′ is needed. L's arguments: x1
  (run). Ls's arguments: a clause performing `Get.get()` with `Get(Unit
  -> Unit with ...s)` in Ls receives a ϱ-typed function from an outer
  handler the caller supplies. Calling it is refused today and by
  Definition 4.2 at the call stage, because the clause row then holds
  `Get` besides the source's ϱ (x2m3 run; in clause position today
  reports E_INTERNAL, §7). H′ still excludes it, so that RC′ does not
  depend on Definition 4.2, which is a validator restriction, not final
  policy (§18.85 item 1). E's label arguments: f's body could perform an
  operation of E returning a ϱ-typed function and capture it in ℓ.
  Parameters: x1c's shape. E's tail alone gives a clause nothing: a
  closure keeps no handler (docs/language.md), and f's body has
  finished before any clause runs; that part of today's own-row clause
  is conservative.
- **P6 (reasoned; rests on FX008 §3.1).** An operation a clause run
  dispatches to its starting context is typed, by P4, through a label
  occurrence of c_j: the r-th κ of c_j, matched to the r-th κ of R
  (E4, first occurrence), matched to the r-th κ of ρ (E5: inclusion for
  a closed R, Definition 4.2 for a rigid-tailed R), which is the r-th κ
  frame of the starting context by FX008 §3.1's positional invariant.
  r ≤ count_κ(Ls) by P3, so RC-reach holds. Substituting ϱ by a row X
  appends X after Ls, so Ls's occurrences keep their ranks.
- **P7 (reasoned).** The installed type's C contains Ls's labels at the
  same per-key ranks: C ≡ C′ is equality up to scoped order (Definition
  4.1(d)), which keeps per-key ranks. Lend `partners` pairs C's r-th κ
  with ρ's r-th κ. So for each operation in P6 there is a FrameOuter
  edge `mark(ρ partner) ⊑ f` and an assumption edge `mark(ρ partner) ⊑
  mark(C label) ⊑ mark(c_j label)`: [FX008-5] points 1 and 2 hold for
  v's clauses.
- **P8 (reasoned).** FrameOuter and FrameRigid are never the missing
  edges, under H or H′. If some c_j ends in ϱ, E4 gives `M ⊑ m`, and m
  stays M at the use (`openHandlers` opens only an N handled label in a
  result; Definition 4.1(b) keeps m through equalities), so FrameOwn
  makes f = M, the top, and every frame edge holds. If no c_j ends in ϱ,
  no clause calls a ϱ-typed function (a call adds the source's ϱ to
  c_j's tail, Definition 4.2), and P6 covers every operation. The
  soundness risk of a fresh tail is in the assumption edges alone, as
  x1 shows.
- **P9 (reasoned).** Merges. The code comment keeps γ open "because C ≡
  C with another value's C (an `if`, a `let`) must be able to merge in
  more labels or a rigid tail". Binding γ adds labels to the installed C
  (more FrameOuter, assumption and per-key count constraints) or a
  rigid tail (FrameRigid, and ρ must end in it): more refusal, never
  more acceptance (E4′'s monotonicity, reasoned in the statements). The
  other value's clauses are covered by its own C, now equal to this one.
  When the other side owns no C (rule J), γ is equated with that side's
  R, whose tail R ≡ R′ links to α: the occurs-case behaviour, only more
  conservative. So γ open is precision (attempt B: a closed γ would
  refuse a merge with a rigid-tailed alias), and soundness needs only
  that γ closed is sound, which is RC′. x1l shows merging does not
  rescue H's failure: both sides' fresh tails stay unlinked to α.
- **P10 (universal, given P1-P9).** RC′ follows: P6 gives RC-reach, P7
  gives the edges, P9 extends both to every binding of γ.

## 7. Separating examples and other candidates

| Program | Today (run) | What it separates |
|---|---|---|
| x1 (§4) | accepted; run `fail(E): E`, exit 1 | RC false; H′ needed for L's arguments |
| x1c (s in a parameter) | refused, E_EFFECT defer/Log | R's tail as C's tail catches x1 |
| x1l (`if` of two mk()) | accepted; run `fail(E): E` | merging does not link γ to α |
| x1p (written parameter type) | refused, E_EFFECT defer/Log | a written type's C is R (`clausesOf`), not a fresh tail |
| x1i (literal inline) | refused, E_EFFECT defer/Log | the defect is specific to ResultC |
| k2f (below) | accepted; run prints `1` | what the fresh tail buys (precision) |
| k2o (k2f, s in a parameter) | refused, E_EFFECT defer/Ask, related "this handler's clauses may perform any effect of ..." | R's tail gives FrameRigid at a rigid ρ |
| x2m1 (Ls holds `Get(... ...s)`, clause performs Get only) | accepted | Ls's arguments alone are not refused |
| x2, x2b, x2m2 (clause performs Get and calls the result) | E_INTERNAL "Effect row consumption failed" | route (iii) blocked, but by an internal error |
| x2m3 (the same in a plain function) | refused, E_EFFECT FX017 ("a function value's row must equal its caller's") | Definition 4.2 at the call stage blocks route (iii) |

**k2f** (statements §12.1's N1 source with `use` written `nofail Log`
and a `main`; run):

```
effect Log { fn log(n: Int): Unit; };
effect Ask { fn ask(): Unit; };
fn mk(): Handler(nofail Ask with Log + ...s) with pure =
  handler Ask { ask() => Log.log(1) };
fn use(): Unit with nofail Log = with mk() { defer Ask.ask(); () };
fn main(): Unit with Console =
  with handler Log { log(n) => Console.print(n) } { use() };
```

Under H′ (s only as R's tail) the fresh tail accepts it and the run
prints `1`; with s in a parameter (k2o) C walks to `use`'s rigid
ambient and FrameRigid refuses it. This is the example §14 decision 3
asked for, in the direction where the claim is used: the clause
performs only Ls's `Log`, and RC′ licenses dropping the edges for the
rest of ρ.

**x2** (route (iii)): `fn mk(): Handler(Ask with Get(Unit -> Unit with
...s) + ...s) with pure = handler Ask { ask() => { let k = Get.get();
k(()) } };`, installed under a caller whose `Get` handler returns a
deferring lambda. Today: E_INTERNAL "Effect row consumption failed" at
`k(())` (x2), at the helper call (x2b, `call(Get.get())` with `fn
call(k: Unit -> Unit with ...e): Unit with ...e = k(())`), and in the
minimal x2m2 (`Get(Unit -> Unit with ...t) + ...s`). Probably FX010's
family (BACKLOG FX010: a `RowOccurs` reported as internal); not
diagnosed here. In a plain function (x2m3) the same shape gets FX017's
refusal, which is Definition 4.2 at the call stage.

**Candidates tried against RC′, and why they fail (reasoned).**
- A type variable `a` only in the result (`Handler(Box(a) with ...s)`):
  the caller instantiates `a` with a function type, but the clause sees
  `a` abstractly and cannot call x (type parametricity). Passing x to
  an outer operation hands it to a frame typed in the caller.
- ϱ-typed values built inside f or a global function (`fn g(): Unit ->
  Unit with ...e`): a lambda whose row is `...e` cannot perform a label
  (rigid e has none); it is inert (P4).
- A clause that installs its own handler: the inner frame's R is
  consumed into c_j, so its reach is c_j's (E5, E2).
- `defer` inside a clause: d is consumed into c_j (E2 at `defer`).
- A handler from a callee g whose own ResultC was fresh: g's literal is
  typed against g's rigids and substituted at g's use (P3, O-SUB).
- An operation's own row variable in a parameter (`fn put(x: Unit ->
  Unit with ...e)`): not writable today, E_UNBOUND "Unbound type
  variable e" (run, y1).

No counterexample to RC′ found. That is a search result over these
shapes, not evidence of soundness.

## 8. Where Waxwing departs from the textbook setting

- **Dynamic scope, dispatch by key** (read). Effect polymorphism in the
  literature is usually argued with lexically resolved or tunnelled
  handlers (Zhang and Myers: not read). Here an operation goes to the
  innermost frame of its key, so a clause's ϱ-typed callee reaches
  whatever frame the caller's instantiation of ϱ places there (x1).
  Parametricity constrains which values a clause holds (P4), not where
  their operations land; positions come from FX008 §3.1 (P6).
- **FX001 consumption** (read). R into ρ ignores marks; inclusion holds
  only for a closed R (Definition 4.2 otherwise). An assumption carried
  in R's tail binding is invisible unless C reaches it: the mechanism
  of x1.
- **First-class handler values** (reasoned). Handler values flow through
  data and joins; P2 and P9 cover the flows a-min records; O6 (records
  with several tails) is proposed only.
- **No resumption** (read; docs/language.md). Clauses are tail
  resumptive: a clause's result is the operation's result, so no
  continuation carries ϱ-typed state back into a later clause run.
- **`defer`** (read). Cleanup runs in its registration context, so a
  deferred operation inside a clause run is one of that run's
  operations; E6 forbids a rigid tail in d.
- **Rows erased** (read). The same Go runs for every instantiation of
  ϱ, which is why a syntactic invariant (P4) is enough to argue that
  behaviour does not depend on ϱ; the runtime has no row to consult.

## 9. Assumptions, each named

- A1: FX008 §3.1's positional invariant holds for the rest of the
  judgment ([FX008-5], not proved; Definition 4.2's sufficiency is
  argued per site, §R6).
- A2: the copies claim of statements §2 (P2): reasoned from §13a's audit,
  O4 decided as rule J, resting on U8.
- A3: E4's own-abort rule and Definition 4.1(b) carry m = M to the use
  (P8), and `openHandlers` opens only N handled labels in results (read,
  FX008 §3.4).
- A4: O-SUB (P3, P4): E4's and Definition 4.2's conditions for a
  literal typed in a callee survive the instantiation of that callee's
  rigid variables. Not stated in a-min; **open**.
- A5: the type-variable parametricity used in §7's first candidate
  (reasoned; Reynolds not read).
- A6: H′'s "at any depth" is decidable by a fold over the result type
  as `occurs` folds over parameters (design; nothing built).

## 10. Unresolved obligations kept separate

None of these is closed by this document; each stays where the
statements put it.

- **E10** (statements §4): settled by reading only (reasoned, nothing
  run). RC′ does not use it.
- **O-SUB** (new here, open): a substitution property for E4 and
  Definition 4.2 at a callee's use. P3 and P4 need it.
- **U4**: hole defaults extended to effect rows; P9 uses γ's closed
  default.
- **U6**: generation must record the ResultC tail by the rule finally
  adopted (statements §12.2's "recording, generation side" fixtures:
  one per tail case; an H′ case would be added).
- **U7**: the ResultC occurs shape is outside u7.mjs's grammar.
- **U8**: the solved form for a-min's effect-row bindings (U8's repair
  covers type and record rows only; it does not cover effect rows or
  marks). P9's "binding γ only adds constraints" assumes γ's binding
  names no other flexible variable.
- **O4** (rule J, decided), **O5**, **O6** (proposed), **O7**: P2 and
  P9 rest on them as the statements label them.
- **Definition 4.2**: P5 and P8 cite it; its sufficiency is per site,
  not a substitution lemma (§R6), and it is a validator restriction
  that may be relaxed, which is why H′ does not lean on it.
- **[FX008-5]**: not proved (statements §14); A1 rests on it.

## 11. Standing, and decisions for the author

Established here (statements and an informal argument): the exact
claim RC behind ResultClauses.purs's comment; a run counterexample to
it (x1, with x1l), with controls; a repaired hypothesis H′ and claim
RC′, argued step by step (reasoned, resting on A1-A6); a precision
example (k2f/k2o); the finding that the fresh tail's risk lies in the
installed-C assumption edges, not in FrameOuter or FrameRigid (P8).

Not established: any proof; any implementation; that H′ is the weakest
sound hypothesis; that RC′ holds outside the shapes searched; the
compatibility cost of H′ against today (no corpus count made).

For the author (none decided here):
1. x1 is an unsound acceptance in today's checker (abort safety,
   compiled and run). It needs a BACKLOG item with x1, x1l and their
   controls, outside the pinned corpus.
2. E4′'s ResultC tail: adopt H′ (extend `occurs` to the result type
   minus R's tail), or treat ResultCs outside H′ as unsupported, or
   always use R's tail (costs k2f-like acceptances). §14 decision 3
   then cites this document.
3. Whether O-SUB is to be stated in a-min, since P3 and P4 need it and
   Definition 4.2's per-site argument does too.
4. x2's E_INTERNAL: file under FX010 or as its own item.

## Review 1 (bounded adversarial review, 2026-10-24): partial

Brief: dossier §18.89. An independent agent (Opus) completed only the
reproduction; a safety classifier then stopped its response mid-way
through the occurrence-criterion reading, and it stopped there without
regenerating or routing around the stop. Tasks 2-5 (occurrence
criterion and caller-supplied sources, O-SUB, the four answers, the
repair proposal) are **not done**.

Reproduction (observed). Two builds, both fresher than every src file:
the main build (worktree effect-kinds, src equal to main 2af6e40 and
origin/main a82d064 by `git diff --quiet`) and this branch's build (src
at 7476097). Both behave identically on all eight programs:

| Program | emit | run |
|---|---|---|
| x1 | exit 0 | exit 1, `fail(E): E` (E_TOOL) |
| x1d | exit 0 | exit 0, prints `99` |
| x1c | refused | E_EFFECT "defer must not fail, but it performs Log, whose handler may fail" |
| x1i | refused | same E_EFFECT |
| x1p | refused | same E_EFFECT |
| x1l | exit 0 | exit 1, `fail(E): E` |
| k2f | exit 0 | exit 0, prints `1` |
| k2o | refused | E_EFFECT "defer must not fail, but it performs Ask, whose handler may fail" |

So FX033 is a defect of shipped main, not of the R0 stack. Code read
before the stop (read, not tested): `occurs` folds over the function's
own row and the parameters only (ResultClauses.purs:43-44); `foldHoles`
(Holes.purs:50-67, Domain/Type/Parts.purs:84-113) already visits data
arguments and rows, handler label arguments and both handler rows,
record fields and tails, arrow parts, and label arguments in rows (not
marks, not pure rows), so a fold over the result minus R's own tail
position would reach every position H′ names (reasoned); a result
handler written without `with` ends in the implicit ambient row
variable (Resolve/Signature.purs:45-49, Resolve/Row.purs:24-30); bare
function references go through the same `openedUse` (Use.purs:136-144),
constructors do not. Whether H′ blocks x1, other paths, the programs it
would reject, and O-SUB remain unexamined.

## Review 2 (bounded review, remaining tasks, 2026-10-24): complete

Brief: Review 1's open tasks (dossier §18.89, §18.90). Same two builds
as Review 1; every probe gave the same verdict and text on both, so
everything here holds for shipped main. Programs are in
research/amin-resultc-probes/review2/ as `.wxw.txt`. "Emulated H′"
means forcing today's R's-tail path with an unused parameter
`d: Unit -> Unit with ...s`: the same tail decision H′ would make, but
not an H′ build. The controller reran d1, h1, gen1, ref3, c1, x1z and
the emulations d1e, h1e, gen1e, c1e, x1ze on the main build with the
verdicts below.

**Occurrence criterion (read).** H′ must count R's tail meta as
occurring if it appears in the opened parameters, in the use's row
(today's check), or in the result with only R's own tail position
removed: L's arguments, Ls's label arguments, and everything nested in
them. `foldHoles` over the result handler with its inference row's
tail dropped visits exactly that. Marks need no visit: a mark shared
between L's arguments and R's labels is carried by C (mk1, mk2 refused
today, observed). Label arguments resolve without an ambient row
(FX024), so the ambient variable never occurs there implicitly.

**Channels (observed unless marked).** Accepted today with run
`fail(E): E`, exit 1, on both builds: x1 (L's argument), x1l (let or
if-merge), d1 (data type in L's argument), r1 (record field), h1
(handler type), gen1 (through `id`), nest1 (two-level ResultC), ref2
(bare reference), ref3 (reference passed to `app`). Each emulated one
is refused once the tail is R's (d1e, r1e, h1e, gen1e, nest1e, ref2e;
x1 via x1c); x1l and ref3 reasoned only. The Ls channel (x2 family,
x2d) is masked today by E_INTERNAL "Effect row consumption failed" or
E_TYPE "Expected a handler"; H′ reaches it by reading, not observed.

**The four answers.**
- (a) H′ blocks x1: reasoned from the fold (Parts.purs:86), with an
  observed emulation (x1c). No H′ build has run.
- (b) Another path past H′: none found among the shapes above. That
  is a search result, not soundness.
- (c) Correct programs accepted today that H′ rejects: c1 (k2f with an
  unused `Ask(Unit -> Unit with ...s)`; prints `1` today; c1e refused
  "defer must not fail, but it performs Ask(Unit -> Unit), whose
  handler may fail") and x1z (x1 whose clause never calls `x`; exit 0
  today; x1ze refused). Correctness of c1 and x1z is reasoned. Kept:
  k2f (reasoned), x1n (x1ne prints `7`, observed). A one-line grep of
  tracked tests and examples found 11 fresh-path signatures, of which
  only the research probes x1 and x2m1/x2 change (heuristic, not a
  parse).
- (d) Unestablished: any H′ build run; soundness of RC′ (P4,
  O-SUB, a substitution lemma for the whole judgment, A1/[FX008-5],
  P2/P9); completeness of the channel list; the Ls channel once FX010's
  E_INTERNAL is gone; compatibility cost beyond the grep.

**O-SUB (reasoned).** O-SUB carries typing conditions through
instantiation. The argument needs more: P4 is a claim about run-time
behaviour and needs a substitution lemma for the whole judgment plus a
static-to-dynamic soundness link (A1, unproved); "inert" is defined
only for functions, but h1 shows handler values are a channel, and
records, data and partial applications need covering; the induction
over the call tree is not well-founded with recursion and should be
over evaluation or derivations. The reviewer cited, from background
knowledge and not read here, Zhang and Myers 2019 on accidental
handling breaking parametricity under dynamic scoping. The compiler
never states or checks O-SUB; it presupposes it (Function.purs:67-80,
DeclarationUse.purs:24). None of the nine failures needs a
substitution failure: x1 refutes the parametricity claim behind
`ownClauses`, not O-SUB. Whether O-SUB holds is unestablished.

**Repair proposal (not authorized).** Tests first: the nine failing
programs as `.wxw.txt` fixtures (rename r1 to avoid the existing
regression's r1), expected refused with E_EFFECT "defer must not fail,
but it performs Log, whose handler may fail", plus a regression row in
scripts/regression-fx008-marks.mjs that reverts the change and expects
x1 accepted. Change: a third disjunct in `occurs`
(ResultClauses.purs:43-44), `foldHoles (found meta) false (untailed
result)`, where `untailed` drops the result handler's inference-row
tail; rewrite the comment at :15-25 to state H′ as an argued
candidate; update the `fx008-result-own-row` needle (:130-135) and E4′
and the U6 fixtures. Controls staying accepted: x1d, x1n, k2f,
`fx008-result-clauses`, `fx008-result-fresh`, r2, r9. Staying refused
with the same text: x1c, x1i, x1p, k2o, `fx008-result-own-row`, eg1,
mk1, mk2, fres, rres, merge1. Flipping to refused, for the author's
approval: c1, x1z. Risks: those lost acceptances; the needle drift;
the Ls-channel tests stay masked until FX010; soundness rests on
unproved RC′. A rule based on whether clauses use ϱ-typed values would
keep c1 and x1z but is invented machinery needing review.

**Side observations, not diagnosed.** tv1 reports E_TYPE "Expected
Handler(Box(a)), found Handler(Box(a))", identical types; x2h and x2h2
refuse `with` on a handler obtained from `Get.get()` with "Expected a
handler", possibly a completeness defect.
