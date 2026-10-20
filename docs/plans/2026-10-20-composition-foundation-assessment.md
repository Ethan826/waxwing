# Composition requirements: foundation assessment

Date: 2026-10-20. Status: assessment for the author's decision. No
implementation is proposed for authorization here, and nothing in this
document changes the compiler.

Requirements: docs/plans/2026-10-20-composition-acceptance-programs.md
(programs 1-10 and the author's response of 2026-10-20). Evidence:
research/composition-assessment/ (each program variant, the runner, and
the PureScript probes), run on the Task 7 checkpoint build (branch
`r005b-task7-wip`, 4d741a1, which accepts several spreads in a literal).

## 0. In brief

- **Now**: programs 1, 2, 10 run; 3 and 6 check (lowering waits for
  Task 8); 4 and 5 are refused as Unresolved; 7 needs classes; 8A is
  refused (monomorphic `let`); 9 is refused by the effect rows' equal-row
  rule. PureScript, whose `Union` the current solver follows, refuses 4
  and 5 too (§2).
- **Records** (§3, §4): what 4 and 5 lack is improvement from facts.
  Rose (Morris and McKinna) has only the forward dependency; Boolean
  unification (Flix) gives principal solutions but is used for effects
  and variants, not records, and would change the type language.
  Recommended: Jones's improvement (1995), decided exactly on Rémy's
  presence flags as Simon (2014) reads records: place a label only when
  every solution places it there. Meets 1-6 with no annotation; an
  undetermined split stays an error.
- **Elsewhere** (§5, §6): program 8 by GHC's closed-binding
  generalization with the value restriction; program 9 by injection
  (Koka's `mask`, Biernacki et al.'s `lift`) or Frank's ambient-relative
  rows; program 7 after classes, through a row map (Ur/Web; Hubers and
  Morris 2023).
- **Decisions**: §7. Task 7 is checkpointed and waits on decision 1.

## 1. Where the work stands, and what the requirements supersede

**Preserved.** Branch `r005b-replan` ends at 43b3a28: B5 as accepted
(1337bd3), the docs entry for decision 24 (69d4525), three behaviour-
preserving splits for Task 7 (fa57f41 Check/Overlap, 0a36ae3
Check/RestBinder, 22d3631 RowMerge/Chain) and a test fix the split
needed (43b3a28: the structural metadata test listed Desugar by file
name and read Chain as a solving module). The splits' differential
against 1337bd3 found 0 differences (8,713 harvested sources, fuzz,
matches, mutations; .build/evidence/r005b-t7-split-diff.log). The Task 7
implementation in progress is preserved unmerged on `r005b-task7-wip`
(4d741a1); it builds with 0 warnings and does not pass verify (on it the
record suites run 486 of 493 tests passing; docs/progress.md has the
details).

**Superseded by the clarified requirements** (each was an approved
decision under the plan it belonged to; the acceptances stay evidence
that the code met that plan):

| Earlier decision | Where | Now |
|---|---|---|
| O4 kept as an accepted limitation ("callers cannot repair it") | plan §10 decisions 17, 18, 19; limitations file option C | program 4 is required: the uniquely determined split is inferred, with no caller annotation |
| `apply(merge, noX)` (program 12, `diag-14-fix`) reclassified Unresolved with an annotated lambda as its fix | plan §4.5, §5; decision 2 of 2026-10-19 | program 5 is required directly; the annotated lambda stays a valid spelling, not a required fix |
| D4's kind-2 hint for a call's own rows (`no annotation can decide …`) | decision 20 | its premise (O4 unrepairable) no longer holds for determined splits |
| "Waxwing generalizes nothing"; `let` is monomorphic | language.md; QT re-plan §0 ("Entailment") | program 8A is the desired experience; a named-helper-only restriction was not accepted |
| A callback's row must equal the row where it is called (FX017, FX018) | language.md, ADR 010 | program 9 needs a callback of row `Users + ...e` called where `Database + Log` are also available |
| The adopted solver's scope: PureScript's `Union` cases plus Sym, 1g, 2g, H | plan §2 | still sound for what it decides; it does not decide programs 4 and 5 (§2), so it is not the complete foundation the requirements need |

Not superseded: everything the programs leave alone (the surface of
records and `lacks`/`disjoint` clauses, the disjoint meaning of a
spread, explicit overlap policy, typed failures as they are).

## 2. The programs against the current compiler

Run with `GOTOOLCHAIN=go1.26.4 node research/composition-assessment/
run.mjs` on the checkpoint build. "Checks" means checking accepts it and
lowering stops at the Task 8 placeholder (rows of several tails are not
lowered yet).

| Program | Outcome now | Negative control | What stands in the way |
|---|---|---|---|
| 1 small part of a larger value | runs, `Hello, Ada!` | rejected (missing `name`) | nothing |
| 2 add a field, keep the rest | runs, `Ada` | rejected (D1, `r lacks { reviewed }`) | nothing |
| 3 combine two pieces | checks (swapped and both groupings of three too) | none | lowering (Task 8): unavailable yet, not a design question |
| 4 a split decided by a `lacks` fact | **rejected**: D4 `Cannot tell how acceptsParts's r and s split { admin: Bool }` | rejected (H: neither part can hold `admin`) | **inference limitation** (§3) |
| 5 `composeRequirements(join, restricted)` | **rejected**: D4 `Cannot tell how join's r and s split { x: Int, y: Int }` | none | **inference limitation**; the annotated spelling checks |
| 6 a forwarding wrapper | checks | rejected (promised `extra` not supplied) | lowering only |
| 7 overlap by chosen semigroups | rejected: `mergeWith` unbound | none | **unavailable feature**: classes and instances, and a typing for per-field policies (§6) |
| 8A a local row-polymorphic helper | **rejected**: second use mismatches the first | none | **semantic choice** (monomorphic `let`, language.md) |
| 8B the named generic helper | runs | none | nothing |
| 9 layered service fulfillment | **rejected**: `action must allow every effect at this call (Users + Database + Log), but its row is Users` | test replacement runs (`User("Test user")`); `profile` without `Users` rejected | **semantic choice** in the effect system (FX017/FX018 equal-row rule, §5) |
| 10 typed failures, one family removed | runs, `Guest`; with `(1, false)`, `Forbidden` | rejected (pure `guestGreeting` leaves `Denied`) | nothing |

The same two record programs in PureScript 0.15.16 (research/
composition-assessment/purs; `purs compile P4.purs`, …): program 4 and
program 5 are refused (`NoInstanceFound`, "The instance head contains
unknown type variables"); program 6 compiles. PureScript's `Union`
improves only through its three functional dependencies (two rows known
determine the third) and its `Lacks` facts never inform `Union`, so the
foundation the current solver copies cannot decide either program.

## 3. What programs 4 and 5 need, in the three senses

Both are calls into interfaces written with `{ ...r, ...s }` and facts
(`lacks`, `disjoint`). On the labels alone each has exactly one
solution: program 4 puts `admin` in `r` and leaves `s` empty; program 5
puts `x` in the first part and `y` in the second (the research oracle's
counts: `diag-14-fix`, plan §4.5, 1 solution; O4 with `{ admin: false
}`, limitations file, 1 solution). Three different questions are asked
of a foundation, and finding one satisfying assignment answers none of
them alone:

1. **Satisfiability.** Is there any placement of the labels in the parts
   that meets every fact? Needed to refuse the negative controls with a
   true contradiction (program 4 with both parts lacking `admin`).
2. **A useful inferred type.** Is a placement *forced*, the same in
   every solution? Program 4's `admin` is forced into `r`, program 5's
   `x` and `y` into their parts. A placement that is not forced must not
   be chosen silently, since the author ruled out guessing. This is what the
   current design lacks: PureScript's dependencies need two of the three
   rows known, and a `lacks` fact never counts as knowing a row.
3. **Checking a quantified signature.** Inside a generic function (the
   forwarding wrapper of program 6), the signature's rows are rigid: a
   wanted placement must hold for every instance of them, so the
   question is "for all rigid rows, is there a placement", not "is there
   a placement". The current design answers it for the shapes it has
   cases for (1g, 2g; program 6 checks).

## 4. Candidate foundations for records

Sources were read for this assessment where marked; research/
composition-assessment/README.md lists them with sections.

### 4.1 The current design: PureScript's `Union` (QT-strict+Sym+H)

Follows PureScript 0.15.16's `unionRows` and `Union`'s three functional
dependencies (Jones 2000), with the approved adaptations 1g, 2g, Sym and
H (plan §2).

- Programs: 1, 2, 3, 6 (lowering aside); not 4 or 5, with or without
  H; PureScript itself refuses both (§2).
- Satisfiability: partial. A contradiction is found when a case's
  unification fails or when H shows a constant no part can hold;
  otherwise a body with no solution can end Unresolved (`odd-cycle`).
- Forced placements: only those the dependencies give. A `lacks` fact
  never forces a placement.
- Quantified signatures: by the cases on rigid tails (1g, 2g).
- Verdict: sound for what it decides. Programs 4 and 5 are outside what
  its rules can decide, so keeping it means restricting the
  requirements.

### 4.2 Rose: Morris and McKinna, POPL 2019

Containment `ρ1 ≲ ρ2` and combination `ρ1 ⊙ ρ2 ~ ρ3` as qualified-type
predicates over an abstract row theory; principal types by Jones's
qualified types (§4.5, Theorem 11).

- Read: the paper's only dependency is the forward one (known parts
  determine the combination; coherence, Def. 13-14, using Jones 2000's
  closure). It has no improvement rules and no lacks predicate; nothing
  recovers the parts from the result plus facts.
- Programs: as 4.1 on records; not 4 or 5.
- Verdict: it states what Waxwing's `Merge` already is and adds nothing
  programs 4 and 5 need. Its sequel (Hubers and Morris, ICFP 2023)
  matters for program 7 (§6).

### 4.3 Improvement decided exactly on presence flags (recommended)

This keeps the qualified-types frame and the current representation,
and replaces "improve only by the dependencies" with Jones's own
definition of improvement, decided exactly.

- **Jones, Simplifying and improving qualified types (FPCA 1995), §4**
  (read for the QT re-plan, §11.5): a substitution `S` improves a
  predicate set `P` when `P` and `S P` have the same satisfiable
  instances and `S` introduces only new variables. Applying an
  improvement never loses a solution, so it is never a guess.
- **Presence flags.** For each label (and each rigid tail, treated as
  one indivisible constant, as now), "part `m` holds it" is a yes/no
  variable. `Merge l r t` says, per label, `t` holds it exactly when
  one of `l`, `r` does and not both; `m lacks { a }` says `m` does not
  hold `a`; `m disjoint n`, not both; a known row fixes its flags. This
  is Rémy's field presence (`pre`/`abs`, in Rémy, Typing record
  concatenation for free, 1992, §2.1, read) read as Boolean variables,
  as Simon does for row-polymorphic records (Optimal inference of fields
  in row-polymorphic records, PLDI 2014, read: one Boolean flag per
  field beside an ordinary type term; symmetric concatenation needs
  exactly the clause "not in both", §1.1).
