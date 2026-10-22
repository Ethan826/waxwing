# Inference foundations, extended: elaboration, coherence, specialization and assurance

Written 2026-10-21 at the author's request (research/division-campaign/
remedy/queued-request-inference-extension.md, parts 1-6). **A research
extension of docs/plans/2026-10-22-inference-foundations-assessment.md**
("the assessment"). It changes no compiler code, builds no prototype,
adds no Lean proof and adopts no language policy. Accepted decisions
(dossier §18.65-18.67) stay in force. Every Waxwing statement proposed
here awaits statement review. The six R0 documents under
research/division-campaign/{r0,witness,refute}/ are not edited; §11
lists proposed changes to them.

The question: **which published results connect signature checking
and inference to typed elaboration, specialization and compilation,
and what does each leave for Waxwing to adapt?**

**One index.** The assessment's §11 matrix is the only obligations
index. This document refers to its rows (O1-O60) and keeps no index of
its own. §0.2 maps the provisional IDs used during reading to rows.

**Statuses** are the matrix's five: proved (a Lean-checked Waxwing
theorem, under its premises), argued, experimentally checked (a
recorded run or test in the repository), proposed, unresolved. A
published theorem is *cited*: it supports an argued correspondence and
is never "proved" for Waxwing. A check run only in a scratch copy is
reported as such and does not make a row experimentally checked.
"Argued" describes a conditional argument, not an implementation
guarantee (assessment, labels).

## 0. Sources, reading status and method

### 0.1 Reading status

Six bounded, read-only readers covered parts 1-6; their reports are
model output, kept outside the repository. The integration owner
re-checked the claims this document relies on centrally against the
source text or the repository (§0.3). "Read in full" means the whole
text was read; "sections" lists what was read. Page numbers are PDF
pages unless marked "printed".

| Source | Kind | Read | Link | Used in |
|---|---|---|---|---|
| Sulzmann, Odersky, Wehr, *Type Inference with Constrained Types*, 1996 | workshop paper, 12 pp. | in full; formulas transcribed from rendered pages; no printed folios | https://publikationen.bibliothek.kit.edu/26696 | §1 |
| Odersky, Sulzmann, Wehr, same title, *TAPOS* 5(1), 1999; final preprint of 4 June 1998 | journal paper (preprint; journal pages not on this copy, printed folio = PDF page) | §1-§6 and appendix, rendered; §7 (records) not read | https://infoscience.epfl.ch/record/64388 | §1 |
| [Sul96], [Sul97] (YALEU/DCS/RR-1102); Sulzmann's thesis, Yale 2000 | technical reports, thesis | not accessed (Yale URLs fail; no copy found) | none working | §1 |
| Pottier, Rémy, *The Essence of ML Type Inference*, ATTAPL ch. 10 | book chapter | §10.2-10.3 rendered; the rest from the assessment's reading | https://cambium.inria.fr/~fpottier/publis/emlti-final.pdf | §1 |
| Vytiniotis et al., *OutsideIn(X)*, JFP draft 2011 | journal draft | PDF p. 22-24, 46, 51 rendered; the rest from the assessment | https://simon.peytonjones.org/assets/pdfs/outsideinx.pdf | §1 |
| Pottier, *Hindley-Milner Elaboration in Applicative Style*, ICFP 2014 | conference paper, 10 pp. | in full, rendered | https://pauillac.inria.fr/~fpottier/publis/fpottier-elaboration.pdf | §2 |
| Inferno documentation (odoc, undated) | implementation documentation | index, `Solver.Make`, `Generalization.Make`, `Decoder.Make` in full | https://cambium.inria.fr/~fpottier/inferno/doc/inferno/ | §2 |
| Inferno source, commit aa1745df2f (2025-05-07) | implementation evidence | client/Infer.ml (annotations, `coerce`, letrec), CheckML, CheckF, TestMLRandom, FTypeChecker.mli | https://gitlab.inria.fr/fpottier/inferno | §2 |
| Jones, *Coherence for Qualified Types*, Yale RR-989, 1993 | technical report, 10 pp. | in full (text); p. 4, 9 rendered | https://web.cecs.pdx.edu/~mpj/pubs/coherence.html | §3 |
| Jones, *Qualified Types: Theory and Practice*, Oxford PRG-106, 1992 | thesis (book: CUP 1994, not consulted) | ch. 5 intro, §5.3-5.4.1, §5.8-5.9, §2.4, §4.7; p. 77-78 rendered; poor OCR elsewhere; proofs not read | https://www.cs.ox.ac.uk/files/3432/PRG106.pdf | §3 |
| Jones, Gomard, Sestoft, *Partial Evaluation and Automatic Program Generation*, 1993 | book (author-hosted PDF) | ch. 14 in full; §4.4.1-4.4.2, §4.4.5-4.4.6, §4.8.3, §5.4.1, §5.5.1, §10.6, §12.2; printed pages | https://raspi.itu.dk/people/sestoft/pebook/toc.html (PDF: https://raspi.itu.dk/people/sestoft/pebook/jonesgomardsestoft-a4.pdf) | §4 |
| MLton "Monomorphise" page | implementation documentation | in full | http://mlton.org/Monomorphise | §4 |
| Cruz-Filipe, Heule, Hunt, Kaufmann, Schneider-Kamp, *Efficient Certified RAT Verification* | conference paper (author preprint, Feb 2017; CADE version not compared) | in full | https://www.cs.cmu.edu/~mheule/publications/lrat.pdf | §5 |
| Gaster, Jones, *A Polymorphic Type System for Extensible Records and Variants*, NOTTCS-TR-96-3 | technical report, 12 pp. | in full | https://web.cecs.pdx.edu/~mpj/pubs/96-3.pdf | §5 |
| Jones, *Simplifying and Improving Qualified Types*, FPCA 1995 | conference paper | Fig. 1 and §4.1 re-read; the rest from the assessment | https://web.cecs.pdx.edu/~mpj/pubs/fpca95.pdf | §5 |
| Martin–Nipkow (JSC 1989); Flix (OOPSLA 2020); Pottier (LICS 2003); Simon (PLDI 2014) | papers | not re-read; reused from the repository's readings (§5) | as cited there | §5 |
| Leroy, *A Formally Verified Compiler Back-end*, JAR 2009 (arXiv v3) | journal article | sections: §1-§2, §3.7, §11.3, §12-12.3, §15.1, §17.4; other passes by heading only | https://arxiv.org/abs/0902.2137 | §6 |
| Haack, Wells, *Type Error Slicing in Implicitly Typed Higher-Order Languages*, ESOP 2003 (author's copy; SCP 2004 version not read) | conference paper | in full; proofs not in this version | https://www.macs.hw.ac.uk/~jbw/papers/Haack+Wells:Type-Error-Slicing-in-Implicitly-Typed-Higher-Order-Languages:ESOP-2003.pdf | §6 |
| Leijen, *Type Directed Compilation of Row-Typed Algebraic Effects*, POPL 2017 | conference paper | in full; Theorem 1 compared with MSR-TR-2016-29 v3 | https://www.microsoft.com/en-us/research/publication/type-directed-compilation-row-typed-algebraic-effects/ | §6 |
| Jones, *A System of Constructor Classes*, FPCA 1993 | conference paper | §3-§4 and closing comments in full; §1-§2 skimmed; proofs in the thesis, not read | https://web.cecs.pdx.edu/~mpj/pubs/fpca93.html | §6 |
| Dreyer, Harper, Chakravarty, *Modular Type Classes*, POPL 2007 (preprint) | conference paper | in full; companion TR not read | https://people.mpi-sws.org/~dreyer/papers/mtc/main-short.pdf | §6 |

Leads named but not read: Hughes, *Type Specialisation for the
λ-calculus*; the ECMA-335 "expanding cycle" rule; rustc's
monomorphization limit (search summary only); Martinot and Scherer,
*Quantified Applicatives*; Nielsen 2001 (selective CPS); Leijen's
scoped-labels paper; Tseitin, Cook–Reckhow, Haken; the DRAT-trim
paper; cake_lpr; Lean's LRAT checker behind `bv_decide`.

### 0.2 Provisional IDs and matrix rows

| Reader ID | Row | Reader ID | Row | Reader ID | Row |
|---|---|---|---|---|---|
| Part 1 item 1 | O3, O4, O9, O11, O12 | J1 | O34 | P5-A (presence) | O46 |
| Part 1 item 2(a) | O24 | J2 | O35 | P5-A (typed, nested) | O47 |
| Part 1 item 2(b) | O25 | J3 | O36 | P5-B (forced) | O48 |
| Part 1 item 3 | O17, O26 | J4 | O37 | P5-B (guarded) | O49 |
| Part 1 item 5 | O10 | J5 | O22c | P5-C | O50 |
| EL-a | O27 | J6 | O38 | AM1 | O51 |
| EL-b | O28 | J7 | O39 | AM2 | O52 |
| EL-c | O29 | K1 | O40 | AM3 | O53 |
| EL-d | O30 | K2 | O41 | AM4 | O54 |
| EL-e | O31 | K3 | O42 | AM5 | O55 |
| EL-f | O32 | K4 | O43 | AM6 | O56 |
| EL4, meaning | O33 | K5 | O44 | AM7 | O16 |
| | | K6 | O45 | AM8 | O57 |
| | | K7 | O22a-d | AM9 | O58 |
| | | | | AM10 | O59 |
| | | | | AM11 | O38 |
| | | | | AM12 | O60 |

### 0.3 What the integration owner re-checked

Against the source text: HM(X) journal Theorem 12, its class
conditions, "not sufficient" (p. 12) and the satisfiability requirement
(p. 6); OutsideIn(X)'s principality-on-success sentences (PDF p. 24,
51); Pottier's "grain of salt" and footnote 7 (PDF p. 10); Jones
RR-989's call-by-name restriction (p. 4) and unambiguity (p. 9); the
thesis's `AV` definitions (§5.8.3); the definition of bounded static
variation and "poly is finite if and only if…" (JGS printed p. 299-300);
the LRAT experiment's numbers (PDF p. 13); Koka 2017 Lemma 4b's wording;
Haack and Wells's `minErrors` and "need not be minimally unsolvable";
Dreyer et al.'s `EqInt1`/`EqInt2` example and total functors.

Against the repository: `d5_refused`, `d5_open`, `cellOpenImpl`,
`openCharacterization_scoped`, `mguExists` (it gives one most general
unifier per pattern and cell list; a reader's "finite sets" was
imprecise and is not used), `eval_split`, `accepted_split`,
`e3_differs`, `e2_covers₂`, `e2_not_covers₁` and `specializationLimit`,
each at the line cited.

A later read-only citation audit of 4ce8f74 (§12) checked most of the
remaining page and quotation claims against the sources: Inferno's
documentation and source, Pottier 2014, OutsideIn(X), Jones RR-989,
the thesis and FPCA 1993 and 1995, JGS, MLton, LRAT, Gaster–Jones,
Leroy, Haack–Wells, Koka 2013 and 2017, Dreyer et al., EMLTI and the
HM(X) journal version, and every repository citation. Its corrections
are applied (§12).

