# A2 specification: the trusted effect validator (proposed, 2026-10-31)

Status: **a proposed specification and one decision table for the
author's approval in one pass; nothing is applied, nothing is
implemented, no soundness claim.** The author's ruling of 2026-10-31
asked that the A2 packet's questions Q1-Q12 and findings F1, F4 be
consolidated into one corrected specification and one decision table,
with M-C and R-A as the preferred direction; validator implementation
is not authorized. Sources: the A2 packet
(docs/plans/2026-10-31-a2-decision-packet.md), the options note
(docs/plans/2026-10-25-amin-a2-options.md), the statements
(docs/plans/r0-amin-statements.md, revision 3.6 with §R7b and the
amendments through 2026-10-31) and the overnight ledger
(docs/plans/2026-10-30-overnight-ledger.md). Code citations are to
fa3f82a, where Task 9 and Task 14 are integrated and accepted (dossier
§18.137; §18.138 in preparation).

**Rulings of 2026-10-31 cited, not restated as new** (the controller
is applying them to the statements in parallel; this document does not
edit the statements):

- R-a. The installed-C `Consume` (`AtInstalledC`) represents the
  site-specific count/pairing and mark-edge conditions only: no
  ordinary argument equality, no row extension, no extra tail
  condition.
- R-b. `bare: true` means arguments are ignored for that comparison,
  not erased from the stored row; keys, `Fail`-family heads included,
  stay determinable.
- R-c. A non-handler `with` records `Install`, and `UnframedInstall`
  stays a hard certification blocker.
- R-d. Coverage rows mixing recording and validator requirements count
  the recorded component as demonstrated, with validation open.

Labels: **published** (a source states it), **derived** (a Waxwing
argument from published parts), **reasoned** (read from code or design,
no run), **bounded** (a finite check, named), **observed** (a run),
**decided** (the author's), **proposed** (this document; not applied),
**open**. Every amendment below is **proposed text**, not applied.

## 1. Scope and trust

`validateEffects` is `certify`'s step (c). It judges one completed
package against the recorded problem; it searches for nothing. Its one
deterministic rewrite is E4′'s forcing (§4), fixed by the record. A
defect in it can certify a wrong program; a defect in the search that
proposes the package can only lose acceptances. This is the
certifying-algorithm pattern in a one-sided form: Waxwing certifies
acceptances only, and a refusal means "cannot certify" (§6). The
pattern's source was read only through an author's slides (§11).

What the validator relies on and does not establish: O-SUB, A1,
[FX008-5] points 1-4, Definition 4.2's sufficiency, E10's reading, U2,
U3, U4, U6/P1, U8's extension (statements §0e's carried table), all
open. A certified declaration is certified against the recorded
obligations, nothing more.

## 2. The package (proposed interface)

