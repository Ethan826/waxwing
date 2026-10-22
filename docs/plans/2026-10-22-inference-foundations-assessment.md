# Inference foundations: published conditions and Waxwing's evidence

Written 2026-10-21 at the author's request (research/division-campaign/
remedy/RESUME.md §2). **A bounded prior-art and planning assessment.**
It changes no compiler code, builds no prototype, adds no Lean proof
and adopts no language policy. Statements in §12 are proposals for
review, not authorized proof work.

Companion: docs/plans/2026-10-22-inference-foundations-extension.md
(the author's extension request, parts 1-6); §11 here stays the one
obligations index.

Revised 2026-10-21 after the author's corrections (research/
division-campaign/remedy/queued-request-inference-extension.md) and a
check of HM(X) on rendered pages, including the 1999 journal version;
§16 lists the changes. §17 records the status and citation reviews of
4ce8f74, and §18 the external review of 2026-10-22.

The question: **which published conditions connect Waxwing's proved
constraint theory to sound, predictable inference, and which of them
has Waxwing established?**

Labels: **cited** (a source location), **proved** (a Lean-checked
Waxwing theorem, named), **checked** (a recorded run or test),
**argued** (reasoning here or in a cited document, not mechanized),
**proposed** (a design or statement awaiting review), **unresolved**
(no adequate argument yet). The matrix (§11) uses the five statuses the
author fixed: proved, argued, experimentally checked (the matrix's name
for checked), proposed, unresolved. A published theorem is cited, not
proved for Waxwing: its use here is at most argued until its
hypotheses are shown to hold. "Argued" describes a conditional
argument: it holds if its stated premises and the cited theorems'
hypotheses hold. It is not an implementation guarantee, and no
argued row says the compiler behaves as described.

"No source" and "none of the sources" below mean none of the five
sources of §1 as inspected there. The companion reads further sources;
they supply techniques, not ready-made Waxwing theorems.

## 0. The answer in brief

- **What is established is a checking theory, not an inference theory.**
  Three Lean theorems of the research model, each with its premises:
  `openCharacterization_scoped` (ProofInstantiateSound.lean:60; premises
  `Scoped P` and fresh labels; a corollary of `openCharacterization`,
  which also assumes `ExistsWithinAt`) says when a *given* signature is
  valid (`ValidOpen`); `cellOpenImpl` (proved) says that acceptance by
  the cell checker with its proposed queries implies `ValidOpen`; and
  `d5_refused` (proved) says that every cell certificate is refused for
  `divide5Sig as` with `as` non-empty, although `d5_open` proves those
  problems valid. So the cell checker is sound and incomplete.
  `d5_refused` is evidence about that checker only: it does not show
  that another checking or inference procedure must be incomplete. That
  a theorem exists does not show that the compiler meets its premises.
  The published counterpart is checking an annotated binding against its
  declared type: OutsideIn(X)'s rule BindA, or entailment between
  constrained types in HM(X). None of the five sources inspected here
  derives principal inference from a validity characterization, and this
  document does not either.
- **The frameworks apply only after their hypotheses are checked for
  Waxwing's constraints.** HM(X) needs a cylindric constraint system
  (E1-E4) and equality axioms (F1-F6 in the 1996 workshop paper, D1-D6
  in the 1999 journal version). Its completeness theorem also needs the
  principal constraint property together with one of two further
  conditions on the constraint system, and a realizable environment
  (journal version, Theorem 12). OutsideIn(X) needs the entailment
  requirements R1-R8 and a sound, guess-free simplifier. **None of
  these is established for Waxwing.** Two Lean results are partial
  evidence: entailed substitutions preserve solutions
  (`binding_correspondence`), and a clause-only `D` is satisfiable
  (`clauseOnly_satisfiable`). Source signatures produce that form under
  recorder-rules G4-G8, which are proposed.
- **Three kinds of guarantee stay separate.** "Principal when it
  succeeds" (OutsideIn(X) Theorems 3.2 and 5.2), "every typable program
  has a principal type" (Jones 1995 Theorem 2; HM(X) workshop
  Corollary 1 and the journal version's corollary to Theorem 12) and
  complete inference (HM(X) journal Theorem 12; Koka Theorem 4) have
  different hypotheses. They can coexist: OutsideIn(X) is incomplete
  by design, yet a binding it accepts has a principal type, and that
  is the type it finds (PDF p. 24, 51). Waxwing promises none of the
  three today.
- **Record composition is where the published row theories stop.**
  EMLTI's Rémy-style rows have no concatenation. The chapter cites
  Sulzmann (2000), whose HM(X) instances add "new, ad hoc constraint
  forms" for record extension and concatenation, and notes that Wand's
  finite rows with duplicate labels already need "a four-way
  disjunction" for extension (Pottier and Rémy, printed p. 488-489).
  Waxwing's ∀rigid/∃flexible validity admits witnesses that depend on
  the rigid instance, so a valid written signature need not be a
  substitution instance of the scheme inferred from its body (argued, §9
  case A). Under EMLTI's constraint-based instantiation it is an
  instance (argued, companion §1.2), assuming Waxwing's row model
  corresponds, through an encoding, to an EMLTI model and ground
  inclusion matches `ValidOpen` (O24, proposed). The encoding is
  needed because EMLTI's Definition 10.2.5 (printed p. 411) makes
  every type constructor denote a total function, while Waxwing's
  disjoint composition is undefined when fields overlap, so the
  models cannot be identified directly. The O24 note
  (docs/plans/2026-10-22-o24-emlti-correspondence.md) recommends
  encoding composition as a ternary predicate U(t, r, s) with total
  constructors and states, without proving, the lemmas that would make
  the correspondence hold. Principality claims must therefore name
  their instance order and their scheme language.
- **Effects: Koka is a foundation for row unification and
  generalization, not for Waxwing's whole effect system.** Its theorems
  cover a calculus with `exn`, `div` and `st`, a unit exception, no
  handlers and generalization only at the total effect. Waxwing's head-
  keyed `Fail` families, deep dynamically scoped handlers, `nofail`
  marks, ambient rows and record requirements are outside them.
- **Inference does not choose compilation witnesses.** None of the
  five sources inspected here resolves G3 (compiling an unforced
  split), R010 admissibility or lowering. The nearest notion among them
  is ambiguity: OutsideIn(X) rejects ambiguous programs and Jones
  removes determined variables by improvement. Neither selects one
  witness among several valid ones. The companion adds sources that
  bear on each: Jones's coherence work (equal meaning despite several
  choices), partial evaluation (finitely many specialization keys) and
  Leroy's simulation proofs (lowering). None of them selects a witness
  either.

## 1. Sources and how they were read

The PDFs were downloaded and converted with pdftotext; the copies are
untrusted data, read as text only. Locations below were checked against
the converted text. Page numbers count form feeds ("PDF p.") unless
marked "printed".

| Source | Kind | Inspected | Caveat |
|---|---|---|---|
| Sulzmann, Odersky, Wehr, *Type Inference with Constrained Types* (HM(X)), 1996, https://publikationen.bibliothek.kit.edu/26696 | workshop paper, 12 pp. | whole text; the formulas cited below were later transcribed from rendered pages (companion §1.1) | the PDF has no printed folios; proofs deferred to a technical report [Sul96], not accessed |
| Odersky, Sulzmann, Wehr, same title, *Theory and Practice of Object Systems* 5(1), 1999; final preprint of 4 June 1998, https://infoscience.epfl.ch/record/64388 | journal paper (preprint) | §1-§6 and the appendix on rendered pages (companion §1.1); §7 not read | the authoritative version: it changes the instance relation, the normal-form requirement and the completeness hypotheses; lemma proofs deferred to [Sul97], not accessed |
| Pottier, Rémy, *The Essence of ML Type Inference* (EMLTI), ATTAPL ch. 10, https://cambium.inria.fr/~fpottier/publis/emlti-final.pdf | book chapter | §10.1-10.8 and solutions | printed page = PDF page + 388 in the chapter body |
| Jones, *Simplifying and Improving Qualified Types*, FPCA 1995, https://web.cecs.pdx.edu/~mpj/pubs/fpca95.pdf | conference paper | whole text | full proofs in a technical report (YALEU/DCS/RR-1040) not read |
| Vytiniotis, Peyton Jones, Schrijvers, Sulzmann, *OutsideIn(X)*, JFP draft of 24 March 2011, https://simon.peytonjones.org/assets/pdfs/outsideinx.pdf | journal draft | whole text | the turnstile ⊩ and ⪯ were lost; reconstructed only where the prose fixes them |
| Leijen, *Koka: Programming with Row-polymorphic Effect Types*, MSR-TR-2013-79, https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/koka-effects-2013.pdf | technical report | whole text | ε dropped throughout; p. 1 says an earlier version "contained a wrong lemma" in §5 |

**HM(X)'s theorems, checked on rendered pages (companion §1.1).** In
the workshop paper, Theorem 1 (soundness, PDF p. 6) says that if
ψ, C, Γ ⊢W e : τ then C, ψΓ ⊢ e : τ, ψC = C and ψτ = τ; the line the
first version of this document called unrecoverable is ψC = C,
ψτ = τ. Theorem 2 (completeness, PDF p. 6) says that if C′, Γ′ ⊢
e : σ′ and C′ ⊢i φΓ ⪯ Γ′, then W succeeds and its generalized result
is at least as general as σ′. Corollary 1 (PDF p. 7) specializes this
to a closed context. **The 1999 journal version is authoritative and
narrows completeness.** It states that the principal constraint
property "is not sufficient" (p. 12, with Kennedy's dimension types
as the counterexample). Its Theorem 12 (p. 13) assumes the constraint
system is in one of two classes, 𝒳^a or 𝒳^r, and that the
environment is realizable. It also requires every valid judgment's
constraint to be satisfiable (p. 6). The appendix sketches the proof
for 𝒳^r only; many lemmas are deferred to [Sul97], not accessed.