- **The rule.** At a waiting predicate, a placement is applied when the
  flags force it: in every solution of the current facts the label is
  in that part (bind the part to hold it, over a fresh tail) or in none
  (record the lack). That substitution is an improvement in Jones's
  sense, because it is true in every solution. Field types are unified
  when a placement is applied, by the ordinary unifier.
- **The three senses.** Satisfiability: the flags have a solution or
  the body is a contradiction, so H becomes a special case and
  `odd-cycle`-like bodies become proved contradictions. Forced
  placements: exactly the improvement test. Quantified signatures: a
  rigid tail's flags for labels it may hold are universally quantified
  ("for all rigid rows, is there a placement"), the ∀∃ form Madsen and
  van de Pol use for rigid variables (OOPSLA 2020 §3.2, read; Π2p-
  complete in general, Baader 1998, read in abstract). Rows a body never
  places stay `{}` as today (unchanged defaulting).
- **Programs.** 1, 2, 3, 6 as now; 4 and 5 accepted with no annotation
  (each placement is forced); their negative controls refused as
  contradictions. A placement that is not forced still waits and ends
  Unresolved (D4): `apply0(merge)` (`diag-01`), F2's family, and O4's
  variant `granted2({ name: 1, admin: false })`, where `name` may be in
  either part (2 solutions). The requirements ask only for the uniquely
  determined call, so this is within them; whether an undetermined split
  could be chosen freely is a separate question (§7, decision 3).
