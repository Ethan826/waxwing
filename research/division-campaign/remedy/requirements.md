# The `divide5` gap: requirements, remedies and architecture

Dossier §18.59 (the author's authorization of a requirements-and-
statements tranche) and §18.60 (design requirements for keeping a route
to fixing `divide5`). **Statements and proposals only: no prototype, no
proofs, no compiler change.** Nothing here is adopted. Each claim is
labelled **cited** (file or section), **argued** (reasoning, not checked
in Lean or by script) or **proposed** (a design choice for the author).
Five read-only parts (R1-R5) supplied the material; the coordinator
assembled it. Adversarial review pending (§10).

## 1. Summary

1. **Three separate gaps, not one.** The current checker refuses valid
   programs for three independent reasons:
   - **G1, certificate expressiveness on written labels.** `divide5`
     needs a split of `r`'s written labels by whether `s` holds each;
     no piece expresses it (CI4′, `d5_refused`; cited §18.58).
   - **G2, the value language.** Some valid problems need a
     certificate to name a field's type through another row (a field
     reference). Neither remedy below fixes this (argued, §3.3).
   - **G3, compilation policy.** Even a certified `divide5` cannot be
     compiled under decision 3: its split is not forced, and no
     annotation can write it (argued, §2.4).
2. **Two remedies for G1** (§4): one-literal guards on written labels
   (R2) and pattern-dependent certificate selection (R3). Guards give
   O(m) certificates and a new piece semantics; selection reuses the
   proved checker per leaf but needs at least 2^m leaves on `divide5`
   (argued). A guarded certificate is a compressed selection family.
3. **The architecture keeps a route to either remedy** (§6-§8): the
   recorder emits the general model; each checking strategy is an
   injected value that supplies "accepted ⇒ `ValidOpen`"; lowering
   consumes a format-neutral witness language, never a certificate;
   verdicts keep Unresolved distinct from Contradiction.
4. **One blocking architectural risk** (§7.1): the constraint recorder
   lives inside the online solver, which today returns a false
   Contradiction for `route` before recording finishes. Unless that
   changes, no remedy can reach the programs it is meant to accept.
5. **Plans to revise before implementation** (§9) and **decisions for
   the author** (§11).

## 2. The architectural test: a `divide5`-shaped program (R1)

### 2.1 Source

Existing surface syntax only (cited: docs/language.md grammar; no
literal has several spreads):

```wxw
fn file(doc: { ...u, ...t, ...q }, inbox: { ...s }, archive: { ...s2 }): Int
  where u disjoint s, t disjoint s2, q lacks { id } =
  0;

fn submit(doc: { ...r }, inbox: { ...s }, archive: { ...s2 }): Int
  where s disjoint s2 =
  file(doc, inbox, archive);

fn main(): Int = submit({ id: 7, title: "Q3", owner: "ada" },
                        { title: "Inbox" }, { owner: "Archive" });
```

Motivation (proposed): `file` is a library API filing a document's
fields into one of two destinations (`u` to `inbox`, `t` to `archive`),
keeping a leftover `q` under a freshly stamped `id`. `submit` is a
generic wrapper: a field the inbox already has must go to the archive
and conversely. Routing depends, label by label, on another row.

Doubt (R1): `file`'s body cannot reach `u`, `t`, `q` separately
without a projection primitive (translation.md §3.2), so the callee is
natural only as a library or foreign API. The same holds for `route`
(§17.3). The program is constructed; §18.59 says a constructed
counterexample warrants investigation but does not settle the
mechanism.

### 2.2 Hand-translated constraints

By translation.md §2.2-2.3 (cited): rigid rows `r=0`, `s=1`, `s2=2`;
the call makes fresh flexible copies `u'=3`, `t'=4`, `q'=5`, `s'=6`,
`s2'=7` (R11). `D = [disjoint 1 2]` (from the written clause; nothing
implied). `B`:

```
eq {0} {3,4,5}      eq {1} {6}      eq {2} {7}
disjoint 3 6        disjoint 4 7    lacks 5 id
disjoint 3 4        disjoint 3 5    disjoint 4 5
```

