# Type-system and compiler assurance register

Recorded 2026-10-21 at the author's request. Planning only: this register
adds evidence obligations to future designs. It authorizes no new proof
milestone, solver, language feature or compiler integration. Existing
record-composition research approvals remain separate.

## Scope and evidence policy

Type safety means well-typed programs respect the rules of the stated
semantics. Inference soundness means inferred contracts justify checking
and retain required constraints, services and failures. Completeness means
finding every solution or typing promised by the specified fragment.
Principality means an inferred scheme is at least as general as every
other permitted scheme. State which of these a design promises; they are
separate claims.

A terminating conservative checker can be sound without complete inference.
Distinguish an established contradiction from an inability to decide. Do
not describe an Unresolved result as evidence that a program is invalid.

For each design, before implementation planning:

1. State its fragment, semantics, exact guarantees and exclusions.
2. Name the published rules it follows and check their assumptions against
   Waxwing. A citation does not establish that an adaptation is sound.
3. Identify each local departure and feature interaction under ADR 014.
4. Assign evidence: source correspondence, a local argument, mechanized
   proof, independent oracle or adversarial regression tests. Tests supply
   bounded evidence, not a universal theorem.
5. State the gate that evidence must satisfy and what remains unproved.

Use standard published mechanisms where they meet the requirements. Lean
is preferred for small, distinctive semantic claims when practical; its
exact statements and scope require review before proof work. Ordinary
features do not each require a separate mechanization. A Lean theorem
establishes its formal statement, subject to its definitions and trusted
foundations; it does not establish source or generated-code correctness
without the corresponding connection.

## Obligations by feature

| Feature / owner | Guarantee and foundation | Evidence and gate | Current standing |
|---|---|---|---|
| Rank-1 generics and specialization / P001 | Instantiation and substitution respect rigid variables; specialization preserves typing and terminates within the admitted fragment. HM-style inference and the existing P001 design supply the foundation. | Preserve existing tests and the design §4.2 termination argument. Audit their assumptions when adding kinds, dictionaries or new recursion rules; revise the argument before changing those rules. No new Lean milestone by default. | Implemented; the existing argument is not a whole-compiler soundness proof. |
| HKTs and kinds / K001 | Kinds prevent malformed type applications; substitution preserves kinds; inference stays within the planned first-order constructor-application fragment. | Name a precise published kinding/unification account and map the design to it. Test kind errors, substitution and constructor application. A departure into type-level reduction or higher-order unification needs a new argument before implementation. | Planned; source correspondence still to write. |
| Local generalization / future design | Generalization preserves row/type constraints and does not let effects or local state escape their scope. | Choose an established discipline, comparing HM and effect-aware Koka rules. State residual-constraint, environment and recursive-group rules. Require a reviewed soundness argument before implementation; propose a focused Lean model for Waxwing-specific interactions. | Unplanned design; a no-local-capture rule alone is not a general soundness argument. |
| Requirement and error inference / INF001 | Inferred schemes retain service requirements, typed failure families and abort-free cleanup obligations through provision, callbacks and recovery. | Before implementation planning, state an elaboration/checking relation and justify it, including generalization, recursion, exported contracts and marks. Compare a reference model; mechanize distinctive rules where practical after statement approval. State completeness/principality separately. | Requirements reviewed; design next. |
| Classes and instance selection / C001 | Dictionary elaboration preserves typing; implicit selection, if offered, has defined scope, ambiguity and coherence rules and terminates. | Use qualified types and dictionary translation as foundations. Specify whether different permitted elaborations can change behavior and how explicit choices are preserved. Justify local departures and resolution termination before implementation. | Direction only; no resolution algorithm selected. |
| Instance-sensitive collections / C001, STD001, M001 | Lookup, update and combination preserve the equality/ordering policy on which a collection's invariants depend. | Decide retained evidence, abstract identity or another justified mechanism. Show cross-module examples and reject incompatible merges or require an explicit rebuilding conversion. Retaining a dictionary alone does not justify merging two collections. | Design obligation; no identity mechanism selected. |
| Class laws / C001, STD001 | State exactly which instances satisfy which algebraic laws and what evidence licenses a law-dependent optimization. | Separate typed dictionary shape, trusted built-ins, property-test evidence and proved laws. An associative-looking signature proves no associativity. Account for effects and failures in rewrites. | No law-proof mechanism selected. |
| Modules and abstract types / M001 | Interfaces preserve intended type identity and hide representations. | Follow an identified standard module discipline. Review dictionary identity and exported schemes. Generative functors or other stronger mechanisms require their own argument before adoption. | Direction only. |
| Effects, cleanup and concurrency / FX001, FX008, INF001, CF001 | Contracts describe permitted effects and block exits; cleanup, cancellation and any resumption obey their stated semantics. | Audit published handler rules against Waxwing's marks, targeted aborts and scopes. Give local semantic arguments for departures. Future concurrency needs explicit lifetime, cancellation and scheduling guarantees; propose focused mechanization rather than treating record proofs as coverage. | Effects and abort tracking implemented; further inference and concurrency guarantees remain separate work. |
| Constraint translation and record layout / R005 | Source produces the intended constraints; accepted constraints justify the split and layout used by lowering. | Keep source-to-constraint translation and split choice as separate obligations. Validate against the dossier's source programs. Existence of a split alone does not justify selecting it. | Research model proved in parts; source translation remains by hand; integration not authorized. |
| Backend lowering and FFI / J001, I001, PKG001 | Specialization, erasure, dictionary passing and runtime lowering preserve specified behavior; foreign contracts have explicit trust boundaries. | Design preservation arguments and cross-backend differential tests. Record trusted foreign declarations, parsed ingress, host exception boundaries and runtime assumptions. Prioritize local transformations with the greatest semantic risk for mechanization or translation validation. | Go exists; JS then LLVM are priorities under ADR 015; no backend correctness proof claimed. |