- **Order.** Improvements are true in every solution, and more facts
  only remove solutions, so an applied placement is never undone; the
  final outcome is a function of the body's final facts, not of the
  order they arrived in. This replaces "measured, not proved" (plan §6,
  M8) with an argument, to be checked by the existing order tests.
- **Cost and assumptions.** The flag problem for one label can need
  search in the worst case (each `Merge` is an "exactly one of two"
  constraint; Simon notes symmetric concatenation is not Horn and needs a
  SAT solver, §1.1, §6). The problems are per label and per connected
  group of predicates, small in written programs; a step bound keeps the
  `Stop Limit` channel. Assumed, to be argued and checked: that labels
  are independent once rigid tails are treated as constants (rows are
  well formed, so a label and a rigid tail in one row never overlap);
  that field types never decide a placement (if a label's placement is
  open on labels alone but one choice makes field types clash, this
  rule leaves it Unresolved rather than deciding it: incomplete, never
  wrong).
- **What is ours.** The composition, not a component: no published
  record system applies improvement to merge predicates this way (the
  source check found Simon's flags with SAT for inference, Flix's
  Boolean unification for effects and variants, and no record system
  with both). The per-label reduction and the treatment of rigid tails
  are the parts to argue and approve (ADR 014).
- **Burden.** Keeps the representation, the unifier, the cases (1, 2,
  2g, Sym become fast paths of the same test), the facts, the
  diagnostics' metadata and the three-way result. Adds one module that
  builds the flag problem for a group of waiting predicates and answers
  "solvable?" and "forced?" by a small exact search, and the research
  oracle's brute force as its reference. Re-does B4's end of a body and
  the D4/D6 classification on top of it.

