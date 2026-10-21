# Independent review: D3b existence proofs

Reviewer: independent adversarial pass (did not write the proofs).
Reviewed at d41eea7 (45b75d5, the D3b existence integration, plus the
coordinator's `d3bExistsWithin` corollary, dossier §18.34-18.35).
Scratch Lean was kept outside the repository; its checks are summarized
in §2 and §6 below.

## Verdicts

| Theorem | Statement matches reviewed Prop | Verdict |
|---|---|---|
| `mguExists` | `MGUExists`, exactly | proved; sound |
| `cellIndependence` | `CellIndependence`, exactly | proved; sound |
| `universality` | `Universality`, exactly | proved; sound |
| `d3bExists` | `D3bExists`, exactly | proved; sound |
| `d3bExistsWithin` | the bridge's `D3bExistsWithin` shape | proved; sound |
| `robinson` | own statement (`MguSpec`), not in Defs | proved; sound |
| `thetaStar_valid_iff_fresh` | own statement, `Fresh` explicit | proved |

No finding is a false statement or a vacuous theorem. Findings F1 to F7
are prose and evidence issues.

## 1. Statements

- `git diff d7113d7 45b75d5 -- .../Typed/Defs.lean` is empty, and so is
  the diff to d41eea7. Defs.lean is unchanged.
- Scratch `example : MGUExists (Label := L) (B := B) := mguExists`,
  and the same for `CellIndependence`, `Universality` and `D3bExists`,
  elaborate for arbitrary `L` with `DecidableEq` and arbitrary `B`. No
  extra instance or hidden argument is used. `#check` of `robinson`,
  `thetaStar_valid_iff_fresh`, `d3bExistsWithin` and `mguSpec_exists`
  shows exactly the premises the prose lists.
- Definitions do not weaken the claims. `UnifiesD` is `Sat` of the
  substituted pre-instance against `(cliftP P).D`, the ordinary
  satisfaction relation. `IsMGU` is the standard notion: it unifies,
  its values are finite, and every unifier `τ'` factors as
  `substG τ'' ∘ τ`. `τ'` ranges over all of `CSubst`, with no finiteness
  restriction. `allowedCells` filters the nonempty sublists of
  `rigidRow` by `∃ τ, UnifiesD P π [S] τ`. `HasInstance` is
  `∃ θR, Sat θR P.D ∧ InPattern P π θR`. Each matches construction.md
  §4. No unfolding makes a theorem trivial. §2 shows `GenericInst` and
  `allowedCells` have content.

## 2. Non-vacuity (scratch Lean, compiled, no sorry)

At `Label := Nat`, `B := Unit` unless stated otherwise:

- **route.** `routeP_scoped` and `routeP_hasInstance` inhabit the
  premises. For any `θs` with `GenericInst routeP π θs`,
  `θs.row 0 (.inr [0]) ≠ none`. Proof: coverage of the instance in
  which row 0 holds label 0 alone. So the witness from `d3bExists`
  really occupies the cell `{r}`, and the cell-free pre-instance
  `eta routeP π []` is not generic. `GenericInst` has teeth.
  `[0] ∈ allowedCells routeP π` (via `occupied_allowed`), and
  `[1,2] ∉ allowedCells routeP π` (because of `disjoint 1 2`), so
  `allowedCells` is not every candidate.
- **agreement** (`agreeP`: `r = s ⊎ t`). `¬ Allowed agreeP π [0]`: the
  equation refuses `{r}` alone. With `Label := List Nat` and
  `B := CConst (List Nat)`, `Fresh agreeP id id` holds, so the
  corollary's premises are jointly satisfiable. Then
  `∃ τ, IsMGU agreeP π (allowedCells agreeP π) τ ∧
  SolvableAt agreeP (thetaStar agreeP π τ)`, from `mguExists`,
  `cellIndependence`, `thetaStar_valid_iff_fresh` and `agreeP_valid`.
  This is the first check that `thetaStar` itself, not `thetaFlat`,
  certifies the agreement problem.
- **split without its hypothesis.** For every `IsMGU` `τ` over the
  allowed cells, `¬ SolvableAt splitFree (thetaStar splitFree π τ)`,
  from `universality`, `d3bSound` and `splitFree_not_valid`, with no
  `Fresh`. The construction does not certify an invalid problem.
- **Infinite values.** `¬ FinG (.record fun _ => some (.base (.inl
  true)) : CG Nat Bool)`. Such values exist, and `IsMGU`'s generality
  clause quantifies over substitutions taking them.

## 3. The key arguments

**hv fixed point (`MguSpec`, `Agree`, `elim_step`).** The last clause
of `MguSpec` says: for every `θ` and `ν`, if `HvSat θ ν E` then
`Agree θ (vcomp ν μ) ν`. `Agree` constrains only the readings `hv`
makes of a cell-shaped value from the top context: non-cell constants
at `none`, and `X r S` at an unwritten `k` with `cellOf θ k = S`.
`hv_congr` proves that these are the only readings, by induction on
`CS`. Under a cell label, `CS` allows only `cv (X r S)`, so `hv` never
reads a non-cell constant at `some k` there. The induction step was
checked:

- Bind1 obtains `ν x none = hv ν none u` from `HvSat` on the
  disagreeing pair.
- Bind2 obtains `ν (X r S) (some k) = ν (X r' S) (some k)` for exactly
  the `k` that `Agree` names.
- `hvSat_bind` transports `HvSat` to the substituted pairs.
- `elim_step` composes with `agree_trans` and `hv_subst`.

The universality step uses `vcomp (vcomp ν0 τ3) τ = vcomp ν0 μ` as a
full `funext` equality. That is valid because `substG τ3 (τ c) = μ c`
for every `c`, where `τ3` replaces non-finite values of `τ''` only off
the constants that occur. So an arbitrary MGU `τ`, which need not be
cell-shaped, is handled through `μ` and needs no shape of its own. No
gap was found.

**Well-foundedness.** `#print psub_acc` shows the term
`G.brecOn x psub_acc._f psubO_acc._f`, so the recursion is structural,
on the reflexive inductive `G`. `#print axioms psub_acc` reports that
it depends on no axioms. `PSub` is the proper-part relation through
arrows and through any record field. Infinite branching is fine
because every path is finite. `occurs_no_unifier` follows from
`psub_irrefl`. `dis` and the other mutual definitions also compile
without `decreasing_by` or `termination_by` in Typed/. The only
`termination_by` in the library is in Composition/Unify/Algo.lean,
which is unrelated.

**Classical reasoning.** Classical reasoning is confined to Props:
`byContradiction` to find a differing pair or field,
`Classical.choose` in `fin_occ_cover`, and the classical `decide` in
`allowedCells`, `bind` and the existing `hv` and `cellOf`. No `decide`
is evaluated on an infinite object. The kernel never computes
`allowedCells`, and the `decide_eq_true_eq` rewrites are only
propositional. The induction measure in `robinson` and `ci_core` is
the length of a finite list covering the occurring constants (`L`,
from `occE_cover`). Each binding erases its variable from that list
(`count_bind`, which needs `¬ Occ x u`).

## 4. Robinson correspondence (§6.1)

Accurate on the main points:

- `IsMGU`'s generality clause and `MguSpec`'s clause
  `∀ τ, UnifL τ E → ∀ c, substG τ (μ c) = τ c` quantify over every
  `CSubst`, infinite-valued ones included, so the model's equality on
  `CG` is covered.
- `UnifL τ (eqPairs …)` is equivalent to `UnifiesD` whenever `DefOk`
  holds (`unifiesD_iff`), and `DefOk` does not depend on `τ`.
- "Every unifier τ satisfies τ = τ∘μ" is proved for `robinson`'s `μ`,
  over all unifiers of the full pair list. `MGUExists` exposes only
  the weaker `∃ τ''` form; the stronger form is available through
  `mguSpec_exists`.
- Rows are evaluated first and are not variables. Substitutions are
  total. Records are functions. All of this matches the Lean.

The attribution paragraph added at d41eea7 now says the result is an
adapted reproof whose source location is unchecked. See F2 and F3 for
the remaining inaccuracies.

## 5. Premises

- `universality` binds `HasInstance` as `_` and never uses it. This
  is harmless: the premise is satisfiable (`routeP_hasInstance`), and
  without an instance the coverage conjunct is vacuous while the other
  conjuncts are still proved.
- No theorem in the set assumes freshness. Their types contain no
  `Fresh`, no `z` or `e`, and no extra class on `Label` or `B`. Only
  `thetaStar_valid_iff_fresh` takes `Fresh`, explicitly, and the scratch
  `fresh_agree` shows it is satisfiable.
- `WithinC` is in `Universality`'s statement and in `d3bExistsWithin`'s.
  It is not in `D3bExists`'s (see F5).

## 6. Axioms and build

At d41eea7, `lake build` reports 128 jobs and success. Running
`lake env lean ../division-campaign/d3b/checks/Audit.lean` prints 24
lines, each `[propext, Classical.choice, Quot.sound]`; the 24 include
`d3bExistsWithin`. A grep of Composition/ for `sorry`, `admit`,
`native_decide` and `axiom` finds no matches. The scratch file also
reports no errors.

## Findings

**F1 (wording): `WithinC` described as "the problem's labels and
bases".** Under the author's reading, `WithinC` admits the written
labels and bases, plus every cell label `inr S` and every constant
(`WithinG`: `.base (.inr _)` is unrestricted, and only `.inl` keys must
be written). The following phrases understate what it admits:

- the Defs.lean docstrings of `Universality` (l.186) and
  `D3bComplete` (l.232);
- construction.md §6 step 5 ("the problem's labels and bases pass back
  through substitution");
- construction.md §8 ("within the problem's symbols");
- the comments in Complete.lean (l.7, l.58), FlatMain.lean (l.5) and
  UnivCover.lean (l.5).

None of these says that θ* is literally written in the program, so
none is false. They do omit the symbolic cell labels and constants.
Correction: use the wording of the `d3bExistsWithin` docstring. Editing
the Defs.lean comments touches the reviewed statement file, so keep
that edit comment-only.

**F2 (overclaim in prose): §6.1 item 5 says that cell locality is "not
for `mguExists`".** It is used there. `robinson` is proved only for
`GoodE` pairs, and `GoodE` includes `CS`. `dis` requires `CS`, and
Clash is defined through cell projections `pr`. `mguExists` reaches
`robinson` through `goodE_eqPairs`, which proves `CS` for the
pre-instance. So the reproved theorem is Robinson's for finite
cell-shaped pairs, as UnifRobinson.lean's header says. It is not
proved for arbitrary finite `CG` pairs. Item 1 likewise says the proof
uses "only" injectivity, disjointness and `psub_acc`; it also uses `CS`
and the projections. Correction: say that `mguExists` is proved
through the cell-shaped adaptation, and drop "not for `mguExists`".

**F3 (overclaim in prose): §6.1 item 4 says that "`robinson`'s result
leaves every constant outside the equations fixed".** Neither
`MguSpec` nor any lemma states this. It is true of the construction,
since `bind` touches only an occurring `x`. It also appears derivable
from `MguSpec`'s fourth clause together with `psub_irrefl`. This
review did not prove it. Correction: add the lemma or mark the claim
as unchecked. Separately, §4 step 2 says "This is ordinary syntactic
unification in the sense of Robinson 1965". That conflicts with
d41eea7's own attribution paragraph, because unifiers range over
infinitely branching values and the theorem is reproved for
cell-shaped pairs. Correction: "a first-order unification problem,
handled by an adaptation of Robinson 1965 (§6.1)". In the same vein,
the comments in Defs.lean l.197 ("Robinson's theorem for the
pre-instance"), MGUExists.lean l.5 and l.62, and UnifMain.lean l.2
should say "adapted".

**F4 (wording): "construction" and "specified θ*".** `thetaStar`
depends on `allowedCells`, which is a classical filter on an
existential over all substitutions, and on a choice of MGU. `robinson`
and `cellIndependence` are existence proofs that use
`byContradiction`. Nothing executable is extracted. §18.35 already
says that executable construction remains to be done. construction.md
§1 and §4 should say once that θ*_π is defined classically, unique up
to the choice of MGU, and not computed by the Lean development.

**F5 (wording, partly closed): `D3bExists` lacks `WithinC`.** This is
closed for use by `d3bExistsWithin` at d41eea7. However,
bridge/statements.md l.43-44 and l.296-300 still say that W is needed
because `D3bExists` lacks `WithinC`. Correction: add a note that
`d3bExistsWithin` supplies `D3bExistsWithin`, so W is not needed on
this route, as §18.35 item 1 already says.

**F6 (gap, evidence only): `thetaStar` is never checked on the worked
examples.** The worked examples in §11, `routeP_valid` and
`agreeP_valid` certify through `thetaFree` and `thetaFlat`. No
repository check exercises `thetaStar` on a concrete problem. The
scratch checks in §2 fill this gap: `allowedCells` membership for
route, the refused cell for agree, agree solvable at `thetaStar`, and
split unsolvable at `thetaStar`. Correction: add them to Examples*.lean
and to Audit.lean.

**F7 (wording): the dossier §18.34 Robinson paragraph.** It still says
"`robinson` reproves it for this model". The adaptation is reproved,
not the published theorem. §18.35 item 3 corrects this, but §18.34 is
the paragraph readers will find first. Correction: replace "reproves
it" with "reproves an adaptation of it (§18.35)".

## Overall claim

"D3b general existence is proved, with no freshness premise": **holds
as stated**, with its premises read in full. For every `Label` with
decidable equality and every `B`, every Scoped `P` and every pattern π
with an instance (`HasInstance`) has a generic instance (`d3bExists`).
It also has one within the problem's labels and bases plus symbolic
cells and constants (`d3bExistsWithin`). No freshness premise is used
anywhere, and only standard axioms are involved. The scope limits
already recorded remain: the result is classical and not executable
(F4), it holds in the research model rather than for Waxwing source,
and completeness stays conditional on `Fresh`.