Today certify reads `Substitution = Map Var RTExpr`
(src/Features/Check/Strategy/Candidate.purs:31): unmarked, with no
effect-row bindings and no mark terms. The validator needs one package
carrying all three, from which G0's substitution and `build`'s witness
are projections, so there is one home per fact (§18.77: "one
authoritative marked pre-Strip package").

**Proposed types** (names are placeholders; generalizing
`Domain.Recorded.Effect`'s marked types over the mark is one way to get
them without a second copy of the grammar):

```
data Term = TN | TM | TJ (NonEmptySet String)   -- norm: J ∅ is TN
-- marked types and rows whose labels carry a Term, not a MarkRef
type PLabel = { effect ∷ EffectRef, args ∷ Array PTy, mark ∷ Term }
type PRow   = { labels ∷ Array PLabel, tail ∷ Maybe PTail }
data PTail  = PRigid VarId | PHole Int          -- never a flexible EVar
data PTy    = (MTy's constructors with PLabel, PRow; MVar for rigids
               and holes only)
type EffectPackage =
  { types   ∷ Map Var PTy      -- flexible type and record-row variables
  , effects ∷ Map EVar PRow    -- package-owned effect-row variables
  , marks   ∷ Map Position Term
  }
```

**Projections.** `erase P ∷ Substitution` drops marks and clauses and
effect rows; G0 judges it (step (b), unchanged). `strip P` keeps
bindings' shapes and drops marks, clauses and `marks`; `build` reads it
(statements §2, "Stripped projection"). A labeled consequence: the
package replaces `Substitution` as the strategy's certificate, so
Strategy/Online.purs `certified` and Witness `bindingsOf` change
(statements §10's change surface already lists them).

**Who owns each binding** (proposed; amends statements §2's table only
in the ResultC row, §3):

| Fact | Home | Package slot |
|---|---|---|
| flexible type and record-row variables (`fields.vars`) | package | `types` |
| a handler literal's `⟨p, handler inference⟩`, `⟨p, handler clauses⟩`, clause rows `⟨p, clauses k⟩` | package | `effects` |
| a lambda's `⟨p, effect⟩`, stage rows `⟨p, stage k⟩`, opened rows, instance slots `⟨p, inst j⟩`, `main`'s `EntryTail` | package | `effects` |
| an annotation C's tail `⟨p, annotation clauses j k⟩` | package | `effects` |
| a ResultC's fresh tail `⟨p, result clauses⟩` | **the record, by forcing** (§3) | none; a package binding is `Malformed` |
| ResultC and annotation C labels and fixed marks; written marks; Console N; `Fail` N | the record (`instances`, `annotations`, written types) | none |
| every recorded `Position` (`Frame`, `Literal`, `Opened`, `Annotation`, `Instantiated`) | package | `marks` |
| marks on labels inside a binding (copies, extensions) | package | the `Term` on that `PLabel` |
| `rigidMarks`, `effectRigids`, arities, ambient rows, obligations | the record | none |

**Exact domain** (I3, N10; proposed wording): `keys types` equals the
problem's flexible type and record-row variables; `keys effects` equals
`flexEff` minus the forced variables (every `EffFresh p ResultClauses`
named as a ResultC tail in `instances`); `keys marks` equals
`positions`. Holes appear only inside images, one sort per hole number
across the three sorts; a mark has no hole (a missing term is
`Malformed`). Standing: design, reasoned; `flexEff` and `positions`
are recorded today (src/Domain/Recorded/Effect.purs:191-192,
`EffectProblem`), and a `with` over a non-handler still mints its
`Frame p`, which needs a term although nothing reads it (ledger, Task 9
author question 4).

## 3. F1 resolved: who binds `⟨p, result clauses⟩` (proposed)

**The conflict.** Statements §2's ResultC row: "the package holds only
the binding of `⟨p, result clauses⟩` when that variable is the tail".
The options note's forcing step 1: "A package binding for any
`⟨p, result clauses⟩` variable is refused as `Malformed`". §R7b amended
E4′ but not the table. Generation mints the variable into `flexEff`
(Generate/Owned.purs:54-56 `kept`; Generate/Minted.purs), so under the
exact-domain rule as written the package must bind it, and under the
options note it must not.

**Three coherent resolutions.**

| | Package binds it? | Forcing does | Accepts | Problem |
|---|---|---|---|---|
| A (proposed) | no: `Malformed` | supplies the only binding, σs(t) | when the forced constraints hold | the home moves back to the package if the restriction is ever lifted |
| B | yes | requires the package's binding to equal σs(t), else a limitation refusal | only if the read-back already applied the restriction | the read-back must know a validator restriction; fewer acceptances than A for a read-back that records H′'s typing |
| C | yes | overrides the package's binding | as A | two homes for one fact (violates §2's single-home rule) |

**Proposed: A.** It keeps one home (the record determines the value),
keeps the read-back independent of the provisional restriction, and is
what the stand-in evidence exercised (§0e item 2: force, then check).

**Proposed text, statements §2 ownership table, ResultC row, last
cell:** replace "the package holds only the binding of `⟨p, result
clauses⟩` when that variable is the tail" with "the package holds no
binding of `⟨p, result clauses⟩`: under the provisional restriction
(§R7b) the validator forces it to σs(R's tail); a package binding is
`Malformed` (I3). If the restriction is lifted, this row is revisited."

**Proposed text, statements §2 after "The package's domain equals the
recorded positions exactly (N10)":** add "and the recorded flexible
variables except the forced ResultC tails (§4 E4′)".

**Consequences.**
- Forcing: deterministic, reads only the record and σs; the forced
  image σs(t) contains no flexible variable once V2 holds for σs, so
  no cycle and no bare variable reference (reasoned).
- I3: one new `Malformed` case (`PackageBindsForced v`).
- Certification: the witness carries σf, so the certified typing is
  the forced one (E4′; no relation to H′'s live typing claimed). G0's
  `erase` is unaffected (ResultC tails are effect rows, which `erase`
  drops).
- Separating example (reasoned): §12.2's attempt B with a package
  binding `⟨p, result clauses⟩ ↦ ∅`. Under A: `Malformed`. Under the
  statements as written with no forcing rule: the forged ∅ is read and
  only Definition 4.1(d) against g's alias tail refuses it.

## 4. The check, step by step (M-C with R-A)

`certify problem P`:

1. **I3** (V12): exact domain (§2); binding constructor matches sort;
   one sort per hole; every `TJ S` has S ⊆ `rigidMarks`; images name
   only declared rigids at their sort and holes (solved form, V2, for
   all three sorts and terms, run here as a refusal, §6); no `Term`
   other than N on a Console or `Fail` label; no slot for a record-owned
   fact (§2's table).
2. **Settle** σ to σs (V1): holes to lowering's defaults (type Int,
   record tail none, effect tail closed ∅), except where E9 is judged
   (step 4, decision D7).
3. **G0** on `erase P` (unchanged).
4. **E9 first** (V11): every `FailConcrete` payload judged before
   defaults (D7), so `Fail` keys are defined for steps 6-7.
5. **Force** (V1a): for each `instances` entry whose result is an
   `MHandler` with `clauses: Just C` and C's tail `EffFresh p
   ResultClauses`, bind it to σs(t), t R's tail in the same instance
   result. σf = σs plus these bindings.
6. **Evaluate every recorded obligation** under σf in recorded order
   (§5), collecting edges and mark equalities (V9).
7. **Judge marks** (V8): `holds (norm x) (norm y)` per edge; `norm`
   equality per E1 mark pair.
8. Mint `Certified Valid (Witnessed (strip σf))`, the only minting
   site (Strategy/Substitution.purs:53-58 today).

**Rows (R-A).** A completed row is σf applied to a recorded or package
row, tail closed or rigid. Keys: `labelKey` (src/Domain/Row.purs:102),
a `Fail` label keyed by its payload's head. Normal form: labels grouped
by key, per-key order kept, then the tail. Row equality: same keys,
same per-key sequences pairwise equal (arguments by E1, marks by `norm`
equality), same tail. Standing: the relation is [L05]'s (eq-swap)
closure with labels compared by key as [L17] compares effect labels
(published, adapted); the grouped normal form as its characterization
is derived and needs the bounded check of §9.

**Marks (M-A in the gate).** `holds x y`: `x = N`, or `y = M`, or
`x = J S`, `y = J T`, S ⊆ T (statements §5; universal argument;
pairs36 and the oracle, bounded). `norm` equality is exact for every
valuation (reasoned: M differs from any `J T` at the all-N valuation;
`J S`, `J T` with S ≠ T differ where one element of the symmetric
difference is M).

**Differential (M-B, test only).** An independent edge collector
written from statements §4 (D6), union-find over E1 mark equalities and
callee-k sharing [Tar75], reachability from each atom (FX008 step 5).
Two separate properties: every package M-A accepts has a satisfiable
graph (soundness direction); for every satisfiable graph the least-term
package passes M-A (completeness direction). Not trusted; unreachable
from live compilation.

## 5. Reading every recorded obligation kind

As Task 9 and earlier tasks record them (src/Domain/Recorded/Effect.purs
`Obligation`, `SiteKind`; Generate/Literal.purs, Generate/Effect.purs).
"Edges" are added to V9's collection.

| Obligation as recorded | Condition under σf | Edges and equalities | Statements |
|---|---|---|---|
| `Equal lhs rhs` (beside an atom or `AtSite`: `ClauseBody` O1, `WithNode` O2) | structural equality (V4); rows by R-A; every handler-type pair by Definition 4.1, rule J; records with several tails by O6 (proposed) | `norm` equality per mark pair | E1, Def. 4.1 |
| `Consume` at `AtCall`, `AtPerform`, `AtApply`, `AtPipe`, `AtStage k`, `AtCallback`, `AtFail` (`marks: true`, `bare: false`) | per-key matching, count(ρ, κ) ≥ count(s, κ), matched arguments equal; a closed s has no tail condition; an s ending in rigid ϱ: Definition 4.2 | `mark(ρ occ) ⊑ mark(s occ)` per matched pair | E2, E7, E10, Def. 4.2 |
| `Consume` at `AtDefer` (`DeferInto`) | labels-only: s is the source's labels, closed; no tail condition | as above | E2 (defer) |
| `Consume` at `AtDeferredRow` | as `AtDefer` | as above | E2 (settling); declared in `SiteKind`, recorded by no generation rule at fa3f82a (reasoned from a search of Generate/) |
| `Consume` at `ClauseIntoR k` (`marks: false`, `bare: false`) | as the call row, marks ignored (top-level only); Definition 4.2 for a rigid c_k | none | E4 |
| `Consume` at `ClauseIntoC k` (`marks: true`, `bare: true`) | per-key matching and counts; arguments ignored in the comparison, keys kept (R-b); Definition 4.2 for a rigid c_k (the recorded departure from today) | per matched pair | E4, Def. 4.2 |
| `Consume` at `InstallR` (`marks: false`, `bare: false`) | as the call row, marks ignored; Definition 4.2 for a rigid R | none | E5 |
| `Consume` at `AtInstalledC` (`marks: true`, `bare: true`) | **R-a:** per-key count and pairing only: C's r-th κ with ρ's r-th κ, count(ρ, κ) ≥ count(C, κ); no argument equality, no extension, no tail condition, no Definition 4.2 | `mark(ρ partner) ⊑ mark(C label)` (Lend `assume`) | E2 installed-C, E5 |
| `HandlerLit { m, inference, clauses, clauseRows }` (`LiteralSite`) | for each c_k = σf(`clauseRows[k]`) holding a `Fail` label or ending in a rigid ϱ | `M ⊑ term(m)` | E4 own abort |
| `Install { frame, handler, ambient }` (`InstallSite`), handler an `MHandler` | m, R, C read from `handler` under σf (C the owned C, else R itself, rule J) | `term(m) ⊑ f`; each ρ label paired with a C label (by key and rank) `⊑ f`; a rigid C tail: `M ⊑ f` and ρ must end in that ϱ; for every frame, Console included (§18.86) | E5 |
| `Install` whose `handler` is not an `MHandler` | not evaluated: the same `with` records `Unsupported UnframedInstall`, a hard blocker (R-c, D11) | none | E5, §9 |
| `Defer { row, enclosing }` (`DeferRegistration`) | d = σf(row) has no `Fail` label and no rigid tail | each non-`Fail` label `⊑ N` | E6 |
| `Entry row` (`EntryRow`) | the completed row (its `EntryTail` bound by the package, settled) has only Console labels and a closed tail | none | E8 |
| `FailConcrete ty` (`PayloadHead`) | the payload's head under σf, before defaults, is a concrete type head (D7) | none | E9 |
| `Unsupported kind` | not evaluated; rule 1 blocks before search | none | §7 routing |

Not obligations of their own: E3 (an `Opened` position is read through
E1), E4′ (read through `instances` and `annotations`, checked through
E1, Definition 4.1 and `Install`), E11 (ambient rows define targets),
E12 (steps 6-7).

**Record-flag consistency.** Each site kind fixes its `marks` and
`bare` (the table). A recorded `Consume` whose flags disagree is a
record defect, refused as `RecordDefect` (§6), never judged under the
wrong reading (proposed; D12).

## 6. Refusals (proposed constructors)

`CheckRefusal` gains (statements §10 names `Malformed` and
`ObligationFailed`; the rest is proposed):

| Constructor | Meaning | Reported as |
|---|---|---|
| `Malformed MalformedReason` | I3: domain, sort, hole, term, forced-slot, record-owned slot, solved form (`UnsolvedEffectImage v`) | candidate refused |
| `ObligationFailed Provenance` | an obligation's condition or one of its edges fails; the provenance is unique per declaration (§18.124) | candidate refused; first in recorded order (D8) |
| `NotCertifiable Limitation Provenance` | `Limitation = RigidExact` (Definition 4.2) `| ForcedTail` (E4′ forcing); the validator cannot certify, the program is not shown invalid | candidate refused; counted apart by the shadow differential and A6 |
| `RecordDefect Provenance` | the record contradicts its own site table | candidate refused; a generation bug, reported apart |

Each is a `CheckFailed` attempt (Strategy.purs:112-124); later
strategies and refuters still run (statements §7).

## 7. Fidelity corrections (proposed text for the options note)

- **F2, options note components table, V2 row.** Replace "solved forms
  of unification problems [BS01] | faithful" with "solved form
  (idempotence) [BS01] §2.2.3 plus §18.76 item 2's restriction (images
  over declared rigids and holes only) | adapted: BS01's solved form
  allows an image to name a variable outside the domain; U8 refuses
  it". Source: verified (§11).
- **F3, V3 row.** Replace "[L05] | faithful" with "[L05] Figure 1, with
  labels compared by key as [L17] §3 does ('we ignore the type
  arguments when comparing labels'), a `Fail` label keyed by its
  payload's head, plus marks | adapted". Sources: L05 verified; L17
  partly (2016 report).
- **V0 row.** Add "one-sided: acceptances only".

## 8. Statements §10 (F6) and §13b (F4): proposed text

**§10, replace the `Obligation` sentence** with: "`Obligation = Equal
MTy MTy | Consume { site ∷ SiteKind, source ∷ MRow, target ∷ MRow,
marks ∷ Boolean, bare ∷ Boolean } | HandlerLit { m ∷ Position,
inference ∷ EVar, clauses ∷ EVar, clauseRows ∷ Array EVar } | Install
{ frame ∷ Position, handler ∷ MTy, ambient ∷ MRow } | Defer { row ∷
EVar, enclosing ∷ MRow } | Entry MRow | FailConcrete MTy | Unsupported
UnsupportedKind`, as src/Domain/Recorded/Effect.purs declares it;
`bare` ignores arguments in the comparison without erasing them (ruling
2026-10-31)." Add: "The package is `EffectPackage` (A2 specification
§2), replacing `Substitution` as the certificate; `SiteFact`s are its
`marks` map."

**§13b, the relaxations paragraph:** replace "Leijen's `inject`, POPL
2017; Koka's `mask`); citations from memory, unverified" with "Koka's
`mask`; Leijen's `inject` (POPL 2017) unconfirmed: absent from the
2016 technical report, POPL text not read; Biernacki et al.'s `lift`
confirmed (POPL 2018, §1); Gaster and Jones's lacks predicates
consistent at abstract level (A2 packet §1)".

## 9. Restrictions the specification adds or keeps

Carried from the packet (§3.2 there), with this document's changes:
Definition 4.2 (T1), forcing (T2), solved form (T3), ∅ effect default
(T4), invariant marks (T5), bare C (T6), Console N and uniform frames
(T7), terms N, M, `J S` (T8), `Unsupported` kinds including
`UnframedInstall` (T9, now a hard blocker by R-c), `Outside
HandlerType` (T10), rule J (T11), first-failure reporting (T12). New
here: E9 judged before defaults (D7: refuses a hole-headed payload that
the Int default would make concrete; matches today's
`FailNeedsConcrete` on an unknown head, reasoned); a package may not
bind a forced ResultC tail (§3).

## 10. Implementation outline (not authorized)

Unchanged from the packet's §7 except: task 1 is `EffectPackage` with
`erase` and `strip` (§2); Force reads `instances` (§4 step 5); E9 runs
before settling (§4 step 4); the record-flag table (§5) is a trusted
constant with its own test; the M-B collector is written apart from
V9. Bounded checks owed before trust: the row normal form against
(eq-swap)'s closure on small rows; `norm` equality over every valuation
of up to four marks; per-site fixtures for each row of §5's table, one
forged package per refusal constructor, one restored-defect proof per
obligation kind.

## 11. Source verification (unchanged from the packet, §1)

Access date 2026-10-30. Labels exactly as the packet gives them; none
upgraded.

| Key | Source | Verdict |
|---|---|---|
| [BS01] | Baader, Snyder. Unification theory. Handbook of Automated Reasoning I, ch. 8, 2001; §2.2.3 p. 448 read | **verified** for the definition; cited too strongly by the options note (F2) |
| [L05] | Leijen. Extensible records with scoped labels. TFP 2005; draft rev. 76 read (Fig. 1, §3.2, §7.1) | **verified** (draft; TFP text not accessed) |
| [Tar75] | Tarjan. Efficiency of a good but not linear set union algorithm. JACM 22(2), 1975; Berkeley memo ERL-M434 abstract read | **verified** (memo version) |
| [BPPS18] | Biernacki, Piróg, Polesiuk, Sieczkowski. Handle with care. PACMPL 2(POPL), 2018; §1 p. 4 read | **verified** for `lift` |
| [L17] | Leijen. Type directed compilation of row-typed algebraic effects. POPL 2017; Aug 2016 technical report read | **partly** (report, not POPL text); `inject` **unconfirmed** |
| [MMNS11] | McConnell, Mehlhorn, Näher, Schweitzer. Certifying algorithms. Computer Science Review 5(2), 2011 | **partly** (Mehlhorn's slides only; paper not accessible) |
| [GJ96] | Gaster, Jones. A polymorphic type system for extensible records and variants. NOTTCS-TR-96-3, 1996 | **partly** (abstract only) |
| [RM99] | Rehof, Mogensen. Tractable constraints in finite semilattices. SCP 35, 1999 | **not accessible** (publisher 403; secondary abstract consistent) |
| [DG84] | Dowling, Gallier. Linear-time Horn satisfiability. J. Logic Programming 1(3), 1984 | **not accessible**; not relied on |

## 12. Decision table (one pass)

Each row is one decision; "recommended" is this document's proposal,
not a choice. Approving the table approves the recommended column
unless a row is marked otherwise.

| # | Decision (folds) | Recommended | Alternatives | Consequence of the recommendation | Depends on |
|---|---|---|---|---|---|
| D1 | Trusted mark check (Q1) | M-C: M-A gated, M-B test-only differential | M-A alone; M-B gated (departs from §5's evidence model); M-D both gated | smallest trusted base; package terms judged; differential tests §5's two directions | D4, D6 |
| D2 | Rows (Q2) | R-A, with keys as [L17] (§4) | R-B (rejected in the options note) | each refusal names an obligation's provenance | — |
| D3 | Interim policy (Q3) | F14 items 1-3 as the options note states them | amend an item | no live change; item 2 waits for a second strategy; item 3 is `Outside HandlerType` | — |
| D4 | Package type and homes (Q4, F5) | `EffectPackage` (§2) as part of A2's specification, replacing `Substitution`; homes as §2's table | leave to tranche 2's read-back | the read-back targets a fixed interface; Online `certified`, Witness `bindingsOf` change | D5 |
| D5 | `⟨p, result clauses⟩` ownership (F1, Q8) | resolution A (§3): record-owned by forcing; a package binding is `Malformed`; statements §2 text as proposed | B: package binds, must equal σs(t); C: forcing overrides (two homes) | one home; read-back independent of the restriction; revisit if the restriction is lifted | §R7b ruling |
| D6 | M-B's edge source (Q5) | an independent collector written from statements §4 | V9's own collector; live `MarkStore` (today's code as reference) | the differential also tests E12's exhaustiveness | D1 |
| D7 | E9 and the type-hole default (Q6) | judge E9 before defaults: a hole head refuses | judge after settling (a hole head passes at Int) | E9 is the one obligation judged before settling; `Fail` keys defined for row steps | — |
| D8 | Several failing obligations (Q7) | report the first in recorded order | report all | deterministic refusals; later failures unreported | D10 |
| D9 | Where V2 lives (Q9) | extend `solvedForm` (Strategy/Witness.purs:86) to all sorts and terms, one function, called both as I3's refusal and in `coverage` | a new trusted module beside it | one re-pin of a trusted module; one definition | D4 |
| D10 | Refusal constructors (Q10) | §6's four: `Malformed`, `ObligationFailed Provenance`, `NotCertifiable Limitation Provenance`, `RecordDefect Provenance` | `ObligationFailed Obligation` only (statements §10) | A6's losses and generation bugs counted apart; never read as "invalid program" | — |
| D11 | `UnframedInstall` and other `Unsupported` in the validator (R-c) | not evaluated; rule 1 blocks; an attempt's acceptance stays suppressed as today | refuse every candidate of a problem with `Unsupported` | routing unchanged (statements §7); no Certified reaches Solved | — |
| D12 | Record-flag consistency (new) | a `Consume` whose `marks`/`bare` disagree with its site kind is `RecordDefect` | trust the flags | a generation defect cannot change a condition silently | D10 |
| D13 | Differential before tranche 2 (Q11) | fixture-only (hand-built honest and forged packages) until a read-back produces effect packages | wait for tranche 2 | §5's directions checked on fixtures early; corpus evidence deferred | D1, D6 |
| D14 | Fidelity corrections (Q12, F2, F3) | apply §7's proposed text to the options note | keep "faithful" | labels match what the sources say | §11 |
| D15 | Citation corrections (F4) and stale §10 (F6) | apply §8's proposed text to the statements | leave as is | statements match the code and the verified sources | §11 |

**What stays open after the table** (not decisions of this table):
U2-U8's extension, O-SUB, A1, P4 (relied on nowhere under forcing),
[FX008-5], Definition 4.2's sufficiency; the corpus differential
(tranche 2); implementation authorization.
