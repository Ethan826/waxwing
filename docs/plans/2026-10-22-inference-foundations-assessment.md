# Inference foundations: published conditions and Waxwing's evidence

Written 2026-10-21 at the author's request (research/division-campaign/
remedy/RESUME.md §2). **A bounded prior-art and planning assessment.**
It changes no compiler code, builds no prototype, adds no Lean proof
and adopts no language policy. Statements in §12 are proposals for
review, not authorized proof work.

The question: **which published conditions connect Waxwing's proved
constraint theory to sound, predictable inference, and which of them
has Waxwing established?**

Labels: **cited** (a source location), **proved** (a Lean-checked
Waxwing theorem, named), **checked** (a recorded run or test),
**argued** (reasoning here or in a cited document, not mechanized),
**proposed** (a design or statement awaiting review), **unresolved**
(no adequate argument yet). The matrix (§11) uses the five statuses the
author fixed: proved, argued, experimentally checked (the matrix's name
for checked), proposed, unresolved.

## 0. The answer in brief

- **What is established is a checking theory, not an inference
  theory.** For the research model, `openCharacterization` (proved)
  says when a *given* signature is valid (`ValidOpen`), and
  `cellOpenImpl` (proved) gives a sound but incomplete checker for it
  (`d5_refused`, proved). The published counterpart is checking an
  annotated binding against its declared type: OutsideIn(X)'s rule
  BindA, or entailment between constrained types in HM(X). None of the
  five sources derives principal inference from a validity
  characterization, and this document does not either.
- **The frameworks apply only after their hypotheses are checked for
  Waxwing's constraints.** HM(X) needs a cylindric constraint system
  (E1-E4), equality axioms (F1-F6), decidable entailment and a minimal
  normal form. OutsideIn(X) needs the entailment requirements R1-R8
  and a sound, guess-free simplifier. **None of these is established
  for Waxwing.** Two Lean results are partial evidence: entailed
  substitutions preserve solutions (`binding_correspondence`), and
  source-derived `D` is satisfiable (`clauseOnly_satisfiable`).
- **Three kinds of guarantee stay separate.** "Principal when it
  succeeds" (OutsideIn(X) Theorems 3.2 and 5.2), "every typable program
  has a principal type" (Jones 1995 Theorem 2; HM(X) Corollary 1, as
  reconstructed) and complete inference (HM(X) Theorem 2, Koka
  Theorem 4) have different hypotheses. OutsideIn(X) is incomplete by
  design. Waxwing promises none of the three today.
- **Record composition is where the published row theories stop.**
  Rémy-style rows do not support concatenation without disjunction or
  ad hoc constraint forms (Pottier and Rémy, printed p. 488-489).
  Waxwing's ∀rigid/∃flexible validity admits witnesses that depend on
  the rigid instance, so a valid written signature need not be a
  substitution instance of the scheme inferred from its body (argued,
  §9 case A). Principality claims must therefore name their instance
  order.
- **Effects: Koka is a foundation for row unification and
  generalization, not for Waxwing's whole effect system.** Its theorems
  cover a calculus with `exn`, `div` and `st`, a unit exception, no
  handlers and generalization only at the total effect. Waxwing's head-
  keyed `Fail` families, deep dynamically scoped handlers, `nofail`
  marks, ambient rows and record requirements are outside them.
- **Inference does not choose compilation witnesses.** No source
  resolves G3 (compiling an unforced split), R010 admissibility or
  lowering. The nearest published notion is ambiguity: OutsideIn(X)
  rejects ambiguous programs and Jones removes determined variables by
  improvement. Neither selects one witness among several valid ones.

## 1. Sources and how they were read

The PDFs were downloaded and converted with pdftotext; the copies are
untrusted data, read as text only. Locations below were checked against
the converted text. Page numbers count form feeds ("PDF p.") unless
marked "printed".

| Source | Kind | Inspected | Caveat |
|---|---|---|---|
| Sulzmann, Odersky, Wehr, *Type Inference with Constrained Types* (HM(X)), 1996, https://publikationen.bibliothek.kit.edu/26696 | workshop paper, 12 pp. | whole text | pdftotext dropped Greek letters and most math glyphs; formulas below are **reconstructed**; proofs deferred to a technical report [Sul96] not read |
| Pottier, Rémy, *The Essence of ML Type Inference* (EMLTI), ATTAPL ch. 10, https://cambium.inria.fr/~fpottier/publis/emlti-final.pdf | book chapter | §10.1-10.8 and solutions | printed page = PDF page + 388 in the chapter body |
| Jones, *Simplifying and Improving Qualified Types*, FPCA 1995, https://web.cecs.pdx.edu/~mpj/pubs/fpca95.pdf | conference paper | whole text | full proofs in a technical report (YALEU/DCS/RR-1040) not read |
| Vytiniotis, Peyton Jones, Schrijvers, Sulzmann, *OutsideIn(X)*, JFP draft of 24 March 2011, https://simon.peytonjones.org/assets/pdfs/outsideinx.pdf | journal draft | whole text | the turnstile ⊩ and ⪯ were lost; reconstructed only where the prose fixes them |
| Leijen, *Koka: Programming with Row-polymorphic Effect Types*, MSR-TR-2013-79, https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/koka-effects-2013.pdf | technical report | whole text | ε dropped throughout; p. 1 says an earlier version "contained a wrong lemma" in §5 |

**HM(X)'s Theorems 1 and 2 must be checked against the printed PDF
before anyone relies on them.** As reconstructed: Theorem 1
(soundness, PDF p. 6) says that if algorithm W derives ψ; C; Γ ⊢W e : τ
then C; ψΓ ⊢ e : τ (a second conclusion line is unrecoverable).
Theorem 2 (completeness, PDF p. 6-7) says that whenever a logical
derivation C′; Γ′ ⊢ e : σ′ exists under a suitable instance of the
context, W succeeds and its generalized result is at least as general
as σ′. Corollary 1 (principal types, PDF p. 7) specializes this to a
closed context.

