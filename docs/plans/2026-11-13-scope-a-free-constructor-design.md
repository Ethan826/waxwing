# Scope A: the free-constructor model for data applications (statements-first design)

Status: design only, authorized by dossier §18.190. No implementation,
no marker removal, no effect-marker work, no Scope C. Nothing here is
proved. The statements below await the author's approval, the first of
the proof-dossier policy's two approvals, before any proof work starts.
Source at 59e70fdb; evidence under .build/evidence/2026-11-13-scope-a/.
Revised after an adversarial statement review (§14).

Approvals: statements, pending (author) / completed dossier, not yet
(rule: the default two; AGENTS.md sets none).

## 1. The question

`Outside DataApplication` blocks a whole-declaration Solved wherever a
declared type is applied to arguments (`Option(a)`, `L(Int)`).
T-R0b §3.5's table puts the kind in the "no" row: nothing is omitted
from the recorded atoms, because `app h [args]` is recorded in full.
What is missing is a model that judges those atoms (T-R0b §11 item 4;
§18.69 Q3, Q10). The exemption condition is the author's (§18.69 Q3):
a construct is exempted only after its omitted obligations are shown
unable to affect the claimed result. For this kind, that means giving
`ValidR` a meaning for `app`, bounding the scope so that `app` hides
nothing (§5), and showing that what R0 checks is sound for that meaning.

The census analysis (docs/plans/2026-11-12-census-analysis.md) found
121 lost programs blocked by this kind alone. Suppressing the marker in
an isolated copy solved all 121. That shows no other blocker appeared,
and nothing more: it is not soundness, and it authorizes no removal
(§18.190).

## 2. How applied types flow today (cited; code read 2026-11-13)

- **Recording.**
  - `TData owner args rows` becomes `Base (DataBase owner)` when it has
    no arguments and no rows. Otherwise it becomes `App (DataHead
    owner) (map recorded args)`. **Row arguments are dropped**
    (src/Features/Check/Generate/Elab/Recorded.purs:36-38).
  - Arrows are recorded with their effect rows erased, inside `app`
    arguments as everywhere else (T-R0b §2.2).
  - `THandler` becomes `App (HandlerHead e) args` (:39-40).
  - The term language is `RTExpr = Base | Arrow | TVar | Record | App
    Head [RTExpr]` (src/Domain/Recorded/Atom.purs:49-54).
- **Arity.** A declared type's `rows` counts its effect-row parameters
  only. A record-row parameter is counted with the type parameters
  (src/Features/Check/Generate/Lookup.purs:105-107;
  src/Features/Resolve/Types.purs:96-101).
- **The marker.** `dataOf` (src/Features/Check/Generate/Translate.purs:
  129-146) marks every `TData` with arguments or rows:
  - `OverRecords` (DataOverRecords) if the owner has a record-row
    parameter, `Application` (DataApplication) otherwise;
  - a type applied only to effect rows is `Application` too
    (docs/findings.md:2221).

  Node.purs:156-163 emits the marker once per `app` built. The emission
  points are signatures, instantiations, constructors, patterns, and
  effect, control and failure annotations.
- **Rule 1** (src/Features/Check/Decide/Reason.purs:62-69) reads only
  the kind: any marker blocks Solved. It also blocks a problem with an
  open requirement atom (Decide.Open), giving `RequirementAtoms`. Rules
  and refuters still run.
- **Solving and checking already treat `App` structurally.**
  - Entailed/Mgu.purs:80-84 decomposes `App h as = App h bs` argument by
    argument when heads and arities agree, and fails otherwise.
  - Strategy/Atoms.purs:76-79 checks a `B` equation by `defined` on
    both sides (:101: `App _ args` is defined when every argument is),
    then syntactic equality.
  - Effects/Equal.purs:59-62 compares `PData` by owner, shape and
    arguments.
- **Requirements.**
  - GroundRule.purs:46-76 judges `App (DataHead t) args` as the
    conjunction of `declared holders t` and the arguments. `declared`
    gives `Unjudged` for an undeclared head, `Open` for a holder head
    and `Holds` otherwise. `App (HandlerHead _)` `Fails`.
  - The holder set is the problem's own (ruling K-a, 2026-10-23,
    docs/findings.md:3109-3125).
  - **G0's check accepts an open atom.** Asked.purs:36-37 returns
    `Right unit` for every atom `Decide.Open` lists, and the guard skips
    open atoms (Guard.purs:33). Only rule 1 blocks them.
- **Read-back.** ReadBack/Images.purs:160-170 reads `App (DataHead t)`
  as `PData t args []` only when `t` has no effect-row parameter.
  Otherwise it gives `UnreadImage`, a read fault. Record-row heads read
  back.