§12 lists the claims still taken from the reports without a re-check;
one is also marked "(report)" where it appears.

## 1. The foundation, re-checked

### 1.1 HM(X) on rendered pages

The assessment's §1, §4-§6 and rows O3, O4, O9, O11 and O12 now carry
these corrections; this section records the transcriptions.

- **Workshop paper.** (∀ Intro): from C ∪ D, Γ ⊢ e : τ with
  ᾱ ∉ tv(C) ∪ tv(Γ), conclude C ∪ ∃ᾱ.D, Γ ⊢ e : ∀ᾱ.D ⇒ τ. (∀ Elim)
  instantiates with explicit types τ̄ and needs C ⊢e [τ̄/ᾱ]D (Fig. 2,
  PDF p. 4). The instance rules (Fig. 3, PDF p. 5) are (REF)
  ∅ ⊢i τ ⪯ τ, (⪯∀) and (∀⪯), the last again with explicit τ̄.
  Definition 8 (PDF p. 5) asks for a *minimal* normalization. Theorem 1
  (PDF p. 6) concludes C, ψΓ ⊢ e : τ, ψC = C and ψτ = τ. Theorem 2
  (PDF p. 6) assumes C′, Γ′ ⊢ e : σ′ and C′ ⊢i φΓ ⪯ Γ′. Definition 12
  (PDF p. 12) generalizes over (tv(σ) ∪ tv(C)) \ tv(Γ).
- **Journal version** (authoritative). (REF) becomes (Sub): from
  C ⊢e (τ = τ′) conclude C ⊢i τ ⪯ τ′, so type equality is entailed,
  though (∀⪯) still instantiates with explicit types (p. 12). Normal
  forms and the principal constraint property replace minimality
  (p. 10). F1-F6 become D1-D6; D5 is congruence for every constructor
  (p. 5). `gen` splits the constraint into a part kept outside and a
  part quantified (p. 11). Valid judgments must have satisfiable
  constraints (p. 6). Theorem 12 (completeness, p. 13) needs X in 𝒳^a
  (solved forms are exactly the satisfiable constraints, plus the
  principal constraint property) or 𝒳^r (regular theories, the
  principal constraint property and simplified solved forms), and a
  realizable environment. The authors give Kennedy's dimension types as
  the reason the property alone "is not sufficient" (p. 12). Semantic
  soundness (Theorem 7, p. 9) needs X sound and coherent. The appendix
  sketches the 𝒳^r proof; for 𝒳^a it says the proof "is similar"; many
  lemmas cite [Sul97], not accessed.

**Status.** The transcriptions are cited facts. Whether Waxwing's
constraint system lies in 𝒳^a or 𝒳^r is unresolved (O4); regularity
is unlikely to hold because unification over disjoint composition is not
unitary: §9 case B of the assessment has two incomparable unifiers
(argued).

### 1.2 Case A: scheme language, substitutions and order

**Question.** Is the written `submit` signature an instance of the
scheme inferred from its body, under which order, in which scheme
language? (Assessment §9 case A; rows O11, O21, O24, O25.)

**The schemes** (illustrative syntax, not Waxwing):

```text
σ_inf = ∀u t q s s2. (u # s, t # s2, q lacks {id}, u t q pairwise #)
          ⇒ ({ ...u, ...t, ...q }, { ...s }, { ...s2 }) -> Unit
σ_w   = ∀r s s2. (s # s2) ⇒ ({ ...r }, { ...s }, { ...s2 }) -> Unit
```

**Scheme language L0 (today).** Record types are fields plus tails;
constraints are conjunctions of `lacks` and `disjoint`; all quantified
variables are universal. `without` is an expression form only
(language.md, Records), so no type says "r restricted to labels
outside s".

**Admissible substitutions.** One vector of L0 row terms over σ_w's
variables and fresh variables, used for every instance. This is the
scope of (∀⪯) in HM(X), of OutsideIn(X)'s Definition 3.3 (PDF p. 22)
and of Jones's generic instances (FPCA 1995, PDF p. 2). The rule (⪯∀)
forbids the outer constraint from mentioning σ_w's variables, so no
outer constraint can carry witnesses that depend on `r`.

**Two orders.**

- *Substitution order:* σ1 is above σ2 when, for some term vector,
  σ2's constraint entails σ1's instantiated constraint and the
  instantiated type equals σ2's type. This is HM(X)'s ⊢i, OutsideIn(X)'s
  Definition 3.3 and Jones's order.
- *Ground-instance inclusion:* every ground instance of σ2 is a ground
  instance of σ1, the witness chosen per ground assignment. This is the
  meaning EMLTI gives schemes (Fig. 10-5, printed p. 414).

**The separation (argued).** In L0 under the substitution order,
equating `{ ...u, ...t, ...q }` with `{ ...r }` makes one of the three
equal to `r` and the others empty; each choice then needs `r # s`,
`r # s2` or `r lacks {id}`, which `s # s2` does not give. Under ground
inclusion every instance of σ_w is one of σ_inf: put `r`'s labels
outside `s` in `u`, the rest in `t`, and leave `q` empty. A reader's
bounded check over the labels `{id, x, y}`, field types ignored, agrees;
it ran in a scratch copy and is not recorded. Jones's satisfiable-
instance order does not close the gap, because its instances range
over open types.

**Challenges that change the reading (argued).**

1. *σ_w is not derivable in the classic systems.* In HM(X)'s and
   OutsideIn(X)'s typing rules the derivation instantiates `file` with
   terms (OutsideIn(X)'s VarCon, Fig. 10, PDF p. 25), so `submit : σ_w`
   has no derivation. Their principality and completeness theorems
   concern a typing relation narrower than `ValidOpen`; that is why they
   do not contradict the separation. EMLTI's presentation does derive
   it: hmx-Inst instantiates by constraint, hmx-Exists hides the
   instantiated variables, and weakening (Lemma 10.3.1) uses `s # s2 ⊩
   ∃u t q.(…)` (Fig. 10-7, printed p. 423).
2. *The substitution order is the wrong one for Waxwing.* Waxwing's call
   sites already instantiate callees with flexible copies that may
   depend on the caller's rigid variables (ADR 007; recorder-rules
   §5.1). That is EMLTI-style instantiation, under which σ_inf is above
   σ_w, assuming Waxwing's row model corresponds to an EMLTI model and
   ground inclusion matches `ValidOpen` (O24, proposed). The
   correspondence needs an encoding: EMLTI's models interpret type
   constructors as total functions (Definition 10.2.5, printed
   p. 411), and disjoint composition is partial. The substitution
   order should be kept only to describe what the HM(X), OutsideIn(X)
   and Jones theorems cover.
3. *A richer internal language changes the example.* With ∃ inside
   constraints (L1), σ″ = ∀r s s2. (∃u t q. r = u ⊎ t ⊎ q ∧ D_file) ⇒
   ({ ...r }, { ...s }, { ...s2 }) -> Unit is above both σ_w and σ_inf
   even in HM(X)'s own order, and has the same ground instances as
   σ_inf. With Boolean row terms (L2: `r ∖ s`, `r ∩ s`), u := r ∖ s,
   t := r ∩ s, q := {} makes σ_w a substitution instance; that
   substitution is exactly G1's conditional split (requirements §7;
   §5 here).
4. *The projected constraint is a disjunction.* σ″'s constraint is
   equivalent, on labels, to "not (`id` ∈ r and `id` ∈ s and
   `id` ∈ s2)". Six writable atoms (`s # s2`, `r # s`, `r # s2` and
   `lacks {id}` on each of `r`, `s`, `s2`) each imply it, and none
   implies another. A reader's search, run in a scratch copy over
   labels only and not recorded in the repository, found no
   conjunction of up to three of these six atoms that is principal
   among the signatures built from them. That is bounded evidence, not
   a universal impossibility: whether any writable `where` clause is
   principal is unresolved, and settling it needs a general argument
   over an exactly stated scheme language.

**Three layers, kept apart.** The *internal scheme language* needs
nothing new for case A under EMLTI's order: σ_inf is writable in L0.
∃ in constraints is needed only to present a type-shaped principal
scheme. *Serialized module interfaces* are written signatures today;
σ_inf serializes with today's atoms, σ″ does not. *Annotation syntax*
needs no change. Requiring users to write a principal form for σ_w's
variables alone would need disjunction if no writable clause is
principal, which item 4 leaves unresolved; this document does not
recommend disjunction.

**Smallest missing adaptation.** (a) Encode Waxwing's row model as an
EMLTI model and argue that EMLTI's ground inclusion coincides with
`ValidOpen`, which quantifies over injective base extensions. The two
cannot simply be identified: Definition 10.2.5 makes every type
constructor denote "a total function", and disjoint composition is
undefined on overlapping fields, so the encoding must represent
composition differently, for example as a relation with definedness
obligations. EMLTI does not treat open-world interpretations, though it
says adopting Odersky et al.'s approach "would not be extensive"
(printed p. 423). The O24 note
(docs/plans/2026-10-22-o24-emlti-correspondence.md) finds direct
identification fails (argued) and recommends encoding (a): composition
as a ternary predicate U(t, r, s), constructors total. Its GI-Open
states, without proof, that ground inclusion at every injective base
extension then coincides with `ValidOpen` (O24, proposed).
(b) State annotation checking as entailment of the body's
instantiation constraint; EMLTI has no annotations (O25, proposed).
**Depends on** IF1's declarative relation and O2.
**Next deliverable:** IF4 as revised in the assessment's §12.

### 1.3 Case B: constraint-only variables, projection, satisfiability

**Program** (illustrative): `fn stamp(doc, extra) =
stamp1(merge(doc, extra))`, recorded as `{ ...a, ...b } = { id: Int,
...w }` with `a # b` (assessment §9 case B).