## Proof priorities and planning gates

The current record dossier remains the first mechanized research track.
Its call-site decider, P9s soundness and certificate results apply to their
formal constraint models. Rigid-row division is still research. Neither
that work nor this register approves P9s's limits as final language policy.

Next candidates for focused mechanization are generalization with effects
and Waxwing-specific requirement/cleanup rules. First write statements and
counterexamples that distinguish soundness, completeness and termination;
then seek approval for the proof scope. Class elaboration or instance
identity may warrant a small proof once their representations are chosen.

Standard kind checking and rank-1 generics can initially use faithful
published rules, explicit arguments and adversarial tests. Revisit that
choice if composition adds assumptions their source results do not cover.
The owner of each feature must record its evidence decision and unresolved
obligations in its design before requesting an implementation plan.

## Sources and related plans

These are foundations or leads, not proofs of Waxwing's adaptations:

- [Koka's row-polymorphic effect types][koka]: effect inference and an
  effect-aware treatment of let-polymorphism. Recheck the exact rules
  against Waxwing's state, handlers and generalization policy.
- [Jones, Coherence for qualified types][coherence]: conditions under
  which dictionary elaborations have consistent meaning.
- [P001 design](2026-10-08-polymorphism-design.md): current generics,
  substitution tests and specialization-termination argument.
- [Instance and module direction][instances]: explicit choices,
  collection invariants and class laws.
- [Inference requirements][inference]: service and failure composition.
- [Record-composition dossier][records]: model, proofs and open bridges.
- [ADR 014](../adr/014-composition-not-invention.md): departures require
  stated justification and explicit approval.

[koka]:https://www.microsoft.com/en-us/research/publication/koka-programming-with-row-polymorphic-effect-types/
[coherence]: https://web.cecs.pdx.edu/~mpj/pubs/coherence.html
[instances]: 2026-10-10-modules-and-instance-selection-direction.md
[inference]: 2026-10-11-requirement-and-error-inference-milestone.md
[records]: 2026-10-20-record-composition-dossier.md