- **No ground model exists in the compiler.** `G`, `Sat` and `ValidOpen`
  exist only in Lean (research/composition-proofs, Lean 4.35.0;
  Composition/Syntax.lean:21-93): `G = base | arrow | record`, and
  `TExpr` has no `app`. `ValidR` is defined in prose only (T-R0b §5.4;
  docs/plans/r0-validr-draft.md). Lean's Refute/Statements.lean:182-190
  takes it as an abstract parameter.
- **Assurance today.** Every R0 Solved carries `Pending
  genericSubstitutionSound` (P-G0, R0 plan §4), and Solved is minted by
  `certifyPackage` (`Pending certifyPackageSound`). G0's check is not
  proved sound on any problem, `app`-free ones included.

## 3. Prior art (what is cited, what is not)

Searched: the repository's R0 documents (T-R0b, the ValidR draft, the R0
plan, the CX statements, the certify arguments), the Lean project's
sources (208 files), docs/findings.md and BACKLOG. The literature below
is cited from standard references. Section and page numbers are to be
confirmed against the texts before the second approval (open item O1).

| Component | Source | Used for |
|---|---|---|
| Types as first-order terms over type constructors, compared syntactically | Damas and Milner, "Principal type-schemes for functional programs", POPL 1982; Pierce, *Types and Programming Languages* (2002), ch. 22 | applied types as free constructor terms |
| Syntactic unification: decomposition and clash rules | Robinson, JACM 1965; Martelli and Montanari, TOPLAS 1982; Baader and Nipkow, *Term Rewriting and All That* (1998), ch. 4 | Mgu R2′, already in the code |
| Free term algebras: constructors injective, distinct heads unequal ("no junk, no confusion") | Goguen, Thatcher, Wagner and Wright, JACM 1977; in Lean 4, `noConfusion` and the injectivity theorems generated for every inductive type | S1 |
| Homomorphisms preserve satisfied equations | Birkhoff, "On the structure of abstract algebras", 1935 | S4's encode and collapse steps |
| Substitution commutes with evaluation (the substitution lemma) | Baader and Nipkow (1998), ch. 3, for terms without records | S3's `app` case |
| Rigid variables as skolem constants under givens | Odersky, Sulzmann and Wehr, HM(X), 1999; Vytiniotis et al., OutsideIn(X), 2011 | the ∀rigid/∃flexible shape, unchanged |

**Not published** (this design's composition, as the ValidR draft §7
flags): free constructor nodes inside this project's record model (row
composition defined only on disjoint parts, `lacks`, `disjoint`). Each
statement that crosses records and `app` is labeled derived and must be
proved.

**The ValidR draft's claims, separated.** Everything in
docs/plans/r0-validr-draft.md is proposed or argued. Nothing in it is
proved:
- VR-sub (revised, §5.1): argued.
- VR-agree (§5.2): argued, with its two homomorphism lemmas unproved.
- VR-CX's correction (§5.3): argued.
- The policy points H-a, F-a, Pr-1 and Q-a are unruled (G-ValidR stays
  open). K-a is ruled.

This design depends on none of the unruled points (S6 and D5 below are
how). It restates the VR-agree lemmas it needs as its own statements.

## 4. Definitions

All are proposed and await approval. `Label`, `B` and `Assign` are as
in Composition/Syntax.lean.

- **D1 `GA`**: ground values `base b | arrow g g | record (Label → Option
  GA) | app t [GA]`, with `t` a declared type id. Handler heads are not
  in `GA` (they stay under `Outside HandlerType`).