Read in the companion, not here: Jones, *Coherence for Qualified
Types* (linked from the assurance register). Still not read: Leijen's
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
  (recorder-rules §5.1, proposed). Under decision 1 the online solver
  becomes a search strategy that never returns a verdict
  (r0/generation-interface.md §1, G-search, proposed); today's checker
  still returns refusals from it (requirements §2.2).
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
  (Theorems 10.4.4 and 10.4.8, printed p. 433-434), where X is a model
  in the sense of Definition 10.2.5 (printed p. 411), whose type
  constructors denote total functions. In the O24 note's recommended
  encoding, Waxwing's partial composition is a predicate, not a
  constructor (note §2a; O24, proposed). Completeness
  assumes C ⊩ ∃Γ and fpi(C, Γ) = ∅. A `let` emits a constraint
  abstraction `let z : ∀X[⟦t1 : X⟧].X in …`, so generation never
  chooses which variables to generalize. But "constraint solving,
  however, cannot be independent of X" (printed p. 406): the solver,
  which interleaves generalization with unification (rule S-Pop-Let,
  printed p. 445), is proved correct only for an equality-only free
  tree model (printed p. 438; Lemmas 10.6.8-10.6.10, printed
  p. 450).
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
  constraints during or after type inference" (PDF p. 7). That is the
  workshop paper's position. The 1999 journal version requires the
  constraint of a type scheme and of every valid judgment to be
  satisfiable (p. 6).
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
  are deferred to [WO96] (PDF p. 10). The journal version recasts this
  as the principal constraint property: every constraint with a normal
  form has a principal one (p. 10). Its completeness theorem assumes
  that property but, by the authors' own account, the property alone
  "is not sufficient" (p. 12).
- Jones: rule (Simp) replaces a predicate set by any equivalent one
  (§3, PDF p. 3); "the only condition that a simplifying function must
  satisfy is that P ⇔ (simp P)" (§7, PDF p. 9). Rule (Imp) applies a
  substitution S when S improves P: ⌊P⌋ = ⌊SP⌋, the satisfiable
  instances are unchanged, and any variable S involves that is not in
  P is new (§4.1, PDF p. 4). With improvement the algorithm is no
  longer complete for the ordinary instance order (§5, PDF p. 6); Jones
  moves to the satisfiable-instance order ≤sat, which "is not
  preserved by substitution" (footnote 3, PDF p. 6).
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
  have the same solutions. For equational bindings over the model's
  atoms and plain `Sat`, this matches OutsideIn(X)'s P1 condition and
  is sufficient for Jones's improvement.
- **The boundary of refusals.** C1-E (an entailed substitution
  followed by a clash refutes the signature) is expected true; C1-X
  (the same after any substitution) is expected false. Example X6
  states a refutation, which the adversarial review proved in a
  scratch copy, not in the repository (refute/statements.md §5, §6;
  neither C1-E nor C1-X is proved). A contradiction reached through a
  guessed binding is not evidence.
- **Which solver steps are guess-free.** `shareTails`'s binding is
  most general on labels, whatever the field types (statement P1,
  argued; refusal-audit.md §4). With a rigid tail beside an unknown it
  would not be (P2, checked in the bounded model), but that case is
  unreachable today (P3, argued, not instrumented). Some of rule H's
  exclusions are unsound: one on written labels, others that assume an
  indivisible rigid row (refusal-audit §3.7). As a result rule H
  rejects valid programs (`route`, c01, b03, checked; class d).

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
| Every typable program has a principal type | Jones 1995 Theorem 2 (PDF p. 7); HM(X) workshop Corollary 1 (PDF p. 7) and journal corollary to Theorem 12 (p. 12-13); EMLTI's generation theorems read as principality (printed p. 430) | Jones: TV(A) = ∅, P0 sat, no redundant `let`s; HM(X) journal: X in 𝒳^a or 𝒳^r (principal constraint property plus satisfiable or simplified solved forms), Γ realizable in `true`, satisfiable judgments | not promised; instance order undefined (§9) |
| Complete inference | HM(X) journal Theorem 12 (p. 13; the workshop Theorem 2, PDF p. 6, omits hypotheses the journal version adds after Kennedy's counterexample); Koka Theorem 4 (PDF p. 8) | HM(X): as above with Γ realizable in C′; appendix sketches 𝒳^r only, lemmas in [Sul97], not accessed; Koka: completeness against its syntax-directed rules, proofs "entirely standard", unification proofs deferred to [14] | not promised; the cell checker is incomplete (`d5_refused`), which says nothing about other procedures |

OutsideIn(X) says plainly that Theorem 3.2 "says nothing about the
situation where the algorithm fails to produce a type, or the
simplifier does not terminate — that is, it says nothing about
completeness" (PDF p. 23), and that "the absence of completeness is by
design" (PDF p. 51). The same page gives the guarantee that survives:
"if the algorithm accepts a definition, then that definition has a
principal type, and that type is what the algorithm finds". So
principality on success and incompleteness coexist; a design may
promise the first with a documented acceptance boundary. The order in
which OutsideIn(X)'s types are principal is its Definition 3.3 (PDF
p. 22), which instantiates with type terms; companion §1.2 explains
why Waxwing would need a different one. EMLTI calls a sound and
complete generator "the
analog of the existence of principal type schemes" (printed p. 430), but
its principal solved forms are established only for the equality-only
free tree model (Lemmas 10.2.19 and 10.2.21, printed p. 421-422).

**Three inferences this document does not make.**

1. **Decidable validity does not supply principal inference.**
   `openCharacterization` decides nothing executable (§18.46), and even a
   decision procedure for `ValidOpen` would only check a given
   signature. Principal inference also needs a space of candidate
   schemes, an instance order and a proof that one inferred scheme is
   above every other.
2. **A generic framework does not apply before its hypotheses are
   checked.** For HM(X): the cylindric axioms E1-E4 (Definition 2, PDF
   p. 3), the type-constraint axioms F1-F6 (Definition 6, PDF p. 4;
   D1-D6 in the journal version, p. 5, where D5 is congruence for every
   constructor, not only `→`), decidable entailment (Definition 1, PDF
   p. 3), the existence of a minimal normalization (Definition 8, PDF
   p. 5) and, for completeness, the journal version's class conditions
   (𝒳^a or 𝒳^r, p. 12-13). For OutsideIn(X): R1-R8 and a sound, guess-free
   simplifier. For Waxwing's constraint domain with ∀rigid/∃flexible
   validity none of these is stated, let alone proved. `subst_sat` and
   `binding_correspondence` bear on F4 and F6 for the model's atoms;
   `mguExists` gives a most general unifier for each pattern and cell
   list that has a unifier, not one normal form per problem.
3. **An incomplete checker does not make every procedure incomplete.**
   `d5_refused` shows that the cell checker refuses valid problems. It
   says nothing about another checker or an inference procedure for
   the same problems.

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
- **Splits.** Two properties must be kept apart (author's correction
  1). *Forcedness* means the split is uniquely determined (G3;
  requirements §5.1, §11 item 5). It is the record analogue of Jones's
  *unambiguity*, a determinacy condition that is sufficient for
  coherence. *Coherence* means that the permitted alternatives, when
  there are several, have equivalent behaviour. Establishing coherence
  is how forcedness might safely be relaxed. Jones's coherence report
  (read in companion §3) proves coherence from unambiguity under a
  free type algebra and call-by-name equality, and his thesis weakens
  unambiguity where evidence does not depend on a variable. Neither
  result transfers literally, because `⊎` is not injective; none of
  the five sources here addresses splits (§10).

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

So these five sources supply typing conditions and a description of
elaboration, not a theorem that elaborated programs mean what the
source means. Companion §2 reads Pottier's elaboration pearl and
Inferno; they supply a design and a stated but unproved specification,
with well-typedness tested, not a meaning-preservation theorem.

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
  narrowed by the ground re-check (RC1-RC6, proposed). None of the
  five sources covers this route, and none of the companion's sources
  covers it whole (companion §2, §4).

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

