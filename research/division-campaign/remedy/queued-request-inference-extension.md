# Queued request: inference-foundations extension (2026-10-21)

The author's request, checkpointed verbatim (reflowed to 80 columns,
not reworded) to begin after the context reset. See RESUME.md §5.

**This is the right synthesis.** I read the assessment. Its central distinction
is sound: the research establishes how to characterize and check a supplied
signature; it does not yet establish principal inference for Waxwing.

The additional sources fit its open rows particularly well:

- **Pottier’s elaboration work** addresses O18: recovering an explicitly typed
  program from constraint solving.
  [Paper](https://pauillac.inria.fr/~fpottier/publis/fpottier-elaboration.pdf)
- **Jones’s coherence work** addresses O19 and part of G3: when different hidden
  evidence choices preserve meaning.
  [Paper](https://web.cecs.pdx.edu/~mpj/pubs/coherence.html)
- **Specialization literature** addresses the specialization portion of O22/O23,
  separately from inference termination. [Jones–Gomard–Sestoft
  contents](https://raspi.itu.dk/people/sestoft/pebook/toc.html)
- **Later Koka work** extends the assessment beyond the limited 2013 calculus to
  handlers, operational semantics and compilation. [POPL 2017
  paper](https://www.microsoft.com/en-us/research/publication/type-directed-compilation-row-typed-algebraic-effects/)

I would correct several statements before building on the assessment:

1. **It conflates forcedness with coherence in §6.** A forced split is uniquely
   determined. Coherence allows several splits when their permitted elaborations
   have equivalent behavior. Establishing the latter is how we might safely
   relax the former.
2. **Its final question presents a false choice about OutsideIn.** OutsideIn
   supports principality when inference succeeds under its hypotheses, despite
   being incomplete. “Principal” versus “sound with a predictable boundary” is
   not an either/or.
3. **O8 cites body-subset monotonicity as evidence for normalization
   equivalence.** Those are different properties. Removing obligations may
   preserve validity in one direction without preserving solutions or meaning in
   both directions.
4. **The §9 instance-order example deserves focused review.** Its
   ground-instance argument and its claim about unavailable symbolic
   substitutions are currently arguments, not established boundaries. Scheme
   expressiveness, permitted substitution syntax and the instance order must be
   specified together.
5. **“No source addresses…” should mean “none of the five inspected sources
   establishes…”.** The additional literature supplies relevant techniques,
   though not ready-made Waxwing theorems.

Here is the replacement go-forward prompt. It extends the actual research
assessment and leaves the reconciliation work separate.

Expand docs/plans/2026-10-22-inference-foundations-assessment.md into a
source-backed assessment of the remaining connections between signature
checking, inference, typed elaboration, specialization and compilation.

Reuse the completed assessment and its source extractions. Incorporate its
independent review when available. This is a research extension, separate from
the six-document R0 reconciliation; do not take over those editors’ work.

Scope: reading, analysis, documentation and proposed statements. No compiler
implementation, new Lean proofs, new prototype campaign or language-policy
adoption. Existing accepted decisions remain in force.

First correct or qualify these points

- Forcedness and coherence are different. Forcedness establishes uniqueness;
  coherence establishes equivalent meaning despite permitted alternatives.
  Correct §6 and O19 accordingly.
- OutsideIn’s principality-on-success and its incompleteness can coexist. Remove
  the false choice in author question 1.
- O8 must distinguish equivalence-preserving normalization from validity
  monotonicity when body atoms are removed.
- Qualify “no source addresses…” by the actual reading scope.
- Keep the three “proved” rows attached to the exact theorems and their
  premises. Do not let a theorem’s existence imply that the compiler meets its
  hypotheses.
- Keep d5_refused as evidence about the current cell checker, not evidence that
  another inference procedure must be incomplete.
- Treat IF1–IF8 as proposals whose statements themselves need review. In
  particular, IF6 needs a determinacy criterion, not a claim that every
  constraint-only variable is determined.

1. Verify the foundation before relying on reconstructed formulas

Finish the pending assessment review. Check HM(X)’s crucial formulas against
rendered PDF pages, including the actual instance relation, normalization
requirements and theorem hypotheses. Read the necessary deferred proof sources
if a recommendation depends on them.

Re-review §9 case A:
- specify the candidate scheme language;
- specify admissible substitutions and their scope;
- define substitution-based generality and ground-instance inclusion;
- check the claimed separation between them;
- determine whether a richer internal constrained scheme changes the example.

Separate the internal scheme language, serialized module interfaces and
user-written annotation syntax. A needed internal relationship does not by
itself require adopting new surface syntax.

For case B, examine constraint-only variables, existential projection,
satisfiability and evidence relevance together. Determine what is already
covered by HM(X), Jones and EMLTI, and what remains an adaptation.

Do not try to prove every hypothesis of several frameworks merely because all
were cited. Recommend the smallest suitable foundation and identify why the
alternatives are unnecessary or insufficient.

2. Investigate typed elaboration as the connection to compiler input

Read:
- Pottier, Hindley-Milner Elaboration in Applicative Style, ICFP 2014:
  https://pauillac.inria.fr/~fpottier/publis/fpottier-elaboration.pdf
- Inferno’s documented implementation:
  https://cambium.inria.fr/~fpottier/inferno/doc/inferno/

Map constraints carrying elaboration results to:
- syntax-directed generation;
- deferred recovery of solved types;
- binder scope and generalization;
- inline substitutions and per-name typed witnesses;
- compilation-relevant bindings;
- field-type references.

Explain which ideas transfer from HM and which require new row-specific
arguments. Distinguish successful elaboration, well-typed elaboration and
preservation of source meaning.

3. Investigate coherence before proposing split selection

Read Jones, Coherence for Qualified Types:
https://web.cecs.pdx.edu/~mpj/pubs/coherence.html

Relate its evidence translation and coherence conditions to restricted C8.

Keep separate:
- uniqueness of a split;
- equivalence of runtime behavior under different splits;
- stability of inferred interfaces;
- preservation of printability/comparability requirements;
- admissibility and termination of specialization.

Preserve explicit operation-dictionary choices. They are intentionally
observable values, not hidden evidence to identify or erase.

Recommend whether a coherence theorem could support a selection policy for an
explicit fragment. Do not choose or adopt that policy.

4. Investigate specialization termination through partial evaluation

Read the relevant material in Jones, Gomard and Sestoft, Partial Evaluation and
Automatic Program Generation, especially bounded static variation and
termination:
https://raspi.itu.dk/people/sestoft/pebook/toc.html

Map the published conditions to R010/R019 and witness-dependent specialization
keys.

Use identity recursion, finite row union/projection and constructor-growing
recursion as separating examples. Distinguish:
- inference termination;
- termination of witness construction/evaluation;
- finitely many reachable specialization keys;
- runtime termination.

A budget is not a termination theorem. A finite abstract analysis needs a
further argument before it proves finitely many concrete keys. Report whether
established restrictions offer an adequate baseline without changing the
accepted R019 policy.

5. Connect conditional witnesses, field references and certified checking

Reuse the existing Martin–Nipkow, Flix and row-theory readings.

Investigate whether Boolean membership formulas provide a principled
representation for G1’s conditional splits. Explain the separate obligations for
field types, nested types and hypotheses relating rigid rows.

Revisit Jones’s record-field predicates as a possible foundation for G2’s
eventual field references. G2 implementation remains deferred; assess interface
compatibility only.

Read:
- Cruz-Filipe et al., Efficient Certified RAT Verification:
  https://www.cs.cmu.edu/~mheule/publications/lrat.pdf

Assess whether a proof-producing SAT solver could certify the absence of a
coverage counterexample. State the encoding-correctness obligation. Keep this
propositional subproblem separate from full typed ∀rigid/∃flexible validity and
CX.

Report search cost, certificate size and checking cost separately. Do not infer
polynomial total cost from efficient proof checking.

6. Extend the assurance mapping where the same sources help

Read or inspect the relevant portions of:
- Leroy, A Formally Verified Compiler Back-end:
  https://arxiv.org/abs/0902.2137
- Haack–Wells, Type Error Slicing in Implicitly Typed Higher-Order Languages,
  ESOP 2003.
- Leijen, Type Directed Compilation of Row-Typed Algebraic Effects, POPL 2017:
https://www.microsoft.com/en-us/research/publication/type-directed-compilation-row-typed-algebraic-effects/
- Jones’s constructor classes:
  https://web.cecs.pdx.edu/~mpj/pubs/fpca93.html
- Dreyer et al., Modular Type Classes:
  https://people.mpi-sws.org/~dreyer/papers/mtc/main-short.pdf

Map their contributions to representation correspondence, lowering, diagnostic
provenance, effect elaboration, kinding, explicit evidence and module
abstraction.

Keep the limits explicit:
- binding checks do not establish layout or generated-code correctness;
- diagnostic slicing is not constraint decomposition;
- later Koka results do not automatically cover Waxwing’s nofail, failure
  families or cleanup semantics;
- class/module papers do not prove dictionary laws or collection-policy
  compatibility.

Deliverables

Extend the existing assessment or add one linked companion document if that
keeps the inference assessment readable. Maintain one authoritative obligations
index.

For each gap, record:
- the exact question and a separating program;
- the published result, section/page and working primary-source link;
- assumptions and correspondence to Waxwing;
- what is established, argued, tested or unresolved;
- the smallest missing adaptation;
- its dependencies and proposed next deliverable.

Label reading status honestly. Distinguish papers, reports, theses, books and
implementation evidence. Flag new combinations under ADR 014.

Review soundness and completeness separately. Include challenges to the proposed
correspondences, not just motivating examples.

Conclude with a dependency-ordered research recommendation and a short list of
genuine author decisions. Preserve distinctions among checking, inference,
principality, evidence construction, coherence, specialization and compilation.
Do not ask the author to choose technical details before explaining the
established options and their consequences.

If delegating, use bounded readers with disjoint outputs and one integration
owner. Reuse completed readings and avoid duplicate investigations.

Follow AGENTS/memory and the Humanizer/Garner review loop. No npm verification
for documentation-only changes. Stop before implementation or new proofs.