The last row is `file`'s implied pairwise disjointness. This is
`route5Sig [id]` (argued), the source-faithful form, following
`routeSig`'s own convention (SourceBoundary.lean:50-55 keeps the copies
and implied atoms). It differs from Lean's `divide5Sig [id]` by the
copies `s'`, `s2'` and the implied disjointness atoms. Eliminating the
copies gives back `disjoint 3 1`, `disjoint 4 2`; the implied atoms are
redundant because a composition is defined only when its parts are
pairwise disjoint (translation.md §2.1). So `ValidOpen (route5Sig as)
⇔ ValidOpen (divide5Sig as)` and the transfer of refusal are
**argued, not proved**; the Lean theorems cover `divide5Sig`.

### 2.3 Validity evidence and the current limitation

- **Valid:** `d5_open`, `ValidOpen (divide5Sig as)` for every list
  (cited, Cell/Proofs/W7/Divide5.lean). Witness `d5Wit`: `u` = the part
  of `r` outside `s`, `t` = the part inside `s` (allowed since `s
  disjoint s2`), `q` empty.
- **Refused by every current certificate** when `as ≠ []`
  (`d5_refused`, `scDivide5`, cited). Accepted when `as = []`
  (`divide5_nil_accepted`, cited).
- **In the model's terms:** `divide5Sig` is inside `LDFragment`
  (checked in Lean during the wave-2 review, §18.58). The checker is
  incomplete on the fragment; its queries are exact there (QR1-QR5).
  Exact queries cannot compensate for a certificate language that
  cannot express the witness (§18.59).

### 2.4 Behavior wanted (proposed)

| Case | Wanted | Today (predicted, not run) |
|---|---|---|
| `submit` signature | valid; Unresolved ("cannot certify") until G1 is fixed, then Solved | rule H likely reports a false contradiction, as for `route` (§18.16, SIG-ROUTE-H, checked for `route` only) |
| compiling `submit` | policy refusal: "valid; split not determined" (decision 3) unless a selection rule is adopted (G3) | as above |
| drop `q lacks { id }` (`as = []`) | valid and certified (`divide5_nil_accepted`); still unforced, so G3 applies | possibly accepted by putting `r` into `q` |
| drop `where s disjoint s2`, keep `lacks` | invalid; Contradiction with the counter-instance `r = s = s2 = {id: Int}` and the hint `where s disjoint s2` | — |
| drop both | valid (`q := r`) | — |
| add `where r disjoint s` | valid with `u := r`, no guard; narrows the contract (callers whose `doc` overlaps `inbox` are rejected) | — |

At run time a witness selects layouts and moves no value (cited
§18.15). Per-key outcomes show the per-label dependence: with `doc =
{id:1}`, `inbox = {id:2}`, `archive = {}`, `id` must go to `t`; with
`inbox = {}`, `archive = {id:3}`, it must go to `u`. The same written
label goes to different parts in different specializations; no
unguarded uniform certificate can say that.

A **programmer-visible cliff** (argued): without `q lacks { id }` the
caller is certified; adding that harmless-looking clause to the callee
makes every certificate fail, although `id` has nothing to do with `s`
or `s2`. The refusal comes from the label being written.

## 3. The three gaps

### 3.1 G1: written-label splits (`divide5`, `chain3`)

`divide5` needs, per written label, "in `u` if `s` lacks it, in `t`
if `s` holds it". Cells already carry such splits for unwritten labels
(a cube literal is a membership guard on the cell's holder set;
argued, R2 §1.3); written labels have no syntactic holder set, so the
current format has no way to say it.

**`chain3`** (R2, argued, ValidOpen unchecked): rigid `r, a, b, c, d`;
`D = [disjoint a c, disjoint b d]`; `{...r} = {...u1, ...u2, ...u3,
...q}`, `u1 disjoint a, b`, `u2 disjoint c`, `u3 disjoint d`, `q lacks`
each written label. Valid by "not c → u2; c ∧ not d → u3; c ∧ d → u1".
Needs a two-literal guard; one literal cannot express it.

### 3.2 G3: compilation policy (R1, R5)

Decision 3 (§4 policy; §18.17 item 3, cited): a compiled split must be
forced (C7) or written. In `divide5`, a label of `r` in neither `s`
nor `s2` may go to `u`, `t` or (if unwritten) `q`: the split is not
forced, and Waxwing has no syntax for `r` minus `dom s` (translation.md
§3.2). So **no certificate remedy lets `divide5` compile**; compiling
it needs C8 for a fragment plus a justified selection rule (the
lexicographic rule is rejected, §18.17 item 2). `route` is in the same
position (split-selection.md §6 q1, cited).