This exposes the question of order. The author's written signature
`submit(doc: { ...r }, inbox: { ...s }, archive: { ...s2 }) where
s disjoint s2` is argued valid (requirements §7: argued equivalent to
`divide5Sig [id]`, for which `d5_open` is proved; a reviewer's bounded
evaluation, unrecorded, agrees). Whether it is an instance of the
inferred scheme depends on three things that must be fixed together
(author's correction 4; companion §1.2 has the details):

- **The scheme language.** Today's (L0): record types are fields plus
  tails, constraints are conjunctions of `lacks` and `disjoint`, and
  `without` is an expression form only, so there is no type-level
  "r restricted to labels outside s".
- **The admissible substitutions.** One vector of L0 row terms over
  the written signature's variables, the same for every instance. This
  is what HM(X)'s instance rule (∀⪯) (Fig. 3, PDF p. 5), OutsideIn(X)'s
  Definition 3.3 (PDF p. 22) and Jones's generic instances use.
- **The order.** Under that *substitution order* no choice works
  (argued; a bounded check over three labels in a scratch copy, not
  recorded, agrees): equating `{ ...u, ...t, ...q }` with `{ ...r }`
  makes one of the three equal to `r` and the other two empty, and each
  choice needs an atom the written `where` clause does not supply.
  Under *ground-instance inclusion* (EMLTI Fig. 10-5, printed p. 414),
  where the instantiating rows may differ at each ground instance,
  every instance of the written signature is an instance of the
  inferred scheme: put `r`'s labels outside `s` in `u`, the rest in
  `t`, and leave `q` empty (argued).

Three further points (argued, companion §1.2). First, in HM(X)'s and
OutsideIn(X)'s own typing rules `submit` cannot even be given the
written signature, because instantiation there takes type terms; their
principality theorems concern a narrower relation than `ValidOpen`.
EMLTI's presentation of HM(X) instantiates by constraint and does
derive it. Second, a richer *internal* scheme language changes the
example: with ∃ inside constraints the written and inferred schemes
are both instances of a third scheme, and with Boolean row terms
(`r` minus `s`) the written signature becomes a substitution instance
through exactly the G1 conditional split. Third, the strongest
constraint on `r`, `s`, `s2` alone is a disjunction (argued). A
reader's search, run in a scratch copy over labels only and not
recorded in the repository, found no conjunction of up to three of
six candidate atoms (`s disjoint s2`, `r disjoint s`, `r disjoint s2`
and `lacks { id }` on each of `r`, `s`, `s2`) that is principal among
the signatures built from them. That is bounded evidence only. Whether
any writable `where` clause is principal is unresolved: settling it
needs a general argument over an exactly stated scheme language
(companion §1.2 item 4). None of this requires
new surface syntax: the internal scheme language, serialized module
interfaces and annotation syntax are separate choices. **Any
principality statement for Waxwing must name its scheme language and
its order.**

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
   also serve. Jones's predicates take a record type `r` (Fig. 1,
   PDF p. 2), but the paper has no record concatenation type to apply
   `has` to.
2. **A variable that occurs only in constraints.** `w` is ambiguous by
   Jones's syntactic test (PDF p. 5) but determined by `a` and `b` when
   `{ ...a, ...b }` holds `id`. A determinacy-based rule (EMLTI
   Definition 10.2.14; Stuckey and Sulzmann, OutsideIn(X) PDF p. 77)
   and the hole contract are needed. Not every constraint-only variable
   is determined: in `{ ...a, ...b } = { ...w1, ...w2 }` neither `w1`
   nor `w2` is. What needs determining is a variable that reaches a
   callee's specialization key (companion §1.3, IF6). Alternatively,
   projecting `w` away leaves `a disjoint b` plus "`{ ...a, ...b }` has
   `id: Int`", a `has` over a composition that Jones 1995 cannot state
   (argued).
3. **A satisfiability check for the exported `D`.**
   `clauseOnly_satisfiable` no longer applies. This `D` is satisfiable
   (`a = { id: Int }`, `b = w = {}`); in general a check is required
   (§4).
4. **A checker beyond `LDFragment`.** The scheme is `Scoped` (every
   `D` variable is a signature variable), so, given fresh labels, the
   characterization states its validity. The cell checker's guard
   returns false on the `eq` atom, which is read as Unresolved.

**What retention does not settle.** Retaining the relationship moves
the split to call sites. There it can still be unforced: a caller
holding a ground record `{ x, y }` with `s = s2 = {}` has several
valid splits into `u`, `t`, `q`: six when the lacked label is `x`
(the corrected table in requirements §5.2 lists three). G3 remains.

## 10. Inferring a valid contract versus choosing a compilation witness

**The five sources stop at types (cited).** Every result above concerns
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
property of all solutions. The five sources answer non-forced choices
with rejection; Jones's coherence work permits any of several choices
whose translations are provably equal, and selects none (companion
§3). It cannot resolve R010, because specialization termination (FK-0,
FK-W, proposed) is about reachable keys, not types; partial
evaluation's bounded static variation is the published target
property there (companion §4). It cannot resolve lowering, because
layout correspondence (Lay, Adapt-N, proposed) is about witness values
(companion §6).

## 11. Obligations matrix

This is the one authoritative obligations index; the companion
refers to it and keeps no index of its own. One status per row.
"Proved" names a Lean-checked Waxwing theorem and holds only under
that theorem's premises, as the row's interpretation states; a cited
published theorem never makes a row proved. Paths are under
research/composition-proofs/Composition/ unless they start with src/.
Page references for the first five sources are those of §1; the
companion's §0 lists its sources and page conventions. O22 is split
into O22a-d (four kinds of termination). Rows O24-O60 come from the
companion, which maps the readers' provisional IDs to them.