Not read, though cited by Waxwing documents: Jones, *Coherence for
Qualified Types* (linked from the assurance register), and Leijen's
scoped-labels paper, to which Koka defers its unification proofs.

## 2. Waxwing's starting point

Facts the assessment maps against (cited):

- **Signatures are mandatory; `let` and lambdas are monomorphic**
  (docs/language.md, opening paragraph, Functions, Effects "`let` is
  monomorphic"). A declaration's own type variables and record rows are
  rigid; each use of a callee gets fresh flexible copies (ADR 007,
  Typing). So today Waxwing checks declarations against written
  schemes and infers only monomorphic local types. There is no
  generalization step.
- **R0, generate-then-decide** (dossier §18.66 decision 1). The
  recorder is a pure, total, syntax-directed function of the resolved
  declaration (r0/recorder-rules.md §1, §2.4, proposed). One
  quantifier level per declaration: rigid variables universal,
  flexible ones existential and dependent on every rigid one
  (recorder-rules §5.1, proposed). The online solver is a search
  strategy and never returns a verdict (r0/generation-interface.md §1,
  G-search).
- **The problem's meaning is `ValidOpen`** of ⟨rigid variables, `D`,
  `B`⟩ (requirements.md §1; Typed/Bridge/Valid.lean:17). Requirement
  atoms (`pr`, `cmp`) are recorded, but their semantics `ValidOpenR` is
  unstated (requirements §11 item 2).
- **Effect rows are erased by the recorder** (recorder-rules §2.2).
  The independence of effect checking from record solutions is an
  assumption (requirements §11 item 13).
- **Proved, research model** (paths under research/composition-proofs/
  Composition/): `openCharacterization` and
  `openCharacterization_scoped` (Typed/Bridge/
  ProofInstantiateSound.lean:45, 60); `d3bExistsWithin` and
  `mguExists` (Typed/Universality.lean:111, Typed/MGUExists.lean:80);
  `cellOpenImpl` (Typed/Cell/Proofs/Main.lean:44); `d5_open` and
  `d5_refused` (Typed/Cell/Proofs/W7/Divide5.lean:98, 103);
  `decideCall_correct` (Unify/Decider.lean:82); `subst_sat` and
  `binding_correspondence` (Binding.lean:100, 110);
  `clauseOnly_satisfiable` (Sig/SourceCampaign.lean:82).
- **Boundaries stated by the author** (dossier §18.44, §18.46): the
  characterization establishes neither principal inferred types, nor
  completeness of source-level inference, nor correct compilation, nor
  an executable decision procedure.

## 3. Generation and solving, generalization, recursive groups

**What the sources establish (cited).**

- EMLTI separates the two. Constraint generation ⟦t : T⟧
  (Fig. 10-9, printed p. 431) is sound and complete for any X
  (Theorems 10.4.4 and 10.4.8, printed p. 433-434). Completeness
  assumes C ⊩ ∃Γ and fpi(C, Γ) = ∅. A `let` emits a constraint
  abstraction `let z : ∀X[⟦t1 : X⟧].X in …`, so generation never
  chooses which variables to generalize. But "constraint solving,
  however, cannot be independent of X" (printed p. 406): the solver,
  which interleaves generalization with unification (rule S-Pop-Let,
  printed p. 445), is proved correct only for an equality-only free
  tree model (printed p. 438; Lemmas 10.6.8-10.6.10, printed
  p. 449-450).
- HM(X)'s algorithm W interleaves the two: each rule combines its
  premises' constraints and normalizes them (§4.2, PDF p. 5).
  Generalization `gen` puts the whole normalized constraint into the
  scheme and carries its projection ∃ᾱ.C outward (Definition 12, PDF
  p. 12).
- OutsideIn(X) generates, then solves each top-level binding
  separately (§3.4-3.5, PDF p. 16-17). Local unannotated `let`s are not
  generalized (NoGen, §4.2.4, PDF p. 32).
- Koka is algorithm W with row unification (Fig. 5, PDF p. 7).
  Generalization happens only after the bound expression's effect is
  unified with the empty row (LET_i, PDF p. 7), "essentially the
  equivalent of the value restriction in ML" (PDF p. 7).

**Recursive groups.** HM(X) has no recursive binding (its core grammar
and Figures 2 and 4 have none). OutsideIn(X)'s text never uses the word
"recursion". EMLTI treats `letrec` as `fix`, with the bound function
monomorphic inside its own definition (Exercise 10.7.6, printed
p. 452), and notes that inferring polymorphic recursion is equivalent
to semi-unification, which is undecidable (printed p. 452). Koka types
recursion through a `fix` primitive whose effect includes `div` (Fig. 3,
PDF p. 6-7).

**Waxwing (argued unless marked).** Decision 1 matches EMLTI's and
OutsideIn(X)'s split: generation emits no verdict, and solving is a
replaceable strategy. Because every declaration has a written scheme,
recursion today is checked against declared schemes, and polymorphic
recursion needs no inference. R010 restricts it only so that
specialization terminates (ADR 007, "The instantiation rule"). Two
gaps open when inference arrives (INF001 B1, B6):

1. **A generalization step.** Inferred effect and error rows of named
   functions need a rule for which residual constraints enter the
   scheme (§4), with EMLTI's constraint abstraction as the closest
   published design.
2. **Recursive groups without written rows.** The published options
   are monomorphic recursion inside the group (EMLTI) or required
   annotations. Inference of polymorphic recursion is excluded by the
   semi-unification result.

A third gap is local: effect rows are erased from the recorded problem,
so R0 gives no complete-problem generation for INF001's channels yet.

## 4. Residual constrained schemes

**What the sources establish (cited).**

- HM(X): schemes σ ::= τ | ∀α.C ⇒ σ (§4.1, PDF p. 4). The (∀ Intro)
  rule has no satisfiability side condition (Fig. 2, PDF p. 4).
  Unsatisfiability propagates to the conclusion (Lemmas 8 and 9, PDF
  p. 7), so "it does not matter whether we test the satisfiability of
  constraints during or after type inference" (PDF p. 7).
- EMLTI: rule hmx-Gen (Fig. 10-7, printed p. 423) and law C-LetAnd
  (Fig. 10-6, printed p. 418) keep the part of a constraint that does
  not mention the generalized variables outside the scheme. The solver's
  S-Pop-Let makes the same split, and Lemma 10.6.10 (printed p. 450)
  proves it exists.
- OutsideIn(X): an unannotated top-level binding quantifies over its
  flat residual (rule Bind, Fig. 7, PDF p. 19; Fig. 12, PDF p. 38). It
  may not quantify over implication constraints (PDF p. 41). An
  annotated binding must be solved completely, with no residual (BindA,
  PDF p. 41). The concrete simplifier fails on obviously inconsistent
  constraints rather than quantify over them (§7.3, PDF p. 56).
- Jones: predicates such as `r has l : t`, `r lacks l` and `r1 # r2`
  (disjoint fields) are ordinary residual predicates (Fig. 1, PDF p. 2).

**Waxwing today (cited).** A signature's `where` clause can hold only
`lacks` and `disjoint` on its own record rows (language.md, Records;
recorder-rules §3.1, G4-G7). Several tails in one record imply pairwise
disjointness (G7). Contract requirement atoms have no syntax (G9). The
cell checker's guard is the same fragment (`LDFragment`,
Sig/SchematicDefs.lean:18). Equations in declarations are deferred
(dossier §18.54 item 2).