### 4.4 Boolean unification of presence (Flix's method on records)

Martin and Nipkow (1989) and Büttner and Simonis (1987): unification in
Boolean rings has most general unifiers, with or without constants
(Baader and Snyder, Handbook of Automated Reasoning, §3.4, read).
Madsen and van de Pol (OOPSLA 2020, read) put it inside Hindley-Milner
with let-generalization and keep principal types modulo Boolean
equivalence, at about 1.4× inference time, and only with formula
simplification (without it the compiler ran out of memory).

- Would give: everything 4.3 gives, plus a most general solution for an
  undetermined split (the free flag stays a variable), which is what
  local generalization of a helper that merges records would need.
- Against it now: Flix applies it to effects and variant case sets, not
  records (its record rows are ordinary rows, RecordConstraintSolver,
  read); no published record system does this (source check). Types
  would carry Boolean formulas over flags, which Waxwing's surface
  (`{ ...r, ...s }`, `lacks`, `disjoint`) cannot print; field types
  under a free flag need conditional constraints; and the
  representation of rows changes throughout.
- Verdict: the route if principal types with free splits become a
  requirement; more invention and more change than the programs need.

### 4.5 A general solver (SMT, or a SAT library)

Would answer satisfiability and, with one query per flag, forcedness;
it does not give inferred types, generalization or the texts, and Z3 in
the checker was assessed and refused for layering and determinism
(alternatives file §8.3). 4.3's search is the small part of a SAT
procedure it needs, on problems of a few flags; no general solver is
recommended.