### 3.3 G2: field references (R2's `pick`, R3's example)

R3 (argued, ValidOpen unchecked): rigid `r`; flexible `x, y, β`;
`D = []`; `{...r, ...x} = {a: β, ...y}`. Valid: if `r` lacks `a`, then
`x := {a: {}}`, `β := {}`, `y := r`; otherwise `β` is `r`'s type at
`a`. At the pattern where `r` holds `a`, the certificate must name that
type; the format has no field reference, and `eqC` never matches a
field to a piece. **Every certificate is refused, under any guard
language and any selection tree.** R2's `pick` (`{a: β, ...y} =
{...q, ...s}`, `q disjoint s`, `D = []`) has the same cause.

This falls under the field-reference deferral already recorded
(§18.54). It also shows that statements.md §9's justification "no
written label is ever forced present" holds for the uniform region but
not inside a selection leaf.

## 4. Two remedies for G1

### 4.1 One-literal guards on written labels (R2)

- **Format** (proposed): `⟨row r, labels L, guard g : Option (Nat ×
  Bool), cubes Ks⟩`; the guard applies to written labels only.
- **Denotation** (proposed): at written `l`, the piece holds
  `θs.row r (inl l)` when `r` is rigid, `l ∈ L` and the literal holds
  at `l` (row `x` present at `l`, read through `GenericInst`'s third
  conjunct, i.e. π); cells as today. No new evidence premise: no change
  to `CellShape`, `WithinC` or `GenericInst` (argued). Guards on
  non-rigid rows are refused by validation.
- **Checker:** one new query `possWL r l K` ("r may hold `l` with
  every literal of `K` true"), subsuming `possW` and `possBoth`;
  implemented as `cellPossS` with `(x, false)` added for each `lacks x
  l`. `lackC`, the written part of `piecesApart` and `sameW` (which
  becomes a semantic coverage test) use it. `cellBoth`, `cover`,
  `sameCells` unchanged.
- **Complexity** (argued): with one literal, every written obligation
  is a Horn instance decided by its least model, polynomial; two
  literals give 2-SAT; three or more open (as PG, projection-statements
  §3.3); DNF guards would bring QX4's coNP-hardness to a single written
  label. Cell `cover` unchanged.
- **Coverage** (argued): `divide5` with 3 pieces, O(m) labels;
  every target constrained by disjointness from one rigid row; a
  partition lemma limits one literal to a two-way split per label, per
  record, by one rigid row. Not `chain3` (needs two literals), not G2.

### 4.2 Pattern-dependent certificate selection (R3)

- **Format** (proposed): a binary decision tree `leaf σ | node (x, l)
  T⁻ T⁺` with `x` rigid and `l` written; leaves are ordinary cell
  certificates. A flat list is rejected: checking that it covers every
  pattern is coNP-hard (argued, 3-SAT reduction).
- **Route (a), strengthen the problem** (proposed, flagged novel): a
  leaf with literals `L` is checked as `cellCheck P_L (implQ P_L) σ`,
  where `P_L` adds `lacks x l` for each negative literal and `lacks y
  l` for each `y` declared disjoint from `x` for each positive literal.
  `P_L` stays in `LDFragment`; `written` and `thetaFree` are unchanged
  (argued). **`cellOpenImpl` applies to each leaf verbatim.**
- **Query equivalence** (argued): on the fragment, `implQ P_L` returns
  exactly the exact answers relativized to the leaf, so route (a) loses
  nothing against a relativized checker (route (b)) for the current
  checker.
- **Composition** (argued): any finite base assignment satisfying `D`
  reaches a leaf whose `D` it satisfies; each leaf problem is
  `ValidOpen`; so `P` is. This works below B5, at `ValidFin` per
  injective extension.
- **Size** (argued): `divide5` with m labels needs at least 2^m leaves
  and 2^m suffice (the cell counterpart of PD5neg; proof idea: 2^m
  extreme patterns, then `d5_refused`'s argument on any leaf holding
  two of them). Strategy B's measured precedent: `divide3` at m = 16,
  65,536 leaves, 43.1 MB (cited, star/report.md §4.3). A single root
  literal certifies m = 1 only.

### 4.3 Comparison

| | One-literal guards | Pattern-dependent selection, route (a) |
|---|---|---|
| `divide5` certificate | 3 pieces, O(m) labels | ≥ 2^m leaves (argued) |
| `chain3` | refused (needs 2 literals) | expected accepted by a tree splitting on `c`, then `d`, per label (coordinator's argument, unchecked; R3 did not analyse `chain3`) |
| G2 (field references) | refused | refused |
| New semantics | guarded piece denotation | none: leaves are today's certificates |
| New queries | `possWL` (Horn, polynomial) | none (route a) |
| Coverage check | semantic `sameW` per label | structural, linear in the tree |
| Reused proofs | conservative extension (G-Ext) carries acceptances; `inl` cases of stream C and CM reassembled | `cellOpenImpl` per leaf, verbatim |
| New proof effort | ~2-3 wave-2-sized streams plus scenarios | ~1-2 streams (tree cover, case split, tree soundness, size bound) |
| Search | new; row unification gives no guards; per-label synthesis polynomial for single-equation shapes (argued) | CEGAR refinement as strategy B; multiplies the per-leaf search |
| Novel under ADR 014 | guarded piece format, semantic `sameW`, `possWL`, partition lemma, G-Ext | positive literals as neighbour `lacks`, the case-split lemma, the cell size bound |
| Author's earlier ruling | — | reintroduces a certificate-supplied split tree, which §18.54 declined for `cover` |

**Relation** (argued, R2 §4 and R3 §4): a guarded certificate is a
compressed, per-label pattern-dependent family checked once over the
region; selection without path-contributed pieces cannot be compressed
below 2^m on `divide5`, and adding path-contributed pieces is guards.

### 4.4 Prior art (cited as the parts report; "memory" = not re-read)

- Conditional constraints with one prime condition applied per label:
  Pottier (NJC 2000; LICS 2003), read per concatenation-leads.md. The
  closest published shape to a one-literal guard.
- Asymmetric concatenation (Rémy, POPL 1992; Pottier 2000): per label
  "left where the right lacks", i.e. `r` minus `dom s`. Read.
- Presence flags (Rémy 1989/1994), disjunctive concatenation types
  (Wand, LICS 1989), Rose (Morris & McKinna, POPL 2019): presence
  resolved uniformly; no static case analysis on rigid presence.
- Case splitting: DPLL(T) (Nieuwenhuis, Oliveras & Tinelli, JACM 2006);
  oracle-based checking of untrusted software (Necula & Rahul, POPL
  2001); union elimination (Dunfield & Pfenning, FoSSaCS 2003). Memory.
- Horn-SAT (Dowling & Gallier 1984) and 2-SAT (Aspvall, Plass & Tarjan
  1979): standard, memory. CEGAR (Clarke et al., CAV 2000), cited in
  star/report.md §2.
- Internal precedent: P9s's `checkAll` (per-pattern tables) and
  strategy B (presence-bit trees, `verifyCoverage`).

## 5. The smallest proposed extension

"Smallest" has two measures, and they disagree:

- **Smallest proof delta: selection, route (a).** It adds no semantics
  and reuses the accepted checker per leaf. Obligations (proposed):
  T0 validation (node literals on rigid rows and written labels); T1
  `P_L ∈ LDFragment` when `P` is; T2 tree cover (every `θR` satisfying
  `D` reaches a leaf whose `D` it satisfies); T3 case split (every
  leaf `ValidOpen` ⇒ `P` `ValidOpen`); T4 tree soundness (from
  `cellOpenImpl`, T2, T3); T5 a one-leaf tree is accepted iff `checkI`
  accepts; T6 `divide5` accepted for every list; T7 the 2^m lower
  bound. Cost: exponential certificates on `divide5`.
- **Smallest certificate and checking cost: one-literal guards**, as a
  separate checker `cellCheckG` beside the reviewed definitions so that
  no accepted theorem is invalidated (`d5_refused` and CI4′ stay true
  of the old checker). Obligations (proposed): G-CI1-CI3, G-CD1-CD4,
  G-CB1-CB4, G-CM over `cellCheckG` and `QSoundG`; G-Q (`possWL`
  soundness) and G-CV2; G-QR (`possWL` exact on the fragment); **G-Ext**
  (for guard-free certificates, `cellCheckG` agrees with `cellCheck`,
  carrying every accepted scenario); G-CI4 (one-literal option C guards
  have an image, with rigid guard rows); scenarios `ScDivide5G`
  (accepted for every list), `ScChain3` (ValidOpen, refused by every
  one-literal certificate), `ScPick` (ValidOpen, refused by every
  certificate), and controls (wrong polarity, flexible guard row,
  field clashing with a guarded piece). Unchanged as theorems: QX1-QX4,
  QR3-QR5, CV1, `cellShape_thetaFree`, CG, CI5, `cellShapeNeeded`,
  `d5_open`, B5.

**Coordinator's proposal, for the author's decision:** state
one-literal guards (`cellCheckG`) as the candidate extension for G1,
because it certifies `divide5` with linear certificates and polynomial
checking, and keep selection (route a) as a recorded alternative whose
obligations are stated but not pursued. Neither is adopted by this
document. Before either goes to proof, `chain3`'s and `pick`'s
validity and the partition lemma should be checked (each is argued
only), since they set the extension's boundary.

## 6. Front half: translation, recording, interfaces, verdicts (R4)

### 6.1 Translation target

The recorder emits the general constraint model, never a certificate
format (§18.60). The planned recorded problem (recorder-spec §2.1,
cited) is already this: `core : SigProblem` (rigid rows and type
variables, `D` computed from the resolved declaration, `B` raw atoms
with metas unsubstituted), explicit flexible variables, requirement
atoms `Q`/`BQ` kept apart, admissibility and split records never
conjoined into `B`, and `outside` for constructs the model cannot
express. Proposed changes: **stable atom ids** with origin, row, span
in place of the JSON bridge's positional provenance array
(recorder-interface §4.1); a **`vars` map** from problem variables to
checker metas and checked-IR holes (the interface point with lowering).
Source `D` is always `lacks`/`disjoint` over rigid rows (translation.md
§2.3), so source problems sit inside `LDFragment` today (argued); the
recorder never shapes `D` for any checker's guard.

### 6.2 Strategy interface (proposed)

```
Strategy = { tag      : FormatTag
           , guard    : Core → Either GuardReason Unit
           , search   : Core → Budget → Stream Candidate   -- untrusted
           , check    : Core → Cert tag → Either Refusal Accepted
           , describe : Core → Cert tag → WitnessDescription }