**What retaining a relationship needs (argued; §9 gives the example).**
A scheme can retain a composition today when the relationship is a
multi-tail record type plus `lacks`/`disjoint` atoms. It cannot retain
an equation between compositions, such as `{ ...a, ...b } = { id: Int,
...w }`, nor a requirement atom. **Not every residual constraint can be
exported**, so an inference design must either widen the scheme
language, refuse to generalize such declarations (OutsideIn(X)'s answer
for implications), or demand an annotation.

Exporting new atom forms has two consequences already visible in the
proofs:

- **Satisfiability is no longer free.** `clauseOnly_satisfiable`
  (proved) gives a finite rigid assignment satisfying any clause-only
  `D`, which is what makes body refutations meaningful (refute/
  statements.md §5, "Why a condition on `D`"). An exported equation
  removes that guarantee: a scheme with unsatisfiable `D` is vacuously
  valid. A satisfiability test at generalization becomes an obligation,
  as in OutsideIn(X)'s consistency check.
- **The checker's guard refuses them.** A `D` with equations is
  outside `LDFragment`, so the cell strategy answers Unresolved. The
  characterization itself needs only `Scoped` (every `D` variable rigid,
  Sig/Validity.lean:33) and fresh labels, so it still states what
  validity means (argued from the statement of
  `openCharacterization_scoped`).

## 5. Simplification and improvement

**What the sources establish (cited).**

- HM(X): "simplifying means changing the syntactic representation of a
  constraint without changing its denotation" (PDF p. 1); equivalence is
  mutual entailment (Definition 1, PDF p. 3). Normalization must exist
  and be minimal (Definition 8, PDF p. 5). Termination and minimality of
  the generic procedure are not proved in the paper; for System O they
  are deferred to [WO96] (PDF p. 10).
- Jones: rule (Simp) replaces a predicate set by any equivalent one
  (§3, PDF p. 3); "the only condition that a simplifying function must
  satisfy is that P ⇔ (simp P)" (§7, PDF p. 9). Rule (Imp) applies a
  substitution S when S improves P: ⌊P⌋ = ⌊SP⌋, the satisfiable
  instances are unchanged, and S introduces only new variables (§4.1,
  PDF p. 4). With improvement the algorithm is no longer complete for
  the ordinary instance order (§5, PDF p. 6); Jones moves to the
  satisfiable-instance order ≤sat, which "is not preserved by
  substitution" (footnote 3, PDF p. 6).
- OutsideIn(X): a solution (Qr, θ) is sound when Q ∧ Qg ∧ Qr ⊩ θQw
  (S1) and guess-free when, in addition, Q ∧ Qg ∧ Qw ⊩ Qr ∧ Eθ (P1),
  where Eθ is θ read as equations (Definition 3.2, PDF p. 20). Only
  touchable variables may be unified (PDF p. 37). The algorithm is
  "conservative: there may exist constraints that admit a unique
  solution, which it may fail to solve" (PDF p. 37).
- EMLTI: equivalence laws (Fig. 10-6, printed p. 417-418); C-LetAll
  needs a determinacy side condition (Definition 10.2.14, printed
  p. 417; Example 10.2.16 shows the law fails without it).

**Waxwing (cited and proved where marked).**

- **Entailed substitutions preserve solutions:**
  `binding_correspondence` (proved, Binding.lean:110). If every
  solution of `C` satisfies σ's equations, then `C` and `eqs σ ∧ Cσ`
  have the same solutions. This is OutsideIn(X)'s P1 condition, and
  Jones's improvement condition, for equational bindings over the
  model's atoms.
- **The boundary of refusals.** C1-E (an entailed substitution
  followed by a clash refutes the signature) is expected true; C1-X
  (the same after any substitution) is expected false, refuted by
  example X6 (refute/statements.md §5; neither is proved). A
  contradiction reached through a guessed binding is not evidence.
- **Which solver steps are guess-free.** `shareTails`'s binding is
  most general on labels, whatever the field types (statement P1,
  argued; refusal-audit.md §4). With a rigid tail beside an unknown it
  would not be (P2, checked in the bounded model), but that case is
  unreachable today (P3, argued, not instrumented). Rule H assumes an
  indivisible rigid row and rejects valid programs (`route`, c01, b03,
  checked; class d).