- **D2 `TExprA`**: `TExpr` with `app t [TExprA]`.
- **D3 `evalA θ`**: `evalT`'s clauses, plus `evalA θ (app t ts) =
  app t <$> traverse (evalA θ) ts`. Defined exactly when every
  argument is.
- **D4 `HoldsA`, `SatA`**: `Holds` and `Sat` over `evalA`. `eq` holds
  when both sides evaluate to the same value. `lacks` and `disjoint`
  are unchanged, since they read rows only.
- **D5 `ValidR_A^{x,κ,Q} p`**: T-R0b §5.4's sketch over `GA`, written
  as a family:
  - `x` ranges over G-ValidR §3.1's options (H-a, H-b, H-c);
  - κ over §3.2's base valuations;
  - `Q` over §3.3's hypothesis choices (`Q_imp` under Pr-1, or none
    under Pr-2).

  For every injective base extension and every finite rigid assignment
  over `GA` satisfying `p.d` and `Q`, there is a finite flexible
  assignment satisfying `p.b`, with every `p.bq` atom satisfying
  `ReqG_{x,κ}`. The statements below hold for every member of the
  family, so none of those policies needs ruling first.
- **D6 `InScopeA p`**, the boundary. A problem is in scope when all of
  the following hold:
  1. every `app` head in `p` is `DataHead t` with `t` declared in the
     problem's holder table;
  2. no such `t` declares an effect-row parameter (`rows = 0`) or a
     record-row parameter (no `RecordSort` among its sorts);
  3. no such `t` is in the holder set `H`, so no constructor of an
     in-scope head holds a function, directly or through another type;
  4. no arrow occurs inside an `app` argument, at any depth;
  5. no `app` occurs in `p.d`;
  6. `p.outside` holds no kind but `DataApplication`;
  7. `Decide.Open` lists no requirement atom of `p` (rule 1's
     `RequirementAtoms` is empty).

  Conditions 2-4 together mean an in-scope `app` can hold no function
  value, so no effect row can hide inside one (S8). Everything else
  keeps its marker or its existing block.
- **D7 `H`**: the problem's holder set (K-a): declared types whose
  constructors hold a function, directly or through another declared
  type, a record field or a type argument (Features.Check.Functional).

Definitional choices to review:
- The model is **nominal**. `app t vs` and `app u ws` are equal only
  when `t = u` and `vs = ws`, whatever the constructors' fields. R3
  below shows why: a structural model is false to today's checker.
- Handler heads are excluded rather than modeled.
- Records stay finite at every depth, as in `ValidFin`.
- `evalA` is partial. An undefined argument makes the node undefined.
- Arity is a precondition: resolution rejects a wrong arity, and
  MalformedTerms checks package arities (Arity.purs:52-56).

## 5. Restrictions table

| Restriction | Why believed harmless | Challenge example |
|---|---|---|
| Heads with an effect-row parameter excluded (D6.2) | their rows are dropped by recording; R1 shows covering them is false | `Job(Log)` and `Job(Tick)` both record `App Job []` |
| Heads with a record-row parameter excluded (D6.2) | `Outside DataOverRecords` and Sig8's implied clauses; no lost program has one (measured) | `Holder({ y: Bool })` |
| Holder heads excluded (D6.3) | a holder's constructors hold functions whose effect rows are erased (R4); one of the 121 programs uses one (measured: a4-phantom) | `type W(a) = W(a, Unit -> Unit with Log)` |
| No arrow inside an `app` argument (D6.4) | the arrow's effect row is erased there (R5); none of the 118 has one (measured) | `L(Unit -> Unit with Log)` |
| Handler heads excluded | `Outside HandlerType` (Scope B) | `Handler(Log)` |
| No `app` in `D` (D6.5) | CX's projection leaves it undefined (Refute/Project.purs:80); none in the 121 (measured) | a `D` clause from Sig8 |
| No open requirement atom (D6.7) | rule 1 blocks one today; G0's check alone would accept it (Asked.purs:36-37; review finding C1) | `show(b)` at `Box(Int)` with `Box(a) = Box(a -> a)` |
| `BQ` atoms at rigid variables stay unsupported | unchanged: rule 1's `RequirementAtoms` (probe: generic `show` of `L(a)`) | `fn g(x: L(a)): Text = show(x)` |
| Nominal equality | matches today: `Tag(Int)` against `Tag(Bool)` is E_TYPE (probe) | `type Tag(a) = Tag(Int)` |
| No effect claim | `ValidR` erases effect rows by definition; effects stay with the A2 effect package and G-erased, as for `app`-free problems (S8) | n/a |
| Solved assurance stays `Pending genericSubstitutionSound` | as for every Solved today; decision U1 | n/a |

## 6. Statements

Labels: published, derived, experimentally checked, unresolved. Status:
not started unless stated.

| Id | Statement | Label | Citation or planned theorem | Distinguishing example |
|---|---|---|---|---|
| S1 | `app t vs = app u ws ↔ t = u ∧ vs = ws` in `GA`; `app` differs from `base`, `arrow` and `record` | published | Lean's generated injectivity and `noConfusion` for D1; GTWW 1977 | `L(Int) ≠ L(Bool)`; `Box(Int) ≠ Wrap(Int)` (probes `argumentClash`, `headClash`) |
| S2 | Embedding: `G` injects into `GA` (the identity on `base`, `arrow`, `record`), and `evalA` on an `app`-free expression is the embedding of `evalT` | derived | `evalA_embed` | an `app`-free record with a tail evaluates identically |
| S3 | Substitution lemma over `TExprA`. Hypotheses: `σ` well-sorted (each row variable to a record term, each type variable to a type term); `θ` total on the variables of `σ`'s range at `t`'s free variables, so that `θ′ = evalA θ ∘ σ` is defined on `t`'s free variables. Claim: `evalA θ (σ·t) = evalA θ′ t` | derived | `evalA_subst` | `σ(x) = L(y)`, `θ(y) = Int`: `app L [Int]` both ways. Without the totality hypothesis the statement is ill-formed (review I3) |
| S4 | Conservativity (VR-agree for this scope): on a problem with no `app` node and empty `q`, `bq`, `ValidR_A p ↔ ValidOpen (toSig p)`. (→) by collapsing each `app` value to the empty record, a homomorphism keeping labels (the empty record exists whatever `B` is); (←) by encoding each distinct `app` value as a fresh base of an injective extension, applying `ValidOpen` there, and decoding | derived | `validRA_agree`, with `collapse_hom`, `encode_hom`, `decode_encode` | rigid `θR(a) = app L [Int]` for an `app`-free `p`: (←) needs the encoding, because `ValidOpen` alone ranges over `G` |
| S5 | G0's check is sound over `GA` on the scope: if `InScopeA p` and `checkSubstitution p σ` accepts, then `ValidR_A^{x,κ,Q} p` for every member of D5's family, with every `p.bq` atom ground under `σ` | unresolved | P-G0 (`genericSubstitutionSound`) restated over `GA`; P-G0 itself is unproved. D6.7 is needed: without it the statement is false (review C1; R6) | `inScope` probe: accepted, valid |
| S5′ | Relative form: on the scope, the `app` case adds to P-G0's argument only S1, S3 and S6. `checkSubstitution` compares `App` terms syntactically (a syntactic equality is a semantic one under every assignment, by S3); `defined (App _ as)` is the conjunction of its arguments, and `rowDefined` reads only labels and tails, so an `App` cannot change row definedness; `bq` atoms over `App` are judged by GroundRule and rest on S6 | derived (argued; to mechanize once P-G0 has a Lean statement) | `app_case_of_P_G0` | `App L [x] == App L [Int]` after `σ(x) = Int` |
| S5e | Differential evidence for S5 on a fixed grammar (§9) | experimentally checked (planned; not run) | oracle O-A | the grammar includes `L(Int)` against `L(Bool)` and the phantom case |
| S6 | Requirement agreement: for declared `t ∉ H` and ground arguments, if GroundRule judges `pr` or `cmp` at `app t args` `Holds`, then `ReqG` holds there under each of H-a, H-b and H-c, for every κ | derived | `reqG_agree_holds` (needs a model of the constructor table and of `H` as a least fixed point) | `pr (app L [Int])`: Holds under all three. Where the options disagree (`Tag(Int -> Int)`: the rule `Fails`, H-b true; `Tag(Box(Int))`: the rule `Open`, H-b true), the rule never says `Holds`, so no Solved rests on the difference |
| S7 | Source-to-problem exactness at in-scope nodes: for `TData t args []` with `t` meeting D6.2-D6.3, the recorded term is `App (DataHead t) ⟦args⟧`, dropping nothing at that node | experimentally checked (planned) plus argued from Recorded.purs:36-38 | a generation test over the corpus's in-scope declarations | `L(Int)` recorded with its argument; contrast `Job(Log)` (R1) |
| S8 | No hidden effects: under D6.2-D6.4, no value of an in-scope `app` type holds a function, so no effect row is erased inside an in-scope `app` node. The effect obligations of an in-scope problem are those an `app`-free problem would have, and stay with the A2 effect package and G-erased exactly as they do today | derived (from D6, `H`'s definition and Recorded.purs; a generation test planned) | `noHiddenEffects` (argued), plus a test that no in-scope node holds an arrow | `L(Int)` holds no function; `W(a)` with a function field is a holder, so excluded |
| R1 | **Refuted.** "`ValidR_A` judges every `app` head soundly": with `type Job(...e) = Job(Unit -> Unit with ...e)`, `fn g(j: Job(Log)): Job(Tick) = j` records `eq (App Job []) (App Job [])`, which `ValidR_A` accepts. Today refuses it: E_EFFECT "This function performs Tick, which its signature does not allow" | refuted (argued from Recorded.purs:36-38; probe `effectRowHead`, checked) | kept as D6.2's reason | `effectRowHeadOk` compiles; a correct model would need the rows |
| R4 | **Refuted.** "Excluding row-parameter heads is enough": `type W(a) = W(a, Unit -> Unit with Log)`, constructed with a `Tick` function, records its field arrow with the row erased, and today refuses it (E_EFFECT, FX018) | refuted (reviewer's probe, checked by the reviewer; reasoned here from Recorded.purs) | kept as D6.3's reason | the same head with a matching function |
| R5 | **Refuted.** "Excluding heads is enough": `fn g(x: L(Unit -> Unit with Log)): L(Unit -> Unit with Tick) = x` records `App L [Arrow Unit Unit]` on both sides; today E_EFFECT | refuted (reviewer's probe, checked by the reviewer) | kept as D6.4's reason | `L(Int)` |
| R6 | **Refuted.** "S5 without D6.7": `type Box(a) = Box(a -> a); fn g(b: Box(Int)): Text = show(b)` passes `checkSubstitution` with the empty σ (the open atom is skipped, Asked.purs:36-37), yet `pr (app Box [Int])` is false under H-a | refuted (reviewer ran `substitutionOnly`; code read here) | kept as D6.7's reason; also excluded by D6.3 | `show(L(1))` |
| R2 | **Refuted.** "Collapsing every `app` to one value is an acceptance model": the collapse makes `L(Int) = L(Bool)` hold, which today refuses (E_TYPE) | refuted (argued; probe `argumentClash`, checked) | kept: the collapse is valid only inside S4's (→) proof, after `θR` is fixed | `argumentClash` |
| R3 | **Refuted.** "Data values are equal when their constructor fields are": with `type Tag(a) = Tag(Int)`, `Tag(Int)` and `Tag(Bool)` have equal fields, but today refuses (E_TYPE) | refuted (argued; probe `phantom`, checked) | kept: the model is nominal (D1, S1) | `phantom` |

The probe evidence is .build/evidence/2026-11-13-scope-a/probes-*.jsonl,
from research/r0-scope-a/probes.mjs. "Checked" there means observed on
those probes, not proved. R4-R6 were run by the reviewer, whose
scripts are not kept in the repository. Re-running them as fixtures is
part of implementation (§8).

## 7. Non-vacuity (planned)

- **Witnesses** (as Lean examples):
  - `inScope`'s problem (`head(x: L(Int))` matching `C(h, _)`):
    `ValidR_A` holds with `θF(h) = Int`.
  - `printed`: `pr (app L [Int])` holds.
- **Negative controls:**
  - `argumentClash`, `headClash` and `phantom` are unsatisfiable in
    `GA`.
  - R2's collapse satisfies `argumentClash`, which shows the collapse
    is not the meaning.
  - R1, R4 and R5's problems are valid in `ValidR_A`, which shows D6.2
    through D6.4 are needed.
  - R6 passes G0's check, which shows D6.7 is needed.
- For S6: `Tag(Int -> Int)` is `Fails` under the rule and true under
  H-b.

## 8. Generation, validation and read-back (proposed; none authorized)

- **Generation.** Narrow the marker, do not remove it. `dataOf` would
  mark `Application` unless the owner meets D6.2 and D6.3 and no
  argument holds an arrow (D6.4). `OverRecords` is unchanged. An
  in-scope `TData t args []` would then record `App` with no marker.
  Decision U2 is whether to rename the kind that remains.
- **Rule 1.** Unchanged. It blocks every remaining marker, open
  requirement atoms included (D6.7).
- **Validation.** `checkSubstitution` already compares `App` terms
  structurally. Proposed as defense in depth (decision U3): refuse, as
  `Undefined`, any problem holding an `App (DataHead t)` that fails
  D6.2-D6.4, so a generation regression fails closed rather than reaching
  Solved. The problem's tables would carry each type's sorts (both row
  sorts) and the holder set already there. GroundRule is unchanged.
- **Read-back.** No change. `rowFree` already refuses effect-row heads.
  It reads record-row heads, which stay blocked by DataOverRecords.
- **Effects.** No change, and no claim (S8). The A2 effect package and
  G-erased keep the effect obligations as they do for `app`-free
  problems.
- **How unsupported cases stay blocked**, each with a regression row
  that restores its defect:
  - effect-row heads (R1), holder heads (R4), arrows inside arguments
    (R5): the marker, then U3's refusal;
  - handler heads: `Outside HandlerType`;
  - open requirement atoms (R6) and atoms at rigid variables: rule 1's
    `RequirementAtoms`;
  - record-row heads: DataOverRecords.

## 9. Oracle O-A (grammar fixed here, before any run; not run)

- **Problems:** `eq` atoms over `TExprA` with heads `L` (arity 1) and
  `P` (arity 2), plus one phantom head `T` (arity 1, field `Int`), none
  a holder. Bases `Int` and `Bool`. At most 3 flexible and 1 rigid
  variable. Records of at most 2 labels and at most 1 tail. Depth at
  most 3. At most 4 atoms. No arrow inside an `app` argument. No
  `lacks` or `disjoint` beyond those records imply.
- **Rigid assignments:** values of `GA` of depth at most 2 over `Int`,
  `Bool`, one fresh base and the three heads.
- **Property:** where the compiler's own `checkSubstitution` accepts the
  candidate R0's search offers, `SatA` holds under every enumerated
  rigid assignment, with the flexible assignment `evalA θR ∘ σ`.
- **Bounded evidence only.** No finite reduction is argued.

**Amendment A1 (2026-11-13, recorded before any run).** A recorded
problem can be built only by generation (Domain.Recorded.Internal is
Generate*-only), so the property above cannot be run on raw atoms
through the compiler's own check. The grammar becomes the problems
generation records for these programs, which have the same heads,
bases and bounds:
- **Declarations:** `type L(a) = N | C(a, L(a))`, `type P(a, b) =
  P(a, b)`, `type T(a) = T(Int)`. None is a holder, and none has a row
  parameter.
- **One function** `fn f(p: τ1, q: τ2): τ3 = e`:
  - each τ from {`Int`, `Bool`, `a`, `L(Int)`, `L(a)`, `P(a, Int)`,
    `T(Bool)`, `{ x: Int, ...r }`, `{ x: a }`}, with one rigid type
    variable `a` and one rigid row variable `r`;
  - `e` from {`p`, `q`, `C(p, N)`, `C(q, N)`, `P(p, 1)`, `P(q, true)`,
    `T(1)`, `{ x: p }`, `p.x`, `q.x`, `N`}.

  That is 8,019 programs; those resolution or generation refuses are
  skipped and counted.
- **The candidate** is test/r0-g0-support.mjs's unifier candidate (the
  online search needs today's checker). A flexible variable it leaves
  unbound takes the default (`Int`, or the empty row), as hole
  defaulting does.
- **Problems judged:** only those whose markers are `DataApplication`
  alone or none, and whose `BQ` is empty.
- **Rigid assignments:** `a` from {`Int`, `Bool`, a fresh base,
  `L(Int)`, `P(Bool, Int)`, `T(Int)`, `{ x: Int }`}; `r` from {`{}`,
  `{ y: Int }`, `{ y: L(Bool) }`, `{ x: Int }`}. Those that violate `D`
  are skipped.
- **Property:** wherever the compiler's `substitutionOnly` returns
  `Valid`, every `B` atom holds in the JS evaluator of `GA`
  (research/r0-scope-a/oracle.mjs).

## 10. Which of the 121 programs fall within scope

Measured by research/r0-scope-a/membership.mjs over each program's
recorded problems (.build/evidence/2026-11-13-scope-a/membership.json).
The holder-head and arrow-in-argument counts come from
research/r0-scope-a/exclusions.mjs, run after the review
(.build/evidence/2026-11-13-scope-a/exclusions.json).

| Set | Programs | What decides it |
|---|---|---|
| A0: `app` only in `B` | 12 (5 unclassified, 5 fixtures, 2 expected-output) | D6 and S1-S5, S8 |
| A1: also `pr`/`cmp` atoms over `app` | 106 (90 execution-oracle, 7 expected-output, 7 unclassified, and the shipped examples functions and lists) | as A0, plus S6 |
| Excluded | 3: test/fixtures/r0/erased/form.pattern-row and obligation-data.control (effect-row head `Job(...e)`, D6.2); docs/plans/2026-10-21-c001-explicit/baseline/a4-phantom.wxw (a holder head, D6.3) | |

None of the 121 has an `app` in `D`, a record-row head, an undeclared
head, or an arrow inside an `app` argument (measured).

So 118 programs are within the proposed scope. That is a
**conditional count**. It becomes a rescue only once all of the
following hold:
- the statements are approved, and proved or accepted at the assurance
  decision U1 sets;
- the implementation lands;
- the comparison and verify show those programs Solved and nothing else
  moved.

The suppression run predicts all 118 would be Solved. That is a
prediction, not a measurement of the implemented scope.

## 11. Costed proposal

No cost here is a recorded estimate. Each is an analogy, labeled, with
its basis. Recorded figures:
- the read-back design, about 1.1M tokens (§18.154);
- Stage B, 4.9-6.8M (§18.155);
- tranche 1's effect recording, run under ceilings rising from 1.6-2.4M
  to 4.6M (§18.99-§18.115);
- one independent review, 150-250K (§18.165).

| Step | What | Cost (analogy unless stated) |
|---|---|---|
| 1 | Statement approval: this set (its adversarial review is done, §14) | the author's review only |
| 2 | Lean, new module beside the existing model (decision U4): D1-D4, S1 import, S2, S3, S4 with its three lemmas, S6 with a constructor-table and `H` model, S8's argument, non-vacuity, axioms gate | 0.8-2.0M. Basis: 404 of the project's 1,049 theorems sit on `TExpr`/`G`, and a parallel module avoids reopening them; S4 is the largest piece |
| 3 | Oracle O-A, built and run once on its fixed grammar | 0.2-0.4M |
| 4 | S5 itself (P-G0 over `GA`), only if U1 requires it | **unknown**. P-G0 has had no Lean statement since October; it means modeling G0's check, rows included. Not estimated |
| 5 | Completed-dossier review and approval | 0.15-0.3M |
| 6 | Implementation: the narrowed marker, U3's refusal, regression rows for every boundary (R1, R4, R5, R6, rigid `RequirementAtoms`, handler heads), S7's and S8's generation tests, the R0 pins that move (census, RT8, window, shadow, effects and loss files), comparison and performance protocol, review, verify | 1.0-2.0M. Basis: this session's R037 (2) repair and criterion-2 correction, scaled for the pin movement |
| | Total without step 4 | about 2.2-4.7M, an analogy |

The adversarial statement review for this draft has been spent, within
the recorded review figure. Machine time: a verify is about an hour at
concurrency 2; the comparison and protocol about 25 minutes.

## 12. Unresolved decisions (the author's)

- **U1, assurance.** Is the exemption acceptable with Solved at `Pending
  genericSubstitutionSound` over `GA`, the same assurance every Solved
  has today, given S1-S4, S5′, S6 and S8 proved and S5e run? Or must
  S5 (P-G0 over `GA`) be proved first, at an unknown cost?
- **U2, naming.** Keep `DataApplication` as the name of the narrowed
  kind, or rename it, which changes census and fixture text.
- **U3, defense in depth.** Have `checkSubstitution` refuse
  out-of-scope `App` heads outright (recommended), or rely on the
  marker alone.
- **U4, Lean placement.** A new module with S2 and S4 as the bridge
  (recommended), or extending `TExpr` and `G` in place, which reopens
  404 theorems.
- **U5, staging.** All 118 programs at once, or A0's 12 first. A0 needs
  every statement except S6.
- **U6, G-exempt (policy).** Whether the language accepts this kind as
  Solved on these statements: the per-kind policy ruling the R0 plan's
  G-exempt row requires. Approving the statements does not settle it.
- **U7, re-pins.** Which R0 pins may move when implementation lands, as
  a reviewed list. None moves under this design.
- **U8, the excluded shapes.** D6.2-D6.4 are deliberately conservative,
  and they cost 3 of the 121 programs. Lifting them later depends on
  how G-erased and the A2 effect package treat erased rows (O4), not
  on this model.

## 13. Open items

- O1: confirm the literature citations' sections and pages before the
  second approval.
- O2: S6 needs the constructor table in the Lean model; whether `H` is
  computed or given is a definitional choice for the proof.
- O3: re-run the reviewer's R4-R6 probes as kept fixtures (under
  implementation).
- O4: whether `certifyPackage`'s effect checks (A2's `prerequisites`,
  `judgeObligations`; Effects/Equal compares `PData` rows) would refuse
  R1, R4 and R5 with a forged candidate. The answer bears on U8, not on
  this scope: forge each candidate through `certifyPackage`, not G0
  alone. Not run.

## 14. Review record

An adversarial statement review of the first draft (2026-11-13, one
reviewer; probes under the session scratchpad, not kept) found:
- **C1:** S5 false without the open-requirement condition. Fixed:
  D6.7, R6.
- **C2:** D6 leaked effect rows hidden inside in-scope heads (a
  function field, an arrow argument). Fixed: D6.3, D6.4, R4, R5, S8.
  The reviewer's point that `certifyPackage`'s effect checks may or may
  not catch these is O4.
- **I1:** `rows` counts effect-row parameters only. Fixed: D6.2 states
  both sorts, and §2 and §8 are corrected.
- **I2:** holder-head atoms are blocked by rule 1, not by a G0 decline.
  Fixed in §2 and §5.
- **I3:** S3 lacked its well-sortedness and totality hypotheses. Fixed.
- **I4:** S5′ understated the `bq` obligation. Fixed: it names S6.
- **Minor:** D5 is now a family covering the Pr and `Q` choices (M1).
  S6's example covers `Open` (M2). The collapse target is the empty
  record (M3). The membership heuristic `hasVar` is not used by §10
  (M4).

The reviewer could not break S1, S2, S4 (both directions), S6's main
claim, or the definedness part of S5′. It confirmed §10's first counts
(TypeId indexes `program.types`) and R2 and R3. The revision's new
counts (holder heads, arrows in arguments) were measured after the
review and have not been reviewed.

## 15. Proof and oracle results (2026-11-13; for the completed-dossier review)

Authorized by §18.192 as bounded proof work. The statements were
approved for investigation, not adoption. Nothing here establishes the
checker's soundness: S5 (P-G0 over `GA`) is unproved, and every Solved
stays at `Pending genericSubstitutionSound` (decision U1).

**Where.**
- The Lean module is research/composition-proofs/Composition/App/:
  Defs.lean and Statements.lean (the interface), Proofs/Subst.lean,
  Agree.lean, Req.lean and Check.lean, and Main.lean (integration).
- The existing model and its theorems are unchanged (U4). The library
  root now imports the module, so `lake build` covers it.
- The gate is the proof-dossier skill's check-axioms.sh: a clean
  rebuild, no placeholders, the theorem inventory read back from Lean,
  and a diff of the report. It passes on f5c58cc1 for 90 theorems.
  Report: research/composition-proofs/app-axioms.out; list:
  app-theorems.txt; log: .build/evidence/2026-11-13-scope-a/gate.log.

| Id | Status | Theorem | Notes |
|---|---|---|---|
| S1 | published | Lean's generated injectivity and `noConfusion` for `GA` | used by the proofs, not restated |
| S2 | proved | `s2` | |
| S3 | proved | `s3` | the existing `subst_evalT` pattern, plus the `app` case |
| S4 | proved | `s4` (`s4_of_s2` does not need S2) | **the `Scoped` hypothesis is unused**: conservativity holds for every `SigProblem` (finite rigid values suffice for `dec ∘ enc = id`) |
| S5 | unresolved | — | P-G0 over `GA`; not attempted (U1) |
| S5′ | proved, relative | `s5'` (= `s5'_of_s3 s3`) | assumes exactly `PG0Clauses`, P-G0's two clauses on the existing model; **the "no `app` in `D`" hypothesis is unused**, since erasure moves every `D` atom across |
| S5e | experimentally checked | oracle O-A (A1) | below |
| S6 | proved | `s6` | needs `TableBases` and `kind (dataB t) = .data t`; **`TableWF` is unused** |
| S7 | not started | — | a generation test under implementation; the corpus measurements in §10 cover in-scope declarations only |
| S8 (first form) | **refuted** | `not_s8NoBases` | without `TableBases`, a field written as a base classified as a holder's type lets reachability enter the holder. Kept as `S8NoBases` |
| S8 | proved | `s8` | carries `TableBases`, the assumption S6 already had; `TableWF` unused |
| R1-R6 | reproducible | research/r0-scope-a/counterexamples.mjs | on the committed compiler: G0's own check accepts R1, R4, R5 and R6, which today refuses; R2 and R3 are refused by both |

**The S8 correction** was a formalization error in the interface: S6
had `TableBases` and S8 did not. The design's S8 is stated "under D6",
and S8's scope did not change. The refuted form is kept, as the policy
requires.

**What S5′ assumes of P-G0, exactly** (`PG0Clauses`,
Statements.lean). Under an assignment satisfying a problem's `D` and a
candidate's binding equations, on the existing app-free model:
- a term G0's `defined` accepts is defined;
- a `lacks` or `disjoint` atom its row tests accept holds.

The existence of such an assignment is also P-G0's, and is neither
assumed nor claimed. Its non-vacuity is shown: `pg0Clauses_semCheck`
builds a semantic check satisfying the clauses, and an `example` shows
that check accepting an `app` equation, carried through `s5'` to the
equation holding.

