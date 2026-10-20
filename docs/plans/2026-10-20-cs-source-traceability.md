# CS sources: claim-level traceability

Date: 2026-10-20. Research and documentation only; no solver adoption or
implementation authorization. Implements the author's request to connect
CS concepts to identifiable published work. See ADR 014.

## What a source establishes

A bibliography is necessary but insufficient. Each substantive checker or
solver rule needs a record of:

- The precise claim or operation, with its implementing component when
  one exists.
- Author, title, year, publication kind, stable link, and section, figure,
  rule or theorem. A thesis, technical report, peer-reviewed paper and
  reference implementation are different kinds of evidence.
- What was actually inspected: full relevant text, selected sections,
  abstract only, or executable source at a pinned revision.
- What is taken unchanged; every changed assumption, extra rule, omitted
  case and interaction with another mechanism.
- The supporting argument and reproducible examples, including negative
  controls; also counterexamples and remaining obligations.
- Status: investigated, proposed, approved or implemented. These statuses
  are independent of whether a source was read or a probe passed.

Use these descriptions consistently:

- **Published rule:** the cited location contains this mechanism, subject
  to its stated assumptions.
- **Reference implementation behavior:** observed in a named compiler at
  a pinned version. This is not a peer-reviewed proof.
- **Local adaptation/composition:** the source supports the ingredients;
  Waxwing's change and its obligations are stated separately.
- **Unresolved:** no adequate source or argument has yet been established.

A framework citation, such as qualified types or improvement, does not
by itself supply a particular merge-solving algorithm. Passing tests
supports the tested behavior; it does not establish publication,
completeness, principality or soundness of the combined language.

## Existing records and their limits

This is an index of repository evidence, not a completed independent
literature or implementation audit.

| Component | Existing source record | What remains to distinguish |
|---|---|---|
| Kinds, rank-1 schemes, unification, dictionaries | ADR 002 links Jones's executable account, Typing Haskell in Haskell | Semantic reference versus Waxwing's restrictions and specialization strategy |
| Pattern usefulness and witnesses | docs/provenance.md and ADR 003 identify Maranget, Warnings for pattern matching, JFP 2007 | Published algorithm versus the inhabitedness extension; independent oracle evidence |
| Effect rows and scoped-label matching | ADR 010 and the FX001 design | Leijen-style row machinery versus Waxwing's Fail keys, row opening and handler rules |
| Abort tracking and settling rounds | ADR 010, FX008 design/plan | ADR 014 explicitly leaves their source audit open; do not certify all FX008 machinery by citing Koka |
| Records, lacks and disjointness | ADR 013; row-merge implementation plan section 1.3 | Paper support versus PureScript v0.15.16 behavior; local Sym, 1g, 2g and H adaptations |
| Composition requirements and candidate foundations | composition-foundation-assessment.md; research/composition-assessment/README.md | Paper readings versus executable translations; failures of a candidate versus impossibility results |
| Modules, instances and schemas | Direction notes linked from docs/provenance.md | Conceptual influence and future direction versus implemented algorithms |

The source tables in the row-merge plans already record useful distinctions,
including papers not accessed. Keep those historical qualifications. A later
source discovery does not retroactively turn a local rule into an approved
faithful implementation of that source.

## Independent follow-up: Sulzmann

Martin Sulzmann, A General Framework for Hindley/Milner Type Systems with
Constraints, Yale PhD thesis, 2000. Primary author-uploaded copy:
https://www.researchgate.net/publication/213884919_A_General_Framework_for_HindleyMilner_Type_Systems_with_Constraints

Read: section 5.1.2, pp. 123-127, including Figure 5.2; Appendix A.2,
p. 174. Thesis evidence; not a claim of conference peer review.

- REC5/REC6 establish the backward field deduction. Figure 5.2 rules
  6/7 implement it only when the required presence constraint is already
  available; see the qualification below.
- Remark 5 makes field typing record-specific. This avoids imposing one
  shared field type merely because records participate in concatenations.
- Figure 5.2 and pp. 125-127 describe closure interleaved with equality
  unification. Theorem 21 states a principal constraint property;
  syntactic uniqueness of solved forms is separately conjectured.
- Section 5.1.2 uses asymmetric overriding. Appendix A.2 gives a
  symmetric variant; its name alone does not establish Waxwing's disjoint
  semantics. Signature entailment remains unverified here.

Follow-up recorded in assessment section 4.10 (1447859): Figure 5.2 does
not explicitly generate presence constraints from a closed result record,
although REC1 supplies the logical fact. Consequently, deriving programs
4/5's fields from the axioms must not be reported as the printed algorithm
computing their split. A satisfiable constraint is not evidence that an
implemented checker discharged it. The assessment separately records
satisfiability, signature-entailment and disjointness obligations.

Record-specific typing addresses program 11's shared-type objection. No
complete replacement solver has been verified or approved here.

## Independent follow-up: Makholm and Wells

Henning Makholm and J. B. Wells, Type Inference, Principal Typings, and
Let-Polymorphism for First-Class Mixin Modules, ICFP 2005. Peer-reviewed
conference paper; primary institutional copy:
https://www2.imm.dtu.dk/pubdb/edoc/imm3930.pdf

Read: section 5, particularly the row-pollution discussion on p. 5.
The paper explicitly rejects a lambda that independently concatenates its
parameter with an integer field and a Boolean field of the same name.
This is an obstacle to program 11 as required, rather than evidence for
adopting its entire system. Hiding is an additional operation, not an
unchanged acceptance of that program.

Separate executable evidence is now being recorded by another session in
research/composition-assessment/makholm-wells/. This note records the paper
reading only; it does not claim to have run or audited those probes.

## Remaining decision gate

Before selecting a replacement record foundation, record source-led
constraint traces for programs 4, 5 and 11 and their negative controls.
Account separately for disjointness, exact record closure, declared
signatures, generalization and operational evidence used by lowering.
Identify any step absent from the source before proposing implementation.
No requirement has been waived by this note.

The assessment now records the thesis reading in section 4.10. This note
supplements that assessment; it does not adopt its candidate foundation.

Distinguish theory obligations from engineering tasks: satisfiability,
entailment and preservation of disjoint semantics require theoretical
support. Diagnostic wording is Waxwing product design. Choosing Go layouts
is engineering once required instantiations/evidence are available; how to
obtain that evidence without arbitrary ambiguous choices is a typing and
elaboration obligation. These tasks do not all constitute new CS.