## 5. Programs 8 and 9: generalization and layered handlers

These are not row-merge inference; each has an established answer that
composes with §4.3. Sources were read by the source check of 2026-10-20
(research/composition-assessment/README.md).

**Program 8A, a local row-polymorphic helper.** Generalize a local `let`
when it is closed (its free variables are top-level declarations or
already-generalized locals) and its right side is a lambda. This is
GHC's rule under MonoLocalBinds (User's Guide, "Let-generalisation": a
binding group is generalized if each of its free variables is closed),
which keeps the generalization Vytiniotis, Peyton Jones and Schrijvers
argue is safe (Let should not be generalised, TLDI 2010; OutsideIn(X),
JFP 2011 §4.2: for bindings with no free type variables "generalization
poses no difficulties"), with the value restriction for effects (only a
lambda, a value, is generalized; Koka's papers generalize only total
expressions, POPL 2017 §3.1). `getName` is closed, so it gets `∀ r. ({
name: a, ...r }) -> a` (Gaster and Jones's row polymorphism with its
`lacks`), and both uses check. Residual predicates (a `Merge` the helper
leaves waiting) are generalized with it, as Jones's qualified types do.
Lowering: a closed local is lifted to a top-level declaration and
specialized per use like any other (Waxwing specializes every
declaration). Not covered: a helper that captures a local variable stays
monomorphic, as in GHC; whether that is acceptable is decision 4.
For comparison, PureScript never generalizes an unannotated local let
(TypeChecker/Types.hs `inferLetBinding`), and Koka generalizes a local
`fun` but not a local `val`.