**Non-vacuity and controls (in the Lean module).**
- S3 at a binding to `app 0 [tvar 1]`.
- S4 at a scoped example (`AgreeExample`).
- S6 at `L(a) = N | C(a, L(a))`, with `app L [Int]`: JHolds and all
  three readings (`ex_jholds`, `ex_readings`). `app L [Int]` reaches
  `Int`, so ReqHb's "for all reachable values" covers at least one.
- Negative control: `Box(a) = Box(a -> a)` is a holder and fails JHolds
  (`box_holder`, `box_not_jholds`).
- S5′ through `semCheck`.

**Axioms.** Every theorem uses at most Lean's standard axioms:
`propext`, `Quot.sound`, and for some `Classical.choice`.
- `s2`, `s3`, `s4` and `s5'` use `Classical.choice` because evaluation
  is classical: the existing model's `compose` decides disjointness
  classically (Compose.lean:12), and `evalA` inherits it.
- `s6` and `s8` use only `propext` and `Quot.sound`.
- There is no declared axiom, `sorry`, `admit` or `native_decide`
  (checked by the gate).

**Definitional choices the proofs fixed**, for review:
- H-b is modeled as reachability through instantiated constructor
  fields.
- A handler field instantiates to an arrow stand-in that no requirement
  accepts.
