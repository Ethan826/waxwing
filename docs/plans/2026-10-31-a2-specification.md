# A2 specification: the trusted effect validator (2026-10-31)

Status: **main choices approved with amendments (author, 2026-10-31,
dossier §18.139); this is the consistency pass §18.139 authorized. Not
ready for implementation authorization; no validator exists or is
authorized; no soundness claim.** §13's decision table shows each
row's ruling. The concrete package representation (§2) is
**proposed**: §18.139 approved one authoritative `EffectPackage` but
not a type, and the review §18.139 authorizes after this pass is to
attack §2, §4-§6 and §10. Earlier text of this document (commit
0469df3) proposed D7, which was rejected; it is recorded in §13 and not
used anywhere below.

Sources: the A2 packet (docs/plans/2026-10-31-a2-decision-packet.md),
the options note (docs/plans/2026-10-25-amin-a2-options.md), the
statements (docs/plans/r0-amin-statements.md, revision 3.6 with §R7b
and the dated amendments through 2026-10-31), dossier §18.138-§18.139.
Code citations are to 868756f.

**Rulings this document applies** (dossier §18.138, §18.139):
- R-a. The installed-C `Consume` (`AtInstalledC`) stands for the site's
  count/pairing and mark-edge conditions only: no argument equality, no
  row extension, no other tail condition.
- R-b. `bare: true` ignores arguments in that comparison; it does not
  erase them; keys, `Fail` heads included, stay determinable.
- R-c. A non-handler `with` records `Install`; `UnframedInstall` stays
  a hard certification blocker; no symbolic framing.
- R-d. Rows mixing recording and validator requirements report
  "recorded component demonstrated, validation open".
- §18.139: D1-D6 and D8-D15 approved with amendments; D7 rejected; the
  four inconsistencies repaired here (§4 data flow, §5 failure
  ordering, §4 and §6 the entry point, §6 RecordDefect).