**Program 9, layered fulfillment.** Koka, Biernacki et al.'s calculus,
Frank and Effekt all reject the wrapper as written: inside the handler
the row is `Users + Database + Log + ...e`, the callback's is `Users +
...e`, and effect rows must match at a call (Koka POPL 2017 §3.2; Koka's
automatic `open` adds a tail only to a closed row, so it does not apply
to `...e`). The established remedy is injection: `mask<l>` in Koka (book
§3.4.7: `(action: () -> e a) -> <l|e> a`), `lift` in Biernacki,
Piróg, Polesiuk and Sieczkowski (Handle with care, POPL 2018, Fig. 5:
from `e : τ / ε` to `[e]_l : τ / ⟨l | ε⟩`, "skip the nearest handler for
l", which is what stops accidental handling), adaptors in Frank (Convent
et al., JFP 2020 §3). Two faithful ways to get program 9:

- *Explicit.* The wrapper writes the injection: `mask(Database, Log) {
  action(()) }` (spelling open). It types, and its meaning is right even
  when `...e` itself holds `Database`: the action's operations skip to
  the outer handler. Smallest change; the program gains one line.
- *Relative to the ambient.* Frank's ports (Lindley, McBride and
  McLaughlin, POPL 2017 §3.1): a callback parameter's ability is the
  ambient one plus an adjustment (`<Users>`), so the call needs no
  injection. A change in what a callback's written row means.

Not recommended: letting the checker insert the injection itself when
the callback's row is a sub-row of the ambient. No system the check
found does that; it would be a local rule.

## 6. Program 7: overlap by chosen semigroups

Unavailable rather than inferred differently: Waxwing has no classes or
instances yet (docs/plans/2026-10-10-modules-and-instance-selection-
direction.md), and `mergeWith` needs a typing of its own. One that uses
only what §4.3 already has: write the overlap as its own row `o`, the
left record `{ ...o, ...a }`, the right `{ ...o, ...b }`, with `o`, `a`,
`b` pairwise disjoint, and the result `{ ...o, ...a, ...b }`; the policy
argument is a record over the same labels as `o`, each field a
semigroup dictionary for that field's type. The last part needs one
operation Waxwing lacks: a record type made from a row by applying a
type constructor to each field (Ur/Web's `map` over rows, Chlipala 2010;
Hubers and Morris, Generic programming with extensible data types, ICFP
2023, read: `rapply : Π(f ⇒ g) → Π f → Π g`, and a record of per-field
dictionaries, `fmapΠ : Π(Functor z) → Functor(Π z)`, §3.3; their system
is explicitly typed, with no inference algorithm). With it, `{ port: last
}` against `defaults` and `{ port: 9090 }` gives `o = { port: Int }`,
`a = { debug: Bool }`, `b = {}`, so `debug` is kept by construction and
a `last` for the whole record is a different, ill-typed argument. An
`Int` field meeting a `Text` field cannot be in `o` (one type per
label), which is the negative control. This is a separate milestone
(classes, then the row map); nothing in §4.3 depends on it.

## 7. Recommendation and decisions for the author

**Recommended foundation for records: §4.3.** In one sentence: Waxwing
keeps qualified types with `lacks`, `disjoint` and `Merge` predicates
(Gaster and Jones; Ur/Web; PureScript's `Union` restricted to disjoint
rows), and improves a waiting predicate as Jones (1995) defines
improvement, exactly: a label is placed in a part when every solution
of the facts places it there, the solutions being read on Rémy's
presence flags as Simon (2014) does for records. The syntax translates
unchanged (`{ ...r, ...s }` is `Merge` over its parts, as now). The
departures to own: the per-label reduction with rigid tails as
indivisible constants; field types never deciding a placement; an
undetermined split staying an error. It meets programs 1-6; §5 and §6
give programs 8, 9 and 7 an established route each, and program 10
already runs.

**Decisions** (none taken here):

1. Adopt §4.3 as the record foundation, with its assumptions (§4.3,
   "Cost and assumptions") to be argued in a rules file and checked
   against the research oracle before any code. Alternative: keep 4.1
   and restrict the requirements (programs 4 and 5 refused).
2. Whether H, 2g and the case table stay as fast paths of the exact test
   or are retired once it exists (no change proposed now).
3. Undetermined splits (`granted2({ name: 1, admin: false })`,
   `apply0(merge)`): remain D4 (recommended; within the requirements),
   or be accepted with a canonical choice on the argument that a record
   value does not depend on which part holds a field. That argument is
   not made or checked here.
4. Program 8: generalize closed local lambdas (GHC's rule); locals that
   capture variables stay monomorphic. Or ask for more, which the
   sources above argue against.
5. Program 9: explicit injection (`mask`), or Frank-style rows relative
   to the ambient.
6. Program 7: a separate milestone after classes and instances, typed
   through an overlap row and a row map (§6).
7. Task 7: the literal, removal by one requirement and the lowering
   (Task 8) do not depend on this choice; the end-of-body classification
   and the D4/D6 texts of the fixtures whose class changes (diag-14-fix,
   O4, `design-forced-bound` and the like) do. Resume Task 7 only after
   decision 1.

## 8. Evidence and limits

- Run: the program variants on the checkpoint build (§2); PureScript
  0.15.16 on programs 4-6. Not run: any candidate. §4.3's outcomes on
  programs 4 and 5 follow from their label-only solution counts (1
  each), not from an implementation; field types, effect rows and texts
  are not modelled.
- Sources: read through two source checks, author or institutional
  copies where the ACM library refused (README lists each, with what
  could not be accessed: Martin and Nipkow's full text, Wright 1995, the
  Effekt paper, Madsen et al. 2023).
- The order argument in §4.3 is an argument, not yet a check.