**Consequence (argued).** Under decision 1 a non-entailed step is a
search choice, which is harmless for validity because a candidate is
re-checked. For an **inferred scheme** it is not harmless: a
non-entailed step exports a less general scheme. Any simplifier used to
produce exported schemes needs a guess-free condition stated over
Waxwing's semantics. That semantics quantifies over injective base
extensions (`ValidOpen`), which resembles OutsideIn(X)'s open-world
stance (a solution must remain "a unique principal solution with
respect to any consistent extension of the axiom set", PDF p. 38). The
analogy is not a theorem.

## 6. Generalization, ambiguity and principality

**Three guarantees, kept apart.**

| Guarantee | Published form | Hypotheses | Waxwing |
|---|---|---|---|
| Principal when it succeeds | OutsideIn(X) Theorem 3.2 (PDF p. 23) and 5.2 (PDF p. 46) | R1-R8 (Fig. 3, PDF p. 14); guess-free simplifier (Fig. 8, PDF p. 21; Fig. 15, PDF p. 42); fuv(Γ) = ∅ | not promised; no simplifier shown guess-free |
| Every typable program has a principal type | Jones 1995 Theorem 2 (PDF p. 7); HM(X) Corollary 1 (PDF p. 7, reconstructed); EMLTI's generation theorems read as principality (printed p. 430) | Jones: TV(A) = ∅, P0 sat, no redundant `let`s; HM(X): Definitions 1, 2, 6, 8 and a closed context | not promised; instance order undefined (§9) |
| Complete inference | HM(X) Theorem 2 (PDF p. 6-7, reconstructed); Koka Theorem 4 (PDF p. 8) | HM(X): as above, proofs in [Sul96]; Koka: completeness against its syntax-directed rules, proofs "entirely standard", unification proofs deferred to [14] | not promised; the cell checker is incomplete (`d5_refused`) |

OutsideIn(X) says plainly that Theorem 3.2 "says nothing about the
situation where the algorithm fails to produce a type, or the
simplifier does not terminate — that is, it says nothing about
completeness" (PDF p. 23), and that "the absence of completeness is by
design" (PDF p. 51). EMLTI calls a sound and complete generator "the
analog of the existence of principal type schemes" (printed p. 430), but
its principal solved forms exist only for equality models (Lemmas
10.2.19 and 10.2.21, printed p. 421-422).

**Two inferences this document does not make.**

1. **Decidable validity does not supply principal inference.**
   `openCharacterization` decides nothing executable (§18.46), and even a
   decision procedure for `ValidOpen` would only check a given
   signature. Principal inference also needs a space of candidate
   schemes, an instance order and a proof that one inferred scheme is
   above every other.
2. **A generic framework does not apply before its hypotheses are
   checked.** For HM(X): the cylindric axioms E1-E4 (Definition 2, PDF
   p. 3), the type-constraint axioms F1-F6 (Definition 6, PDF p. 4),
   decidable entailment (Definition 1, PDF p. 3) and the existence of a
   minimal normalization (Definition 8, PDF p. 5). For OutsideIn(X):
   R1-R8 and a sound, guess-free simplifier. For Waxwing's constraint
   domain with ∀rigid/∃flexible validity none of these is stated, let
   alone proved. `subst_sat` and `binding_correspondence` bear on F4
   and F6 for the model's atoms; `mguExists` gives a finite most general
   unifier per pattern and cell list, not one normal form per problem.

**Ambiguity (cited, then argued).** Jones calls a type ambiguous when a
variable appears left of ⇒ but not right of it (§4.3, PDF p. 5), and
improvement can remove the ambiguity when the variable is determined
(same page). OutsideIn(X) rejects ambiguous programs because their
meaning "may be affected by the arbitrary choices the type checker
makes" (§6.1, PDF p. 47), and cites Stuckey and Sulzmann's determinacy
condition as "the only condition we know of in the literature that
effectively eliminates ambiguity" (Definition 9.1, PDF p. 77). EMLTI's
determinacy (Definition 10.2.14) is the same idea.

For Waxwing, ambiguity appears in two places:

- **Holes.** P001's representative (Int) is valid because no
  constraint mentions a hole (ADR 007, Holes, condition 1); the
  property is tested (test/poly-properties.test.mjs). With residual
  constraints that condition fails, and the proposed hole contract
  (witness/statements.md §1.5) or a determinacy rule replaces it. C001
  holds its unknown-type rule open (c001-explicit/README.md, ruling 2).
- **Splits.** Whether every valid split behaves alike is "forcedness"
  (G3; requirements §5.1, §11 item 5). It is the record analogue of
  coherence, and no source settles it (§10).

## 7. Evidence and elaboration

**What the sources provide (cited).**

- OutsideIn(X) describes GHC's elaboration: solving "generates an
  evidence term that encodes the proof, and decorates the program with
  this evidence term, a process known as elaboration", into a typed
  core (§8.1, PDF p. 70). **No formal evidence-translation theorem**
  was found.
- HM(X) mentions evidence only when describing Jones (PDF p. 2) and
  gives no translation, elaboration or coherence result.
- Jones 1995 never uses the words "evidence", "dictionary" or
  "translation". Its guarantees are about typing judgments only.
- EMLTI has no elaboration; its only translation (HM(=) to Damas-
  Milner, Theorem 10.3.7) omits details "due to lack of space".
- Koka gives no translation; "a proper monadic semantics" is future
  work (§8, PDF p. 12).

So the sources supply typing conditions and a description of
elaboration, not a theorem that elaborated programs mean what the
source means.

**Waxwing (cited, then argued).** C001 chose explicit structural
dictionaries (records of functions) with no instance search
(c001-explicit/README.md, rulings 1 and 4). Its assurance gates include
elaboration typing and explicit selection: "each method use observes
the dictionary value supplied to that lexical operand"
(c001-explicit/assurance.md). With no search there is no
solver-chosen dictionary, so Jones-style coherence of instance choice
does not arise for dictionaries. Two obligations remain for inference:

- **Inference must not rewrite explicit choices.** Simplification or
  improvement that unifies the type of a dictionary operand must not
  change which value is used, and no defaulting rule may stand in for a
  missing operand. This is C001's explicit-selection gate restated for
  an inferring checker (argued).
- **Row constraints are discharged by specialization, not by passing
  evidence at run time.** ADR 013 declined dictionary passing for open
  rows ("Alternatives considered"). The record analogue of evidence is
  the per-name witness evaluated at each specialization key (decision
  4; witness/statements.md §1, §4: K, V, Lay, Adapt-N, all proposed),
  narrowed by the ground re-check (RC1-RC5, proposed). No source covers
  this route.

## 8. Effects: what Koka establishes and where Waxwing differs

**Koka's results and their hypotheses (cited).**

| Result | Statement (paraphrase) | Location | Hypotheses and gaps |
|---|---|---|---|
| Theorems 1-2 | syntax-directed rules sound and complete for the declarative ones | PDF p. 7 | proofs claimed "straightforward", not given |
| Theorems 3-4 | the algorithm is sound and complete for the syntax-directed rules | PDF p. 8 | proofs "entirely standard", not given; row unification's soundness, completeness and termination "carry over directly" from [14] |
| Theorem 5 | semantic soundness: a closed well-typed term diverges or reduces to a well-typed answer | PDF p. 9 | closed terms; δ-typability assumed for constants |
| Theorem 6 | if `exn` ∉ ε, no uncaught exception | PDF p. 11 | exceptions carry unit; `catch` removes one head `exn` |
| Theorem 7 | if `st⟨h⟩` ∉ ε, the term diverges or ends in a value or a thrown value, with no heap left | PDF p. 11 | printed "Iff", apparently a typo |
| Theorem 8 | if `div` ∉ ε, the term terminates | PDF p. 11 | proof by logical relations, sketched, over a monomorphic environment; relies on `(!)` carrying `div` |

The formal calculus restricts effect constants to `exn`, `div` and `st`
(PDF p. 6). Generalization requires the total effect (GEN, Fig. 3, PDF
p. 6-7). The row unifier's check that the tail is not yet bound "is
subtle but necessary to guarantee termination" (PDF p. 8). Koka
rejects a union operator on rows because unification constraints "cannot
be solved uniquely" (PDF p. 2). **Not covered:** handlers of any kind
beyond `catch` and `run`; record concatenation or disjointness;
requirements or services; a monadic or other translation.

**Where Waxwing differs (cited from ADR 010, language.md Effects;
consequences argued).**

- **Shared ground.** Waxwing's effect rows are ordered with
  first-occurrence matching (Leijen's scoped labels) and adopt Koka's
  tail side condition (ADR 010, "Rows, labels and signatures";
  regression row `fx-side-condition`, scripts/regression-fx.mjs).
- **Failure families.** `Fail` labels are keyed by the payload's
  declared head, so `Fail(Error(Int))` and `Fail(Error(Bool))` share a
  key (language.md, Rows). Koka has one `exn` carrying unit. A
  Waxwing analogue of Theorem 6 would be per family and would have to
  handle shared keys (INF001 B5); none is stated.
- **Handlers and cleanup.** Waxwing's handlers are deep and dynamically
  scoped, `defer` runs on every exit, and FX008 tracks whether a frame
  can abort through `nofail` marks solved as a path check on a
  two-point lattice (ADR 010, "FX008 refinement: marks"). Koka 2013 has
  none of these, so its theorems do not cover them; the
  source-traceability record already warns against certifying FX008
  by citing Koka.
- **Ambient rows.** Every Waxwing signature has an implicit rigid
  ambient row that passes callbacks' effects through but cannot absorb
  a function's own undeclared effects (INF001, "Baseline"; ADR 010).
  INF001 must change this deliberately; Koka's open-row inference is a
  candidate foundation for that change, not a description of today.
- **Generalization.** Koka generalizes only at the total effect.
  Waxwing's named functions are values, so that side condition is met
  for them (argued); local generalization is unplanned (assurance
  register, "Local generalization").
- **Records are not effect rows.** Waxwing records use disjoint
  composition and forbid duplicate labels; ADR 013 rejected scoped
  labels for records. Koka's principal-unification argument for rows
  rests on duplicates being allowed (§2.4, PDF p. 3), so it does not
  transfer to records.
- **Requirements.** `pr` and `cmp` atoms (printability, comparability)
  are typing obligations with no Koka counterpart, and their semantics
  `ValidOpenR` is unstated.

## 9. Illustration: retaining a row relationship without a split

The syntax in this section is **illustrative**: it is not Waxwing and
is not proposed. `∀ … (D) ⇒ τ` is a constrained scheme in HM(X) style.

**Case A: expressible in today's signature language.** The `divide5`
architectural test (requirements.md §7) has a callee

```text
file(doc: { ...u, ...t, ...q }, inbox: { ...s }, archive: { ...s2 })
  where u disjoint s, t disjoint s2, q lacks { id }
```

If `submit`'s scheme were inferred from its body `file(doc, inbox,
archive)`, the result would retain `file`'s relationships on the
caller's own variables and never introduce a single row `r`:

```text
submit : ∀ u t q s s2.
  (u disjoint s, t disjoint s2, q lacks { id })   -- writable today
  ⇒ ({ ...u, ...t, ...q }, { ...s }, { ...s2 }) -> Unit
-- u, t, q pairwise disjoint: implied by the three-tail record
```

Every atom here can be written in a Waxwing `where` clause today, though
checking such signatures still stops at the R005B placeholder
(language.md, "Tranche B, Task 2"). No split is chosen inside
`submit`; its callers supply `u`, `t` and `q`.

This exposes the question of order (argued). The author's written
signature `submit(doc: { ...r }, inbox: { ...s }, archive: { ...s2 })
where s disjoint s2` is valid (requirements §7: argued equivalent to
`divide5Sig [id]`, for which `d5_open` is proved). Yet no substitution
of written record expressions over `r`, `s`, `s2` for `u`, `t`, `q`
makes the written signature an instance of the inferred one. Record
syntax has no "r restricted to labels outside s"; `without` removes
written labels only. So under the substitution-based instance order of
HM(X) (Fig. 3, PDF p. 5) and OutsideIn(X) (Definition 3.3, PDF p. 22)
the inferred scheme is not more general than a valid written one, while
at every ground key each instance of the written signature is an
instance of the inferred scheme. **Any principality statement for
Waxwing must say which order it uses.**

**Case B: needs more expressiveness.** With written callees

```text
merge(x: { ...a }, y: { ...b }): { ...a, ...b } where a disjoint b
stamp1(x: { id: Int, ...w }): Unit
```

an unannotated `fn stamp(doc, extra) = stamp1(merge(doc, extra))`
records `{ ...a′, ...b′ } = { id: Int, ...w′ }` over flexible copies
(recorder-rules E5). Retaining it without choosing which side holds
`id` gives

```text
stamp : ∀ a b w.
  (a disjoint b, { ...a, ...b } = { id: Int, ...w })
  ⇒ ({ ...a }, { ...b }) -> Unit
```

Choosing instead `a = { id: Int, ...a1 }` or `b = { id: Int, ...b1 }`
gives two incomparable, less general schemes, the situation EMLTI
describes for Wand's rows ("a four-way disjunction", printed p. 488)
and OutsideIn(X) for programs with two incomparable types (§2.2-2.3,
PDF p. 8-10).

**Expressiveness case B requires (argued):**

1. **An equation atom between compositions in `where`.** Today only
   `lacks` and `disjoint` are writable; equations in declarations are
   deferred (§18.54 item 2). Jones's `has` over a composition would
   also serve, but Jones's table has `has` only on a row variable
   (Fig. 1, PDF p. 2).
2. **A variable that occurs only in constraints.** `w` is ambiguous by
   Jones's syntactic test (PDF p. 5) but determined by `a` and `b` when
   `{ ...a, ...b }` holds `id`. A determinacy-based rule (EMLTI
   Definition 10.2.14; Stuckey and Sulzmann, OutsideIn(X) PDF p. 77)
   and the hole contract are needed.
3. **A satisfiability check for the exported `D`.**
   `clauseOnly_satisfiable` no longer applies. This `D` is satisfiable
   (`a = { id: Int }`, `b = w = {}`); in general a check is required
   (§4).
4. **A checker beyond `LDFragment`.** The scheme is `Scoped` (every
   `D` variable is a signature variable), so the characterization
   states its validity; the cell checker refuses it as outside its
   guard, giving Unresolved.

**What retention does not settle.** Retaining the relationship moves
the split to call sites. There it can still be unforced: a caller
holding a ground record `{ x, y }` with `s = s2 = {}` has three valid
splits into `u`, `t`, `q` (requirements §5.2, corrected table). G3
remains.

## 10. Inferring a valid contract versus choosing a compilation witness

**The sources stop at types (cited).** Every result above concerns
typing judgments, schemes and, informally, evidence terms. None
mentions specialization keys, monomorphization termination, record
layouts or the choice among valid splits. The nearest notion is
ambiguity: OutsideIn(X) rejects programs whose meaning could depend on
a checker's choice (PDF p. 47), and Jones resolves determined variables
by improvement (PDF p. 5). Neither selects one witness among several
valid ones.

**Waxwing keeps four layers apart** (r0/boundaries.md §1, proposed):
V, the verdict on the complete problem (validity plus requirement
atoms); P, admission (decision 3, G3's selection contract); A,
admissibility (R010 on the single-tail baseline, decision 2); S,
support and limits. A strategy may establish validity without a
witness, and that cannot authorize lowering (decision 4;
witness/statements.md §1.6, `NoWitness`).

**So (argued):** an inference design can deliver V for inferred
contracts at most. It cannot resolve G3, because forcedness is a
property of all solutions and the literature's answer to non-forced
choices is rejection. It cannot resolve R010, because specialization
termination (FK-0, FK-W, proposed) is about reachable keys, not types.
It cannot resolve lowering, because layout correspondence (Lay,
Adapt-N, proposed) is about witness values.

## 11. Obligations matrix

One status per row. "Proved" names a Lean-checked Waxwing theorem;
paths are under research/composition-proofs/Composition/. Page
references are those of §1.

| # | Published requirement (location) | Waxwing interpretation | Existing evidence | Remaining gap | Next action | Status |
|---|---|---|---|---|---|---|
| O1 | Sound and complete constraint generation for any X (EMLTI Thms 10.4.4, 10.4.8, printed p. 433-434) | the R0 recorder's problem is valid iff the declaration is well typed | recorder-rules §2.4 G-total, G-local, G-dead (proposed); acceptance tests stated, not run | no declarative Waxwing typing relation to correspond to; effect rows erased | state IF1 after a declarative relation for the record fragment exists | proposed |
| O2 | Decidable entailment (HM(X) Def. 1, PDF p. 3) | deciding `ValidOpen`, i.e. `D ⊩ ∃flex. B` | `openCharacterization` (Typed/Bridge/ProofInstantiateSound.lean:45) characterizes; `cellOpenImpl` sound; `d5_refused` incomplete; `decideCall_correct` decides satisfiability only | no executable decision procedure (§18.46) | none now; executable construction is a separate authorized step | unresolved |
| O3 | Cylindric system E1-E4 and type axioms F1-F6 (HM(X) Defs. 2, 6, PDF p. 3-4, reconstructed) | ∃ over flexible variables; `eq` atoms | `subst_sat`, `binding_correspondence` bear on F4, F6 | axioms unstated for Waxwing's Sat-entailment | state IF2; check the printed PDF first | unresolved |
| O4 | A minimal normalization exists (HM(X) Def. 8, PDF p. 5) | one most general residual per declaration | `mguExists` (Typed/MGUExists.lean:80): finite mgu per pattern and cell list | per-pattern, not per problem; §9 suggests none in written syntax | state IF4 with an explicit order | unresolved |
| O5 | Entailment requirements R1-R8 (OutsideIn(X) Fig. 3, PDF p. 14) | Waxwing's semantic entailment | R1, R2 hold for any semantic entailment | R3 (substitution) and R8 (substitutivity) unstated | include in IF2 | argued |
| O6 | Improvement preserves satisfiable instances (Jones §4.1, PDF p. 4); guess-free P1 (OutsideIn(X) Def. 3.2, PDF p. 20) | an entailed binding preserves the solution set | `binding_correspondence` (Binding.lean:110) | rows: field types and composition beyond equations | reuse in IF3 | proved |
| O7 | A sound, guess-free simplifier (OutsideIn(X) Fig. 8, PDF p. 21; Fig. 15, PDF p. 42) | solver steps used for exported schemes are entailed by original atoms | `shareTails` P1 (refusal-audit §4); rule H known not guess-free (checked rejections) | no simplifier stated; P3's reachability not instrumented | state IF3 | argued |
| O8 | Simplification needs only equivalence (Jones (Simp), §3, PDF p. 3; §7, PDF p. 9) | normalizing a recorded problem keeps its meaning, definedness atoms included | recorder-spec §5.3 normalization; C1-M `ValidOpenAntitone` stated (Typed/Refute/Rules.lean:44), expected true | not proved | prove C1-M when CX's statements are approved | proposed |
| O9 | Satisfiability may be tested during or after inference (HM(X) Lemmas 8-9, PDF p. 7); reject obviously inconsistent constraints (OutsideIn(X) §7.3, PDF p. 56) | source-derived `D` is satisfiable | `clauseOnly_satisfiable` (Sig/SourceCampaign.lean:82) | exported equation atoms (§9 case B) fall outside it | state IF5 | proved |
| O10 | Principal when it succeeds (OutsideIn(X) Thms 3.2, 5.2, PDF p. 23, 46) | an accepted inferred scheme is most general | none | needs O5, O7 and an instance order | decide whether INF001 promises it | unresolved |
| O11 | Principal satisfiable types (Jones Thm 2, PDF p. 7; TV(A) = ∅, no redundant `let`s) | every typable declaration has a principal inferred scheme | none; §9 case A suggests order-dependence | instance order; record composition | IF4 first | unresolved |
| O12 | Complete inference (HM(X) Thm 2, PDF p. 6-7, reconstructed; Koka Thm 4, PDF p. 8) | the inferring checker accepts every specified program | `d5_refused` shows the cell checker incomplete | completeness not promised anywhere | record as an explicit non-goal or a separate claim (register) | unresolved |
| O13 | Recursion monomorphic inside its definition (EMLTI Ex. 10.7.6, printed p. 452); polymorphic recursion inference undecidable (same page) | inferred rows in a recursive component are shared within it, or written | signatures make today's recursion checked, not inferred | INF001 B6 termination | state IF8 | proposed |
| O14 | Generalize only at the total effect (Koka GEN, Fig. 3, PDF p. 6-7) | named functions are values; `let` and lambdas stay monomorphic | language.md Effects ("`let` is monomorphic") | local generalization unplanned | none until local generalization is designed | argued |
| O15 | Row unification terminates with the tail side condition (Koka Fig. 6, PDF p. 7-8) | effect-row unification | ADR 010; regression row `fx-side-condition` | proof deferred by Koka to [14], not read | read [14] when INF001's design starts | experimentally checked |
| O16 | No uncaught exception when `exn` ∉ ε (Koka Thm 6, PDF p. 11) | no uncaught abort of a `Fail` family absent from the row | test/fx-*.test.mjs, test/fx008-*.test.mjs, oracle interpreters (language.md Effects) | per-family statement with shared keys and marks | state IF7 | experimentally checked |
| O17 | Ambiguous types rejected or determined (Jones §4.3, PDF p. 5; OutsideIn(X) §6.1, PDF p. 47; Def. 9.1, PDF p. 77) | holes and constraint-only variables are determined, or behavior is independent of them | ADR 007 holes; test/poly-properties.test.mjs; hole contract (witness §1.5) | residual constraints break ADR 007's condition 1 | state IF6 | proposed |
| O18 | Elaboration into a typed core (OutsideIn(X) §8.1, PDF p. 70; no theorem in any source) | explicit dictionaries survive inference; per-name witnesses for rows | C001 assurance gates; witness §4 (K, V, Lay, Adapt-N) | no elaboration relation stated for inferred schemes | INF001 design states it (register row INF001) | proposed |
| O19 | Coherence of elaborations (Jones, *Coherence for Qualified Types*; cited by the register, not inspected here) | permitted elaborations agree in meaning | none | source unread; G3's forcedness is the record analogue | read the source before INF001's design review | unresolved |
| O20 | Concatenation needs disjunction or new constraint forms (EMLTI printed p. 488-489) | disjoint composition with its own validity theory | `openCharacterization`; `d3bExistsWithin` (Typed/Universality.lean:111) | a scheme-level (inference) account | IF4 | proved |
| O21 | Annotated bindings solved completely by one substitution (OutsideIn(X) BindA, Fig. 7, PDF p. 19; PDF p. 41) | Waxwing checks ∀rigid ∃flexible, witnesses may depend on the rigid instance | `d5_open` (Typed/Cell/Proofs/W7/Divide5.lean:98) | that no uniform written substitution exists for `divide5` is argued only | include in IF4 | argued |
| O22 | Termination of solving (OutsideIn(X) §7.7, PDF p. 67-69; EMLTI Lemma 10.6.8, equality model) | generation total; strategies under budgets; specialization keys finite | G-total (proposed); FK-0, FK-W (witness §2.4, proposed) | none proved | the termination stream, after statement review | proposed |
| O23 | None: no source addresses witness selection, R010 or lowering | G3, R010, Lay stay separate obligations | boundaries §1; requirements §5 | as recorded in requirements §11 | keep out of inference claims | unresolved |

Counts: proved 3 (O6, O9, O20); argued 4 (O5, O7, O14, O21);
experimentally checked 2 (O15, O16); proposed 6 (O1, O8, O13, O17,
O18, O22); unresolved 8 (O2, O3, O4, O10, O11, O12, O19, O23).

## 12. Recommended statements (statements only)

None is authorized for proof. Each needs statement review before any
proof work (dossier §18.66: "no new proofs before statement review").

- **IF1, generation correspondence.** Given a declarative typing
  relation for the record fragment, a declaration is typable exactly
  when its recorded problem is `ValidOpen`. The EMLTI analogue is
  Theorems 10.4.4 and 10.4.8. Prerequisite: that relation.
- **IF2, framework hypotheses.** Waxwing's entailment (`Sat` over
  finite assignments, ∃ over flexible variables) satisfies HM(X)'s E1-E4
  and F1-F6 and OutsideIn(X)'s R1-R8, each stated separately, with a
  counterexample search for any expected to fail.
- **IF3, guess-free steps.** A solver step σ may be used when producing
  an exported scheme only if every solution of the original atoms
  satisfies `eqs σ` (the premise of `binding_correspondence`), and
  `shareTails`'s labels-only binding is an instance (its P1).
- **IF4, instance order.** Define a substitution-based and a
  ground-instance order between constrained signatures, and state for
  §9 case A that the written `submit` signature is an instance of the
  inferred scheme in the ground-instance order but not in the
  substitution order. This fixes what a principality claim can mean.
- **IF5, satisfiable exported hypotheses.** Before C1 or CX applies to
  a scheme with exported equation atoms, some finite rigid assignment
  satisfies its `D`: a generalization of `clauseOnly_satisfiable`, or a
  decidable check.
- **IF6, determined variables.** A scheme variable occurring only in
  `D` is determined by the others (EMLTI Definition 10.2.14 adapted);
  when it is, the hole contract (witness/statements.md §1.5) holds for
  it at every key.
- **IF7, failure-family safety.** If a `Fail` key is absent from a
  checked row, no execution ends in an uncaught abort of that family,
  with shared keys (INF001 B5) and marks (B7) stated. Koka's Theorem 6
  is the model.
- **IF8, recursive groups.** Within a recursive component, inferred
  effect and error rows are shared (monomorphic recursion), and
  inference terminates or rejects with a source diagnostic (INF001 B6).

## 13. Connections

- **R0.** requirements.md §2 and r0/generation-interface.md give the
  generate-then-decide split that EMLTI and OutsideIn(X) also use (§3).
  r0/recorder-rules.md fixes one ∀/∃ level per declaration, which is why
  today's checking needs no generalization rule. r0/refusal-audit.md's
  `shareTails` statements are the guess-free evidence in §5.
  r0/boundaries.md's layers are why inference stops at V (§10).
  refute/statements.md's C1-E and C1-X mark the guess boundary.
- **INF001** (docs/plans/2026-10-11-requirement-and-error-inference-
  milestone.md). Its design gate asks for principal schemes,
  generalization, recursive groups and exported interfaces compared
  with published rules. §3, §4, §6 and §8 map those rules; O10-O14, O16
  and O18 are its open rows; IF7 and IF8 are its candidate statements.
- **AS001** (docs/plans/2026-10-21-type-system-assurance-register.md).
  The register asks each design to name its published rules and check
  their assumptions against Waxwing (its item 2). The matrix does that
  for inference, and keeps soundness, completeness and principality as
  separate claims, as the register requires.
- **Source traceability** (docs/plans/2026-10-20-cs-source-
  traceability.md). §1 records what was inspected and how; each
  citation here is a published rule in that document's sense, and every
  Waxwing use of it is a local adaptation with stated obligations.
  "A framework citation … does not by itself supply a particular
  merge-solving algorithm" applies to HM(X) and OutsideIn(X) here.

## 14. Questions for the author

1. Should INF001 promise principality, and in which instance order
   (IF4)? Or should it promise only soundness plus a predictable,
   documented acceptance boundary, as OutsideIn(X) does?
2. When inference meets a residual relationship the signature language
   cannot express (§9 case B): widen `where` with equation atoms,
   refuse to generalize, or require an annotation?
3. Should IF2 be stated in Lean before any framework is cited as a
   foundation in a design, or is a reviewed prose argument enough for
   the first INF001 design?

## 15. Prose review

Reviewed 2026-10-21 with the `humanized-prose-review` skill: a
catalogued audit, a rewrite, a re-review, then an editorial pass on
Garner's, Fowler's, Orwell's and Williams's plain-style principles.
Findings fixed: an overstated claim in §0 (a valid signature "need not
be an instance of any scheme" narrowed to the inferred scheme of §9
case A); a vague verb ("handled by") replaced by what each source does;
an inflated label ("the hard part"); an ambiguous order word ("below")
in IF4; a misattributed warning about Koka and FX008 (to the
source-traceability record, not ADR 014); a loose paraphrase of Koka's
Theorem 7; wrong section pointers; Lean paths missing `Typed/`; and an
unclear "caller's caller". Every fact, location and qualification was
kept. Deliberate patterns kept: bold lead sentences in lists (the
repository's plan style) and contrasts that correct a likely misreading
(checking versus inference; Koka's scope).