- A parameter index out of range instantiates to the empty record.
- A declared type with no parameters is written `.data u .nil` and
  instantiates through `dataB`.
- `enc` codes finite `app` values as fresh bases, deciding finiteness
  classically.

**Oracle O-A, amendment A1** (research/r0-scope-a/oracle.mjs; output
.build/evidence/2026-11-13-scope-a/oracle.json; grammar recorded before
the run, commit 15954081).
- All 8,019 programs were judged: none refused, none out of scope.
- The compiler's `substitutionOnly` returned `Valid` on 495.
- Under all 13,083 rigid assignments satisfying `D`, every `B` atom
  held in the JS evaluator of `GA`: **0 failures**.
- The negative control: on all 7,524 refused candidates, the evaluator
  found a failing atom, so it can fail.
- Bounded evidence; no finite reduction is argued.

**Model-to-implementation gap.**
1. `CheckA` mirrors Strategy/Atoms.purs by hand, and the Lean model is
   not extracted. The link is differential: oracle O-A runs the
   compiler's own check against the `GA` evaluator on its grammar.
   Bounded.
2. The tables are assumptions about the compiler. Its `holders` field
   must equal `Holder T` (K-a's obligation; test/r0-holders.test.mjs),
   and declared field types must name only Waxwing's bases
   (`TableBases`). The second is argued from resolution and is not
   tested yet: a test is proposed for implementation.
3. Generation exactness (S7) and D6's conditions are measured on the
   corpus (§10) and still need their generation tests and U3's
   defensive refusal under implementation.
4. P-G0 is unproved (U1).

**Remaining before any use.** Implementation stays unauthorized.
- The completed-dossier review, which includes U6, the exemption
  ruling.
- O1, confirming the literature citations' sections.
- An implementation proposal, with U3's refusal, S7's test, the
  `TableBases` test and the re-pin list (U7).

**Spent.** About 0.9M tokens for this round by rough count: four proof
agents about 0.37M in total, plus the interface, fixtures, oracle,
integration and gate. That is inside the 1.0-2.4M planning range.