**What the sources cover (cited).** HM(X)'s `gen` binds every free
variable of the constraint universally, while its ideal semantics
treats variables occurring only in constraints existentially (journal
p. 8); ⊢i still demands term witnesses. EMLTI treats them semantically
and turns ∀ into ∃ only for determined variables (C-LetAll,
Definition 10.2.14, printed p. 417; Example 10.2.16 shows the failure
without it). Both have existential projection (HM(X)'s cylindric ∃,
E1-E4; EMLTI's hmx-Exists). Jones 1995 has no ∃ and no composition
type, so `w` stays ambiguous by his syntactic test. On satisfiability:
the HM(X) journal version requires satisfiable judgments (p. 6), EMLTI's
hmx-Var requires C ⊩ ∃σ (printed p. 423), and Jones requires P0 sat.
None of the three has an evidence theorem; the HM(X) journal version
integrates Jones only for systems where projections of solved
constraints are trivial (p. 3), which composition equations fail.

**Adaptations (argued).**

1. *Projection.* ∃w.(a # b ∧ { ...a, ...b } = { id: Int, ...w }) is
   equivalent to a # b ∧ ({ ...a, ...b } has id: Int). The internal
   language therefore needs either an `eq` atom with a constraint-only
   variable or a `has` over a composition (O26). Either is an ADR 014
   new combination.
2. *IF6's determinacy criterion.* What must be determined is not every
   constraint-only variable but every projected variable that reaches a
   callee's specialization key. Case B's `w` is determined by
   cancellation of disjoint union, so `stamp1`'s key is a function of
   `stamp`'s. Case A's `u`, `t`, `q` reach a key and are *not*
   determined, so they may not be projected: the scheme keeps them (L0,
   σ_inf), or the site is a G3 split, answered by rejection or by
   coherence (§3), not by determinacy. The L1 scheme σ″ of §1.2, which
   projects them, therefore violates IF6. A counterexample to "every
   constraint-only variable is determined": `{ ...a, ...b } = { ...w1,
   ...w2 }`. The candidate sufficient syntactic test is in the
   assessment's IF6.
3. *IF5.* A satisfiability decision for `D` with `eq` or `has` atoms.
   Case B's `D` is satisfiable (`a = { id: Int }`, `b = w = {}`).

**Status:** O26 argued; O17 proposed. **Depends on** §1.2(a) and §3 for
undetermined variables. **Next deliverable:** IF5 and IF6 as revised.

### 1.4 The smallest suitable foundation

**Recommendation (argued): EMLTI's presentation of HM(X), with an
encoding of Waxwing's row model as X.** Its instantiation is by
constraint, so it derives `ValidOpen`-style signatures whose
witnesses depend on the rigid instance, matching Waxwing's call-site
rule. Its generation is sound and complete for any X (Theorems 10.4.4
and 10.4.8, printed p. 433-434), where X is a model in the sense of
Definition 10.2.5 (printed p. 411), whose type constructors denote
total functions.
Waxwing's disjoint composition is partial: it is undefined when fields
overlap. So the row model is not such an X as it stands, and the
theorems transfer to Waxwing only through an encoding, for example
composition as a relation with definedness obligations, shown to agree
with `ValidOpen` (O24, proposed). The O24 note
(docs/plans/2026-10-22-o24-emlti-correspondence.md) recommends that
encoding as a ternary predicate U(t, r, s) with total constructors,
and states M0, T1, T2, V, GI and GI-Open (unproved) for it; schemes
then become U-chains, so a flattening lemma F is needed, and EMLTI's
solver and row laws do not cover U.
Given such an encoding, principality read as "least specific
constraint" needs no normal-form, regularity or
principal-constraint-property obligation. Determinacy (Definition
10.2.14) answers the ∀/∃ question for constraint-only variables.

**What it leaves:** the encoding of partial composition and the other
model conditions (Definition 10.2.5 and C-Arrow); the open-world match
(O24); a Waxwing solver, since EMLTI's
solver is proved for the equality free tree model only; presenting
exported schemes, where case A's disjunction lives (O4); and
elaboration, which EMLTI does not cover (§2).

**Why not the others.**

- *HM(X) as published (either version):* its ∀ Elim and ⊢i need term
  witnesses, so σ_w is not derivable; its completeness needs 𝒳^r,
  which Waxwing likely fails, or 𝒳^a, whose proof is only sketched.
  Its axiomatic style remains citable for IF2's checks; it is not
  needed as a second foundation.
- *Jones 1995:* syntactic generic instances and no ∃. Useful for
  (Simp) and (Imp) on exported schemes.
- *OutsideIn(X):* VarCon instantiates with terms (Fig. 10, PDF p. 25),
  so σ_w has no derivation when X's types are L0. Algorithmically, BindA
  leaves no residual (PDF p. 41), so the algorithm rejects it. It is the
  right model for an *acceptance policy* on unannotated bindings (§1.5).

**ADR 014.** EMLTI's HM(X) instantiated with a disjoint-composition
row model is a new combination: no published instance exists, and
EMLTI cites only Sulzmann's "ad hoc" forms (printed p. 489).

### 1.5 OutsideIn(X): principal on success, incomplete by design

Theorem 3.2 (PDF p. 23) and Theorem 5.2 (PDF p. 46) say that an
accepted binding's inferred type is principal; the same pages say
nothing about failure. PDF p. 23-24: even when "the type system lacks
principal types", accepted unannotated bindings "do have principal
types". PDF p. 51: "The absence of completeness is by design", followed
by the guarantee for accepted definitions. The author's correction 2
is confirmed: the two properties coexist, and the assessment's
question 1 is restated.

**Caveat (argued).** "Principal" there is relative to Definition 3.3,
which instantiates with terms. Waxwing would need OutsideIn(X)'s
guess-free condition (Definition 3.2, P1) restated under `ValidOpen`
and EMLTI's order (O10). That is an adaptation, not a citation.

### 1.6 Soundness and completeness of part 1's claims

*Soundness.* The case A separation rests on an argument plus an
unrecorded bounded check that ignores field types; field types could
only add constraints, so they cannot create a substitution where none
exists for labels (argued). The claim that σ_w is not derivable in
OutsideIn(X) rests on VarCon's term instantiation, given X's type
language is L0 (with L2 terms it would be derivable, §1.2 item 3); the
full rule set is unchecked. *Completeness.* Not examined: HM(X) journal
§7 (records), which might contain a record system with relevant atoms;
Sulzmann's thesis; scheme languages between L1 and L2.

## 2. Typed elaboration (rows O18, O27-O33)

**What Pottier 2014 establishes (cited, PDF pages).** A solver that
answers only "satisfiable" gives no explicitly typed term (§1-§2,
p. 1-3). Elaboration must wait for solving, because "constraint
solving is a non-local process" (§3, p. 3). The pearl expresses
generation and elaboration together as constraints that produce values
(`∃α.C` yields the decoded witness for α; `x τ` yields the
instantiation vector; `let` yields a scheme and two terms), through an
applicative functor with no bind (§4.3, p. 5-6). The semantics (App. A,
Fig. 9, p. 9) chooses witnesses non-deterministically. The only
correctness statements, solver correct and complete with respect to
Fig. 9 (p. 10), are stated "with a grain of salt, as we have not
conducted any proofs", and footnote 7 says the produced value need not
be unique. Abstracting over exactly the scheme's quantifiers is
"wrong"; elaboration coerces the extra variables (App. B, p. 10), and
Inferno's `coerce` instantiates them with `∀a.a`, which is
meaning-neutral only because they are unconstrained (Inferno's
client/Infer.ml). The idea "is not specific of the Hindley-Milner
setting" (§6, p. 8), and the high-level interface can be built above
any low-level solver "provided the low-level solver produces some form
of satisfiability witness" (same page).

**What Inferno adds (implementation documentation and source).** `letr1`
solves with rigid variables, then lets uses instantiate them, which is
Waxwing's shape. `instance` returns types in the scheme's quantifier
order, as Waxwing's `Instantiation` does
(src/Domain/Checked/Internal.purs). Rigid variables unify only with
younger flexible ones, or `VariableScopeEscape` is raised.
Well-typedness of elaborated terms is *tested*: random ML terms are
translated to System F and checked by an independent checker. That
checker confirms typability, not equality with the inferred type.

**Three guarantees, kept separate.**

| Guarantee | Pottier / Inferno | Waxwing analogue | Row, status |
|---|---|---|---|
| Successful elaboration | stated, unproved (p. 10); value not unique | V plus `Witnessed` from a constructive adapter (Cov) | O27, O28: proposed, argued |
| Well-typed elaboration | no theorem; tested by an independent checker | Adapt-N, R, Lay, K (witness §4), re-checked at reached keys by RC1-RC6 | O30: unresolved |
| Preservation of meaning | not stated; HM to System F rests on erasure | erasure fails: layouts and keys depend on types, and a split can change behaviour | O33: unresolved |

**The central non-transfer (argued).** Pottier's non-determinism is
harmless in HM because every produced term erases to the same untyped
term. In Waxwing two valid witnesses for the same problem may lower to
different programs, so forcedness or coherence (§3) is essential.

### Gap records

**O27. Generation that also builds the checked IR.** *Question:*
should R0's generator return, with each `RecordedProblem`, a
continuation that builds the checked IR from a witness, instead of the
current route in which the checked IR comes from reading settled types
back (recorder-rules §5.3)? *Separating program* (illustrative):

```text
both(x: { ...a, ...b }): { ...a, ...b } where a disjoint b
fn f(p: { ...r }): { ...r } = both(p)
```

The settled type `{ ...r }` cannot be matched uniquely against
`{ ...a′, ...b′ }`; recorder-rules §5.3 already calls this read-back
"ambiguous" and leaves it to the strategy's adapter. A continuation
reads `a′` and `b′` from the witness directly, then inherits whatever
split the strategy chose, which is G3. *Published:* the applicative
interface and the single recursive generator that builds constraint and
elaboration together (§4.3, §5.2, Fig. 8, p. 5-7). *Correspondence:*
R0's G-total, G-local and G-fresh are the generator's properties;
`vars.position` is a static list of the places a value will be read,
which Pottier's `decode` calls replace. Building inside the
continuation removes the separate list, but it does not by itself make
W's R2 or Cov hold: a `build` of type `Witness → Either ElabFault a`
can still request a variable the witness does not bind. Coverage needs
one of the mechanisms listed under D1 (tracked requests, a restricted
builder interface, or an explicit coverage theorem). No bind is needed
because no R0 rule branches on a solved shape (recorder-rules §4).
*Smallest adaptation:* a pure `Elaborating a = { problem, build ∷
Witness → Either ElabFault a }`, the analogue of Pottier's `rawco ×
(witness → α)`. *Statement* EL1: for every `Witness` satisfying Cov and
Adapt-N's conclusion, `build` is defined and yields the checked IR.
EL1 presupposes that Cov's domain contains every variable `build`
requests; D1's coverage mechanism is what makes that domain definite.
*Depends on* T-R0a/T-R0b ownership and §18.67 Q1(e). *Next:* a design
note for the R0 owners comparing both routes, with acceptance tests
(the same IR at every unambiguous site; no read-back). **Proposed.**
Decision D1 (§10).

**O28. Values only after the verdict.** Decisions 1 and 4 match
Pottier's discipline, and the non-locality argument does not depend on
the constraint domain. Pottier's `decode` corresponds to the
per-strategy adapter (Adapt-N), not to unification; a non-constructive
strategy (`NoWitness NonConstructive`) breaks Pottier's premise, which
agrees with decision 4's rule that no witness means no lowering.
*Separating program:* `divide5` (no uniform substitution, O21), whose
witness must be key-dependent (`Restrict`, `Choose`). *Adaptation:* the
continuation's input is a `Witness`, not a substitution, and it is
never invoked on `NoWitness`. **Argued.**

**O29. Binder scope and quantifier coercion.** One ∀rigid/∃flexible
prefix per declaration matches `letr1`; recursion against a declared
scheme matches Inferno's letrec elaboration. Two points need row
arguments. First, Inferno's level discipline would refuse `divide5`,
whose flexible values depend non-uniformly on the rigid instance
(argued from O21), so citing Inferno for Waxwing's quantifier handling
would overclaim. Second, HM may default unconstrained quantifiers;
Waxwing's are constrained, and defaulting `u` to `{}` breaks `route`
(split-irrelevance/ground-check.md §3). *Statement* EL3: a variable
read by `build` but not determined may be defaulted only under the hole
contract (witness §1.5). *Depends on* IF6 and §18.67 Q6. **Proposed.**

**O30. Well-typed elaboration with named witnesses.** `Inline`
bindings correspond to decoded types. `Named` bindings (key-dependent
case analyses) have no counterpart in these sources; Pottier's
suggested `let a = T in t` abbreviations name types, not case analyses
(§6, p. 8). Inferno's oracle is a symbolic checker for the target
calculus; Waxwing's is the ground re-check, per key and for reached
keys only (witness §3.4 item 2). *Statement* EL2: at every reached key
the lowered `build` result is well typed under the ground typing; it
needs Lay and R1. *Adaptation:* specify, without building, a key-wise
re-typer independent of the strategy, bounded to reached keys. ADR 014:
key-dependent decoded values are a new combination. **Unresolved.**

**O31. Compilation-relevant bindings.** In Inferno only the variables
passed to `decode` or `instance`, or returned by `let`, get values
(Solver docs). Under O27, Cov's domain should become "the variables
`build` requests", so that no separate positional list can drift from
it. An opaque `build` does not expose that set: it is defined only if
requests are tracked or the builder interface is restricted (D1 (a),
(b)). Otherwise (D1 (c)) Cov's domain is fixed independently, for
example as the problem's non-auxiliary flexible variables, and a
coverage theorem states that the variables `build` requests lie in
it. Auxiliaries still need
values for RC2, evaluated from their defining atoms (recorder-rules
§5.3), a use Pottier never makes. *Separating program:* E26 `p.a`,
whose auxiliary `⟨p, rest⟩` has no checked-IR position. **Proposed**,
conditional on D1 adopting the continuation and choosing a coverage
mechanism (argued before the external review of 2026-10-22, §12).

**O32. Field references (G2), interface only.** If D1 adopts the
continuation (O27): Pottier's value type is a parameter, so adding
`Field r l` to `TyTerm` (reserved in W §1.4) changes neither
`generate`'s type nor EL1 (statement EL5). The new obligation is
partiality: `Field r l` is undefined when `r` lacks `l`, so `build`
returns `Either` from the start, and each use carries a definedness
condition (guarded by `Choose (r, l, true)` or entailed by `D`).
*Separating program:* requirements §6.3's `{ ...r, ...x } = { a: β, ...y
}`. G2 stays deferred (decision 8). ADR 014: partial, key-dependent
decoded values. **Argued** (compatibility only).

**O33. Meaning preservation.** *Statement* EL4: at a split site whose
basis is forced, any two valid witnesses give equal lowered programs
at every key. Weaker forms belong to §3. **Unresolved.**

### Challenges to these correspondences

1. Pottier's `decode` reads one most general solution; Waxwing's
   strategies return certificates that are not substitutions, so
   "decode" is an interface with one adapter proof per strategy.
2. The applicative restriction binds R0: a future generation rule that
   branches on a solved shape needs bind and breaks the pattern.
3. Inferno's well-typedness oracle is not a meaning oracle, and RC has
   the same limit ("RC accepts any satisfying split", W §3.4 item 4).
4. Citing Pottier 2014 means citing a design and a specification, not
   a theorem: Fig. 9 is unproved and the cost claim is hedged.

## 3. Coherence before split selection (rows O19, O34-O39)

**What Jones establishes (cited).** RR-989 translates an implicitly
typed source (OML, no recursion, no signatures) into a target with
explicit evidence (OP). Different derivations can give inequivalent
translations (§2, p. 3-4). Equality of translations includes β, so it
"is not sound in models of the λ-calculus with call-by-value
semantics" (p. 4). Uniqueness of evidence is a hypothesis (§3.1, p. 4);
the thesis adds that it must be verified for each predicate system
(§5.4.1, printed p. 60-61). Definition 5 (p. 9): a scheme is
*unambiguous* when its quantified variables that occur in the
predicates also occur in the type. Theorem 5 (p. 9): any two
translations of a term whose principal scheme is unambiguous are equal.
The proof's second step needs injective type constructors (report).
The condition is sufficient, not necessary. Jones never selects a
translation: infer the principal type, reject it if ambiguous (p. 9);
coherence means "an implementation is free to use whichever
translation is more convenient" (thesis printed p. 52). The thesis
weakens unambiguity where evidence does not depend on a variable,
replacing TV(Q) by AV(Q), with AV(r has l : t) = TV(r) (§5.8.3,
printed p. 77-78).

**Correction 1, applied.** Forcedness (a uniquely determined split)
is the record analogue of Jones's *unambiguity*, a sufficient
condition. Coherence is equivalence of meaning across the permitted
splits. Jones's AV weakening is the published pattern for coherence
without uniqueness. The assessment's §6 and O19 now say this.

**Where the correspondence breaks (argued).**

| Jones | Waxwing | Challenge |
|---|---|---|
| translation | the specialized program at a key | OP erases types, so splits that differ only in instantiation give the same OP term; Waxwing's keys, layouts and print checks carry the split. Treating keys and witnesses as evidence is a reinterpretation |
| instantiating types in a conversion | the split | close fit |
| Definition 5 | forcedness | breaks: `divide`'s `{ ...u, ...v }` is unambiguous by Definition 5, yet `{x}` arises from `u = {x}` and from `v = {x}` because `⊎` is not injective (research/division-campaign/compile/split-selection.md §3.2). Literal transport proves coherence only for forced splits |
| uniqueness of evidence | none for row atoms (ADR 013) | Jones's sorted-offset evidence fixes record offsets; Waxwing's sorted layout does so for the whole record, not its parts |
| AV weakening | restricted C8 | transfers as a proof pattern, not a theorem |
| βη equality | `eval_split`'s operational equality | Jones's equality is unsound for call-by-value; Waxwing is call-by-value with effects |
| factoring through the principal translation | none | needs a principal scheme and an order (O10, O11, IF4), all unresolved |

### Gap records

**O34. Uniqueness of a split.** *Question:* is the split determined by
the complete obligations, `pr` and `cmp` included? *Separating
program* (dossier §3.2, §5, program 4): `fn acceptsParts(whole:
{ ...r, ...s }): Text where s lacks { admin }`, called with
`{ admin: false }`, has one split; without the `lacks` clause it has
two. *Published:* EMLTI Definition 10.2.14; Jones Definition 5 only
under a free type algebra. *Adaptation:* determinacy over `ValidOpen`
with requirement atoms (§18.62 item 1). *Depends on* `ValidOpenR` and
IF6; who decides forcedness is open (§18.67 Q7). **Unresolved**
(argued for the examples).

**O35. Equal behaviour under different splits (restricted C8).**
*Separating programs:* printing `{ ...u, ...v }` cannot differ,
because records print with sorted labels (language.md, "Comparison and
printing"); projection can (E3, `e3_differs`, proved in the model); a
hypothetical layout-dependent FFI could. *Evidence:* `eval_split`
(proved: split variants, projection-free, agree on projection-free
terms at any keys and fuel); C8-rt (argued, current constructs); the
holes analogue (ADR 007 conditions 1 and 4; test/poly-properties.
test.mjs runs programs at Int and Bool). *Adaptation:* extend R to
`==` results, data, effects, handlers, `Fail` and update, and state
A-go. **Argued.**

**O36. Acceptance under different splits.** *Separating program:* E2:
an unapplied `fn(p: { ...u }) => show(p)` is accepted with `u = {}`
and refused with `u = { f }` (compile/split-selection.md §3.4);
`p == p` behaves likewise for comparability. Jones has no
counterpart: his equality concerns meaning, and Definition 5 rejects
rather than filters.
*Evidence:* `e2_not_covers₁`, `e2_covers₂`; `accepted_split`
(conditional on `Covers` and declared interfaces). *Next:* a statement
that the selection contract returns a witness satisfying the complete
`BQ`, or Unresolved. **Unresolved.**

**O37. Stability of inferred interfaces.** E2′ (dossier §18): a
generic caller's inferred `pr` lands on different regions under
different splits, so its callers are accepted under one and refused
under the other. Jones's order (principal type first, then the
ambiguity test) supports selecting only after inference. *Next:* an
"interfaces before selection" clause, a proposed obligation (an
exported interface never depends on a split selection; today it holds
only vacuously, because interfaces are declared). **Argued** for the
finding; the obligation is proposed.

**O38. Explicit dictionary choices.** `combineAll(sum, xs)` and
`combineAll(product, xs)` at `Int` are both well typed with different
results (C001 assurance.md). Jones's uniqueness of evidence would
identify them, which is the case Jones excludes (p. 4); so C001
dictionaries must not be modelled as Jones evidence. They are ordinary
values, and the analogue of `Erase C = id` (Definition 3, p. 7) forbids
any conversion from changing them. Dreyer et al.'s `EqInt1`/`EqInt2`
example (§3.1, p. 5) shows what an inferred dictionary parameter could
flip; mandatory signatures exclude it today (argued). Implicit
construction would need totality, as Dreyer et al. require of instance
functors (p. 2, 6): a `with pure` dictionary constructor can diverge,
because `pure` is not totality (ADR 010). None of the sources read
(§0.1) proves dictionary laws. **Argued** for the finding; the
obligation that inference, split selection and any future implicit
layer preserve every dictionary operand term is proposed (C001's
explicit-selection gate, itself proposed).

**O39. Could coherence support a selection policy?** *Recommendation,
no policy chosen (argued):* yes, in one layer. A restricted-C8 theorem
in Jones's AV form would make the choice among valid,
requirement-satisfying, admissible splits irrelevant to run-time
meaning, and a deterministic choice would then be an implementation
freedom, Jones's own reading. It would not justify acceptance (O36),
interface stability (O37), key finiteness (O22c) or byte-identical Go
(requirements §5.3). Jones's Theorem 5 cannot be cited as the theorem:
it is call-by-name, assumes a free type algebra, factors through a
principal translation, has no recursion or signatures, and erases the
types that carry the split. *Recommended composition:* Jones for the
shape of the argument, EMLTI determinacy for O34, and `eval_split` and
`accepted_split` as the operational core. *Next:* one statements-only
"C8-J" note with one owner: split variants at a key; observation sites
(print, compare, project, key, FFI); determined variables; extended R;
the acceptance statement; dictionary preservation; interfaces before
selection; the separating programs above as fixtures in a stated
oracle grammar. **Proposed.** Decision D3 (§10).

**ADR 014 flags (§3).** Evidence reinterpreted as specialization keys
and per-name witnesses; Definition 5 replaced by determinacy under a
non-injective `⊎`; an operational call-by-value relation in place of
βη equality (Jones names this as open work, p. 10); any selection
policy licensed by coherence.

## 4. Specialization termination (rows O22a-d, O40-O45)

**Four kinds of termination (O22a-d).** The O22 row is split. The
separating programs (illustrative, Waxwing-like):

| Program | Inference | Witness evaluation | Keys | Runtime |
|---|---|---|---|---|
| `fn spin(x: { ...r }): Int = spin(x)` | terminates | none needed | one per entering key | diverges |
| `fn g(x: { ...r }, n: Int): Int = if n == 0 then 0 else g({ inner: x }, n + -1)` | terminates | none needed | infinite | terminates after n + 1 calls |
| a name `Fields [(a, List(Field r a))]` (witness §2.5 example 1) | terminates | each evaluation terminates | infinite (`{a: Int}`, `{a: List(Int)}`, …) | n/a |
| `fn f(x: a): Int = f(Cons(x, Nil))` | checks against its signature; inferring it would need polymorphic recursion (undecidable, EMLTI printed p. 452) | none needed | infinite | n/a |

Runtime termination is unrelated to the other three in both directions
(O22d, argued). Witness evaluation terminates structurally over
`NameId` order (witness §1.3, argued; O22b), which says nothing about
keys.

**Correspondence (argued).** JGS's specialized program point
(Definition 4.3, printed p. 78) corresponds to a key; `poly`, the set
of reachable specialized points, to the set of reached keys; "poly is
finite if and only if all static variables assume only finitely many
different values" (p. 299). Every type or row slot is static. A
variable is of *bounded static variation* when, for every static
input, the set of its values over `poly` is finite (p. 299-300).
FK-0, FK-W and FK-U state exactly this, per slot and per entering key,
with a bound that depends on the entering key, as in JGS's Example 14.1
(p. 300).

**Gap records.**

- **O40, FK-0 (proposed).** On the single-tail baseline every slot
  takes values from the entering key's components and written
  constants, so the proof needs no size order: the degenerate case of
  JGS's dependency-chain argument (§14.4, p. 305-306). Record-tail
  type slots are increasing edges off any self-dependency cycle.
  *Next:* revise FK-0 to name bounded static variation as its target
  and state the type-slot-with-tail case.
- **O41, FK-W (proposed).** JGS's increasing, equal and decreasing
  descriptions (§14.3, p. 303) classify witness constructors:
  `Restrict` is decreasing or equal, ground `Fields` parts are
  constants, a constructor over a reference is increasing. JGS follows
  both static branches (p. 305), as CS requires both arms of `Choose`.
  *Next:* the P2 lemma statement.
- **O42, FK-U (unresolved).** Faithful JGS rejects the walk probe
  `walk(whole, {}, n + -1)` with `v′ = { ...u, ...v }`: union is
  increasing (`e1 + e2 ↦ I(V1 ∪ V2)`, p. 304) on a self-loop with no
  decreasing variable. The keys are in fact two. The Trick (§4.8.3,
  p. 92-93) assumes the finite set is already known. FK-U rests on the
  finite-powerset closure U-a (witness §2.7, argued), a local rule.
- **O43, abstract versus concrete (argued).** JGS: congruence of a
  division does not give finiteness of `poly` (p. 299); §14.4's proof
  (pp. 305-306) is the further argument. Waxwing likewise: Adm_W's table
  and R010's check are decidable, and FK-0/FK-W are the further
  argument. JGS's proof is a sketch for a first-order flow-chart
  language over naturals.
- **O44, budgets (argued).** JGS §14.1's online size heuristics are
  not theorems; `specializationLimit = 10000` is a resource guard
  (decision 3).
- **O45, global composition (argued).** JGS has one entry and one
  `poly`; Waxwing composes per-component bounds over the component DAG
  with memoization (design §4.2). MLton duplicates a recursive group
  as a unit and terminates "due to the absence of polymorphic
  recursion in SML", dropping unused constructors of nested datatypes;
  Waxwing's rejection of nested datatypes is stricter and compatible.

**Challenges (argued).**

1. *No dynamic fallback.* JGS can always make a variable dynamic
   ("a congruent finite division is an achievable goal", p. 299).
   Waxwing makes one copy per concrete row (ADR 002, ADR 013) and has
   no dictionary passing for rows, so it must refuse where JGS
   generalizes. JGS's analysis maps to an admissibility rule (layer A),
   not a division.
2. *No decreasing static variable at the type level,* so JGS's escape
   in step 4b never applies; its analysis collapses to "no increasing
   self-dependency", close to the expanding-cycle criterion.
3. *Precision.* `f(a)` calling `g(List(a))` and `g(b)` calling `f(Int)`
   (design §4.3) is finite; JGS's dependency analysis accepts it and
   R010 rejects it.
4. *Different proof routes.* JGS argues by size; FK argues by closure
   of a finite universe plus memoization. JGS supports the target
   property and the framing, not FK's proof.
5. *Effect rows are erased from keys* (src/Features/Specialize/
   Ground.purs:25-26). If they become key slots, a new FK clause is
   needed.

**Answer to part 4.** Bounded static variation is an adequate target
property and an adequate baseline for FK-0, without changing the
accepted R019 policy: the documented single-tail rule is argued (ADR
007; FK-0, proposed, unproved) to be a sufficient condition for it, and
the property neither narrows nor endorses composed tails. JGS cannot
justify FK-U, which needs U-a.

**ADR 014.** Low novelty: bounded static variation and `poly` as the
meaning of monomorphization keys (MLton's per-type cache is the same
idea). Flag: FK-U's closure argument in place of JGS's size analysis;
key-dependent static control through `Choose`; the CS syntactic class,
which mirrors R010 and has no published source.

## 5. Conditional witnesses, field references, certified checking (rows O46-O50)

Reused readings, not re-read: Martin–Nipkow and Flix
(research/composition-assessment/division/boolean-elimination.md,
boolean-unification-types.md), row theories (typed-row-theories.md),
Pottier's conditional constraints (concatenation-leads.md) and Simon's
flags (docs/plans/2026-10-20-composition-foundation-assessment.md
§4.3).

**O46. Boolean membership formulas for G1 (proposed).** *Question:*
can per-label Boolean formulas over rigid membership bits represent
G1's witnesses ("label `l` goes to `u` if `s` lacks it, to `t`
otherwise"), and is that representation complete for presence?
*Separating programs:* `divide5` (one literal per written label: u(l)
= r(l) ∧ ¬s(l), t(l) = r(l) ∧ s(l); every cell certificate refused,
`d5_refused`); `chain3` (two literals; only its routing is recorded);
and `∀r s t. s # t ⇒ ∃u v. r = u ⊎ v ∧ u # s ∧ v # t`, valid with
the hypothesis and invalid without it (boolean-elimination.md Q-b,
script-checked on 2³). *Published:* Boolean unification is unitary,
with Boole's and Löwenheim's reproductive solutions, and Lemma 4.5
brings relations among rigid constants in through a presented algebra
(Martin–Nipkow; reused). Flix treats rigid variables as constants with
a SAT base case; checking is Π₂ᴾ-complete; no type system read handles
hypotheses relating the rigids. *Correspondence (argued):* on
`LDFragment` no two labels are linked, the allowed holder sets at a
label are the models of a 2-CNF, and the cell format's cubes are
already DNF membership formulas for unwritten labels. *Caveat:* finite
rows form a ring without unit, so a guard like `¬s` alone denotes a
cofinite row; a finite-rows lemma bounding witnesses by the rigid rows
is conjectured. *Statement* PF1: on `LDFragment` with no flexible type
variable at a field position, `ValidOpen` holds iff a certificate
exists whose pieces are guarded by per-label formulas over rigid bits,
with witnesses bounded by the rigid rows. *Cost:* guards of at most two
literals keep checking 2-SAT; arbitrary guards are coNP-hard per label,
as is the cell `cover` (QX4, argued). *Depends on* decision 7's order
(R0, termination and the witness contract first) and §18.48 item 3.
*Next:* a statements-only note with PF1 and the finite-rows lemma; if
authorized, an exhaustive small-domain check in a grammar fixed in
advance. ADR 014: new combination (already flagged, §18.47).
Decision D4.

**O47. Typed and nested obligations under guards (unresolved).** Three
cases: copying a source entry (`A(r,l)`) involves no choice; region-wise
type equalities fail at a generic instance because `A(r,l)` is a fresh
constant, and no Boolean source attaches types (Simon's shared-term
flags refuse valid programs, `programs/shared-type-*.wxw`); a flexible
type variable whose value depends on the region (G2's `β`) needs
conditional type terms, whose published form, Pottier's guarded
constraints, decides satisfiability, not ∀∃ entailment. Shared type
variables couple labels and break per-label independence (requirements
§11 item 5); the reader could not construct a valid `LDFragment`
problem needing cross-label type witnesses, which is not a proof.
*Next:* a counterexample search for cross-label coupling.

**O48. Field references forced by declaration (argued; the interface
proposal below is deferred with G2, D6).** Jones's `r has l : t` with
improvement determines `t` from `r` and `l` (FPCA 1995 Fig. 1, PDF p. 2;
§4.1, p. 3-4). Gaster–Jones state positive information by extension and
negative by one `lacks` predicate, prove principal types (Theorems 1-2,
p. 8) and pass offsets as evidence (§5.1, p. 9); they note that Jones's
full system lacked most general unifiers as "the result of including
record restriction in the type language" (p. 2), and have no append (§7,
p. 11). For forced presence, `A(r,l)` is "the unique `t` with `r has l :
t`", which is the determinacy IF6 needs. Evidence does not transfer:
Waxwing passes no row evidence at run time (ADR 013). *Interface
proposal:* keep references as per-name witness metadata (option B) and
surface them in schemes only as `has`-bound variables, not as a type
operator. Exporting `has` makes `D` no longer clause-only (`r has a : T,
r lacks a` is unsatisfiable), so IF5 applies. Deferred with G2 (D6).

**O49. Guarded field references (unresolved).** Requirements §6.3's
example needs a reference whose presence is conditional: presence of
`a` in rigid `r` is not entailed, rigid `r` cannot be an inserter's
target, and `β`'s witness is conditional. Outside Jones and
Gaster–Jones; depends on O46's guards.

**O50. Certified coverage via LRAT (proposed).** *Question:* can a SAT
solver's UNSAT proof, checked by a verified LRAT checker, discharge the
cell `cover` obligation for a fixed certificate? *The propositional
subproblem* (reader's encoding): for each cube K of `L`, φ_K = x_r ∧ K ∧
(¬x_a ∨ ¬x_b for each declared disjoint pair) ∧ (¬K′ for each K′ in
`R`); each ¬K′ is already a clause. *Encoding obligations:* ENC-S
(soundness) says every free occupied cell that `L` selects and `R`
misses gives a model of φ_K, so UNSAT of every φ_K implies `cover`;
ENC-C (only for meaningful refusals) says every model decodes to such a
cell. The trust base also includes variable numbering, serialization and
the check that the verified formula is the encoded one (the Coq checker
does it, about 15 s on the Pythagorean Triples proof, p. 11; the ACL2
checker had not implemented it, p. 13). *Published:* RAT and LRAT
(§2-§3); checker soundness Theorem 1 (§4, p. 8), mechanized in Coq and
ACL2 (p. 11-12). *Costs, kept separate:* search is CDCL plus DRAT
logging and an untrusted conversion (of 241 UNSAT instances, 225
converted within 20,000 s; 12 timed out, 3 crashed, 1 failed, p. 13);
certificate size was 381,468,814 lines and 250 GB for 225 proofs (p.
13), and is not polynomially bounded in general unless NP = coNP
(Cook–Reckhow, not read); checking is polynomial in proof size (Theorem
2, p. 9): ACL2 checked 205 GB in just under 17 hours, covering 212 of
the 225 proofs (it rejected 11 as invalid, ran out of memory on 1 and
crashed on 1), and Coq 88 GB in just under three weeks, covering 161 of
the 225 (59 timed out, 1 ran out of memory and 4 were rejected as
invalid) (p. 13). **Efficient checking does not imply polynomial total
cost.** *Kept separate:* the SAT query certifies one checker obligation
inside `checkI`; `ValidOpen` is ∃-certificate over typed terms, and
presence-only ∀∃ validity is Π₂ᴾ-shaped, not SAT. A SAT model is a
counterexample to one certificate's coverage (Unresolved), never a
Contradiction, which needs CX. *Need:* none demonstrated; the recorded
scenarios need Shannon depth at most 1, and if `coverS` is proved exact
(QX3) SAT adds only speed and a proof format. ADR 014: the encoding is
local glue around widely used black boxes. Recorded default D5:
`coverS`/QX3; LRAT only on demonstrated need.

**Challenges (argued).** Presence completeness is not acceptance
completeness, since requirement atoms depend on the split (A1, D-acc).
Jones's improvement is justified over satisfiable instances; with a
rigid `r`, `r has l : t` is a hypothesis, so its transfer to ∀rigid
entailment is argued only. Gaster–Jones's theorems rely on extension
without concatenation, which O20 says Waxwing lacks. coNP-hardness
(QX4) concerns exact checking of the unrestricted cell format, not
every Waxwing algorithm.

## 6. Assurance beyond inference (rows O16, O51-O60)

**Limits kept explicit.** Binding checks do not establish layout or
generated-code correctness (O51). Diagnostic slicing is not constraint
decomposition (O55). Later Koka results do not cover `nofail`, failure
families or cleanup (O16). Class and module papers prove no dictionary
laws and no collection-policy compatibility (O38, O60).

**O51. Representation at a key (unresolved).** *Separating program:*
`fn diff(r: { a: Int, b: Int, ...t }): Int = r.a - r.b`. A lowering
that maps `a` to `b`'s target field passes every type-level check
(RC1-RC6, Lay's type part, `Sat ρ B`) and prints the negated result;
witness §3.4 item 5 already says RC does not check field reads.
*Published:* Leroy relates layouts by value: memory extension plus
frame agreement (§12.3, p. 57; agreement relation §11.3, p. 53),
proved for CompCert's passes. *Adaptation:* a value relation `V_k`
over the reference interpreter's record values and target values,
with Lay as its type projection. *Next:* state `V_k`; a differential
fixture family of same-typed field pairs with swapped-field mutants.

**O52. Lowering preservation (unresolved).** Leroy: forward simulation
for safe programs plus target determinism gives preservation of
specifications (§2.1, p. 3-6); verified passes compose (Theorem 2,
p. 9); divergence needs a measure (§3.7); stack consumption "is not
naturally preserved by compilation" (§17.4, p. 71-72). *Separating
program:* a cleanup that exhausts the stack; Go fatal errors skip
cleanup (ADR 010). *Correspondence (argued):* Waxwing's defects are
specified behaviour (report text, exit status, cleanup ordering), so
they cannot play Leroy's "Wrong"; the source is deterministic (ADR
001); target determinism is a premise to state (goroutines, map
iteration and JS host callbacks were not audited). *Next:* a one-page
preservation statement in J001's design, Leroy's definitions verbatim,
exclusions listed.

**O53. The ground re-check in Leroy's terms (argued).** RC validates a
weaker property than semantic preservation (typing, callee keys and
layout definedness at reached keys) and is unverified. By Leroy's
Definition 9 and Theorem 1 (§2.2.2, p. 7) it would make the compiler
verified only for that property. It already follows Leroy's rule that
a validator answers false when it cannot establish its property:
unsupported paths are never verdicts (witness §3.3).

**O54. Diagnostic blame (unresolved).** Haack and Wells: minimal errors
are faithful (Theorem 6.1) and accurate (Theorem 6.2), and a minimal
error can be found by `minimize` (correct by Theorem 5.2) with at most
2n unification runs (p. 12), for equality constraints; enumeration is
exponential. Waxwing's effect provenance keeps the first origin per
label, which is Wand-style derivation tracking whose results "need not
be minimally unsolvable" (§1.3, p. 3). *Separating program:* a function
performs `Log` at two sites and its signature lacks `Log`; provenance
names site 1, there are two minimal errors, and removing site 1 does not
fix the program. Haack and Wells apply only to established
contradictions; slicing an Unresolved result would explain a non-error,
which docs/engineering.md forbids. *Next:* classify diagnostics as path
claims or participation claims; the two-site program in both orders as a
fixture pair.

**O55. Slicing versus decomposition (argued).** S1 (slicing/
statements.md) partitions atoms by shared variables and needs a vacuity
disjunct; Haack and Wells find overlapping minimal unsolvable subsets
of a failed problem. Fixtures `vacuity-one-slice` and `field-clash`
separate them. Under `ValidOpen`, removing `D` hypotheses can turn a
valid problem invalid, so Haack and Wells's monotonicity holds only for
`B` with `D` fixed. Any minimal invalid core for ∀rigid/∃flexible
problems is new (ADR 014).

**O16 extended (proposed).** Koka 2017 Lemma 4b (p. 9): an operation
stuck under no handler forces its label into the effect ("if a
function does not have an exc effect, it will never throw an
exception"). It covers user effects, so it is closer to IF7 than Koka
2013's Theorem 6. Theorem 1 as printed (p. 9) claims every closed
well-typed term diverges or reaches a value, for any ε. But a closed
`op(v)` with l ∈ ε is well typed and stuck (Lemma 4b only puts l in
ε). So cite it only for ε with no operation labels, or restate the
conclusion as "diverges, reaches a value, or is stuck on an operation
whose label is in ε".
Neither paper covers `nofail` marks, `defer`, marker-aimed aborts,
head-keyed families or ambient rows. *Separating program:* FX008's
pinned case, a cleanup ending in a typed abort (test/fx-oracle.
test.mjs:69). *Next:* IF7 as two statements, failure-family safety
and cleanup abort-freedom.

**O56. Handler semantics (argued).** In Koka 2017 (Fig. 4, p. 8) a
clause replaces the whole handle expression, so it runs outside its
handler; the innermost handler is chosen; handlers are deep; label
comparison ignores type arguments (p. 6). This matches
`fx-clause-context`, the pinned witness at test/fx-oracle.test.mjs:79,
and ADR 010's innermost-frame rule. Waxwing's marker-aimed aborts,
absence of `resume` and `defer` are its own. *Next:* a frame
correspondence for the resume-free fragment, in INF001's design.

**O57. Compiling `resume` to JavaScript (unresolved).** Koka 2017's
selective CPS (§5, p. 10-12) reads effect types and duplicates
effect-polymorphic functions with a run-time test (LAM-DUP), and has
no correctness theorem. ADR 010 erases rows before specialization, so
the CPS decision would have to be made before erasure. LAM-DUP is a
third option ADR 010 does not list. ADR 014: new combination.

**O58. Opening rule (argued).** Koka 2017 opens any function-typed
expression and closes before generalization (§3.2, p. 7; losslessness
argued, not proved). Waxwing opens only when a declaration reference
is instantiated, an accepted local departure (ADR 010).

**O59. Kinding (argued).** Jones 1993: kind-preserving unification is
sound and most general, decidable because constructors have no
abstraction (Theorem 1, p. 8); unknown kinds default to `∗` and synonyms
must be fully applied (§4.1-4.2, p. 10). Waxwing's two row sorts, with
unconstrained rows defaulting to effect rows, are the same defaulting
move with a different default (argued). Jones's Theorem 1 is not shown
to apply: its hypotheses (no constructor abstraction, a kinded mgu) are
unchecked for two row sorts with disjoint composition, and none of the
sources read (§0.1) has such a kind. *Separating program:* `fn f(x: { a:
Int, ...r }): Unit with ...r` is rejected today and must stay a kind
error; one `Row` kind would accept it.

**O60. Collection policies (unresolved).** Dreyer et al.'s canonical
modules make two same-signature submodules of a canonical module the
same value (p. 6), but only by allowing one canonical instance per type
in scope (`using`, p. 3; §3.2, p. 5). C001 deliberately allows several
same-signature explicit dictionaries with structural types, so the
identity does not transfer; it would need an abstract or generative
policy type. None of the sources read (§0.1) proves two policies
compatible.

**Challenges (argued).** Leroy's route from forward to backward
simulation assumes a deterministic target, which fails for JS host
callbacks and Go goroutines (CF001). Koka 2017's inference results are
inherited from earlier work (§3.3), so the assessment's O12 and O15
caveats carry over. Waxwing also unifies the type arguments of matched
labels (ADR 010); whether Koka does is in its ref. [24], not read.
Jones's coherence condition concerns hidden evidence; citing it for
explicit operands would be a category error.

## 7. Soundness and completeness review of this extension

**Soundness pass** (could a claim here be false?).

- *Status inflation.* No row moved to proved or experimentally checked.
  Every cited theorem supports at most an argued row. Scratch checks
  (case A, case A's disjunction) are labelled unrecorded.
- *Correspondences most at risk:* EMLTI's order coinciding with
  `ValidOpen` (O24) is the load-bearing assumption of §1.4 and is
  unresolved, and it needs an encoding because EMLTI's type
  constructors are total and disjoint composition is partial; "σ_w is
  not derivable in OutsideIn(X)" (§1.2) rests on VarCon's term
  instantiation, given X's type language is L0 (with L2 terms it would
  be derivable, §1.2 item 3), and the full rule set is unchecked;
  "Inferno's levels would refuse `divide5`" (O29) rests on
  O21, itself argued; Jones's AV pattern (O35) is a proof pattern, not a
  theorem; JGS's bounded static variation (O22c) is a property with a
  sketched proof in a different language.
- *Reader claims corrected here:* `mguExists` gives one mgu per pattern
  and cell list, not a finite set; Theorem 2's page is PDF p. 6.

**Completeness pass** (what could be missing?).

- *Sources not read:* [Sul97] and Sulzmann's thesis (the 𝒳^a proof);
  HM(X) journal §7 (records); Jones's thesis proofs and ch. 6
  (recursion, signatures); JGS ch. 15 and §17.3-17.4; Hughes's type
  specialisation; Leijen's scoped labels; Koka's later finalization
  work (the nearest lead for FX008 marks); Nielsen's selective CPS.
- *Questions not covered:* effect-row inference with ambient rows
  (INF001 B1-B7) beyond O16 and O56; generalization of requirement
  atoms (`ValidOpenR` is unstated); the cost of EMLTI-style solving for
  disjoint composition.
- *No source* in either document selects among valid witnesses (O23).
- *Records without a separating program:* O43, O44, O45, O53 and O58
  record distinctions or citations rather than gaps a program could
  separate; their rows are argued on that basis.

## 8. New combinations under ADR 014

| Combination | Row | Components and sources |
|---|---|---|
| EMLTI's HM(X) instantiated with an encoding of a partial, disjoint-composition row model | O24 | EMLTI ch. 10; Waxwing's `ValidOpen` |
| `has` over a composition, or `eq` with a constraint-only variable, in exported schemes | O26, O48 | Jones 1995; Rose (reused) |
| key-dependent decoded values in an elaboration continuation | O30 | Pottier 2014; dossier §18.1 term grammar |
| partial decoded values (`Field r l`) with a definedness condition | O32 | Pottier 2014; W §1.4 |
| hole contract in place of defaulting unconstrained quantifiers | O29 | Pottier App. B; W §1.5 (already flagged) |
| per-key re-typing in place of a symbolic target checker | O30 | Inferno's CheckF discipline; RC |
| Jones's coherence with evidence read as keys and witnesses, determinacy under `⊎`, an operational CBV relation, and any selection policy | O35, O39 | Jones RR-989 and thesis; EMLTI; `eval_split` |
| FK-U's finite-powerset closure in place of JGS's size analysis; `Choose` as static control; the CS class | O41, O42 | JGS ch. 14; witness §2 |
| Boolean guards over rigid bits with hypotheses via Lemma 4.5; typed obligations per region; guarded field references | O46, O47, O49 | Martin–Nipkow; Pottier LICS 2003 (already flagged, §18.47) |
| Waxwing-to-CNF encoding around LRAT | O50 | LRAT; QX4 (local glue) |
| value relation over witness-dependent layouts | O51 | Leroy (method published, relation new) |
| minimal invalid cores with hypotheses | O55 | Haack–Wells |
| selective CPS with row erasure and a single opening site | O57 | Koka 2017 §5; ADR 010 |
| two row kinds under one kinded unifier (shipped local rule) | O59 | Jones 1993; Koka 2017 |
| canonical module identity with structural explicit dictionaries | O60 | Dreyer et al. |

## 9. Research recommendation, in dependency order

Statements and notes only; each waits for the step before it where a
dependency is named. None authorizes proofs or prototypes.

1. **Documentation with no dependencies.** Record the slicing and
   blame distinctions and classify diagnostics (O54, O55); name RC's
   property in Leroy's terms (O53); revise FK-0 to target bounded
   static variation, with the abstract/concrete distinction and the
   budget rule (O40, O43, O44, O45).
2. **R0 interface note** (after the R0 owners' statement review):
   continuation versus read-back, coverage of `build`'s requests
   enforced or proved, values only after the verdict (O27, O28, O31;
   decision D1).
3. **Foundation statements:** statement review of the O24 note's
   §3 (encoding (a), composition as the predicate U; M0, T1, T2, V,
   GI, GI-Open, GI-Atoms, GI-Fin and F, all proposed), IF1's
   declarative relation,
   then IF4 with the open-world match and annotation checking (O24,
   O25), then
   IF5 and IF6 with projection (O26, O17), then EL3 (O29).
4. **Termination statements:** P2 for FK-W (O41); U-a/U-b kept
   inactive (O42); the DAG induction (O45).
5. **C8-J note** (after IF6 and step 4, since O22c is cited): O34-O39,
   then EL4 (O33) and the extended R (O35). Decision D3.
6. **Guards** (after R0, termination and the witness contract, per
   decision 7): PF1 and the finite-rows lemma (O46), the coupling search
   (O47), the field-reference interface note (O48, O49; when G2 is
   authorized), and ENC-S only if `cover` needs it (O50). Decision D4;
   D5 is a recorded default and D6 is deferred with G2.
7. **Designs that own their rows:** IF7's two statements and the frame
   correspondence in INF001 (O16, O56); `V_k` and the preservation
   statement in J001 (O51, O52); O57 in FX006/J001; O59 in K001; O60
   in M001.

## 10. Decisions for the author

D1-D4 ask a question; each explains the options and consequences
before asking, and states this document's recommendation or the
default where it has one. D5 and D6 ask nothing now: D5 records a
default and D6 is deferred with G2. The assessment's §14 Q1 and Q2
overlap D2 and point to it; §14 Q1 also asks whether complete
inference (O12) is an explicit non-goal.

- **D1. How R0 obtains the checked IR (O27).** *Read-back* (today's
  recorder-rules §5.3): the strategy's adapter matches settled types
  against recorded positions. It keeps T-R0a/T-R0b as written, but
  read-back is ambiguous with several flexible tails and the position
  list is maintained separately from its uses. *Generation
  continuation* (Pottier 2014): the generator returns a pure `build`
  over witnesses, so no separate position list is kept. Generation
  must stay applicative (no rule may branch on a solved shape), and
  the R0 interfaces change, which those documents' owners would carry.
  The continuation does not by itself give one variable per position
  or Cov: a `build` of type `Witness → Either ElabFault a` can still
  request a variable the witness does not bind. If D1 adopts the
  continuation, coverage must come from one of three mechanisms, and
  choosing among them is part of the decision:
  (a) *Tracked requests:* the builder declares the variables it reads,
  much as the static part of Pottier's applicative constraint records
  where values are decoded; Cov's domain is that declared set. A read
  outside it is rejected when the `Elaborating` value is built, before
  any witness exists (the declared set is static, as in Pottier's
  applicative structure), so `build` cannot fail for an absent binding.
  (b) *A restricted builder interface:* `build` reads the witness only
  through handles the generator issued for this problem, so the issued
  handles are Cov's domain and no other variable can be named. Handles
  are scoped to the problem by type (rank-2), so a handle from another
  problem does not typecheck, and none is issued for auxiliaries,
  which Cov exempts.
  (c) *An explicit coverage theorem:* `build` stays an unrestricted
  function. Cov's domain is fixed independently of `build` (for
  example, the problem's non-auxiliary flexible variables), and the
  theorem states that, for every witness, the variables `build`
  requests lie in that domain.
  Either way G3 still decides the split. O31 (proposed) and O32
  (argued) hold only on the condition that D1 adopts the
  continuation, O31 also on the choice of mechanism.
- **D2. Instance order and scheme language for IF4 (O10, O11, O24;
  assessment §14 Q1, Q2).** *This document's recommendation (argued,
  §1.2, §1.4; conditional on O24's encoding of partial composition):*
  EMLTI's order, with the substitution order kept only
  to describe what the HM(X), OutsideIn(X) and Jones theorems cover
  (§1.2 calls it "the wrong one" for Waxwing); L0 as the scheme
  language for exported schemes, since σ_inf is writable in L0; ∃ in
  constraints only to present a type-shaped principal scheme. The
  options: *Substitution order:* the HM(X), OutsideIn(X) and Jones
  theorems speak in it, but `submit : σ_w` is not derivable, so
  principality would concern a narrower relation than `ValidOpen`.
  *EMLTI's order* (ground inclusion): matches Waxwing's call-site rule,
  and generation is sound and complete for any model meeting
  Definition 10.2.5, but that definition requires total type
  constructors and disjoint composition is partial, so Waxwing needs
  an encoding of its row model before EMLTI's theorems apply. The O24
  note recommends encoding (a), composition as a ternary predicate
  U(t, r, s) with total constructors (statements proposed, unproved).
  Its costs: schemes are no longer type-shaped (σ_inf becomes a
  U-chain under ∀), so exported L0 schemes need the flattening lemma
  F; and EMLTI's solver and its row laws do not cover U. The encoding,
  the open-world match (O24, GI-Open) and a solver are Waxwing's own.
  Scheme language: *L0* keeps exported schemes writable today; *L1*
  (∃ in constraints,
  internal) gives type-shaped principal schemes that do not serialize
  with today's atoms, and is constrained by IF6: σ″ projects case A's
  `u`, `t`, `q`, which reach `file`'s key undetermined, so σ″ violates
  IF6 as stated; *L2* (Boolean row terms) makes case A a substitution
  instance through G1's split and is a new combination tied to D4.
- **D3. When and in what form decision 6's restricted C8 argument is
  stated (O39).** Dossier §18.66 decision 6 already adopted a
  restricted C8 argument and a selection contract, with no rule chosen,
  applying only where behaviour preservation is justified; this
  decision does not reopen it. *Recommended (§9 step 5):* a
  statements-only C8-J note with one owner, in Jones's AV form, after
  IF6 and the termination statements; it could later license a
  deterministic choice for run-time meaning only. *Later:* defer the
  note, for example until INF001's design fixes the scheme language.
  Until the argument is stated, the behaviour is forcedness only:
  unforced splits stay rejected (Jones's own practice), with no new
  combinations, at the cost of refusing programs whose splits are
  behaviourally irrelevant.
- **D4. Whether the guards investigation may begin (O46).** Decision 7
  defers G1's remedies until R0, termination and the witness contract.
  *Default: wait (decision 7).* It follows decision 7's order and
  avoids rework. *Begin statements now, in parallel (reopens decision
  7):* PF1 and the finite-rows lemma are independent of those
  documents' wording, but a later change to the witness representation
  could invalidate them.
- **D5. `cover` (O50): recorded default, not asked now.** `coverS`,
  proving QX3: exact, inside Lean, adequate for the recorded scenarios
  (Shannon depth at most 1). LRAT only on demonstrated need: LRAT
  proofs as untrusted hints checked by a verified checker are a widely
  used black box and the general form of "split tree as an untrusted
  hint", but they add a proof format and an encoding obligation
  (ENC-S) to the trust base, their search and certificate size are
  unbounded in general, and ADR 014 clause 4 asks for a demonstrated
  need first. No need is demonstrated today.
- **D6. Exported field references (O48, O49): deferred with G2.** G2
  is deferred (decision 8), and the brief asked for compatibility
  only. What is in scope now is what W §1.4 reserves: `Field r l` as
  an internal witness term, with its scope and definedness conditions,
  and EL5's compatibility condition (O32). How references appear in
  exported schemes is asked when G2 is authorized. The options, for
  that time: *`has`-bound variables only (forced presence):* matches
  Jones and Gaster–Jones, supplies IF6's determinacy, but makes `D`
  not clause-only (IF5). *A type operator in `Ty`:* Gaster–Jones
  report that restriction as a type operator cost most general
  unifiers. *Witness metadata only (option B, no export):* no scheme
  change; references stay internal.

**External review recommendations (2026-10-22, pending the author's
confirmation).** An external reviewer, in a review the author
forwarded, recommended the following. They are recorded here as the
reviewer's; none is a decision, and D1-D6 above stay as they were.

- *D1:* develop the continuation design, with coverage enforced or
  proved explicitly.
- *D2:* pursue EMLTI as the candidate; investigate O24 before adopting
  its claimed correspondence or freezing L0 exports.
- *D3:* proceed with statements once the relevant interfaces are
  stable; no selection rule yet.
- *D4:* keep deferred.
- *D5 and D6:* retain the recorded defaults and deferrals.

The reviewer added that "argued" labels are defensible where they
describe conditional arguments and must not be read as established
implementation guarantees. The reviewer's next step is these
corrections plus a narrowly scoped O24 correspondence note, not a
broad campaign, with blanket acceptance of Q1-Q12 and the
implementation plan held until the correction pass is back.

## 11. Proposals outside this document

**R0 documents** (their editors decide; nothing here edits them). The
decision-free items (FK-0's target, RC in Leroy's terms, forcedness
versus coherence, interfaces before selection) were added as labelled
notes at 2443479; the rest wait for D1 or §18.67 Q6 (EL3):

- r0/recorder-rules.md §4 and §5.3: record the continuation alternative
  (O27) and the applicative invariant it relies on; note that Cov's
  domain could be the variables `build` requests, once D1 fixes how
  requests are tracked, restricted or proved covered (O31).
- r0/generation-interface.md: if D1 chooses the continuation,
  `generate` returns `Elaborating`, a pure problem plus `build` (O27).
- witness/statements.md §1.4: EL5's compatibility condition (`build`
  returns `Either`; a definedness condition per `Field`) (O32).
- witness/statements.md §1.5: the hole contract as the precondition of
  quantifier defaulting, EL3 (O29).
- witness/statements.md §2: FK-0's target is bounded static variation
  (JGS printed p. 299-300), with the type-slot-with-tail case and the
  abstract/concrete distinction (O40, O43).
- witness/statements.md §3.4: name RC's property in Leroy's terms, a
  validator for a weaker property (O53).
- witness/statements.md §4 (Cov): domain = variables `build` requests
  under D1 (a) or (b), or a domain fixed independently that `build`'s
  requests provably lie in under D1 (c) (O31).
- r0/boundaries.md, layer P: forcedness is determinacy, a sufficient
  condition; coherence (O35) is separate; add "interfaces before
  selection" (O37) to the selection contract's obligations.

refute/statements.md already uses C1-M as a one-direction monotonicity
fact (its §4 and CX-P, CX-KP), so O8's correction needs no change
there.

## 12. Review record

**Integration (2026-10-21).** Six reader reports were integrated by one
owner; provisional IDs were renumbered into the assessment's §11
(O22a-d, O24-O60). The claims listed in §0.3 were re-checked. Not
re-checked against sources, and taken from the reports: Inferno's
documentation and source details; Leroy's section and page numbers
beyond those quoted; Gaster–Jones's theorem pages; Jones 1993's theorem
pages; Koka 2017's Theorem 1 caveat; Haack–Wells's theorem pages; JGS
pages other than 299-300; MLton's wording; the Martin–Nipkow and Flix
readings reused from the repository; the reader's case A scripts.
The citation audit below has since checked most of these; the
remaining list is at the end of this section.

**Prose review (2026-10-21).** Reviewed with the
`humanized-prose-review` skill: a catalogued audit, a rewrite, a
re-review, then an editorial pass on Garner's, Fowler's, Orwell's and
Williams's plain-style principles. Findings fixed: an overbroad claim
that "every statement here is a proposal" (cited facts are not; now
"every Waxwing statement proposed here"); a vague "where it matters"
about report labels, replaced by a pointer to this section; a hedge
that left an action to an unnamed reader (§1.6, now "has not been
checked"); an informal "looks unlikely" (§1.1); a title that omitted
two of the document's subjects; and an unstated limit, the rows with
no separating program, now listed in §7. Every fact, page, quote and
qualification was kept. Deliberate patterns kept: bold lead sentences
in gap records (the repository's plan style) and contrasts that
correct a likely misreading (forcedness versus coherence; checking
versus inference; efficient checking versus total cost).

**Status and citation reviews of 4ce8f74 (2026-10-21).** Two
read-only reviews (model output, kept outside the repository) checked
this document and the assessment at 4ce8f74: a status review (19
findings) and a citation audit (13 findings). Neither found anything
blocking. All 32 findings were applied; the changes to the
assessment's matrix are recorded in its §17. Repository claims were
re-checked before the central ones changed: `OpenCharacterization`'s
`ExistsWithinAt` premise (Typed/Bridge/Complete.lean:89), C1-M at
Typed/Refute/Rules.lean:40 and the key comment at
src/Features/Specialize/Ground.purs:25-26. Changes here:

- **Statuses and claims.** O31 and O32 are argued only on the
  condition that D1 adopts the continuation; O37 and O38 separate the
  argued finding from the proposed obligation; O48's interface
  proposal is deferred with G2; O59 says only that the defaulting move
  is Jones's and that Theorem 1 is not shown to apply; §1.3's status
  is "O26 argued; O17 proposed". §1.2's claim that σ_inf is above σ_w
  now assumes an EMLTI model and the open-world match (O24). §4's
  answer calls the single-tail rule argued (FK-0, unproved) to be
  sufficient for bounded static variation. §1.3 says that undetermined
  key-reaching variables may not be projected, so L1's σ″ violates
  IF6. IF7's first statement is named failure-family safety
  throughout. "No source" claims about dictionary laws, policy
  compatibility and row kinds now name the sources read.
- **Decisions (§10).** D2 states this document's recommendation first,
  adds EMLTI's model conditions and IF6's constraint on L1, and points
  to assessment §14 Q1 and Q2. D3 now asks when and in what form
  decision 6's restricted C8 argument is stated; "forcedness only" is
  the behaviour until then, not an option. D4's default is to wait
  (decision 7); beginning now is labelled as reopening decision 7. D5
  is a recorded default (`coverS`/QX3; LRAT only on demonstrated
  need). D6 is deferred with G2, scoped now to what W §1.4 reserves.
  No decision was removed, so D1-D6 keep their numbers.
- **Citations.** Koka 2017 Theorem 1 claims no stuck terms; the gap is
  a closed, stuck `op(v)` with l ∈ ε, so it is cited only for ε with
  no operation labels (§6). JGS has no "says nothing about `poly`";
  O43 paraphrases p. 299 instead. Pottier's §6 sentences are quoted in
  their order. "σ_w is not derivable in OutsideIn(X)" rests on
  VarCon's term instantiation (Fig. 10, PDF p. 25), with BindA (PDF
  p. 41) cited only for algorithmic rejection (§1.2, §1.4, §1.6, §7).
  Also corrected: HM(X) journal Theorem 12 is on p. 13; EMLTI's
  open-world remark is on printed p. 423, with its "would not be
  extensive"; OutsideIn(X)'s "lacks principal types" is PDF p. 23-24;
  Haack–Wells's 2n bound is a remark on p. 12, with Theorem 5.2 the
  correctness of `minimize`; Gaster–Jones's quotation starts after
  "as"; LRAT's 205 GB and 88 GB cover 212 and 161 of 225 proofs, and
  the 15 s check is on one instance; key erasure is cited to
  Ground.purs; Koka 2017's label comparison is on p. 6.
- **Re-check tags.** "(report)" and "not re-checked" were dropped for
  claims the audit confirmed (§0.3).

**Still not re-checked against sources.** The Martin–Nipkow, Flix,
Pottier LICS 2003 and Simon readings reused from the repository; the
reader's case A and disjunction scripts (scratch only); the reader's
ENC-S/ENC-C encoding; the step of Jones's Theorem 5 proof that needs
injective type constructors (marked "(report)" in §3); Inferno's
letrec elaboration and the claim that its System F checker confirms
typability, not equality with the inferred type; Leroy's Definitions
5-7 and Theorem 4 and the passes read by heading only; JGS §5.5.1
(printed p. 118-119); Koka 2017 Fig. 1 (p. 6).

**External review, 2026-10-22.** An external review forwarded by the
author (the reviewer did not rebuild Lean or audit every row) raised
six issues; 1, 2 and 5 bear on this document and the assessment, and
3, 4 and 6 concern the R0 documents and are handled there. The
assessment's §18 records its own changes. Here:

- **O24, partial composition (issue 1).** EMLTI's Definition 10.2.5
  was checked on the rendered page (printed p. 411): every type
  constructor of signature K ⇒ κ denotes "a total function" from 𝓜_K
  into 𝓜_κ. Disjoint composition is undefined on overlapping fields.
  §1.2 item 2 and (a), §1.4, §7, §8 and D2 now say that the
  correspondence needs an encoding (for example, composition as a
  relation with definedness obligations), not an identification of
  models; §1.4 no longer lets "sound and complete for any X" apply to
  Waxwing without it. The narrow O24 correspondence note
  (docs/plans/2026-10-22-o24-emlti-correspondence.md) is cited as in
  progress.
- **Coverage (issue 2).** "By construction" is withdrawn from O27 and
  D1: a `build` of type `Witness → Either ElabFault a` can still
  request an absent binding. D1 now presents three coverage mechanisms
  (tracked requests, a restricted builder interface, an explicit
  coverage theorem); EL1 says it presupposes one; O31 and §9 step 2
  and §11's Cov proposals say the same. O31 argued → proposed.
- **Writable principal signatures (issue 5).** §1.2 item 4 and the
  annotation-syntax sentence now report only the bounded result (a
  scratch search over labels only, not recorded, over conjunctions of
  up to three of six candidate atoms) and mark the universal claim
  unresolved.
- **Recommendations and labels.** §10 records the reviewer's D1-D6
  recommendations, pending the author's confirmation. The statuses
  paragraph says that "argued" is a conditional argument, not an
  implementation guarantee.

**O24 note integrated, 2026-10-22.** The note
(docs/plans/2026-10-22-o24-emlti-correspondence.md) is written. It
finds that direct identification fails (argued: ⊎ is partial against
Definition 10.2.5's total constructors), recommends encoding (a),
composition as a ternary predicate U(t, r, s) with total
constructors, and proposes M0, T1, T2, V, GI, GI-Open, GI-Atoms,
GI-Fin and F (statements only). §1.2 (a), §1.4, §9 step 3 and D2 now
cite those findings in place of "in progress"; D2's EMLTI option names
(a)'s costs (lemma F for non-type-shaped schemes; EMLTI's solver and
row laws do not cover U). O24 is proposed in the assessment's matrix;
counts there are recomputed.

**Review of the correction pass, 2026-10-22.** A read-only review
(model output, kept outside the repository) found D1's three coverage
mechanisms each one sentence short of coherent. Applied:

- **(a) tracked requests (finding 14).** "A construction error" did
  not say when. If it were raised when `build` runs, it would be an
  `ElabFault` under another name. D1 (a) now says the read is rejected
  when the `Elaborating` value is built, before any witness exists,
  because the declared set is static.
- **(c) coverage theorem (finding 15).** With Cov's domain defined as
  "the variables `build` requests", the theorem was a tautology. Cov's
  domain is now fixed independently (for example, the problem's
  non-auxiliary flexible variables), and the theorem states that
  `build`'s requests lie in it. O31's text here and in the
  assessment's matrix, and §11's proposal for witness/statements.md
  §4, say the same.
- **(b) restricted builder (finding 16).** D1 (b) now scopes handles
  to the problem by type (rank-2) and issues none for auxiliaries.

No status changes; O31 stays proposed.
