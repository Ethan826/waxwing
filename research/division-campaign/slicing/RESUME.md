# Stream 10 (slicing statements): resume notes

Paused 2026-10-21 at the coordinator's request (usage). Statements and
review only; no proofs, no implementation.

## Done (committed in the WIP checkpoint)

- statements.md: definitions, S0, DSatSplit, S1, S1Fin, S1r, S1-acc,
  S2, C1-C3, restrictions table, counterexample hunt with results
  (§5), soundness review findings (§6, not yet applied).
- research/composition-proofs/Composition/Sig/SliceDefs.lean
  (statements-only, `#guard`s), imported in Composition.lean;
  `lake build` passes.
- slice.mjs, variants.mjs, problems.mjs, hunt.mjs (20 problems, 0
  flagged), generated.mjs (challenges, plain 300 7, pair 400 1 and 2:
  no S1, S1-acc or S2 disagreement).

## In flight

- Completeness review subagent: asked to stop and hand back; its
  findings, if any, are not recorded.
- Coordinator items (from app-measurements.md, dossier §18.25 on
  r005b-replan) not yet written up.

## Exact next step

1. Apply the soundness review's three points (statements.md §6):
   per-slice erasure in S2's sketch; tighten `IsSlicing.sort` to
   `Q.rigidTy ⊆ P.rigidTy ∧ Q.rigidRow ⊆ P.rigidRow` plus agreement;
   add a `DSatFinSplit` statement.
2. Rerun the completeness pass (separate reviewer), record findings.
3. Move SliceDefs.lean's examples to SliceExamples.lean (250-line
   limit) and add the statements below.

## Author's decisions to act on (2026-10-21, via coordinator)

- **S1 is stated over the residual constraints after a validated
  substitution**, with a separate theorem connecting them to the
  original. Chain: recorded constraints → substitution with its binding
  equations retained → residual constraints → independent slices whose
  combined solutions preserve the residual problem. Planned form:
  `substP P σ = ⟨rigidTy, rigidRow, D, eqs σ ++ substProblem σ B⟩`;
  `SubstSound`: `ValidAll (substP P σ) → ValidAll P` (and `ValidFin`),
  argued from `subst_sat` (Binding.lean), to be established, not
  assumed; `C1Subst`: `checkSliced (substP P σ) Ts → ValidAll P ∧
  ValidFin P`. Not an equivalence: σ commits to a choice, so failure
  under σ is Unresolved. Preserve rigid/flexible and the quantifiers:
  σ found for one concrete instance must not discard other rigid
  assignments (σ's domain must be flexible; a σ binding a rigid
  variable only makes `substP` harder, never unsound). Avoid
  circularity: identify what the existing solver resolves cheaply
  (e.g. field-read type metas solved to ground types, app A's
  2^120 → 2^12) before the signature procedure. Note: substitution can
  create new ground atoms (`substAtom` yields `ff`); the ground slice
  keeps them. Eqs of variables absent from `B` may merge slices; drop
  those bindings.
- **Declaration-consistent pattern enumerator**, proposed statement
  with completeness: `holdersOK P l rs` (per label, rigid subsets not
  lacking `l` and with no declared-disjoint pair); `consistentPatterns
  P` = product over `(written P).eraseDups` of the allowed subsets;
  `checkAllCons`; CP: lists exactly the patterns `checkAll` keeps (as
  sets, via `samePattern`); C4: `checkAllCons P T = checkAll P T`.
  Evidence planned: `#guard` C4 on CheckData's 58 exported problems.
- **Star must be supported at useful scale** (acceptance benchmark;
  polynomial worst case not required; avoid eager enumeration on
  routine cases, measured resource limits, fail honestly). Finding so
  far: S2 as stated cannot cover star (relevance is per slice, and the
  one finer notion tried, per atom, is unsound: `atom-relevance`); a
  directed label-flow relevance might, but it is new machinery.
  Investigate declaration-consistent patterns, symbolic
  representations or other established techniques first.
- **Measure search cost, certificate size and checking cost
  separately**: a larger certificate table only relocates the
  exponential cost.
- Exhaustive enumeration stays the reference baseline.

## Uncommitted

Nothing in this directory or SliceDefs.lean after the checkpoint.
Scratch outputs (not in the repo) are in the session scratchpad.

## Completeness review (handed back after the pause; not yet applied)

No → direction found false (argument only). Findings to act on:

1. Rigid type variables and D-only links make slices too coarse;
   bounded checks (493 problems, 0 disagreements) support S1r-acc and
   an S2r (relevance per flexible-only component). Propose both.
2. C3's `checkAllOn` enumerates a product over slices, so it only
   drops `wide`-style labels; only `checkSliced` gives the sum. Say so.
3. `written` keeps duplicates, so `pairs`/`relevantPairs` repeat and
   `subsets` doubles per repeat; dedup `relevantPairs`, note `pairs`,
   fix the `twoParts` docstring ("three of four" vs 2 distinct of 4).
4. State a per-slice refusal lemma (¬Valid Q, other slices' D
   satisfiable ⇒ ¬Valid P) and its precondition for `Outside` slices.
5. Oracle gap: rigid field types Int/Bool only, so D `r = {a: {b: Int}}`
   reads as impossible; flag zero-checked cases in hunt.mjs or widen
   rigidRowTypes.
6. DSat ↔ DSatFin via `r1` (argument): S1Fin could use DSat.
(Its note about unfilled placeholders is stale: they were filled.)
