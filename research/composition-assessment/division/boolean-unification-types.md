# Boolean unification in type systems — source reading (2026-10-20)

Scope: published, implemented type systems that use Boolean unification
(unification modulo Boolean rings/algebras), read for how they handle rigid
(skolem) variables, mgus, the exact theory, and per-element types. No procedure
is proposed here.

Convention: plain sentences report what a source says, with a citation.
Sentences marked **[INF]** are my inference and not stated by the source.

## Sources and access

| # | Source | Status | Where from (local copy) |
|---|--------|--------|------|
| S1 | Madsen & van de Pol, "Polymorphic Types and Effects with Boolean Unification", PACMPL 4(OOPSLA) art. 154, 2020, doi:10.1145/3428222 | §1–3 (calculus, SVE, inference, complexity) and §6–8 read in full; §4–5 (implementation, evaluation) skimmed; App. A not read | users-cs.au.dk/magnusm/papers/oopsla20/paper_b.pdf → `downloads/flix-oopsla2020/paper.pdf` |
| S2 | Madsen & van de Pol, "Relational Nullable Types with Boolean Unification", PACMPL 5(OOPSLA) art. 110, 2021, doi:10.1145/3485487 | §4.1, §4.3–4.6 (types, Algorithm W, theorems) and §5.3 read; §2 study, pattern-matrix saturation and proofs skimmed | pure.au.dk/ws/files/289642581/3485487.pdf → `downloads/flix-oopsla2021/paper.pdf` |
| S3 | Madsen, van de Pol & Henriksen, "Fast and Efficient Boolean Unification for HM-Style Type and Effect Systems", PACMPL 7(OOPSLA2), 2023, doi:10.1145/3622816 | **Abstract only.** Full text not read: ACM DL, pure.au.dk/portal/files/417851913/3622816.pdf and researchprofiles.ku.dk all returned Cloudflare 403/challenge pages to curl and WebFetch; the Chrome extension was not connected | abstract from SPLASH 2023 page and OpenAlex |
| S4 | Madsen & van de Pol, "Programming with Purity Reflection", ECOOP 2023, LIPIcs 263 art. 18 (the request's "OOPSLA 2022" title is this paper) | §3 (λB calculus) skimmed; grep for rigid/unification found nothing beyond citing S1 | drops.dagstuhl.de → `downloads/flix-ecoop2023/paper.pdf` |
| S5 | Madsen, Starup & Lutze, "Restrictable Variants: A Simple and Practical Alternative to Extensible Variants", ECOOP 2023, LIPIcs 263 art. 17 | §2 example, §3.2 (types), §3.5–3.7, §4 and the Boolean-unification related work read; proofs not read | drops.dagstuhl.de → `downloads/flix-restrictable-ecoop2023/paper.pdf` |
| S6 | Martin & Nipkow, "Boolean Unification — The Story So Far", JSC 7(3–4), 1989 | §1–5 and §8 read; §6–7, §9–10 skimmed. Read from the authors' DVI (1994 build, 15 pp). Page numbers below are that DVI's, **not** JSC pagination | proof.cit.tum.de/~nipkow/pubs/jsc89.dvi.gz → `downloads/martin-nipkow-jsc89/` |
| S7 | de Vries, Plasmeijer & Abrahamson, "Uniqueness Typing Simplified", IFL 2007, LNCS 5083 (2008), doi:10.1007/978-3-540-85373-2_12 | Final version: §5 (Boolean unification) and §6–7 read, rest skimmed. An earlier pre-proceedings version (Radboud 2066/36653) was also skimmed. It uses inequality constraints u ≤ v plus a propositional entailment check, not Boolean unification | ftp.cs.ru.nl/…/vrie08-IFL07-UniquenessTypingSimplified.pdf → `downloads/devries-ifl2007-final/`; `downloads/devries-ifl2007/` |
| S8 | Flix compiler source, github.com/flix/flix at master 076fab4 (2026-10-20) | Read: `RigidityEnv.scala`, `Scheme.lessThanEqual`, `BoolUnification.scala`, `shared/SveAlgorithm.scala`, `EffUnification3.scala` (header and `toSetFormula`), `set/SetFormula.scala` (docs), `zhegalkin/ZhegalkinAlgebra.scala`, `ZhegalkinExpr.isEmpty`, `CofiniteIntSet` (docs), `CaseSetUnification` (SVE), `ConstraintSolverInterface.visitSpec` (comments). Rest not read | gh api → `downloads/flix-src/` |
| S9 | Zullo, "Let Generalization, Polymorphic Recursion, and Variable Minimization in Boolean-Kinded Type Systems", PACMPL POPL 2026, doi:10.1145/3776644 | **Abstract only** (POPL page, OpenAlex). Full text is ACM-only and blocked | — |
| S10 | Lee, Starup, Lhoták & Madsen, "Qualified Types with Boolean Algebras", PACMPL OOPSLA 2025, doi:10.1145/3763096 | **Abstract only** (OpenAlex). Full text ACM-only and blocked | — |

Not pursued (outside the Boolean theory): Kennedy's units of measure use
abelian-group unification. Rémy-style presence flags and Leijen's scoped labels
are not Boolean algebras. Koka is not Boolean. S1 §3.6 and §6.5 contrast the
Flix approach with row-polymorphic effects. No read source uses Boolean
unification for record-label presence. The nearest is S5, which uses it for the
label sets of *variants*.

## Q-a. How a declared signature with rigid Boolean variables is checked

- S1 (§3.2, p.154:9): to compare type schemes, "we will need to solve problems
  of the form ∀Y.∃X. φ(X,Y) ≡B ψ(X,Y)". This is treated as unification with
  flexible X and rigid Y. SVE is run "in the Boolean Algebra, whose elements are
  formulas over the rigid symbols Y". The base-case test `f == F` becomes `f(Y)
  ≡B F`, which is checked by SAT/validity. Example 3.6 (p.154:9): `x? ∧ y = z`
  has no unifier.
- S1 (§3.5, p.154:14): σ1 ⊑B σ2 iff ∀γ2.∃γ1. τ1 ≡B τ2. It is checked by
  unify(τ1(γ1?) = τ2(γ2)), with σ1's bound variables flexible and σ2's bound
  variables "(as well as all free type variables from the context) as rigid".
  This is used by rule W-Let-2 for annotated lets (Fig. 5).
- S1 (§3.5, p.154:15): Thm 3.15 states Algorithm W completeness and Cor. 3.16
  principal types. The proof needs mgus. Checking ⊑B "we need Boolean
  unification with constants, which is Π2P-complete [Baader 1998] … corresponds
  to a general QBF2 problem."
- S8 implements this. `ConstraintSolverInterface.visitSpec` marks a def's
  declared type parameters rigid while it solves the body's constraints.
  `Scheme.lessThanEqual` instantiates sc2, marks its type variables rigid, and
  solves sc1.base = tpe2. `SveAlgorithm.unify` eliminates only non-rigid
  variables. Its base case is `alg.isEquivBot(f)`, commented "unsatisfiable when
  all (rigid) variables are made flexible", which makes it a validity test over
  the rigids. In `EffUnification3.toSetFormula` the comment reads "A rigid
  variable is a constant."
- S7 (§5, fn. 6, p.8): skolem constants are used for higher-rank subsumption.
  Löwenheim is impractical "in the presence of skolem constants" because a
  particular solution cannot be guessed by 0/1 instantiation (example uR ∨ vR ≃
  w). Only SVE is practical.
- Hypotheses relating the rigids (like s∩t=∅): **none of S1, S2, S5, S7, S8
  handles them.** S1's ∀∃ has no premise. S8's lessThanEqual adds sc2's
  trait/equality constraints to the environment, not Boolean relations. S6 does
  cover it algebraically. A Boolean ring given by generators and relations B =
  ⟨c1..cn | w1..wk⟩ has its zero test given by Lemma 4.5 (§4, p.6): "p =B 0 iff
  p·W =E 0" with W = Π(wi+1). §5 (p.7) adds that this applies "equally well to
  terms with variables which are then interpreted as new free constants". SVE is
  stated for an arbitrary Boolean ring, and its base case is "a test whether
  f(x)=0 is valid in B" (§3.1, p.3). **[INF]** The SVE-with-rigid-constants
  scheme of S1/S8 would therefore carry over to ∀∃ problems whose rigid set
  obeys relations. That only takes swapping the base-case zero test for S6's
  Lemma 4.5 test. No type-system paper I read does this.

## Q-b. Unifiers as terms; unitarity

- S6 (§1 p.1; §3 pp.2–3): Boolean unification is unitary. Reproductive solutions
  are mgus (G = λx.F(G(x))). Thm 3.4 gives Boole's recursive mgu construction.
- S1 (Def. 3.1, Thm 3.2, Table 1; pp.154:7–8): mgus are substitutions to
  formulas. Examples include x ∧ y = F ↦ {x ↦ x ∧ ¬y}. Mgus are not unique even
  modulo ≡B, but the theory is unitary. Prop. 3.5 composes mgus sequentially. S2
  §4.1 (p.110:10) says the same thing.
- S5 (§2, p.~17:8): a concrete mgu with rigid-like s1, {s3 ↦ s1 +
  {Cst,Not,And,Or}}, mixing a variable with label constants. S7 §5 gives [u ↦ u,
  v ↦ v ∨ ¬u].
- S8 `SveAlgorithm` comment (sveAllPerComponent): every binding is `x -> se(t0)
  or (x and not se(t1))`, mentioning only the component's flexible variables,
  "rigid variables, and constants", and "No fresh variables are introduced". So
  flexible variables are bound to Boolean combinations that include the rigids.
  **[INF]** For the dossier example this kind of solver would return some
  formula over r, s, t and u, v themselves, possibly not literally r∖s.
- S2 fn. 3 (p.110:17): formulas in Γ must be simplified (e.g. β ∨ ¬β to T)
  before generalization, or generalization is blocked. S9's abstract says let
  generalization and polymorphic recursion in Boolean-kinded HM were "limited or
  unknown" and contributes "equational generalization and semiunification in
  arbitrary Boolean rings" (abstract only).

## Q-c. The exact theory

- S1 §3.1 (p.154:7) and S2 §4.1 define formulas over T, F, β, ¬, ∧, ∨ with ≡B as
  equality under all valuations into B={T,F}. For variables-only formulas
  **[INF]** this coincides with the free Boolean algebra. S1 §3.2 explicitly
  moves to "arbitrary Boolean Algebras", namely formulas over the rigids.
- S5 §3.2 (p.17:10): set formulas over ∅, singleton labels {E.ℓ}, variables,
  complement, ∪, ∩. Complement "is well-defined, since a variant type is
  declared to have a fixed finite set of labels (which forms the universe)".
  Equivalence is under all valuations of variables by concrete label sets.
- S8 (current Flix effects, `set/SetFormula.scala` doc) distinguishes "elements,
  constants (fixed unknown sets), variables (unknown sets)". "The universe of
  elements is infinite so no finite set is equivalent to universe."
  `CofiniteIntSet`: finite or co-finite sets of an infinite universe. The solver
  works on Zhegalkin polynomials whose coefficients are CofiniteIntSets.
  `ZhegalkinExpr.isEmpty` relies on the representation being unique: "hence we
  can use a simple equality check". **[INF]** That is a free Boolean-ring
  extension of the finite/cofinite algebra by the unknowns. **[INF]** Of the
  sources, this is the closest match to "finite label sets in an infinite
  universe with specific-label atoms". The older S5 design needs a finite
  universe per enum.
- S6 Thm 3.2 (p.2): solvability and mgus can be computed in the finite
  subalgebra generated by the equation's constants and stay valid in any
  superalgebra.

## Q-d. Per-element types combined with the Boolean constraints

- No source attaches a type variable per label inside the Boolean algebra. S1
  §3.5 cites Boudet, Jouannaud & Schmidt-Schauss 1989: "the combination of a
  Boolean algebra and a free algebra still has a most general unifier". Its
  unify procedure (p.154:14) descends type structure and calls unify_B at
  Boolean positions (U-Arrow; App. A not read). That combines Boolean subterms
  *inside* types, not types indexed by Boolean elements.
- In S5, payload types are fixed per label by the nominal enum declaration
  (Σ(E.ℓ) in T-Choose, §3.5), so no per-label type unification arises. S2 tracks
  per-component nullity formulas on tuples (§4.3) but the component types are
  ordinary.
- Flix records are row-based and handled by a separate `RecordConstraintSolver`
  (S8, not read), not by Boolean unification. S5 §2/§7 presents restrictable
  variants and extensible records as complementary.
- S3, S9 and S10 could not be checked (abstract only).