| # | Published requirement (location) | Waxwing interpretation | Existing evidence | Remaining gap | Next action | Status |
|---|---|---|---|---|---|---|
| O1 | Sound and complete constraint generation for any X meeting Def. 10.2.5 (EMLTI Thms 10.4.4, 10.4.8, printed p. 433-434) | the R0 recorder's problem is valid iff the declaration is well typed | recorder-rules §2.4 G-total, G-local, G-dead (proposed); acceptance tests stated, not run | no declarative Waxwing typing relation to correspond to; effect rows erased | state IF1 after a declarative relation for the record fragment exists | proposed |
| O2 | Decidable entailment (HM(X) Def. 1, PDF p. 3) | deciding `ValidOpen`, i.e. `D ⊩ ∃flex. B` | `openCharacterization` (Typed/Bridge/ProofInstantiateSound.lean:45) characterizes; `cellOpenImpl` sound; `d5_refused` incomplete; `decideCall_correct` decides satisfiability only | no executable decision procedure (§18.46) | none now; executable construction is a separate authorized step | unresolved |
| O3 | Cylindric system E1-E4 and type axioms F1-F6 (HM(X) workshop Defs. 2, 6, PDF p. 3-4, checked on rendered pages; D1-D6 in the journal version, p. 5, where D5 is congruence for every constructor) | ∃ over flexible variables; `eq` atoms | `subst_sat`, `binding_correspondence` bear on F4, F6 | axioms unstated for Waxwing's Sat-entailment | state IF2 against the journal's D1-D6 | unresolved |
| O4 | A minimal normalization exists (HM(X) workshop Def. 8, PDF p. 5); the journal's principal constraint property (p. 10), assumed by its completeness theorem but "not sufficient" without X in 𝒳^a or 𝒳^r (p. 12; the classes, p. 12-13) | one most general residual per declaration, presentable as an exported scheme | `mguExists` (Typed/MGUExists.lean:80): a most general unifier per pattern and cell list | per pattern, not per problem; case B has two incomparable unifiers, so 𝒳^r's conditions are unlikely to hold (argued); for case A a scratch search over labels only (not recorded) found no principal conjunction of up to three of six candidate `lacks`/`disjoint` atoms; whether any writable `where` clause is principal is unresolved | IF4 restated on EMLTI's order (companion §1.4) removes this as a precondition of principality; keep it for presenting exported schemes | unresolved |
| O5 | Entailment requirements R1-R8 (OutsideIn(X) Fig. 3, PDF p. 14) | Waxwing's semantic entailment | R1, R2 (and R4-R7 for plain `Sat`) argued to hold for plain `Sat` entailment; entailment under `ValidOpen` undefined | R3 (substitution) and R8 (substitutivity) unstated | include in IF2 | unresolved |
| O6 | Improvement preserves satisfiable instances (Jones §4.1, PDF p. 4); guess-free P1 (OutsideIn(X) Def. 3.2, PDF p. 20) | for an equational binding σ whose equations every solution of `C` satisfies, `C` and `eqs σ ∧ Cσ` have the same solutions, under plain `Sat` over the model's atoms (a sufficient condition for Jones's improvement, argued) | `binding_correspondence` (Binding.lean:110) | lifting to `ValidOpen` (σ entailed under each rigid instance, binding only flexible variables) is not stated | reuse in IF3 | proved |
| O7 | A sound, guess-free simplifier (OutsideIn(X) Fig. 8, PDF p. 21; Fig. 15, PDF p. 42) | solver steps used for exported schemes are entailed by original atoms | `shareTails` P1 argued (reviewer: correct; refusal-audit §4); P2 bounded-checked; rule H known not guess-free (checked rejections); P3 argued only | no simplifier stated; P3's reachability not instrumented | state IF3 | unresolved |
| O8 | Simplification needs only equivalence (Jones (Simp), §3, PDF p. 3; §7, PDF p. 9; HM(X) PDF p. 1) | normalizing a recorded problem preserves its meaning in both directions: the normalized problem is `ValidOpen` exactly when the original is, with the same solutions, definedness atoms included | recorder-spec §5.3 normalization, with no equivalence statement. C1-M `ValidOpenAntitone` (stated, Typed/Refute/Rules.lean:40, expected true) is a different property, validity monotonicity: removing body atoms keeps a valid problem valid (and can make an invalid one valid, argued; not part of C1-M's statement). It is why §5.3 keeps `Defined` atoms, not evidence of equivalence | no equivalence statement for the normalizer | state normalization equivalence (both directions; solutions and validity) separately from C1-M | proposed |
| O9 | Satisfiability may be tested during or after inference (HM(X) workshop Lemmas 8-9, PDF p. 7; the journal version instead requires satisfiable judgments, p. 6); reject obviously inconsistent constraints (OutsideIn(X) §7.3, PDF p. 56) | a clause-only `D` (`lacks`/`disjoint` only) is satisfiable by a finite assignment; that source declarations yield clause-only `D` follows from recorder-rules G4-G8 (proposed) | `clauseOnly_satisfiable` (Sig/SourceCampaign.lean:82) | exported equation or `has` atoms (§9 case B; O26, O48) fall outside it | state IF5 | proved |
| O10 | Principal when it succeeds (OutsideIn(X) Thms 3.2, 5.2, PDF p. 23, 46); coexists with incompleteness (PDF p. 24, 51) | an accepted inferred scheme is most general, in a stated order | none | needs O5, O7 and an instance order; OutsideIn(X)'s order (Def. 3.3, PDF p. 22) instantiates with type terms, so its guess-free condition must be restated under `ValidOpen` and EMLTI's order (companion §1.5) | order and scheme language decided in part (D2, §18.69: EMLTI's order through encoding (a); current exported syntax kept; L0 not frozen as sufficient for future principal inference); whether INF001 promises principality, and with which documented acceptance boundary, is still open (§14 Q1) | unresolved |
| O11 | Principal satisfiable types (Jones Thm 2, PDF p. 7; TV(A) = ∅, no redundant `let`s); HM(X) journal corollary to Thm 12 (p. 12-13; X in 𝒳^a or 𝒳^r, Γ realizable in `true`) | every typable declaration has a principal inferred scheme | none; §9 case A: the written signature is not a substitution instance of the inferred scheme in today's scheme language, but is an instance by ground inclusion (argued) | instance order; scheme language (L0 not frozen as sufficient, D2, §18.69); record composition; open-world match (O24) | IF4 restated, over encoding (a) (D2, §18.69) | unresolved |
| O12 | Complete inference (HM(X) journal Thm 12, p. 13; the workshop Thm 2, PDF p. 6, lacks its hypotheses; Koka Thm 4, PDF p. 8) | the inferring checker accepts every specified program | none; `d5_refused` shows only that the cell checker is incomplete, not that another procedure must be | completeness not promised anywhere | record as an explicit non-goal or a separate claim (register; author question, §14 Q1) | unresolved |
| O13 | Recursion monomorphic inside its definition (EMLTI Ex. 10.7.6, printed p. 452); polymorphic recursion inference undecidable (same page) | inferred rows in a recursive component are shared within it, or written | signatures make today's recursion checked, not inferred | INF001 B6 termination | state IF8 | proposed |
| O14 | Generalize only at the total effect (Koka GEN, Fig. 3, PDF p. 6-7) | named functions are values; `let` and lambdas stay monomorphic | language.md Effects ("`let` is monomorphic") | local generalization unplanned | none until local generalization is designed | argued |
| O15 | Row unification terminates with the tail side condition (Koka Fig. 6, PDF p. 7-8) | effect-row unification: the tail side condition is necessary on the `fx-side-condition` probe; with it, the suite terminates | ADR 010; regression row `fx-side-condition` (scripts/regression-fx.mjs): removing the side condition makes the probe time out (necessity on one probe); termination with it is exercised only by the passing suite | proof deferred by Koka to [14], not read | read [14] when INF001's design starts | experimentally checked |
| O16 | No uncaught exception when `exn` ∉ ε (Koka 2013 Thm 6, PDF p. 11); for user-defined effects, Koka POPL 2017 Lemma 4b (p. 9); Koka 2017 Thm 1 as printed needs a qualifier for an ε containing operation labels (companion §6) | no uncaught abort of a `Fail` family absent from the row, per key; abort-freedom of cleanup stated separately | related differential and FX008 soundness tests (Go vs reference interpreter; no escape from cleanup); no test states the per-family property | per-family statement with shared keys and marks; neither Koka paper covers marks, `defer`, marker-aimed aborts or head-keyed families | state IF7 as two statements | proposed |
| O17 | Ambiguous types rejected or determined (Jones §4.3, PDF p. 5; OutsideIn(X) §6.1, PDF p. 47; Def. 9.1, PDF p. 77; EMLTI Def. 10.2.14, printed p. 417) | holes meet the hole contract (behaviour independent of the default); a projected constraint-only variable that reaches a callee's specialization key is determined, or it may not be projected: the scheme keeps it (L0), or the site is a G3 split (rejection or coherence, O19) | ADR 007 holes; test/poly-properties.test.mjs; hole contract (witness §1.5) | residual constraints break ADR 007's condition 1; not every constraint-only variable is determined (`{ ...a, ...b } = { ...w1, ...w2 }`) | state IF6 as restated in §12 | proposed |
| O18 | Elaboration into a typed core (OutsideIn(X) §8.1, PDF p. 70); Pottier ICFP 2014's relational specification (Fig. 9, PDF p. 9), stated and not proved (PDF p. 10); Inferno tests well-typedness | explicit dictionaries survive inference; per-name witnesses for rows | C001 assurance gates; witness §4 (K, V, Lay, Adapt-N) | no elaboration relation stated for inferred schemes | O27-O33; INF001 design states it (register row INF001) | proposed |
| O19 | Coherence (Jones, *Coherence for Qualified Types*, Yale RR-989, Def. 5 and Theorem 5, p. 9; thesis §5.8.3, printed p. 77-78, the AV weakening) | when several splits are valid, their permitted elaborations agree in meaning. Forcedness (uniqueness) is the analogue of Jones's unambiguity, a sufficient condition, and is not itself coherence | `eval_split` (SplitIrrelevance/Run.lean:133; λ-split model, projection-free); `accepted_split` (SplitIrrelevance/Acceptance.lean:59; conditional on `Covers` and declared interfaces) | Jones's Theorem 5 assumes call-by-name βη equality, a free type algebra (false for `⊎`) and a principal translation, with no recursion or signatures | the C8-J statements note (O34-O39) | unresolved |
| O20 | Rémy-style rows without concatenation; Sulzmann (2000) adds "new, ad hoc constraint forms" for extension and concatenation, and Wand's finite rows with duplicate labels need "a four-way disjunction" for extension (EMLTI printed p. 488-489) | disjoint composition with its own validity theory | checking-level validity characterized (`openCharacterization`, `d3bExistsWithin` (Typed/Universality.lean:111); Scoped, fresh labels) | a scheme-level (inference) account | IF4 | unresolved |
| O21 | Instantiation by type terms (OutsideIn(X) VarCon, Fig. 10, PDF p. 25; base system PDF p. 13-14; declarative BindA, Fig. 4, PDF p. 15; generation, Fig. 7, PDF p. 19); algorithmically, an annotated binding is solved completely, with no residual (BindA, PDF p. 41) | Waxwing checks ∀rigid ∃flexible, witnesses may depend on the rigid instance | `d5_open` (Typed/Cell/Proofs/W7/Divide5.lean:98) | that no uniform written substitution exists for `divide5` is argued only; non-derivability rests on VarCon's term instantiation, given X's types are L0 (companion §1.2); the full rule set is unchecked | include in IF4 | argued |
| O22a | Termination of inference and solving (OutsideIn(X) §7.7, PDF p. 67-69; EMLTI Lemma 10.6.8, equality model); inferring polymorphic recursion is undecidable (EMLTI printed p. 452) | generation total; strategies under budgets; mandatory signatures avoid semi-unification | G-total (proposed) | none proved | the termination stream, after statement review | proposed |
| O22b | Termination of witness construction and evaluation (JGS §5.5.1, printed p. 118-119, finite unfolding) | `eval_k` terminates at each key | witness §1.3: structural over `NameId` order (argued) | not stated apart from key finiteness | state with FK-W (O41) | argued |
| O22c | Finitely many reachable specialization keys: bounded static variation (JGS §14.2, printed p. 299-300; safety proof §14.4, p. 305-306) | from every entering key, a recursive component reaches finitely many keys (FK-0, FK-W, FK-U); two splits with the same meaning may still differ here | FK-0, FK-W (witness §2.4, proposed); R010 | none proved; JGS's proof is a sketch for a first-order language over naturals | O40-O45 | proposed |
| O22d | Runtime termination (Koka 2013 Thm 8, for `div`) | not implied by O22a-c, and does not imply them | separating programs `spin` (keys finite, runtime diverges) and constructor growth (runtime terminates, keys infinite), companion §4 | none claimed | keep out of inference and specialization claims | argued |
| O23 | None of the five sources addresses witness selection, R010 or lowering; the companion's sources bear on parts (O19, O22c, O51-O53) and none selects a witness | G3, R010, Lay stay separate obligations | boundaries §1; requirements §5 | as recorded in requirements §11 | keep out of inference claims | unresolved |
| O24 | EMLTI's HM(X): generation sound and complete for any model X (Thms 10.4.4, 10.4.8, printed p. 433-434); model conditions (Def. 10.2.5, printed p. 411: every type constructor of signature K ⇒ κ denotes "a total function" from 𝓜_K into 𝓜_κ); open-world interpretations not treated, though adopting Odersky et al.'s approach "would not be extensive" (printed p. 423) | Waxwing's row model, with composition encoded as the predicate U (O24 note §2a: U(t, r, s) ⟺ Disjoint r s ∧ t = union r s; constructors base, →, Π, ∅, single_ℓ stay total), is an EMLTI model X_W(B); ground inclusion at every injective base extension coincides with `ValidOpen` (GI-Open, reading EMLTI's per-model order over that family), and in the one model X_W^atoms(B) (carriers over B ⊕ ℕ, constructors `base (inl b)` only) it does so given B1b (GI-Atoms). Direct identification fails (argued): ⊎ is partial, against Def. 10.2.5's totality. This does not give principal types in L0 (O4, O11), a solver, soundness of record primitives (§10.5 unchecked), elaboration, any result for `ValidAll`'s infinite rows, or coincidence at the unextended X_W(B) (GI-Fin: one direction only) | docs/plans/2026-10-22-o24-emlti-correspondence.md: model-condition check argued (§1, §2); lemma statements M0, T1, T2, V, GI, GI-Open, GI-Atoms, GI-Fin, F proposed (§3), none reviewed or proved | statement review, then proofs of M0, T1, T2, V, GI, GI-Open and F (flattening: U-chain schemes are not type-shaped); EMLTI's solver and row laws do not cover U; B1b for GI-Atoms; ADR 014 combinations flagged (note §4: EMLTI with a disjoint-composition model; U as the only row primitive; X_W^atoms(B) for the open-world family; EMLTI's order quantified over injective base extensions) | statement review of M0, T1, T2, V, GI, F and GI-Open for a focused proof tranche, not yet authorized (D2, §18.69: encoding (a) chosen, unproved); GI-Atoms conditional on B1b; then IF4 (companion §1.4) | proposed |
| O25 | Instantiation by constraint (EMLTI hmx-Inst, hmx-Exists, Fig. 10-7, printed p. 423; weakening, Lemma 10.3.1) | a written signature is accepted when its constraint entails the instantiation constraint of its body (EMLTI has no annotations) | `d5_open`; recorder-rules §5.1 (call sites instantiate with flexible copies) | no statement relating annotation checking to EMLTI's entailment | include in IF4 | proposed |
| O26 | Existential projection (HM(X) cylindric ∃, E1-E4; EMLTI hmx-Exists); Jones 1995 has neither ∃ nor composition | eliminating a constraint-only variable leaves a `has` over a composition, or keeps an `eq` atom with the variable | §9 case B: ∃w.(a disjoint b ∧ { ...a, ...b } = { id: Int, ...w }) is equivalent to a disjoint b ∧ ({ ...a, ...b } has id: Int) | internal atom form undecided; ADR 014 new combination | IF5 and IF6 restated; §14 Q2 | argued |
| O27 | Constraints with a value (Pottier ICFP 2014, §3-§4.3 and Fig. 8, PDF p. 3-7): applicative, no bind | R0's generator returns the recorded problem with a pure continuation that builds the checked IR from a witness (EL1), instead of reading back settled types; chosen (D1, §18.69), unproved | recorder-rules §4 (no rule branches on a solved shape) and §5.3 (read-back ambiguous with several flexible tails) | EL1 unstated; T-R0a/T-R0b ownership; a `build` of type `Witness → Either ElabFault a` can still request a variable the witness does not bind, so coverage needs tracked requests, a restricted builder interface or a coverage theorem; D1 (§18.69) chose tracked applicative requests, not yet specified | specify the tracked-request mechanism (reads introduced through constructors that record their dependencies; scoped handles optional) before implementation (companion §2, D1, §10) | proposed |
| O28 | Elaboration after solving (Pottier §3, PDF p. 3, non-locality; §6, PDF p. 8, needs "some form of satisfiability witness") | values only after the verdict; `decode` corresponds to the per-strategy adapter (Adapt-N), never invoked on `NoWitness` | decisions 1 and 4 (§18.66); W §1.1 | Adapt-N unproved for every format | fold into the O27 note | argued |
| O29 | Rigid then flexible binding (Inferno `letr1`, Solver docs); coercion of unconstrained quantifiers (Pottier App. B, PDF p. 10; Inferno `coerce`) | one ∀rigid/∃flexible prefix per declaration; a variable read by the elaboration but not determined may be defaulted only under the hole contract (EL3) | ADR 007; recorder-rules §5.1; `route` fails when `u` defaults to `{}` (split-irrelevance/ground-check.md §3) | Inferno's level discipline would refuse `divide5` (argued); EL3 unstated | state EL3 with IF6 | proposed |
| O30 | Well-typed elaboration: no theorem; Inferno checks it with an independent System F checker on random terms (implementation evidence) | at every reached key the lowered checked IR, `Named` witness terms included, is well typed (EL2) | RC1-RC6 (proposed; reached keys only); witness §4 Cov, Adapt-N, R, Lay (proposed) | no symbolic checker for name-carrying checked IR; key-dependent decoded values are an ADR 014 new combination | specify, without building, a key-wise re-typer as an independent oracle | unresolved |
| O31 | Only decoded variables get values (Inferno Solver docs: `decode`, `instance`, the variables `let` returns) | D1 adopts the continuation with tracked applicative requests (O27; chosen, §18.69, unproved), so Cov's domain is the tracked set of variables the continuation requests; auxiliaries are evaluated from defining atoms, never bound. An opaque `Witness → Either ElabFault a` does not expose that set, so the domain is defined only with tracked requests or a restricted builder interface; otherwise Cov's domain is fixed independently (for example, the non-auxiliary flexible variables) and a coverage theorem states that `build`'s requests lie in it (companion D1 (c)) | W §4 Cov; recorder-rules §5.3 | depends on O27 (proposed) and on the tracked-request mechanism, chosen (D1, §18.69) but not yet specified | one sentence offered to W's Cov owner, with the mechanism's specification | proposed |
| O32 | The continuation's value type is a parameter (Pottier §3, PDF p. 3) | under D1's continuation (O27; chosen, §18.69, unproved): adding `Field r l` (G2) changes `TyTerm`, not the elaboration interface (EL5), and a `build` returning `Either` gives partiality a place | W §1.4 (reserved); decision 8 | depends on O27 (proposed; D1 decided, §18.69); definedness of partial values deferred with G2 (D6 stands); ADR 014 new combination | record the condition in W §1.4 (proposal) | argued |
| O33 | Meaning preservation: not stated by Pottier; HM to System F rests on type erasure | two valid witnesses lower to programs with the same behaviour at every key (EL4 for forced splits; O19 otherwise) | none; erasure fails because layouts and keys depend on types | EL4 unstated | after the C8-J note (O39) | unresolved |
| O34 | Determinacy (EMLTI Def. 10.2.14, printed p. 417); Jones's Def. 5 (RR-989 p. 9) only under a free type algebra | the split is unique given the complete obligations, requirement atoms included (forcedness) | dossier program 4 (`acceptsParts`), argued for examples | determinacy over `ValidOpen` with `pr`/`cmp`; `ValidOpenR` unstated; the decider is unassigned (§18.67 Q7) | state forcedness as determinacy, with IF6 | unresolved |
| O35 | Jones's AV weakening (thesis §5.8.3, printed p. 77-78): unambiguity relaxed where evidence does not depend on a variable | restricted C8: observable behaviour depends on a split only through its determined union | `eval_split` (proved; λ-split model, projection-free, no `==`, data, effects or handlers); C8-rt argued; `e3_differs` (SplitIrrelevance/Boundary.lean:83) shows projection breaks it | extend R to `==`, data, effects, handlers, `Fail` and update; Go rests on assumption A-go; Jones's βη equality is unsound for call-by-value | the extended R, stated in the C8-J note | argued |
| O36 | None: Jones's equality concerns meaning, and Def. 5 rejects rather than filters | every valid split is accepted alike (printability, comparability) | `e2_not_covers₁`, `e2_covers₂` (SplitIrrelevance/Examples.lean:218, 198); `accepted_split` (conditional on `Covers` and declared interfaces) | requirement atoms in the selection contract | statement: the contract returns a witness satisfying the complete `BQ`, or Unresolved | unresolved |
| O37 | Jones's order: principal type first, then the ambiguity test (RR-989 p. 9) | a split selection made before inference can change an inferred interface (E2′), so Jones's order (infer first, then select) is the one that keeps interfaces stable | E2′ (dossier §18, derived) | `accepted_split` assumes declared interfaces; needs IF4 | proposed obligation: an exported (inferred) interface never depends on a split selection (today it holds only vacuously, because interfaces are declared); an "interfaces before selection" clause in the selection contract | argued |
| O38 | Jones's `Erase C = id` (RR-989 Def. 3, p. 7); uniqueness of evidence would identify distinct dictionaries (p. 4); Dreyer et al. POPL 2007 §3.1 (p. 5): two instances, two typings; instance functors total (p. 2, 6) | explicit dictionary choices are observable values: two dictionaries at one type give different results, so Jones's uniqueness of evidence would wrongly identify them and C001 dictionaries are not Jones evidence; implicit construction would need totality | C001 rulings 1 and 4; c001-explicit/assurance.md "explicit selection" gate (proposed) | the Dreyer-style and divergent-constructor programs are not fixtures | proposed obligation: inference, split selection and any future implicit layer preserve every dictionary operand term; C001 acceptance and rejection examples, marked future | argued |
| O39 | None selects among coherent alternatives; Jones only permits any of them (thesis printed p. 52) | a coherence theorem for an explicit fragment could make a deterministic choice an implementation freedom for run-time meaning, not for acceptance (O36), interfaces (O37) or key finiteness (O22c) | `eval_split`, `accepted_split` | Jones's Theorem 5 cannot be cited as the theorem; four ADR 014 new combinations (companion §3) | one statements-only C8-J note with one owner, once the witness and termination interfaces stabilize; no selection rule (D3, §18.69) | proposed |
| O40 | Bounded static variation (JGS §14.2, printed p. 299-300); safety by dependency chains and finite downward closure (§14.4, p. 305-306) | FK-0: on the single-tail baseline every slot takes values from entry components and written constants | ADR 007 (argued for rows); design §4.2 (types) | FK-0 not stated for type slots with tails | revise FK-0 to name bounded static variation as its target | proposed |
| O41 | JGS's increasing, equal and decreasing descriptions (§14.3, p. 303); both static branches followed (p. 305) | FK-W: witness-bound names (`Restrict`, `Choose`) keep slot values within the bound U_C(E) | witness §2.3-2.4 (proposed); P2 argued | P2 unproved; union is the one constructor JGS classes as increasing | P2 lemma statement | proposed |
| O42 | None: JGS §14.3 applied faithfully rejects a pure union on a self-loop (p. 304); the Trick (§4.8.3, p. 92-93) assumes a finite set already computed | FK-U: pure unions of caller row variables keep keys finite (the walk probe) | U-a, finite-powerset closure (witness §2.7, argued) | U-b definedness; U-c waits for Task 8; a local rule under ADR 014 | U-a/U-b statement, inactive until FK-U is adopted | unresolved |
| O43 | A finite abstract analysis is not a finite set of concrete keys (JGS p. 303 versus §14.4) | Adm_W's table and R010's check are decidable; FK-0 and FK-W are the further argument | none beyond the distinction | JGS's §14.4 proof is a sketch | cite the distinction in the FK statements | argued |
| O44 | Online size heuristics are not theorems (JGS §14.1, p. 297-298) | `specializationLimit = 10000` (src/Features/Specialize/State.purs:101) is a resource guard, never a termination argument | decision 3 (§18.66); ADR 007 | none | keep the limit as decision 9's resource-limit reason | argued |
| O45 | One entry point, one `poly` (JGS); MLton duplicates a recursive group as a unit (implementation documentation) | per-component bounds compose over the component DAG with finite seeds and memoization | design §4.2 (argued) | the DAG induction, stated with FK-0 | state with O40 | argued |
| O46 | Boolean unification (Martin–Nipkow, JSC 1989, Lemma 3.3, Thms 3.4, 3.6; Lemma 4.5 for presented algebras); Flix SVE (OOPSLA 2020 §3.2, §3.5) | G1 presence: on `LDFragment` with no flexible type variable at a field position, `ValidOpen` holds iff a certificate exists whose pieces are guarded by per-label Boolean formulas over rigid membership bits (PF1) | boolean-elimination.md Q-b (script-checked on 2³); `d5_refused` (cell certificates refuse `divide5`) | PF1 and a finite-rows lemma unstated (finite rows lack a unit); guards deferred (§18.48, decision 7); ADR 014 new combination | none now: guards stay deferred (D4, §18.69); later, a statements-only note, with an exhaustive check in a grammar fixed in advance if authorized | proposed |
| O47 | Pottier LICS 2003 conditional constraints (§2.3, §4; satisfiability only) | typed field obligations per guarded region; flexible type variables shared across labels; nested types | `programs/shared-type-*.wxw` (shared-term flags refuse valid programs) | no ∀∃ typed account; per-label independence fails under shared type variables | counterexample search for cross-label coupling | unresolved |
| O48 | Jones FPCA 1995 `r has l : t` with improvement (Fig. 1, PDF p. 2; §4.1, PDF p. 3-4); Gaster–Jones TR 96-3, extension plus `lacks` (Thms 1-2, p. 8) | for forced presence, `A(r,l)` is "the unique t with r has l : t" (the determinacy IF6 needs); how references surface is not decided here (D6, deferred with G2) | witness option B (requirements §4.2) | exported `has` makes `D` not clause-only (IF5) | an interface note, statements only, when G2 is authorized (D6's deferral stands, §18.69) | argued |
| O49 | None: Jones and Gaster–Jones need presence entailed; Pottier's guarded constraints decide satisfiability only | a reference whose presence is conditional (requirements §6.3) | none | depends on O46's guards; ADR 014 new combination | after O46 (guards deferred, D4, §18.69) | unresolved |
| O50 | LRAT checking (Cruz-Filipe et al., §4 Thm 1, PDF p. 8; Coq and ACL2 checkers, PDF p. 11-12; checking cost Thm 2, PDF p. 9) | an UNSAT certificate, checked by a verified checker, discharges cell `cover` for a fixed certificate; a SAT model is never a Contradiction (CX) | QX4 `CheckTautology` (coNP-hard, argued); `coverS` | ENC-S (soundness) and ENC-C (meaningful refusals) unstated; no demonstrated need (ADR 014 clause 4) | ENC-S/ENC-C statements only if `cover` needs them (D5's default, `coverS`/QX3, stands, §18.69) | proposed |
| O51 | Leroy, JAR 2009, value relations for layouts (§11.3, p. 53; §12.3, p. 57) | at each key the lowered record value corresponds field by field to the source value (`V_k`); Lay is its type projection | fx differential suite (Go vs reference interpreter); record-layout coverage not checked | a label swap between same-typed fields passes every binding check | state `V_k`; same-typed-field mutants as a differential fixture family | unresolved |
| O52 | Leroy Defs. 5-7, Thms 1, 2, 4 (§2.1-2.3, p. 3-9; §3.7, p. 16-17); resources not preserved (§17.4, p. 71-72) | preservation: value or divergence, plus console trace and defect report, modulo resource exhaustion; one simulation obligation per pass | fx differential suite; register: "no backend correctness proof claimed" | target determinism unstated; defects are behaviour, not "Wrong" | one-page preservation statement in J001's design | unresolved |
| O53 | Translation validation (Leroy §2.2.2, p. 7, Def. 9, Thm 1) | RC validates a weaker property (typing, callee keys, layout definedness at reached keys), unverified; it answers "unsupported", never a verdict | witness §3.1, §3.3, §3.4 | wording only | one sentence naming RC's property in Leroy's terms (proposal for W) | argued |
| O54 | Haack–Wells, ESOP 2003, Thms 5.2, 6.1, 6.2 (p. 11, 14, 15): minimal errors are faithful and accurate, for equality constraints | a diagnostic that names a culprit names a member of some minimal error; effect provenance names a path only | row `fx-provenance` (behaviour); docs/engineering.md "Blame needs evidence" | Haack–Wells covers established contradictions, not Unresolved; enumeration is exponential | classify diagnostics as path or participation claims; a two-site fixture pair | unresolved |
| O55 | Haack–Wells monotonicity: a superset of an unsolvable set is unsolvable | diagnostic slicing is not constraint decomposition (S1/S2); under `ValidOpen` removing `D` hypotheses can break validity | fixtures `vacuity-one-slice`, `field-clash` (slicing/statements.md) | any minimal invalid core would be new (ADR 014) | record the distinction | argued |
| O56 | Koka POPL 2017 operational semantics (Fig. 4, p. 8): deep handlers; a clause runs outside its handler | Waxwing's handler selection and clause context match, for the resume-free fragment; marker-aimed aborts and `defer` are Waxwing's own | pinned oracle rows (`fx-clause-context`; test/fx-oracle.test.mjs:79) | a written frame correspondence | part of INF001's design, as IF7's baseline | argued |
| O57 | Koka 2017 §5, selective CPS with LAM-DUP (p. 10-12), with no correctness theorem | compiling a future `resume` (FX006) to JavaScript (J001) under ADR 010's row erasure | ADR 010 lists two options; LAM-DUP is a third | the CPS decision must precede erasure; ADR 014 new combination | source comparison in the FX006/J001 design | unresolved |
| O58 | Koka 2017 OPEN and CLOSE (§3.2, p. 7; losslessness argued, not proved) | Waxwing opens a closed row only when a declaration reference is instantiated | ADR 010 (accepted local departure; eta-expansion workaround) | none | cite as the alternative in INF001's design | argued |
| O59 | Jones FPCA 1993 Thm 1 (p. 8; kind-preserving mgu without constructor abstraction), §4.1-4.2 (p. 10; defaulting, synonyms); Koka 2017 Fig. 1 (p. 6) | K001: value, record-row and effect-row kinds with first-order constructor application; the two row sorts stay distinct. Waxwing's row-sort defaulting is Jones's kind-defaulting move with a different default (argued); Jones's Theorem 1 is not shown to apply (its hypotheses are unchecked for two row sorts with disjoint composition) | language.md "Row sorts" (shipped; unconstrained rows default to effect rows) | none of the sources read (companion §0.1) has a record row kind with disjoint composition; local rule under ADR 014 | K001 source-correspondence note | argued |
| O60 | Dreyer et al. POPL 2007 canonical modules (p. 6) and `using` scope (§2.2, §3.2, p. 3, 5) | two collections share a compatible key policy | register: "Retaining a dictionary alone does not justify merging two collections" | identity holds only under one canonical instance per type; none of the sources read (companion §0.1) proves policy compatibility; ADR 014 new combination | none until M001's design | unresolved |

Counts (63 rows): proved 2 (O6, O9); argued 19 (O14, O21, O22b,
O22d, O26, O28, O32, O35, O37, O38, O43, O44, O45, O48, O53, O55,
O56, O58, O59); experimentally checked 1 (O15); proposed 18 (O1, O8,
O13, O16, O17, O18, O22a, O22c, O24, O25, O27, O29, O31, O39, O40,
O41, O46, O50); unresolved 23 (O2, O3, O4, O5, O7, O10, O11, O12,
O19, O20, O23, O30, O33, O34, O36, O42, O47, O49, O51, O52, O54,
O57, O60).

## 12. Recommended statements (statements only)

None is authorized for proof. These are proposals whose statements
themselves need review before any proof work (dossier §18.66: "no new
proofs before statement review"). IF2, IF4, IF5 and IF6 were revised
after the author's corrections and companion §1; the companion adds
EL1-EL5 (§2), which also await statement review.

- **IF1, generation correspondence.** Given a declarative typing
  relation for the record fragment, a declaration is typable exactly
  when its recorded problem is `ValidOpen`. The EMLTI analogue is
  Theorems 10.4.4 and 10.4.8. Prerequisite: that relation.
- **IF2, framework hypotheses.** Waxwing's entailment (`Sat` over
  finite assignments, ∃ over flexible variables) satisfies HM(X)'s E1-E4
  and the journal version's D1-D6, and OutsideIn(X)'s R1-R8, each stated
  separately, with a counterexample search for any expected to fail. If
  EMLTI's presentation is adopted as the foundation (companion §1.4),
  its model conditions replace most of this list.
- **IF3, guess-free steps.** A solver step σ may be used when producing
  an exported scheme only if every solution of the original atoms
  satisfies `eqs σ` (the premise of `binding_correspondence`), and
  `shareTails`'s labels-only binding is an instance (its P1).
- **IF4, scheme language and instance order (revised).** Fix the
  scheme language (today's L0, or L0 with ∃ in constraints), the
  admissible substitutions and their scope, and two orders: the
  substitution order (one vector of row terms for all instances) and
  EMLTI's order (entailment between instantiation constraints, read as
  ground-instance inclusion). State for §9 case A that the written
  `submit` signature is below the inferred scheme in EMLTI's order and
  incomparable with it in the substitution order over L0. State that
  EMLTI's order, read over the family of injective base extensions,
  coincides with `ValidOpen` over Waxwing's row model (O24; the O24
  note's GI-Open, over encoding (a)) and that annotation
  checking is entailment of the body's
  instantiation constraint (O25). This fixes what a principality claim
  can mean. D2 (dossier §18.69) chose encoding (a) and kept current
  exported syntax, but did not freeze L0 as sufficient for future
  principal inference, so IF4's scheme-language choice stays open.
- **IF5, satisfiable exported hypotheses.** Before C1 or CX applies to
  a scheme with exported `eq` or `has` atoms, some finite rigid
  assignment satisfies its `D`: a generalization of
  `clauseOnly_satisfiable`, or a decidable check.
- **IF6, determinacy criterion (revised).** Not every constraint-only
  variable is determined (`{ ...a, ...b } = { ...w1, ...w2 }`). The
  semantic criterion: every projected variable that reaches a callee's
  specialization key is determined by the scheme's type variables
  (EMLTI Definition 10.2.14 adapted to `ValidOpen`). A candidate
  sufficient syntactic test, to be checked: the variable occurs once,
  as a whole tail, on one side of a single `eq` atom whose other
  variables are determined (the analogue of EMLTI Lemma 10.6.7, which
  covers only the free tree model). A determined variable is never left
  a hole: its value is computed from the variables that determine it
  (inlined or named, witness §1.3 reuse rule). The hole contract
  (witness/statements.md §1.5) governs only undetermined variables, and
  EL3 only those that reach no key. When the criterion fails, a
  projected variable that reaches a key and is not determined may not
  be projected: the scheme keeps it (L0), or the site is a G3 split
  (rejection or coherence, O19). §9 case A's `u`, `t`, `q` are such
  variables, so the L1 scheme σ″ (companion §1.2), which projects them,
  violates the criterion; the L0 scheme σ_inf keeps them.
- **IF7, failure-family safety.** If a `Fail` key is absent from a
  checked row, no execution ends in an uncaught abort of that family,
  with shared keys (INF001 B5) and marks (B7) stated. Koka's Theorem 6
  is the model, and Koka 2017's Lemma 4b the closer one for user
  effects. Abort-freedom of cleanup is a second, separate statement
  (companion §6, O16).
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

1. These are not alternatives: OutsideIn(X) promises soundness,
   principality when it succeeds and a documented acceptance boundary
   at once (§6). The question is which of these INF001 promises, and
   for principality, in which scheme language and instance order
   (IF4). Companion §1.4-1.5 explains the options and why EMLTI's order
   fits Waxwing's call-site rule; companion decision D2 asks the order
   and scheme-language part. A related question: should complete
   inference (O12) be recorded as an explicit non-goal of INF001, or
   kept as a separate claim to be stated later? Nothing here promises
   it, and `d5_refused` bears only on the cell checker.
   *Decided in part (§18.69, D2):* EMLTI's order through encoding
   (a); current exported syntax kept; L0 not frozen as sufficient for
   future principal inference. Still open: which of soundness,
   principality and an acceptance boundary INF001 promises, and
   whether O12 is a non-goal.
2. When inference meets a residual relationship the signature language
   cannot express (§9 case B): widen `where` with equation or `has`
   atoms, keep the relationship only in an internal scheme language,
   refuse to generalize, or require an annotation? Companion §1.3
   separates the internal language, serialized interfaces and surface
   syntax, which need not change together; companion D2 covers the
   scheme-language choice for case A, and IF6 constrains it.
   *Decided in part (§18.69, D2):* current exported syntax is kept
   for now, so `where` is not widened yet; L0 is not frozen, so an
   internal language or a later widening stays possible. The choice
   for case B is still open.
3. Should IF2 be stated in Lean before any framework is cited as a
   foundation in a design, or is a reviewed prose argument enough for
   the first INF001 design? Not decided by §18.69.

Companion §10 adds the decisions that arise from parts 2-6; the
author decided them on 2026-10-22 (dossier §18.69).

## 15. Review record

**Prose review.** Reviewed 2026-10-21 with the `humanized-prose-review` skill: a
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

**Accuracy review.** A reviewer checked about 50 source locations
against the converted texts (HM(X) 12, Jones 8, EMLTI 17, OutsideIn(X)
16, Koka 12) and every cited Lean name at its line, and reported 20
findings; all were applied on 2026-10-21. Corrections:

- **Citation.** EMLTI does not say Rémy-style rows need disjunction or
  ad hoc forms for concatenation: its rows have none, the ad hoc forms
  are Sulzmann's (2000), and the four-way disjunction is Wand's, for
  extension (§0, O20). Also corrected: the page of Lemmas
  10.6.8-10.6.10 (§3), Jones's `has` taking a record type (§9 case B)
  and the paraphrase of Jones's new-variable condition (§5).
- **Statuses.** O20 proved → unresolved: only a checking-level
  characterization is proved, and a narrower interpretation would not
  match an inference requirement. O16 experimentally checked →
  proposed: no test states the per-family property. O5 and O7 argued
  → unresolved: entailment under `ValidOpen` is undefined, and one
  argued rule is not an argued simplifier. Counts recomputed.
- **Narrowed claims.** O9 and §0 now say clause-only `D`, with source
  signatures producing it under proposed G4-G8; O6 and §5 restrict
  `binding_correspondence` to plain `Sat` and call it sufficient for
  Jones's improvement; `openCharacterization` carries `Scoped` and
  fresh labels (§0, §9 case B); HM(X) Theorem 2 is marked
  reconstructed in §0; EMLTI's solved forms are "established only" for
  the free tree model (§6); §9 case A's validity is argued; X6 is a
  refutation proved only in a scratch copy (§5).
- **Wording.** The online solver's verdict-free role is proposed, not
  current (§2); rule H's unsound exclusions are named, with the review's
  "Rule H's exclusions are unsound" corrected to "some", since
  refusal-audit §3.7 finds some of them sound; O8's C1-M evidence gives
  one direction only; O15's regression row shows necessity on one
  probe; §9's split count is six, not three.

The changed passages were re-reviewed with the `humanized-prose-review`
skill, keeping every fact and qualification.

## 16. Revision after the author's corrections (2026-10-21)

**Corrections applied** (queued request, "First correct or qualify
these points", and companion §1):

- **Forcedness and coherence** (§6, O19): forcedness is uniqueness,
  the analogue of Jones's unambiguity; coherence is equivalent meaning
  across permitted alternatives.
- **OutsideIn(X)** (§0, §6, O10, §14 Q1): principality on success and
  incompleteness coexist; the question no longer offers a false choice.
- **O8:** normalization equivalence (both directions) is separated from
  C1-M's validity monotonicity.
- **Reading scope** (§0, §7, §10, O23, labels): "no source" means none
  of the five sources inspected here.
- **Proved claims** (§0, §6, O12): the three Lean results in §0 carry
  their premises; `d5_refused` is evidence about the cell checker only.
  The matrix's proved rows remain O6 and O9; the author's "three proved
  rows" predates O20's demotion in §15.
- **HM(X)** (§0, §1, §4-§6, O3, O4, O9, O11, O12, IF2): checked on
  rendered pages; the 1999 journal version is cited as authoritative,
  with its class conditions, realizable environments and satisfiable
  judgments. The formulas are no longer marked reconstructed.
- **§9 case A** re-specified (scheme language, substitutions, orders)
  with its claims marked argued; case B gains the determinacy
  counterexample and the projection to `has`.
- **IF4-IF6** restated as proposals needing statement review; IF6 now
  states a determinacy criterion instead of claiming every
  constraint-only variable is determined.
- **§11:** O22 split into O22a-d; rows O24-O60 added from the
  companion; counts recomputed.

**Prose review.** The changed passages were reviewed with the
`humanized-prose-review` skill (catalogued audit, rewrite, re-review,
editorial pass on Garner's, Fowler's, Orwell's and Williams's
principles). Findings fixed: "every statement" claims narrowed to the
five sources; a status sentence that let a theorem's existence imply
the compiler meets its premises, now stated as a non-implication; an
ambiguous "it" in §0's record bullet checked and kept (its antecedent
is the written signature). Every fact, location and qualification was
kept.

## 17. Status and citation reviews of 4ce8f74 (2026-10-21)

Two read-only reviews (model output, kept outside the repository)
checked this document and the companion at 4ce8f74: a status review
(19 findings) and a citation audit (13 findings). Neither found
anything blocking; all findings were applied. The companion's §12
records its own changes. Here:

- **Premises.** §0 cites `openCharacterization_scoped` (premises
  `Scoped P` and fresh labels), a corollary of `openCharacterization`,
  which also assumes `ExistsWithinAt` (checked at
  Typed/Bridge/Complete.lean:89). §0's case A instance claim now
  assumes Waxwing's row model is an EMLTI model and ground inclusion
  matches `ValidOpen` (O24).
- **IF6 and O17.** The false sentence "the hole contract holds for a
  determined variable" is replaced: a determined variable is never a
  hole, and the hole contract governs only undetermined variables.
  IF6 now says what happens when its criterion fails (the variable is
  not projected, or the site is a G3 split), so the L1 scheme σ″
  violates it; O17's interpretation uses the same wording.
- **Rows split or narrowed, status kept.** O31 and O32 are argued
  only if D1 adopts the continuation. O37 and O38 state the argued
  finding as the interpretation and move the proposed obligation to
  the next action. O48's interpretation is the argued correspondence
  for forced presence; how references surface is deferred with G2
  (D6). O59 says the row-sort defaulting is Jones's move (argued) and
  that Jones's Theorem 1 is not shown to apply. O15's interpretation is
  what the run shows: necessity on one probe, termination of the suite
  with the condition. O6 states `binding_correspondence` in its own
  form and marks the improvement correspondence argued. O8 cites
  Rules.lean:40, and its "can make an invalid one valid" is marked
  argued.
- **Counts.** Recomputed from the matrix: unchanged (proved 2, argued
  20, experimentally checked 1, proposed 16, unresolved 24).
- **Citations.** HM(X) journal Theorem 12 is on p. 13 (§1, §6, O12;
  the classes span p. 12-13, O4). O21 now rests non-derivability on
  OutsideIn(X)'s VarCon (Fig. 10, PDF p. 25) and cites BindA (PDF
  p. 41) only for algorithmic rejection. O24 cites EMLTI's open-world
  remark on printed p. 423, with "would not be extensive". O16 names
  the qualifier Koka 2017 Theorem 1 needs (ε with operation labels).
  O59 and O60 say "none of the sources read" instead of "no source".
- **Cross-references.** The decisions are in companion §10, and O27's
  design comparison in companion §2. §14 Q1 adds whether complete
  inference (O12) is an explicit non-goal, and Q1 and Q2 point to
  companion D2. §16 notes that the author's "three proved rows"
  predates O20's demotion in §15. O50 points to D5 as a recorded
  default.

## 18. External review, 2026-10-22

An external review, forwarded by the author (the reviewer did not
rebuild Lean or audit every row), raised six issues. Issues 1, 2 and 5
bear on this document and the companion; issues 3, 4 and 6 concern the
R0 documents and are handled there. The review's recommendations on
companion D1-D6 are recorded in companion §10, pending the author's
confirmation (since adopted, §20). Changes here:

- **O24, partial composition (issue 1).** EMLTI's Definition 10.2.5
  (checked on the rendered page, printed p. 411) makes every type
  constructor denote "a total function"; Waxwing's disjoint composition
  is undefined when fields overlap. §0, §3, O1 and O24 now say that the
  correspondence needs an encoding (for example, composition as a
  relation with definedness obligations), not an identification of
  models, and that EMLTI's theorems transfer only through it. O24's
  next action is the narrow correspondence note
  (docs/plans/2026-10-22-o24-emlti-correspondence.md), since written
  and integrated below. Status unchanged at the time (unresolved).
- **Coverage (issue 2).** A `build` of type `Witness → Either
  ElabFault a` can still request a variable the witness does not bind.
  O27's gap and O31's interpretation now name the three ways to obtain
  coverage (tracked requests, a restricted builder interface, an
  explicit coverage theorem; companion D1). O31 argued → proposed: its
  claim that Cov's domain is "the variables the continuation reads"
  is not defined for an opaque function until D1 picks a mechanism.
- **Writable principal signatures (issue 5).** §9 and O4 now report
  only the bounded result: a scratch search over labels only, not
  recorded, over conjunctions of up to three of six candidate atoms.
  Whether any writable `where` clause is principal is unresolved.
- **"Argued" (review's closing note).** The labels paragraph now says
  that "argued" describes a conditional argument and is not an
  implementation guarantee.
- **Counts.** Recomputed: proved 2, argued 19, experimentally checked
  1, proposed 17, unresolved 24.
- **O24 note integrated.** The note
  (docs/plans/2026-10-22-o24-emlti-correspondence.md) finds that
  direct identification fails (argued): ⊎ is partial, and Definition
  10.2.5 requires total constructors. It recommends encoding (a),
  composition as a ternary predicate U(t, r, s) with total
  constructors, and proposes the statements M0, T1, T2, V, GI, GI-Open,
  GI-Atoms, GI-Fin and F, none reviewed or proved. O24 unresolved →
  proposed, with the note's interpretation: the row model with U is an
  EMLTI model, and ground inclusion at every injective base extension
  coincides with `ValidOpen` (at X_W(B ⊕ ℕ) given B1b). The row lists
  what it does not give: principal types in L0, a solver, soundness of
  record primitives, elaboration, `ValidAll`'s infinite rows and
  coincidence at the unextended X_W(B). The note's ADR 014 flags are
  cited in the row. §0, §3 and IF4 (§12) now cite the note.
  Counts recomputed from the matrix by script: proved 2, argued 19,
  experimentally checked 1, proposed 18, unresolved 23.

## 19. Review of the correction pass, 2026-10-22

A read-only review (model output, kept outside the repository) checked
the correction pass and the O24 note's integration. Nothing blocked.
Changes here:

- **§0 wording (finding 2).** §0 now says Waxwing's row model
  "corresponds, through an encoding, to an EMLTI model", as the
  companion does. The §16 and §18 entries that say "is an EMLTI model"
  are historical and stay.
- **O24 row (findings 5 and 8).** The O24 note's GI-Atoms now uses
  X_W^atoms(B) (carriers over B ⊕ ℕ, constructors `base (inl b)`
  only), since X_W(B ⊕ ℕ) names the `inr n` atoms. The row uses that
  name, says GI-Open reads EMLTI's per-model order over the family of
  injective base extensions, and lists that reading among the ADR 014
  flags. IF4 (§12) is qualified the same way. The note's other
  corrections (T1, GI-Open's proof route, the Case A premise) change
  none of the row's claims.
- **O31 row (finding 15).** Under the coverage-theorem mechanism,
  Cov's domain is fixed independently and the theorem states that
  `build`'s requests lie in it; the old wording was circular. The
  row's interpretation now says so.
- **Counts.** No status changed: proved 2, argued 19, experimentally
  checked 1, proposed 18, unresolved 23.

## 20. Author's decisions (§18.69), 2026-10-22

The author forwarded a second external review and adopted its
recommended answers to Q1-Q13 and companion D1-D6 (dossier §18.69).
The implementation plan may now be written; implementation and proof
work stay unauthorized. A decision is not evidence, so no status
changed. Where a decision makes a row's claim a chosen design, the row
says "chosen (§18.69), unproved" and keeps its status. Changes here:

- **D1 (O27, O31, O32).** The continuation with tracked applicative
  requests is chosen, unproved. O27's next action is to specify the
  mechanism before implementation; O31's Cov domain is the tracked
  set; O32's condition on D1 is met. O27 and O31 stay proposed, O32
  argued.
- **D2 (O10, O11, O24, IF4, §14 Q1 and Q2).** Encoding (a) is chosen,
  unproved; M0, T1, T2, V, GI, F and GI-Open go to statement review for
  a focused proof tranche; GI-Atoms stays conditional on B1b. Current
  exported syntax is kept, but L0 is not frozen as sufficient for
  future principal inference. O24 stays proposed, O10 and O11
  unresolved. §14 Q1 and Q2 are decided in part; what stays open is
  marked there.
- **D3 (O39).** The C8-J note waits for stable witness and termination
  interfaces; no selection rule. O39 stays proposed.
- **D4-D6 (O46, O48, O49, O50).** Guards deferred; D5's `coverS`/QX3
  default and D6's deferral with G2 stand. Statuses unchanged.
- **§14 Q3** is not decided by §18.69.
- **Counts.** Recomputed from the matrix by script, unchanged: proved
  2, argued 19, experimentally checked 1, proposed 18, unresolved 23.