Refuter  = { search : Core → Budget → Stream CounterInstance
           , check  : Core → CounterInstance → Either Refusal Refuted }
```

Strategies and the refuter are injected values, not flags (AGENTS.md).
Certificates are a tagged sum. Only `check` is trusted. **Every format
supplies one theorem, `Sound_F : check_F P c = accepted → ValidOpen
P`.** For today's cell format it is `cellOpenImpl` (proved, research
model, no further premise; §18.56). A guarded format or a selection
format is a new `Strategy` value; the recorder, problem type, verdict
type and refuter do not change (argued). Strategy order is cost
policy, never semantics.

**What acceptance guarantees:** `ValidOpen` of the recorded problem,
for the research model. **Not guaranteed:** that the PureScript port
equals the Lean checker (evidence only: differential tests,
translation validation); that the recorded problem is the source's
meaning (L1-L3); requirement atoms (no checker; `ValidOpenR` unstated);
effect-row independence; completeness (`d5_refused`); any polynomial
bound on `cover`; witness correctness at keys or lowering (§7).

### 6.3 Verdicts

Names as in the repository (docs/engineering.md "Evidence for solvers",
cited): Solved, Contradiction, Unresolved.

- **Solved(evidence):** some strategy's `check` accepted.
- **Contradiction(θR, refutation):** separate evidence, as W5 used: a
  finite rigid assignment `θR` over the bases plus `k` fresh ones,
  checked to satisfy `D`, and a refutation of `B` at `θR`. Proposed
  statement **CX** (unproved): for injective `i : B → B₁` and finite
  `θR` with `Sat θR (P.mapBase i).D` and `decideCall (subst θR
  (P.mapBase i).B) = false`, `¬ ValidOpen P`. It needs a substitution
  lemma not yet stated. Fresh bases are needed for problems such as
  `shapeSplit ()` (`ValidFin`, not `ValidOpen`).
- **Unresolved(reasons):** everything else, including refusal by every
  current certificate (`divide5`), guard refusals (`agreeP`, `D =
  [ff]`) and limits. Reasons form an ADT with no catch-all:
  `NoAcceptedCertificate`, `OutsideCheckerFragment`, `Unsupported`,
  `OutsideModel`, `Limit`. Diagnostics say "the checker could not
  justify this obligation", never "this is wrong"; hints only when
  re-checked (for example the narrowing `where r disjoint s`, labelled
  as narrowing).

### 6.4 Policy versus validity

Order (proposed): model coverage → per strategy: guard, search under
budget, check → refuter → verdict → separately, for Solved, admission
(R010 on a witness description, decision 3, specialization limits).
Guards and limits yield Unresolved with a reason; admissibility and
decision 3 are their own refusal ("valid; compilation refused by rule
X"), never conjoined into `B` and never a validity verdict.

## 7. Back half: witness, selection, lowering (R5)

### 7.1 The blocking risk (R4 §5)

The recorder sits inside the online solver (recorder-spec §5.2, §6,
Q10; recon step 6, cited). Rule H's rigid-atom exclusion classifies
`Homeless` as Contradiction (RowOutcome.purs; Homes.purs:31-34; checked
for `route`, SIG-ROUTE-H). A refused body returns no recorded state, so
no checker ever sees it. **Before the gate, one of:** every
Contradiction path that assumes indivisible rigid rows becomes advisory
pending the gate (at least `Homeless`; per-constructor audit needed),
or recording moves to a generate-only pass (recon §6 Q1, "gate vs
generate-then-decide", open).

### 7.2 Witness language (proposed)

Lowering needs, per instantiation slot and flexible hole, at each
specialization key, the ground row and ground types; nothing about
pieces, cubes, cells, patterns or P9s tables (argued from
split-selection.md §1-2.1 and ADR 013). Proposed contract: a witness
language between Check and Specialize, carried in checked IR as a
separate slot type (`Determined (Ty Open) | Divided WitnessRef`), never
inside `Ty`. Atoms: `in(x)` (label in rigid row `x`), `is(a)` (label is
written label `a`), `has(x, a)` (row `x` holds `a`, at the key); a
`case` node on patterns. Every format targets it through an adapter in
Features.Check.*: cell pieces, guarded pieces (one more literal) and
selection trees (`case` over `has`). Specialize imports only the
language; a structural rule can enforce that.

**The one necessary connection** (proposed, unstated): per adapter, a
correspondence lemma: evaluating the adapted witness at a ground rigid
instance of pattern π equals the valuation of `cinst P θs σ` at `θs =
thetaFree P π`. It changes with the format; the evaluator, IR, layouts
and Go do not.

### 7.3 Selection

Under decision 3 a compiled split is forced or written, hence unique;
so two formats accepting a program give byte-identical Go provided
lowering goes only through the witness language (argued). Proposed
regression property: compile a corpus through two adapters and compare
bytes. After decision 3 is lifted, the witness must come from a stated
rule in an injected Selection component; otherwise layouts change with
the format (R5's example key: `sigma5`, `d5Wit` and the rejected lex
rule give three different splits).

### 7.4 `divide5` at run time

Under whole-program specialization, the membership test against `s`
is a compile-time sorted merge per key; no run-time dispatch, copy or
evidence (argued; split-selection.md §2.1, §4). The 2^m certificate
bound is a checking cost, not Go size: only reached keys exist. A
run-time partition would arise only in a future boxed backend (ADR 002),
where `route` needs one too.

## 8. Change impact when G1's extension arrives

| Component | Guards | Selection | Notes |
|---|---|---|---|
| Recorder, `RecordedProblem`, translation rules | reusable | reusable | provided §7.1 is resolved |
| Verdict type, diagnostics shape, refuter, CX | reusable | reusable | new `Refusal`/reason constructors only |
| Certificate type, checker | new tag, `cellCheckG` | new tag, tree walker | |
| Format proofs | G-* (2-3 streams) | T0-T7 (1-2 streams) | `cellOpenImpl` reused per leaf (selection) |
| Bridge (B5, `openCharacterization`, `openToFin`), CV1, `cellShape_thetaFree`, CG, CI5 | reusable | reusable | |
| Wave 1-2 theorems | stay true of the old checker; transfer via G-Ext | apply per leaf | `d5_refused`, CI4′ stay true of the old checker |
| Search | new (per-label synthesis) | CEGAR over the existing search | |
| Adapter to the witness language, its lemma | new | new (`case`) | |
| Witness language, Specialize.Witness, layouts, Go | reusable | reusable | |
| Admissibility (R010 on support), decision-3 policy, Selection interface | reusable | reusable | |

## 9. Plans to revise before implementation

None of these is implemented, so revising them is cheap (§18.60: revise
the boundary before implementing it).

| Plan | Coupling | Revision (proposed) |
|---|---|---|
| recorder-spec §5.2, §6, Q10; recon step 6 | recorder inside a verdict-making solver | §7.1 |
| recorder-spec §3 "covered by", §7; recorder-interface §6 | guarantees stated via `checkAll_validFin` | restate per strategy through `Sound_F` |
| recorder-spec T8a; recon step 4 | online σ read as a P9s certificate | per-format `fromSubst_F` on the search side |
| recorder-spec §2.4 (`slots` = certificate term), H1, H4, L9, P3, P5 | admissibility and lowering over certificate syntax | witness description; P3 becomes the adapter lemma |
| recorder-spec §2.5 `Outside RequirementAtom` | a checker limit encoded as a model gap | `Unsupported` reason, Unresolved |
| recon §2.3, §2.4, §3.2, step 7 | P9s `interp`/`hS`; certificate in checked IR | witness language only |
| split-selection §2.2, §2.3 | presence-only, P9s-shaped; restricted tail inside `Ty` | witness language; separate slot type |
| split-selection §3.5 | lexicographic rule | already rejected (§18.17 item 2) |
| recorder-interface §4 (effect rows dropped on arrows) | drops constraints | follow recorder-spec (`Outside EffectRow`) |
| translation.md §2.1, §5 | example verdicts stated for `ValidFin`/P9s | restate as `ValidOpen` |

## 10. Adversarial review

Pending. Planned: a soundness pass (try to break `chain3`'s and
`pick`'s validity, the partition lemma, the 2^m bound, route (a)'s
query equivalence and composition, the guard denotation's lack of new
premises, CX) and an architecture pass (each §18.60 requirement against
§6-§9; a restrictions table for each remedy; couplings missed).

## 11. Decisions for the author

1. **Gate vs generate-then-decide** (§7.1), needed before any gate.
2. **Which G1 extension to state for proof:** one-literal guards
   (proposed), selection route (a), or neither yet. Selection
   reintroduces a certificate-supplied split tree.
3. **G3:** whether to pursue C8 for a fragment plus a selection rule;
   without it `divide5`- and `route`-shaped programs are valid but not
   compilable.
4. **G2:** field references stay deferred (§18.54); `pick` and R3's
   example would be recorded as known valid-but-uncertified.
5. **A distinct error code for Unresolved** (changes pinned fixture
   codes, recon §4.2).
6. **Ground re-check at keys** (investigated, not adopted; §18.17 item
   5): it would catch adapter defects.

## 12. Unresolved couplings

1. Gate vs generate-then-decide (§7.1).
2. `ValidOpenR` for requirement atoms is unstated; until then problems
   with non-empty `BQ` are Unsupported for every strategy.
3. CX and its substitution lemma are unstated.
4. Which current Contradiction classifications establish `¬ValidOpen`
   under divisible rows: an audit with counter-instance fixtures.
5. Forcedness is a "for all solutions" property; an existence
   certificate does not supply it. Who decides it on the typed
   fragment (type variables couple labels).
6. The adapter correspondence lemma (§7.2) is unstated; it depends on
   `hv`'s treatment of cell entries, unverified.
7. From `ValidOpen` to existence at each key: a stated correspondence
   between ground keys and model instances, including constructs
   outside the fragment (recon risk 3), and that reached keys satisfy
   their declaration's `D`.
8. R010 admissibility of divided slots: no termination argument for
   restricted images.
9. Requirement atoms and witness choice: acceptance can depend on the
   witness (E2).
10. Task 8 (several tails) and M14 are prerequisites; "same layout, no
    conversion" is assumed.
11. Per-key solving cost if a future rule solves in Specialize
    (`decideCall` is exponential in the worst case; unmeasured).
12. Slicing (S1/S2) would sit between recorder and checker; its
    soundness must quantify over the original recorded problem.
13. The source translation of `divide5` (`route5Sig`) and Lean's
    `divide5Sig` are argued equivalent, not proved.
14. The docs disagree on today's compiler behavior (language.md's
    Tranche B paragraph versus §18.16's probes); every claim about the
    current compiler here is predicted, not run.
