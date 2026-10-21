# Stream 2: an attack on D3a

D3a (dossier §18.6, grammar §18.8 as amended in §18.9): if a typed
problem is valid, then for each written-label pattern `π` there is one
typed template that works for every rigid assignment in `π` satisfying
`D`. This file records the attack. Section (a) was written and committed
before any run in this directory (commit 56aa801); amendments made later
say so.

**Verdict.**

1. **D3a as stated is false when base types are finite**, and the
   dossier allows that (§13.1: "Base types may be finite"). `shape-split`
   is valid with one base type (Lean, over all values and over finite
   ones) and no witness family can fix a flexible row's presence at a
   written label across its rigid assignments (Lean). Its single pattern
   therefore has no template in any grammar of D3a's form. The finite-base
   follow-up extends the construction to any complete finite list of base
   constants, with one arm per constant. A second base makes the original
   one-arm example invalid; it does not dismiss the generalized family.
   The bounded oracle's universe (`Int`, `Bool`) is finite, so its
   semantics admits the same issue (R1).
2. **G-A has two gaps unrelated to uniformity**: fixed depth (`Temp₁`
   for rows' written fields, `Temp₂` for type variables) and leaf-only
   written fields on record nodes with tails. Three valid problems have
   no G-A template and have one in the widened grammar G-W (R2). Any
   fixed depth fails the same way; the grammar needs a problem-dependent
   depth.
3. **R3 and R4 remain incomplete.** Their original runs were killed after
   about 40 minutes. Reduced diagnostic runs below cover smaller spaces;
   they do not settle the original claims. Completed R5 runs found
   uniform templates for the tested label ties, vacuity and record-valued
   rigid variables.
4. **Positive direction**: with infinitely many labels and enough base
   types not written in the problem, D3a for an unbounded-depth grammar
   reduces to D3b (Stream 1's generic instance) plus three normalization
   steps. Status per step in (d): argued, none proved.

## (a) Frozen grammars and bounds

### Template grammars

- **G-A (the amended grammar, as accepted in §18.13).** §18.8's grammar
  with §18.9's amendment: leaves `A(r, l)`, `T(n)`, the problem's base
  types and `Int`, `Bool`; `Temp_{k+1}` fills the problem's skeletons
  from `Temp_k`; a record node with tails gets a cell map (per Venn cell
  of the rigid rows, absent or one source row in the cell) and, at each
  written label its skeleton does not write, absent or a leaf (`Temp₀`).
  Flexible type variables range over `Temp₂`; flexible rows have, per
  written label, absent or a `Temp₁` template, and a cell map.
  Implementation: sig-oracle/nested-search.mjs `findNested` with
  `{ tailWritten: true }`, used unchanged.
- **G-1 (the first-pass grammar, §18.7)** for flat problems only:
  sig-oracle/templates.mjs `findTemplate`, used unchanged.
- **G-W (a widened grammar; an amendment, recorded here before any
  run).** G-A with three changes: flexible type variables range over
  `Temp₃`; flexible rows' written fields over `Temp₂`; a record node
  with tails gets, at each written label its skeleton does not write,
  absent or a template from the level being filled from (`Temp_k` when
  building `Temp_{k+1}`), not only a leaf. G-W exists only to show that
  a G-A gap is a gap of depth or of tail-node fields and not of
  uniformity. Implementation: d3a/widened.mjs (new; same search as
  `findNested`, with the domains injected).
- **Grammar-independent check.** For the finite-base candidate (R1), the
  claim does not depend on any grammar: every typed template, in any
  grammar where a flexible row's presence at a written label is fixed
  per pattern, fails. Checked by restricting the bounded flexible search
  to each presence choice, and proved in Lean (section (c)).

"No template" below always means: none within the named grammar and
bounds, searched exhaustively.

### Bounded validity

Validity is shown two ways. (1) A **hand witness**: a function from the
rigid assignment to a flexible assignment, written down with the
problem and checked atom by atom (sig-oracle/semantics.mjs `sat`) at
every bounded rigid assignment satisfying `D`. (2) Where a problem is
claimed invalid, or where no hand witness is given, a **bounded search**
(d3a/bt.mjs, new): backtracking over the flexible variables in the
order the atoms first mention them, each atom checked as soon as its
variables are assigned. Domains as bounded.mjs: flexible rows map the
labels to absent or the flexible field types; flexible type variables
range over the type values plus the values of `B`'s subexpressions
that mention no unassigned flexible type variable (bounded.mjs builds
these once per row choice and only from subexpressions free of every
flexible type variable; bt.mjs builds them under the partial
assignment, which can only enlarge the domain). Cross-check before use:
bt.mjs against bounded.mjs on every problem of typed-challenges.mjs,
the first-pass challenges and nested-challenges.mjs at their bounds;
any disagreement must be in the direction "bt valid, bounded invalid"
and explained by the larger domain.

### Runs and their bounds

| Run | Problems | Labels | Rigid rows | Rigid type variables | Flexible field types / type values |
|---|---|---|---|---|---|
| R1 shape split | `shape-split` (finite base types) | written + `q` | none | `Int`, `Bool`, `{}`, `{q:Int}`, `(Int->Int)`; R1' adds base `Str` | second-pass list (`Int`, `Bool`, `{}`, `(Int->Int)`, `{q:Int}`); R1' adds `Str` |
| R2 grammar gaps | `depth-row`, `depth-ty`, `tail-written` | written + `z1`, `z2` | absent, `Int`, `{q:Int}` | the second-pass list | the second-pass list; validity by hand witness only |
| R3a pigeonhole diagnostic | `pigeonhole` (flat, three rigid rows) | `z1` | `Int`, `Bool`; R3' adds `{}` | none | `Int`, `Bool`; R3' adds `{}` |
| R4a agreement diagnostic | 5 problems each for seeds 5 and 17 | `z1` | `Int`, `Bool`, `{}` (three, so three rigid rows can differ pairwise) | none | first-pass list |
| R5 named nested | §18.10 label ties, vacuity, record-valued rigid variables | written + `z1`, `z2` | absent, `Int`, `{q:Int}` | the second-pass list | the second-pass list |

R4's generator (d3a/agreement.mjs): rigid rows 0-2, flexible rows 3-6,
no written labels, no type variables. `D`: each `disjoint` between two
rigid rows with probability 0.2; with probability 0.6 one, else none,
and then with probability 0.3 a second, equation among rigid rows,
uniformly `{ ...x } = { ...y }` or `{ ...x } = { ...y, ...z }`. `B`: two
to five atoms, uniformly from: `{ ...r } = { ...f, ...g }`;
`{ ...f } = { ...r }`; `{ ...f, ...g } = { ...r, ...s }`;
`{ ...f } = { ...g }`; `{ ...f, ...r } = { ...g, ...s }`;
`disjoint f g`; `disjoint f r` (`r`, `s` rigid, `f`, `g` flexible,
distinct where written distinct). Classification as typed-oracle.mjs:
bounded valid (bt.mjs), uniform G-1 template per pattern, per-assignment
G-1 template when no uniform one. A separation is minimized by dropping
atoms and rechecked with labels `z1`-`z3` and rigid field types `Int`,
`Bool`, `{}`, `(Int->Int)`.

Stop rule: a run stops at the end of its problem list; a separation is
recorded, minimized and rechecked, not used to stop other runs.

### Amendments made after runs (each labelled where it is made)

1. **G-W searched only where needed.** The first R1-R3 attempt ran G-W
   on every problem; its `Temp₃` spaces were too large to enumerate
   (R2's `depth-ty` alone pairs two type variables over roughly 24,000
   templates each). G-W is now checked by an explicit template for each
   R2 problem (run R2W): each part is confirmed to be an element of G-W's
   enumerated domain, then the search runs with those parts as the only
   shapes and still chooses every cell map. R5 searches G-W in full.
2. **R1 without a G-A search.** The G-A search on `shape-split` did not
   finish in 7 minutes (for every failing choice of rows it enumerates
   two type variables over `Temp₂`). R1 rests on the grammar-independent
   presence check and on Lean, which is stronger than a G-A search.
3. **R3's atom order** (speed only, same conjunction): the four-part
   equation is listed last so the backtracking search prunes first.
4. **R5's tie problems were vacuous at the frozen bounds.** With rigid
   fields `Int` and `{q:Int}` no rigid assignment satisfies
   `{ ...r } = { f: { ...s } }` (the field would have to be the record of
   a row over `f`, `z1`, `z2`). Rerun as `tie-decomposed-a` and
   `tie-two-level-a` with rigid fields `Int`, `{}`, `{z1:Int}` (run R5a).
   The vacuous results are kept below and count for nothing.

## (b) Candidates, verdicts and evidence

"Valid" without qualification means valid in the semantics (`ValidAll`
or `ValidFin`), argued or proved as stated; "bounded valid" means at the
stated bounds only.

| Candidate | Problem(s) | Verdict | Evidence |
|---|---|---|---|
| finite base types: a witness that cases on a rigid variable's shape | `shape-split` (R1) | **separation**: valid with finitely many base types, no template in any per-pattern grammar | Lean (c); R1 hand witness 5/5, presence check (one admissible `uᵢ` per `α`, a different one per shape); invalid with a third base type (R1', bt at `α = Str`; Lean `shapeSplit_not_valid`) |
| nesting deeper than `Temp₂`; rows' written fields deeper than `Temp₁` | `depth-ty`, `depth-row` (R2) | **gap of G-A**: valid, no G-A template, G-W template | hand witness 5/5 each; G-A search none; explicit G-W template uniform (R2W) |
| a shape the problem writes, but not at a tail node's extra written label | `tail-written` (R2) | **gap of G-A**: valid, no G-A template, G-W template | hand witness 9/9; G-A none; explicit G-W template uniform |
| type-agreement placement | `pigeonhole` (R3a); R4a's sample | diagnostic runs only | R3 and R4 below |
| hypotheses forcing equality on some cells only | R4a sample | diagnostic run only | R4 below |
| §18.10 ties between a row's labels and a nested field's labels | `tie-decomposed-a`, `tie-two-level-a`, `tie-nested-division` (R5, R5a) | uniform template, as predicted | hand witness 2/2 and 32/32; bt valid at 500 assignments; G-A, the search copy and G-W all find one |
| record-valued rigid type variables | `rigid-tyvar-record`, control `rigid-tyvar-undeclared` (R5) | as predicted: template when `D` gives the shape, invalid otherwise | hand witness 3/3; control bounded invalid at `α = Int` |
| vacuity through type equations | `vacuity-type` (R5) | trivial: no rigid assignment, template vacuously | bt 0 assignments |
| function types | the arrow disjunct of `shape-split`; `depth-*` | no uniformity issue beyond the two above | as above |
| a shape the problem never writes | none constructed | argued unnecessary (P3 in (d)) | argument only |

**R1, `shape-split`.** With label `f`, flexible rows `u1`-`u4`,
`m1`-`m4`, `w` and type variables `β1`, `β2`:

    ∀ α. ∃ ….  { ...u1, ...u2, ...u3, ...u4 } = { f: α },
               { ...u1, ...m1 } = { f: Int },
               { ...u2, ...m2 } = { f: Bool },
               { ...u3, ...m3 } = { f: β1 → β2 },
               { ...u4, ...m4 } = { f: { ...w } }

Exactly one `uᵢ` holds `f`, at `α`, and `uᵢ` may hold it only when `α`
has the `i`-th shape. Over base types `{Int, Bool}` every ground type has
one of the four shapes, so the problem is valid; `uᵢ`'s presence at `f`
is then a function of `α`'s shape. A D3a template fixes each flexible
row's presence at each written label per pattern, and with no rigid
rows there is one pattern, so no template exists in any grammar of that
form. The R1 presence check, per bounded `α`: `Int` only `u1`; `Bool`
only `u2`; `(Int->Int)` only `u3`; `{}` and `{q:Int}` only `u4`; `Str`
(R1') none (printed as an empty list). Lean proves the three-shape
version over base type `Unit` (section (c)).

Why this matters beyond the example: the dossier's S2 argument (§13.5)
and D3b's generic instance both need "pairwise distinct ground values
that nothing in `B` can denote". With finitely many base types there
are none: `B` can match each base type by name, every arrow by
`β1 → β2` and every record by `{ ...w }`, so an exhaustive case split is
expressible with positive atoms. Over infinitely many base types the
split cannot be exhaustive: a disjunct satisfied at a base type the
problem never names is satisfied at every value (substitute for that
base type), so one witness serves all values (P0 in (d), argued).

**R2.** `depth-ty`: `∀ α. ∃ β γ δ. β = γ → γ, γ = δ → δ, δ = α → α`
needs `β` at `Temp₃`. `depth-row`:
`∀ α. ∃ u γ. { ...u } = { f: γ → γ }, γ = α → α` needs `u`'s field at
`Temp₂`. `tail-written`: `∀ r. r lacks g ⇒ ∃ u m β. β = { ...u },
{ ...u } = { ...m, ...r }, { ...m } = { g: Int → Int }` needs
`β = { g: Int → Int, ...r }`: a tail node (from `{ ...u }`) holding the
written label `g` at a non-leaf, which §18.9's amendment does not allow;
the closed skeleton `{ g: _ }` has no cell map for `r`'s labels. Each is
valid by a hand witness, has no G-A template, and has a uniform G-W
template. A chain of `n` type variables needs `Temp_n`, so no fixed
depth suffices: the depth must depend on the problem (bound conjectured
in (d), P3).

**Original R3, `pigeonhole`** (three rigid rows `r`, `s`, `t`). A label in all
three must go to one of `x1` (needs `r = s` there), `x2` (`r = t`) or
`x3` (`s = t`); `x4` and `x3` serve labels outside `t` or outside `s`.
The original run used 729 rigid assignments and was killed after about
40 minutes without a result. It remains incomplete.

**R3a diagnostic amendment.** The replacement uses one unwritten label
`z1`, giving 27 rigid assignments, and limits flexible field values to
the two rigid types. A three-type control adds `{}` to both domains.
This keeps the assignment types available as flexible values while
shrinking the search space. The finite flexible domain makes this a
diagnostic only.

RESULT-R3

The pigeonhole observation concerns this particular bounded example. It
does not dismiss the generalized finite-base separation: the follow-up
constructs one base branch for each constant in a complete finite list.

**Original R4, agreement generator.** Seed 5 at 500 problems was killed
after about 40 minutes before printing a result; seed 17 was not run.
Both original confirmation runs remain incomplete.

**R4a diagnostic amendment.** Run five generated problems for each seed,
with one unwritten label `z1`; other generator and type bounds stay the
same. The driver logs each problem's start and elapsed time so an
external timeout leaves useful progress evidence.

RESULT-R4

## (c) Counterexample, minimized, and its Lean refutation

The minimized counterexample is `shape-split` with three shapes over the
single base type `Unit`:

    ∀ α. ∃ u1 u2 u3 m1 m2 m3 w β1 β2.
      { ...u1, ...u2, ...u3 } = { f: α },
      { ...u1, ...m1 } = { f: () },
      { ...u2, ...m2 } = { f: β1 → β2 },
      { ...u3, ...m3 } = { f: { ...w } }

Dropping any atom makes the problem invalid or lets one presence choice
serve every `α` (argued by inspection, not machine-checked). File:
research/composition-proofs/Composition/TypedAttack/ShapeSplit.lean
(the `Sig` model, `SigProblem Nat B`; no `sorry`, axioms `propext`,
`Classical.choice`, `Quot.sound`).

| Statement | Lean |
|---|---|
| valid over all values, base types `Unit` | `shapeSplit_valid` |
| valid over finite values (`ValidFin`), finite witnesses | `shapeSplit_validFin` |
| with base types `b ≠ b'`: not `ValidAll`, not `ValidFin` | `shapeSplit_not_valid` |
| in every solution, `u1` holds `f` iff `α = b` | `u1_holds_iff` |
| no witness family fixes `u1`'s presence at `f` over the rigid assignments | `no_uniform_presence` |

`no_uniform_presence` is grammar-independent: it refutes every
template language in which a flexible row's presence at a written label
is chosen per pattern, which D3a's is. The step from "D3a template" to
"presence fixed per pattern" is D3a's definition (§18.6), not a Lean
definition; no template syntax is formalized. The file is not imported
from `Composition.lean` (the owner integrates shared files); it builds
with `lake build Composition.TypedAttack.ShapeSplit`.

## (d) The positive direction

Target, **D3a-∞** (conjectured): assume infinitely many labels (A1) and,
for the problem `P`, infinitely many base types not written in `P`
(A2). If `P` is valid (`ValidAll` or `ValidFin`), then for each pattern
`π` there is one template in **G-ω** working for every rigid assignment
of `π` satisfying `D`. G-ω is G-A with unbounded depth (`⋃ₖ Temp_k`)
and with tail nodes' extra written labels drawn from G-ω, not from the
leaves. A2 is necessary: R1 refutes D3a-∞ without it.

The argument, with the status of each step:

- **P0, a generic instance (D3b; Stream 1's; a dependency, not argued
  here in full).** For each `π` with `π ∩ D` non-empty: a rigid
  assignment `θ*_π ∈ π ∩ D` and, for every `θ ∈ π ∩ D`, an
  interpretation `h_θ` that (i) fixes the problem's base types and
  written labels, (ii) commutes with template instances,
  `inst(t, θ) = h_θ(inst(t, θ*))`, and (iii) transfers atoms,
  `(θ*, σ) ⊨ a` implies `(θ, h_θ σ) ⊨ a`. The shape this argument
  needs: `θ*`'s written part is the most general unifier of `D`'s
  equations under `π` (presence at written labels is fixed by `π` and
  every record in `D` has rigid tails, so this is syntactic
  unification, which is unitary), with a fresh base type for each
  remaining unknown (A2); each Venn cell `S` that `D` allows gets one
  fresh label `z_S`, whose fields in the rows of `S` are fresh values,
  equal exactly where `D`'s equations at that label force (`E_S`, an
  equivalence: at an unwritten label `D` can only equate whole fields,
  never constrain their shape). `h_θ` maps fresh types to `θ`'s values
  and expands `z_S` into `θ`'s labels of cell `S`, label by label, as
  `h` expands a rest in §14.3. (iii) is §14's L2-L4 with cells in place
  of rests; L2-L4 are proved for rests (Sig/Interp.lean,
  Sig/Commute.lean, Sig/Soundness.lean). Status: **argued** by
  analogy; Stream 1 owns the statement.
- **P1, labels outside `L` and the cells can be dropped** (**argued**;
  §13.9 (a)): deleting such a label from every flexible value preserves
  every positive atom, since no rigid value holds it.
- **P2, cell entries are copies** (**argued**). Atoms are conjunctions
  over blocks of positions (§18.8's decomposition, cross-checked by
  brute force in §18.9-18.10, not proved). In the block of `z_S`, `B`
  compares only whole field values at `z_S` (no expression names `z_S`,
  so nothing reaches inside them) and presence. Any map on those values
  fixing the rigid ones preserves the block's atoms, so every flexible
  field at `z_S` can be replaced by some rigid row's field there, or
  stay absent: a source in `S`. Where two sources are equal at `θ*` they
  are `E_S`-equal, hence equal at every `θ`, so either choice is
  uniform.
- **P3, the written part is built from the problem's skeletons**
  (**argued**, standard; depth bound **conjectured**). With the presence
  of written labels fixed by the solution at `θ*`, the rest block of `B`
  is syntactic unification over constructors (base types, arrows,
  records with a fixed set of written labels) with `θ*`'s written part
  as constants. The solution is an instance of the most general
  unifier, whose values are built from subterms of `D` and `B` and from
  `θ*`'s values (Robinson; Martelli and Montanari): from skeletons in
  `Sk(P)` and the leaves `A(r, l)`, `T(n)` and `P`'s base types.
  Remaining free variables can be set to `Int`: a free variable's
  position is equated with nothing in the rest block, hence with nothing
  in any cell block, so dropping record nodes there changes no atom.
  Conjectured bound: depth at most the number of variables plus one.
- **P4, transfer** (**argued**, from P0 (ii)-(iii)): the template `t`
  that P1-P3 extract at `θ*` satisfies `B` there, so by P0 every
  `inst(t, θ) = h_θ(inst(t, θ*))` satisfies `B` at `θ`.

Validity gives a solution at `θ*` (since `θ* ∈ π ∩ D`); P1-P3 turn it
into a G-ω template; P4 makes it uniform. A2 enters only in P0, to make
`θ*`'s fresh types genuine base types that no atom can match; cell
values need no fresh base types (P2: nothing inspects them).

Lean route, if approved: a template syntax and `inst` over the `Sig`
model; P1 and P2 as homomorphism lemmas on blocks; P3 through a
most-general-unifier shape lemma; P0 from Stream 1. P3 and the block
decomposition are the largest pieces; neither is formalized in this
repository.

What D3a-∞ would not give: a procedure (finding the solution at `θ*` is
a search), the depth bound, or a result for finite base types. The
finite-base follow-up proves the semantic equation family for any
complete, duplicate-free finite list of base constants and proves that
its witnesses cannot fix a named base branch's presence across inputs.
It also shows that the original singleton example becoming invalid with
a second base does not dismiss the enlarged family. These are branch
indexed equations over the `G` model, not a Nat-indexed `SigProblem` or a
Waxwing source theorem.

Waxwing has `TData`, effect-bearing `TFun` and `THandler`, as well as
builtins and records (`src/Domain/Type/Core.purs`). The follow-up does not
prove that its four-base scaffold covers these forms or establish a
source-level counterexample. A checked body elaborates once for every
`α`; whether its generic universe is closed or admits fresh nominal types
remains a language-policy question.

## (e) Reproduction

From research/division-campaign/d3a/ (Node 20 or later):

    node run.mjs check   # bt.mjs vs bounded.mjs; search.mjs vs findNested
    node run.mjs R1      # shape-split: witness, presence, bounded
    node run.mjs R2      # G-A gaps: witness, G-A search
    node run.mjs R2W     # explicit G-W templates
    node run.mjs R3      # reduced R3a: pigeonhole and three-type control
    node run.mjs R5      # named nested problems (frozen bounds)
    node run.mjs R5a     # tie problems at amended bounds
    node agreement.mjs 5 5  # reduced R4a, one unwritten label
    node agreement.mjs 5 17 # reduced R4a, one unwritten label

From research/composition-proofs/:

    lake build Composition.TypedAttack.ShapeSplit

Cross-checks: bt.mjs agrees with bounded.mjs on all 37 problems tried
(typed, first-pass and nested challenges at their bounds); the search
copy (search.mjs with G-A's domains) agrees with `findNested` on 17
problems (the nested challenges, R2, R5).