Labels: **published**, **derived**, **reasoned** (from code or design,
no run), **bounded**, **observed**, **decided** (the author's),
**proposed** (this document, not approved), **open**.

## 1. Scope and trust

`validateEffects` is `certify`'s step (c). It judges one completed
package against the recorded problem and searches for nothing; its only
rewrites are completion (§4: absent type variables as fresh holes, as
today; forced ResultC tails), both fixed by the record and the input.
A defect in it can certify a wrong program; a defect in the search can
only lose acceptances. Waxwing uses the certifying-algorithm pattern in
a one-sided form: acceptances are certified, refusals mean "cannot
certify" (§6). The pattern's source was read only through an author's
slides (§12, partly).

Relied on, not established: O-SUB, A1, [FX008-5] points 1-4,
Definition 4.2's sufficiency, E10's reading, U2, U3, U4 (open; the
effect-hole default), U6/P1, U8's extension (statements §0e). D6's
differential tests agreement on the inputs it exercises; it does not
establish E12's exhaustiveness universally (§18.139).

## 2. The package (proposed representation)

### 2.1 What exists today

- `Substitution = Map Var RTExpr` (src/Features/Check/Strategy/
  Candidate.purs:31): one map for both sorts; a record-row variable's
  image is a `Record` term (`generic`'s `fits`, Candidate.purs:33-44).
- `RTExpr` (src/Domain/Recorded/Atom.purs:52-57): `Base`, `Arrow`,
  `TVar Var`, `Record fields tails`, `App Head args`; no effect rows,
  no marks. `Var = RigidVar VarId | FreshVar Path Role` (Atom.purs:36);
  a hole is `holeVar n` (src/Domain/Recorded/Hole.purs:19-22).
- `Witness = { bindings ∷ Map Var Binding, names }`, `Binding = Inline
  RTExpr | Free Int` (src/Domain/Verdict/Witness.purs:25-27), built by
  `bindingsOf` (src/Features/Check/Strategy/Witness.purs:137-148): an
  absent flexible variable becomes a fresh `Free` hole numbered after
  the largest hole in the candidate.
- The recorded side (src/Domain/Recorded/Effect.purs:40-92):
  `EVar = EffRigid VarId | EffFresh Path ERole`; `MTy` with `MBase`,
  `MVar Var`, `MArrow MTy MRow MTy`, `MRecord fields (Array Var)`,
  `MData TypeId (Array MTy) (Array MRow)`, `MHandler MLabel { inference,
  clauses ∷ Maybe MRow }`; `MLabel`'s mark is `MarkRef = Written Fixed
  | At Position`; `MRow`'s tail is `Maybe EVar`.

### 2.2 Proposed types

A new trusted Domain module (placeholder name `Domain.Verdict.Effect
Package`). Sort-correct by construction: one map per sort, so a
binding's sort is its map's; I3 checks that each key's recorded sort
matches the map it is in.

```purescript
-- A mark term (statements §2): N, M, or the join of named rigid
-- marks. `TermJ` with an empty set is read as `TermN` (norm).
data Term = TermN | TermM | TermJ (Set String)

-- A package type: MTy's constructors, with marks as Terms and with
-- variables restricted to declared rigids and holes (I3's solved
-- form): no FreshVar other than `holeVar n` may occur.
data PTy
  = PBase Base
  | PVar Var                       -- RigidVar at SortType, or a hole
  | PArrow PTy PRow PTy
  | PRecord PRecordRow
  | PData TypeId (Array PTy) (Array PRow)
  | PHandler PLabel { inference ∷ PRow, clauses ∷ Maybe PRow }

-- Record fields and tails; a tail is a RigidVar at SortRow or a hole.
type PRecordRow = { fields ∷ Array (Tuple String PTy), tails ∷ Array Var }

type PLabel = { effect ∷ EffectRef, args ∷ Array PTy, mark ∷ Term }

-- An effect row's tail: a declared effect rigid, or effect hole n.
-- Never a flexible EVar: bindings are in solved form.
data PTail = PTailRigid VarId | PTailHole Int
type PRow = { labels ∷ Array PLabel, tail ∷ Maybe PTail }

type EffectPackage =
  { types ∷ Map Var PTy            -- flexible SortType variables
  , rows ∷ Map Var PRecordRow      -- flexible SortRow variables
  , effects ∷ Map EVar PRow        -- package-owned effect-row variables
  , marks ∷ Map Position Term      -- every recorded position
  }
```

**How marks attach.** A mark inside a binding is the `Term` on that
`PLabel` (a copy, an extension label, a handled label). A recorded
type's mark is read through the record: `Written FixedN ↦ TermN`,
`Written FixedM ↦ TermM`, `Written (FixedRigid k) ↦ TermJ {k}`,
`At pos ↦ marks[pos]`. The package never names a `Position` inside an
image; positions are only `marks`' keys, and copies are linked to them
by recorded E1s (statements §2, "Copies through equations").

**Reading a recorded type under a package** (`under P ∷ MTy → PTy`,
total on the completed domain): `MVar v` to `types[v]` (a rigid stays);
`MRecord fs ts` appends `rows[t]`'s fields and tails for each flexible
tail t; an `MRow` whose tail is `EffFresh` appends `effects[v]`'s
labels and takes its tail; `EffRigid r` becomes `PTailRigid r`.

**Holes.** Type and record-row holes are `holeVar n`, as today. An
effect-row hole is `PTailHole n`. One sort per hole number across all
three sorts (I3). Marks have no holes: a missing term is `Malformed`.

**Alternative kept for the reviewer:** generalize `MTy` over its mark
and tail types (`MTyOf mark tail`), so recorded and package types
share one grammar. It changes a pinned recorded type and every
generation site's signature; the separate `PTy` costs a second
grammar and a conversion. Not chosen here; open for the review.

### 2.3 The two domains (D5, ruled)

- **Input domain** (what a strategy supplies; I3 checks it):
  `keys effects` = `flexEff` (Effect.purs:191) minus the forced tails
  F; `keys marks` = `positions` (Effect.purs:192) exactly, the unread
  `Frame p` of a non-handler `with` included; `keys types ∪ keys rows`
  ⊆ the problem's flexible variables, each in the map of its recorded
  sort (as `generic` reads a `Substitution` today: an absent variable
  is allowed and becomes a fresh hole at completion). F is every
  `EffFresh p ResultClauses` that is the tail of a ResultC in
  `instances[p]` (Generate/Owned.purs:54-56 mints it). A binding for a
  member of F is `Malformed (BindsForced v)`.
- **Completed domain** (what is judged and certified): the input
  domain plus every absent type or row variable, bound to a fresh hole
  numbered after the largest hole number in any of the four maps (a
  named change to `bindingsOf`'s numbering, which today counts type
  images only), plus F, each `⟨p, result clauses⟩ ↦ P(t)`, t R's tail
  variable in the same instance result.

The asymmetry is deliberate and inherited: type and row variables keep
today's "absent means a fresh hole" rule so G0 and the witness do not
change; effect variables and positions are exact (statements §2, N10;
§18.97 "complete position and domain accounting"). A well-formed term
at an unread frame conveys no evidence that the blocked installation
is valid (§18.139).

### 2.4 Projections and today's types

- `erase ∷ EffectPackage → Substitution`: `types` and `rows` merged
  into one map; `PArrow a _ r ↦ Arrow (erase a) (erase r)`; `PRecord ↦
  Record`; `PData id as _ ↦ App (DataHead id) as`; `PHandler l _ ↦ App
  (HandlerHead l.effect) l.args` (statements §2: recorded atoms erase a
  handler type to `App (HandlerHead e) args`); effect rows and terms
  dropped. G0 reads only an erasure (§4).
- The compilation witness is `substitutionWitness problem (erase
  P_in)` exactly as today (Witness.purs:55-60), so `build` and the hole
  contract are unchanged. `Certified` keeps its shape, `Certified Valid
  Compilation` (src/Domain/Verdict/Certified/Internal.purs:13).
- "The completed certified package" (D5) is P_cu below: the object the
  check judged, deterministic from the problem and P_in. Its effect
  part (forced tails included) is not read by `build`; carrying it in
  `Certified` for audit is a separate interface choice, not made here.
- The strategy's certificate changes from `Substitution` to
  `EffectPackage` (Strategy/Online.purs:72, :156-157).

## 3. The ResultC binding (F1; ruled D5)

Applied to statements §2 (ResultC row and the domain paragraph, dated
2026-10-31, §18.139): an input package holds no binding of
`⟨p, result clauses⟩`; the validator derives it by forcing; supplying
one is `Malformed`; the completed package includes the derived
binding; revisit if the provisional restriction is lifted. Forcing is
deterministic from the record and the input package. The certified
typing is the forced one; no relation to H′'s live typing is claimed.
The options note's forcing step 1 was already this; it now cites the
ruling.

## 4. Data flow (repair 1) and the entry point (repair 3)

Notation: P_in the input package; `settle` replaces holes by
lowering's defaults pointwise (type hole `PBase IntBase`, record tail
hole dropped, `PTailHole` dropped so the row closes, as ReadBack.Type
`settled` does for types, Strategy/ReadBack/Type.purs:88-102);
`complete` adds the completed domain's bindings (§2.3).

```
certifyEffects problem P_in:
  0. RecordDefect check     reads the problem only
  1. I3 on P_in             input domain, sorts, terms, solved form
  2. Unsupported check      reads the problem only
  3. P_s  = settle P_in
     G0 on erase P_s        = today's `map settled unsettled`
  4. P_cu = complete P_in   absent variables as fresh holes; forced
                            tails ⟨p, result clauses⟩ ↦ P_in(t)
     P_c  = settle P_cu     what every obligation reads
  5. obligations, in recorded order, on P_c; edges collected
  6. edges and mark equalities judged
  7. Certified Valid (substitutionWitness problem (erase P_in))
```

- **Which settled projection G0 checks:** `erase P_s`, the erasure of
  the settled input package. It equals today's `map settled
  (Substitution)` (Strategy/Substitution.purs:53-55) because `erase`
  and `settle` commute on types and rows and effect holes vanish under
  `erase` (reasoned; a property test is owed, §11). G0 does not see the
  completion's fresh holes, as today.
- **Which package forcing and the obligations read:** forcing builds
  P_cu from the unsettled input, so a forced binding is a copy of
  P_in(t), holes included; P_c = settle P_cu. Since forcing copies an
  image and settling acts pointwise, settle(complete P_in) and
  complete(settle P_in) agree on F (reasoned), and the forced binding
  is σs(t) as §R7b states. Every obligation, E9 included, reads P_c:
  E9 is judged after settling (D7 rejected).
- **The witness** is built from `erase P_in` as today (holes stay
  `Free` for the hole contract).
- **The entry point guarantees (repair 3):** step 2 refuses every
  candidate of a problem recording an `Unsupported` obligation with
  `NotCertifiable (UnsupportedRecorded kind) provenance`. No path
  through `certifyEffects` mints `Certified` for such a problem,
  whatever the caller does; rule 1's block (Decide/Reason.purs:62-63)
  remains as routing and is no longer what prevents certification.

## 5. Failure ordering (repair 2)

Refusals are reported one per candidate, deterministically. Steps 0-2
are **prerequisites**: none of them depends on obligation results.

| Step | What fails | Order within the step | Reported as |
|---|---|---|---|
| 0 | a `Consume` whose `marks`/`bare` disagree with §7's site table | recorded order of `obligations` | `RecordDefect provenance` |
| 1 | I3 on P_in | fixed: (i) map sorts; (ii) missing keys, then extra keys, per map in the order effects, marks, types, rows, keys in `Ord` order; (iii) `BindsForced`; (iv) terms (`TermJ` names in `rigidMarks`; a `Console` or `Fail` label's term `TermN`); (v) one sort per hole; (vi) solved form | `Malformed reason` |
| 2 | an `Unsupported` obligation recorded | recorded order | `NotCertifiable (UnsupportedRecorded kind) provenance` |
| 3 | G0 | G0's own order, unchanged | today's `CheckRefusal`s |
| 4-6 | obligations | **recorded order applies here:** obligation index i first; within i, its structural conditions before its edges and mark equalities, each in generation order j | `ObligationFailed provenance` or `NotCertifiable RigidExact provenance` |

- **Provenance on edges:** every edge and every mark equality carries
  the provenance of the obligation that produced it and its index j
  within that obligation. Step 6 judges all edges, then reports the
  failure with the least (i, phase, j); an edge from obligation 3 is
  reported before a condition of obligation 4.
- **`RigidExact`** is reported exactly when the failing check is
  Definition 4.2's addition to E2 (exact per-key counts, or ρ ending in
  ϱ, for a rigid-tailed source); any other failure at the same site is
  `ObligationFailed`.
- **Forcing is not a refusal category** (a correction within D10's
  four categories, proposed). A failing obligation that reads a forced
  tail cannot be attributed to forcing without evaluating it under a
  binding the package does not hold; naming forcing as the cause would
  be blame without evidence (docs/engineering.md, "Blame needs
  evidence"). Instead every `ObligationFailed` carries a flag
  `readsForced ∷ Boolean`, a fact about the obligation, not a cause.
  A6's losses are measured by the shadow differential against live
  acceptance, not by refusal tags.
- Solved form for effect bindings and terms is a step-1 refusal (an
  obligation cannot be read on an unsolved image). For type and row
  bindings the existing `solvedForm` keeps its current effect, a
  `NoWitness (UnsolvedImage v)` compilation with `Valid` untouched
  (Witness.purs:69-75, 86-98): one definition extended to all sorts
  (D9), two call sites, behavior for types unchanged. The asymmetry is
  for the reviewer.

## 6. Refusals and routing (repair 4)

| Constructor (proposed) | Depends on the candidate? | Decide's handling |
|---|---|---|
| `RecordDefect Provenance` | no | **fails closed** for the recorded problem: no further strategy is tried as a repair; verdict Unresolved with a new reason `GenerationDefect`, reported in its own category of the shadow differential, apart from candidate refusals |
| `NotCertifiable (UnsupportedRecorded kind) Provenance` | no | rule 1 already blocks (`EffectsUnchecked`); strategies and refuters run as today; the reason stays `EffectsUnchecked` (blocks take priority, Decide/Reason.purs:47-50) |
| `Malformed MalformedReason` | yes | a `CheckFailed` attempt; the next strategy runs |
| `ObligationFailed { provenance, readsForced }` | yes | as above |
| `NotCertifiable RigidExact Provenance` | yes | as above; counted apart (a validator limitation, not "invalid program") |

Applied to statements §7 (dated 2026-10-31): the blanket "a candidate
that fails (a)-(c) ... continues to the next strategy" now applies to
the candidate-specific rows only.

## 7. Reading every recorded obligation kind

As generation records them at 868756f (src/Domain/Recorded/Effect.purs
`Obligation`, `SiteKind`; Generate/Literal.purs:40-74;
Generate/Effect.purs:156-193; Generate/Obligation.purs:146-170). Every
condition is judged on P_c. The `marks`/`bare` columns are the site
table step 0 checks.

| Obligation | marks | bare | Condition on P_c | Edges and equalities |
|---|---|---|---|---|
| `Equal lhs rhs` (beside an atom; `ClauseBody` O1; `WithNode` O2) | — | — | structural equality; rows by R-A; handler types by Definition 4.1, rule J; several-tailed records by O6 (proposed in the statements) | `norm` equality per mark pair |
| `Consume` `AtCall`, `AtPerform`, `AtApply`, `AtPipe`, `AtStage k`, `AtCallback`, `AtFail` | true | false | per-key matching; count(ρ, κ) ≥ count(s, κ); matched arguments equal; closed s: no tail condition; s ending in rigid ϱ: Definition 4.2 | `mark(ρ occ) ⊑ mark(s occ)` per matched pair |
| `Consume` `AtDefer` (`DeferInto`) | true | false | labels only: s is d's labels, closed | as above |
| `Consume` `AtDeferredRow` | true | false | labels only | as above. Declared, recorded by no generation rule at 868756f (reasoned from a search of Generate/); settling's deferred rows stay unfinished (§18.138) |
| `Consume` `ClauseIntoR k` | false | false | as the call row with top-level marks ignored; Definition 4.2 for a rigid c_k | none |
| `Consume` `ClauseIntoC k` | true | true | matching and counts by key, arguments ignored (R-b); Definition 4.2 for a rigid c_k | per matched pair |
| `Consume` `InstallR` | false | false | as the call row, marks ignored; Definition 4.2 for a rigid R | none |
| `Consume` `AtInstalledC` | true | true | **R-a:** C's r-th κ paired with ρ's r-th κ, count(ρ, κ) ≥ count(C, κ); nothing else | `mark(ρ partner) ⊑ mark(C label)` |
| `HandlerLit { m, inference, clauses, clauseRows }` | — | — | for each c_k = P_c(`clauseRows[k]`) holding a `Fail` label or ending in a rigid ϱ | `M ⊑ term(m)` |
| `Install { frame, handler, ambient }`, handler an `MHandler` | — | — | m, R, C from `under P_c handler` (C owned, else R itself, rule J) | `term(m) ⊑ f`; each ρ label paired with a C label `⊑ f`; a rigid C tail: `M ⊑ f` and ρ ends in it; every frame, Console included |
| `Install`, handler not an `MHandler` | — | — | never reached: the same `with` records `UnframedInstall`, so step 2 refuses first (R-c) | none |
| `Defer { row, enclosing }` | — | — | d = P_c(row): no `Fail` label, no rigid tail | each non-`Fail` label `⊑ N` |
| `Entry row` | — | — | only Console labels, closed tail (its `EntryTail` bound by the package, then settled) | none |
| `FailConcrete ty` | — | — | the payload's head under P_c, **after settling** (statements E9; D7 rejected), is concrete | none |
| `Unsupported kind` | — | — | step 2 | — |

Not obligations of their own: E3 (read through E1), E4′ (through
`instances`, `annotations`, E1, Definition 4.1, `Install`), E11, E12
(steps 5-6). Marks: `holds x y` iff `x = N`, `y = M`, or `J S ⊆ J T`
(statements §5, universal; pairs36 and the oracle, bounded); `norm`
equality exact for every valuation (reasoned). Rows (R-A): keys by
`labelKey` (src/Domain/Row.purs:102), grouped normal form (derived; a
bounded check is owed, §11).

## 8. Amendments applied in this pass

All dated 2026-10-31 and citing §18.139; nothing else in those
documents was changed.

| Document | Section | Gist |
|---|---|---|
| statements | status | names the §18.139 amendments and the sections they touch |
| statements | §2 ResultC row | input packages hold no `⟨p, result clauses⟩` binding; forced; supplying one is Malformed; completed package includes it (D5) |
| statements | §2 after N10 | one `EffectPackage`; input and completed domains stated apart; unread frame term required, no evidence (D4, D5) |
| statements | §4 E9 | D7 rejected; E9 after settling; U4 open |
| statements | §7 pipeline | order: record consistency, I3, Unsupported refusal, settle, G0 on the settled erasure, completion, obligations; no certificate for an Unsupported problem |
| statements | §7 routing | RecordDefect fails closed; the "continues to the next strategy" bullet limited to candidate refusals |
| statements | §10 | the code's `Obligation` (F6), `bare`'s meaning, `EffectPackage`, four refusal categories (D4, D10, D15) |
| statements | §13b | citation standing: `lift` verified, Gaster-Jones abstract only, `inject` unconfirmed, `mask` unchecked (F4, D15) |
| options note | status | approval and pointer to this document |
| options note | forcing step 1 and after step 5 | ratification; the data flow in §4 here |
| options note | components V0, V2, V3 | "faithful" to "adapted" with the reason and source label (D14) |
| options note | references, questions | sources checked in the packet; questions 1-3 answered |

## 9. Restrictions

Unchanged from the packet (§3.2 there): T1 Definition 4.2, T2 forcing,
T3 solved form, T4 ∅ effect default (U4 open), T5 invariant marks, T6
bare C, T7 Console N and uniform frames, T8 terms N, M, `J S`, T9
`Unsupported` kinds (now refused at the entry point), T10 `Outside
HandlerType`, T11 rule J, T12 first-failure reporting (§5). New here:
an input package may not bind a forced tail; every recorded position
needs a term, an unread one included; a record defect fails closed.
D7's E9-before-settling restriction is not adopted.

## 10. Distinguishing cases

Each case gives a concrete program or package, the verdict this
specification predicts, and what a plausible wrong pipeline or
interface does. Every verdict is **reasoned** unless marked; nothing
was run for this pass.

**C1. Forced-tail domain.** Statements §12.1's N1 source: `fn mk():
Handler(nofail Ask with Log + ...s) with pure = handler Ask { ask() =>
Log.log(1) }; fn use(): Unit with Log = with mk() { defer Ask.ask();
() };`. At the use p of `mk()`, s occurs only in the result, so the
ResultC tail is `⟨p, result clauses⟩` ∈ F.
- Package A binds every package-owned variable and position, nothing
  for `⟨p, result clauses⟩`, with least terms: passes I3; completion
  forces the tail to A's image of s's instance slot. E5's edge from
  C's `Log` partner makes the frame term M, so the `defer`'s demand on
  `Ask` (`M ⊑ N`) fails: `ObligationFailed { provenance:
  DeferRegistration, readsForced: false }` (today refuses the program,
  observed §R5b). With the frame term forged to N instead, the
  `Install` obligation (recorded before the body's, Generate/Effect.purs
  `with`, reasoned) fails first on `M ⊑ N`, and it reads C's tail:
  `readsForced: true`. The flag differs while forcing caused neither
  refusal, which is why it is a flag and not a cause (§5).
- Package B = A plus `⟨p, result clauses⟩ ↦ ∅`: `Malformed (BindsForced
  ⟨p, result clauses⟩)`.
- Wrong W1, exact domain checked against the completed domain at
  input: A is `Malformed` (missing key), so every honest package for a
  fresh-tail use is refused. Wrong W2, forcing overrides a supplied
  binding: B is read as A (two homes). Wrong W3, the certified package
  omits F: a re-reader finds `⟨p, result clauses⟩` unbound.
- Control: `use` with `with nofail Log` (accepted today, observed
  §R5b): predicted accepted under forcing (reasoned; the stand-in kept
  r1, r2, r9 but did not run this control).

**C2. Prerequisite against recorded order.**
- (a) §7a's `work` (`fn work(): Unit with Log = { defer Log.log(1); ()
  }`), package with d's `Log` label term `TermJ {z}`, z not in
  `rigidMarks`, and otherwise honest: `Malformed` at step 1. Wrong:
  obligations first, reporting `ObligationFailed`.
- (b) The same with the honest term M: `Defer` is recorded before its
  `AtDefer` consumption (Generate/Obligation.purs:149-152); `Defer`'s
  edge `M ⊑ N` fails, reported `ObligationFailed DeferRegistration`.
  With the forged term N: `Defer` holds, the consumption's edge `M ⊑
  N` fails, reported `ObligationFailed DeferInto`. Wrong: an
  FX008-style pooled graph without provenance refuses both and names
  neither obligation.
- (c) `fn work(h: Unit -> Unit with State(Int)): Unit with Log +
  State(Bool) = { defer Log.log(1); h(()) }` with honest terms:
  obligation `Defer` (earlier) fails on an edge, the call's `Consume`
  (later) fails a structural condition (payload `Int` against `Bool`).
  Reported: `Defer`'s. Wrong "all conditions first, then all edges":
  reports the call's. (Recorded order follows the block's items;
  reasoned.)

**C3. Unsupported at the entry point.** FX032's program, `effect Op
{ fn op(): Int with Log; }; fn g(): Int with Op = Op.op(); fn main():
Int = 0;`, with a package satisfying every other obligation of `g`:
`certifyEffects` returns `NotCertifiable (UnsupportedRecorded
(OperationWithRow …))`; no `Certified` exists. Wrong (routing-
dependent): `Certified` is minted and only Decide's rule 1 suppresses
Solved; any other caller of `certify` (Elaborate's re-check, a test,
a later strategy) holds a certificate for an unchecked problem.

**C4. RecordDefect fails closed.** A restored-defect mutant of
generation recording `AtInstalledC` with `bare: false`, on the famw
program (statements §12.2, `Fail(Job)` in C against `Fail(Job(Int))`
in ρ). Predicted: every candidate refused `RecordDefect` at step 0;
the declaration Unresolved with `GenerationDefect`, reported apart;
no second strategy tried. Wrong W1, flags trusted: the site is judged
with argument equality and refused as `ObligationFailed`, a generation
bug reported as a candidate's failure. Wrong W2, `CheckFailed` and
continue: a strategy whose package satisfies the mis-recorded
condition could be certified against the wrong obligation.

**C5. The unread frame term.** The ledger's probe shape: `fn main():
Unit with Console = { let h = 1; with h { () } }` (h: Int). Recorded:
`Install { frame: Frame p, handler: MBase Int, … }` and `Unsupported
UnframedInstall`. Package without a term for `Frame p`: `Malformed`
(step 1, missing key). With `TermN` or `TermM`: passes step 1, refused
`NotCertifiable (UnsupportedRecorded UnframedInstall)` at step 2; the
two terms give the same verdict. Wrong W1, unread positions optional:
the missing term passes and domain accounting silently weakens. Wrong
W2, Unsupported checked before I3: the read-back's missing term is
never reported. Wrong W3, the term read as evidence (evaluating E5
with a guessed label): could accept.

**C6. E9 after settling with a hole head.** A package for a
declaration recording `FailConcrete (MVar v)`, v flexible, with v
absent from P_in (so a fresh hole at completion) or bound to
`PVar (holeVar 3)`. On P_c the payload is `Int`, a concrete head: E9
holds, and `Fail` labels with that payload key on `Int`. Predicted:
not refused by E9. U4 stays open on whether the default is right for
lowering. Control: v bound to a declared rigid type variable: E9
refuses. Wrong W1 (D7, rejected): refuses the hole head. Wrong W2,
keys computed before settling: the `Fail(hole)` label has no key and
matching fails or is postponed. Whether a source program produces a
hole-headed payload is unknown (no program constructed).

**C7. Which settled projection.** Statements §12.2's "hole identity":
`fn g(): Unit = { let k = fn(u: Unit) => (); k(()) }`, the lambda's
row `PTailHole 3`, the Apply row `PTailHole 4`: both settle to the
closed row, E1 holds, predicted accepted. Wrong: obligations on P_cu
(unsettled) compare hole 3 with hole 4 and refuse; or G0 on `erase
P_in` (unsettled), today's R026 defect for types.

## 11. Implementation outline (not authorized)

The packet's §7 outline, with: task 1 the `EffectPackage` module, its
`erase`, `under`, `settle`, `complete`, and their property tests
(erase∘settle = settle∘erase on types and rows; settle∘complete =
complete∘settle on F; `under` total on the completed domain); the site
table as a trusted constant with a test that every `SiteKind` has a row;
steps 0-2 before any package reading of obligations; the extended
`solvedForm` and `bindingsOf`'s numbering as named trusted-surface
changes (D9); the four refusal constructors and `GenerationDefect` with
Decide's handling (§6); a fixture for each of C1-C7; the M-B collector
written apart from the validator's (D6), its result stated as agreement
on exercised inputs only; fixture-only differential until a read-back
produces effect packages (D13).

## 12. Source verification (unchanged from the packet, §1)

Access date 2026-10-30. Labels exactly as the packet gives them; none
upgraded.

| Key | Source | Verdict |
|---|---|---|
| [BS01] | Baader, Snyder. Unification theory. Handbook of Automated Reasoning I, ch. 8, 2001; §2.2.3 p. 448 read | **verified** for the definition; cited too strongly by the options note (F2, now amended) |
| [L05] | Leijen. Extensible records with scoped labels. TFP 2005; draft rev. 76 read (Fig. 1, §3.2, §7.1) | **verified** (draft; TFP text not accessed) |
| [Tar75] | Tarjan. Efficiency of a good but not linear set union algorithm. JACM 22(2), 1975; Berkeley memo ERL-M434 abstract read | **verified** (memo version) |
| [BPPS18] | Biernacki, Piróg, Polesiuk, Sieczkowski. Handle with care. PACMPL 2(POPL), 2018; §1 p. 4 read | **verified** for `lift` |
| [L17] | Leijen. Type directed compilation of row-typed algebraic effects. POPL 2017; Aug 2016 technical report read | **partly** (report, not POPL text); `inject` **unconfirmed** |
| [MMNS11] | McConnell, Mehlhorn, Näher, Schweitzer. Certifying algorithms. Computer Science Review 5(2), 2011 | **partly** (Mehlhorn's slides only; paper not accessible) |
| [GJ96] | Gaster, Jones. A polymorphic type system for extensible records and variants. NOTTCS-TR-96-3, 1996 | **partly** (abstract only) |
| [RM99] | Rehof, Mogensen. Tractable constraints in finite semilattices. SCP 35, 1999 | **not accessible** (publisher 403; secondary abstract consistent) |
| [DG84] | Dowling, Gallier. Linear-time Horn satisfiability. J. Logic Programming 1(3), 1984 | **not accessible**; not relied on |

## 13. Decision table with rulings (dossier §18.139)

| # | Decision | Ruling | What this pass did | Still open |
|---|---|---|---|---|
| D1 | Trusted mark check | approved: M-C | §4 step 6, §7 | — |
| D2 | Rows | approved: R-A | §7 | the grouped normal form's bounded check |
| D3 | Interim policy | approved: F14 items 1-3 | options note answered | — |
| D4 | Package | approved: one authoritative `EffectPackage`; representation still to design | §2 proposes a sort-correct representation; statements §2, §10 amended | the representation's approval (after review) |
| D5 | ResultC ownership | approved: record-owned forcing; input excludes forced bindings (Malformed if supplied); completed includes them; two domains stated | §2.3, §3; statements §2 amended | revisit if the restriction is lifted |
| D6 | Differential edges | approved: independent test-only collector, agreement on exercised inputs only, not E12 exhaustiveness | §1, §11 | — |
| D7 | E9 before defaults | **rejected**: E9 stays after settling; U4 open | removed from §4, §7, §9; statements E9 note; C6 | U4 |
| D8 | Failure reporting | approved, ordering clarified | §5 | — |
| D9 | Solved form | approved: extend the existing definition, trusted-surface change named in any plan | §5, §11 | the type/effect asymmetry of §5 for the reviewer |
| D10 | Refusals | approved: four categories, RecordDefect as ruled | §6; forcing removed as a refusal tag in favor of a `readsForced` flag (proposed correction within the four categories) | the author's view of that correction |
| D11 | UnframedInstall | approved: stays blocked, no symbolic framing | §4 step 2, §7; C5 | symbolic framing (not authorized) |
| D12 | Record flags | approved: checked against the site table; inconsistency a record defect | §5 step 0, §6, §7; C4 | — |
| D13 | Differential before tranche 2 | approved: fixture-only for now | §11 | corpus differential |
| D14 | Fidelity corrections | approved | options note V0, V2, V3 amended | — |
| D15 | Citations and stale §10 | approved, qualifications kept | statements §10, §13b amended | — |
| — | Unused frame positions | ruled: a well-formed term required for every recorded position, conveying no evidence | §2.3, C5 | — |

Open after this pass, as before: U2-U8's extension, O-SUB, A1,
[FX008-5], Definition 4.2's sufficiency, the corpus differential, the
focused adversarial review §18.139 authorizes, and implementation
authorization.
