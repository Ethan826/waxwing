# Task 9 design: how a handler literal's marked type reaches its uses (2026-10-30)

Status: design for the author's review (batch lane R9, §18.122); not approved,
nothing implemented. Written by an Opus design agent at base 8e9ddf7 and
returned as text; the controller saved it and spot-checked its citations to
Effect.purs (`literalType`, `literalVars`), Block.purs (`letItem`), Control.purs
(E14's definedness E1) and the absence of any `Clauses` use in Generate.
"Observed" means generated from that tree's build output by a read-only probe;
everything else is reasoning or proposal. Line citations are to 8e9ddf7.

## Summary

The shadow generator already connects a literal's marked type to every use, so
no new E1 is needed. It does this in two ways:

1. **Identity.** The literal's type is its node's type. It moves unchanged
   through `let`, locals, a `with`'s handler child and a record literal.
2. **Task 7's existing E1s.** Wherever a rule moves the type into another type
   (an argument, a body result, an `if` or `match` branch, a field access, an
   application, an O1 clause body, an O2 `with` node), Task 7 already records an
   E1 beside the rule's `GenEqual`.

Recording any E1 "at the literal's node" would be reflexive, whatever is put on
either side. So the proposal is that Task 9 records no new E1 and instead tests
this connection explicitly, with a restored defect that breaks identity while
keeping erasure. This changes what the §18.119 amendment left open ("literal-E1
coverage deferred: neither satisfied nor unnecessary"), so it needs the author's
ruling (Q1).

## 1. The two sides, case by case

Notation:

- `p_lit` is the literal's path.
- L is `literalType p_lit` (Generate/Effect.purs:139-145): `MHandler {e, args:
  ⟨p_lit, inst j⟩…, mark: At (Literal p_lit)} {inference: {[], ⟨p_lit, handler
  inference⟩}, clauses: Just {[], ⟨p_lit, handler clauses⟩}}`.
- `handler` returns L as `marked` (Effect.purs:86, :94).
- Every node's marked type goes into `nodes` at its path (Expr.purs:46-50,
  `NodeAt`; Assemble.purs:110).
- The literal mints only what carries `p_lit`: its two tails and `Literal p_lit`
  (Minted.purs:45-56; Effect.purs:87-90).

| How L reaches a use | Sides | Where recorded | Provenance |
|---|---|---|---|
| Installed directly: `with handler … {…}` | None. `Install.handler` (Task 9) is `nodes[p_with/With/handler]`, which is L itself, because the handler child is the literal node. | Effect.purs:117 (`handlerPart`); `with` records only O2, Effect.purs:126 | none; identity |
| Let-bound, then installed | None. `letItem` binds the local to `{ty, marked}` of the value (Block.purs:89-96), and `localOf` returns that MTy (Expr.purs:132-143). Observed: `nodes[Block/result/With/handler]` = L, mark `At (Literal Block/items/0/Let/value)`. | — | none; identity |
| Passed to a function `g(h)` | `Equal L P`. P is the instance's parameter i, whose handled label is opened to `At (Opened p_call i)` (Opening.purs:42-53, Callee.purs:91-94, Task 18). | Call.purs:190-197 (F1 row 1) | `BesideAtom (ExprRule 5) {decl, path: p_call, index}`; observed index 1 (after `EmitAdm`) |
| Returned (body ends in the literal) | `Equal L sig.result`, the declaration's written result. Observed for `fn mk(): Handler(Log) = handler Log {…}`: right side `MHandler {Log, Written FixedM} {inference: {[], EffRigid 0}, clauses: Nothing}`. | Signature.purs:147-148 (Sig3) | `BesideAtom (SigRule 3) {path: InBody, index: 0}` |
| Stored in a record, read by field access | Record literal: none, because the field's MTy is embedded unchanged (Record.purs:63-79, E24). Field access: `Equal (MRecord [h: L] []) (MRecord [h: ⟨q, field h⟩] [⟨q, rest⟩])`. Observed. | Record.purs:181 (E26, B4); spreads Record.purs:112, :143 (E25) | `BesideAtom (ExprRule 26) {path: q, index: 0}` |
| `if` / `match` branch | `Equal L ⟨p, res⟩`, once per branch. Two literals are then joined through the shared image. Observed for `if`: indices 1 and 2. | Operator.purs:152-154 (E11); Control.purs:111 (E12) | `BesideAtom (ExprRule 11 or 12)` |
| Applied lambda, passed to an unannotated parameter | `Equal (MArrow ⟨λ, param 0⟩ ⟨λ, effect⟩ …) (MArrow L ⟨p, stage 0⟩ ⟨p, res⟩)`. Observed. | Operator.purs:197-215 (apply) | `BesideAtom (ExprRule 14)`; pipe is E15, Operator.purs:182-187 |
| Clause body, `handle`, `with` body | O1 `Equal L result` (HandlerClause.purs:82-84); `handle` Failure.purs:66, :75; O2 Effect.purs:126 | as listed | `AtSite … ClauseBody`, `BesideAtom (ExprRule 22)`, `AtSite … WithNode` |

There is no new role. Task 7's sentence "No other effect-only E1 site exists"
remains true, and the literal adds none.

Builtins have no escape route: `print`, `show` and `crash` take the argument
only into `GenPrintable` (Builtin.purs:75, :123), so nothing copies the type
onward.

## 2. Separating example

Source (it generates; this design does not need it to be accepted):

```
type E = E; effect Log { fn log(n: Int): Unit; };
fn pass(h: Handler(Log with Fail(E))): Handler(Log with Fail(E)) = h;
fn main(): Unit with Console = {
  let h = handler Log { log(n) => Fail.fail(E) };
  let g = pass(h);
  with h { defer Log.log(1); () }
};
```

Paths, all under `InBody`:

- `p_lit = Block/items/0/Let/value`
- `p_call = Block/items/1/Let/value`
- `p_with = Block/result`

Recorded today in main's effect problem (observed):

- `nodes[p_lit]`, `nodes[p_call/Call/args/0]` and `nodes[p_with/With/handler]`
  are all exactly L.
- Exactly one obligation mentions `Literal p_lit`: `{provenance: BesideAtom (E5)
  {decl: 1, path: p_call, index: 1}, value: Equal L P}`, with `P = MHandler
  {Log, [], At (Opened p_call 0)} {inference: {[Fail(E) Written N], ⟨p_call,
  inst 0⟩}, clauses: Nothing}`. P is also `instances[p_call].parameters[0]`.
- `positions` = `[Literal p_lit, Opened p_call 0]`.

The proposed Task 9 test, "a handler literal reaches its uses" in
test/r0-obligations-handler.test.mjs:

- **A1.** The E5 E1 above exists with left = `nodes[p_lit]` and right =
  `instances[p_call].parameters[0]`.
- **A2.** `nodes[p_with/With/handler]` equals `nodes[p_lit]` exactly, so its
  mark is `At (Literal p_lit)` and its tails are the literal's. Once Install
  exists, `Install.handler` at `p_with` equals it too.
- **A3.** (Amended by the author, 2026-10-31, dossier §18.138; was: "No
  obligation has provenance at `p_lit` under rule E20 except
  `HandlerLit`".) The obligations at `p_lit` under rule E20 are exactly
  `HandlerLit` and, per clause k, `ClauseIntoR k` and `ClauseIntoC k`;
  the prohibition is on an invented literal-node E1, and no `Equal`
  there has identical sides. This must be scoped to
  E20: E14 already records a reflexive definedness E1 beside its reflexive atom
  (Control.purs:196-198).
- **A4.** `HandlerLit` at `p_lit` names `m = Literal p_lit`, `inference =
  ⟨p_lit, handler inference⟩` and `clauses = ⟨p_lit, handler clauses⟩`. These
  are the mark and tails of `nodes[p_lit]`.
- **A5 (corpus, rt8 sources plus defect probes, as Task 7's survey).** For every
  `Let local value` at item path i, every `Local local` node in its scope has
  `nodes[q] = nodes[i/Let/value]`. The assertion is on marks, not erasure.

What each nearby wrong design does to the test:

- **W1, reflexive literal E1** (`AtSite {p_lit, E20, LiteralNode}`, `Equal L
  L`): fails A3.
- **W2, joining L to the `with` node's `⟨p_with, res⟩`** (the O2 image): fails
  A3's scope check and A2's requirement that Install's handler is the handler
  child. It would also equate a handler with `Unit`.
- **W2′, joining L to g's type** (`instances[p_call].result`, pass's ResultC)
  instead of parameter 0: fails A1.

Restored defect for the Task 9 regression row, proposed as
`r0-amin-literal-reaches-use` and replacing the plan's "drop the literal E1":

- **Mutation:** Block.purs:92 binds the local to `forged found.marked`, where a
  helper added in the mutant sets a top-level `MHandler` mark to `Written
  FixedN` (plus an import edit for `Fixed(..)` and `MarkRef(..)`). `ty` is
  untouched.
- **Erasure is preserved:** test/r0-marked-erase.mjs:21-35 drops marks.
- **Expected failure:** A2 fails with a message matching `/installed handler's
  mark is .*, not At \(Literal/`. The failure comes from the marked side, not
  from erasure.
- **Why Task 7 will not catch it (prediction, unrun):** with this mutant, A1's
  left side becomes the forged copy. Task 7's `markedSides` accepts any eligible
  recorded candidate with the same erasure (§18.120), and the forged copy is
  itself recorded at `p_call/Call/args/0`. So the Task 9 row, not Task 7's
  check, carries this defect. The row should show that r0-amin-node-erasure
  stays green under the mutant (also a prediction).

## 3. How it composes with the other Task 9 rows and with Task 8; amendments

**HandlerLit (E4).** Its fields are the names L uses, so E4's `ClauseIntoR k`
target `⟨p_lit, handler inference⟩` and `ClauseIntoC k` target `⟨p_lit, handler
clauses⟩` are the same variables every identity copy carries.

**Install (E5).** When `Install.handler` is L by identity, InstallR's source is
L's own inference row, so E4 and E5 share R's variable and m's position with no
equation. When it reaches the `with` through an image (an `MVar` or an instance
parameter), m, R and C come from the package's binding of that image, and the
binding is tied to L by the moving rule's E1 (E5 as written: "read from h's
marked type, wherever it comes from"). InstallR's recorded source in that case
is open (Q6).

**Task 8.** The clause ambient row and `HandlerLit.clauseRows` must be the same
EVar, `EffFresh p_lit (Clauses k)`. Nothing mints it today: `literalVars` lists
only the two tails (Effect.purs:147-149), and `Clauses` has no constructor use
in Generate. Minted.purs:45-56 lets only the owner whose path a variable carries
mint it, so the literal must mint it (Q5). Task 8's stage consumptions inside
the `with` body target `f L + ρ`, whose L label comes from `Install.handler`.

**Callee.purs.** The plan lists "opened label → At (Opened p)" under Task 9's
files. Task 18 already built it (Opening.purs:42-53; observed `Opened p_call
0`).

**Statement amendments (texts to replace):**

- **§2, "Copies through equations".** Current: "and generation records `Equal
  (TVar node) (that type)` at the literal's node (design). (Deferred to Task 9
  by the §4 amendment of 2026-10-29, §18.119.)" Proposed: "and that type is the
  literal's node type itself (Generate/Effect.purs `handler`): it reaches each
  use unchanged (`let`, locals, a `with`'s handler, a record literal) or through
  the E1 of the rule that moves it, so no equation is recorded at the literal's
  node (§18.119; Task 9 design)." In the same paragraph, list (i): delete "the
  literal's node,". List (iii): current "(iii) the same variable (`let`, locals,
  binders)"; proposed "(iii) the same variable or the same marked type (`let`,
  locals, binders, a handler literal's node)".
- **§4, "Where E1 is recorded".** Delete "a handler literal's node (§2);". In
  the Amendment bullet, replace "Task 9 records the connection between the
  literal's marked type and its image or use. Literal-E1 coverage is deferred:
  neither satisfied nor unnecessary." with "The connection is the literal's own
  type, carried by identity or by the E1s listed here; Task 9's test names it
  (A1-A5) and its restored-defect row breaks it."
- **§13 row.** Current: "E1 at the literal's node and at each recorded
  unification (N5)". Proposed: "the literal's type itself at its node and its
  identity copies, and E1 at each recorded unification (N5)".
- **Plan Task 9 Step 1.** Current: "records `HandlerLit` and the E1 joining h's
  image to `Literal p`". Proposed: "records `HandlerLit`, h's uses carrying
  `Literal p` (A2, A5), and the argument E1 (A1)". Regression: replace "drop the
  literal E1" with `r0-amin-literal-reaches-use`.
- **§12.1 N5 row: a note, not a rewrite.** The oracle graph keeps its image. In
  the generator's record, h has no image slot, so that forgery cannot be
  expressed. Forging `Literal p` itself is E4's (`M ⊑ m`).

**What this does not establish:**

- That any validator refuses N5's forgery. There is no validator yet.
- That Definition 4.1 holds for the recorded pairs.
- That rules other than `let`/local pass marked types faithfully. A5 covers
  `let` only, and Task 7's corpus check is weak on marked sides (§18.120).
- Anything across declarations. A returned literal reaches other declarations
  through the signature and E4′, never as L.
- O4/rule J, U8, or InstallR's source for image handlers.

## 4. Provenance of each component

- Identity of a let-bound type: monomorphic `let` (Damas-Milner without
  generalization; Block.purs:2-3 "monomorphically (§5.1)"). Existing.
- E1 at moving rules: Task 7's `BesideAtom` and `AtSite`. Existing, reused
  unchanged.
- Opened positions: Task 18. Existing.
- A5: a test property, not machinery.
- **Invented: nothing.** The only new piece of text is the proposed Q4 roles,
  and they apply to non-E1 obligations.

## 5. Questions for the author's ruling

- **Q1.** Accept "no new E1; the connection is identity plus Task 7's E1s plus
  shared names" and close literal-E1 coverage as covered rather than deferred?
  Recommend yes, conditional on A5 and the restored-defect row both showing.
- **Q2.** Include A5 corpus-wide, or targeted fixtures only? Recommend
  corpus-wide, as one survey pass alongside Task 7's.
- **Q3.** Approve the §2, §4, §13 and plan text above? Recommend as written.
- **Q4.** Provenance for HandlerLit and Install: extend `SiteRole` with
  `LiteralSite` (E20 at `p_lit`, one per literal) and `InstallSite` (E21 at
  `p_with`; it differs from `WithNode` by role). Deterministic: the node's path,
  rule and role. Unique: a path names one node. Task 7's rule reads "an E1 with
  no atom" and would become "an obligation with no atom". Recommend yes.
- **Q5.** Should the literal mint `⟨p_lit, clauses k⟩` (added to `literalVars`),
  with Task 8's clause ambient naming it? Recommend yes.
- **Q6.** InstallR when `Install.handler` is not syntactically an `MHandler`:
  recommend recording only Install and having E5 read R from the handler's type
  under the package, rather than recording a Consume with a guessed source.
- **Q7.** Add the N5 note to §12.1? Recommend yes.

## Design agent's rulings (decisions the brief did not settle)

- Chose identity plus existing E1s over any new equation, because every
  candidate E1 is either reflexive or duplicates a Task 7 E1. Cost if wrong:
  Task 9 needs a different link design, about one more design round.
- Treated E14's reflexive definedness E1 as out of scope and scoped A3 to E20.
  Cost if wrong: A3 would fail on E14 if left unscoped.
- Chose Block.purs `letItem` mark forgery as the restored defect, because it is
  the generator's version of "images unlinked to site positions" and preserves
  erasure. Cost if wrong: a different mutation and needle.
- Predicted, without running, that Task 7's `markedSides` misses that defect.
  Cost if wrong: Task 9's row is redundant, but harmless.
- Used the §12.1 N5 program plus `pass` as the fixture. Cost if wrong: a
  different fixture.
- Put InstallR's source and clause-row minting forward as questions rather than
  designing them, because they are Task 9's other rows and Task 8's. Cost if
  wrong: one more note.
