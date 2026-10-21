# Type-system assurance prose review

2026-10-21. Humanizer and Garner review under the convention in
`docs/engineering.md` and the author's Claude memory.

## Catalogue before rewriting

| Draft passage | Pattern | Why revise |
|---|---|---|
| "Each feature requires rigorous assurance." | Garner: abstract obligation | Name the guarantee and the evidence required at its planning gate. |
| "Classes are not merely dictionaries; they are coherent evidence." | Humanizer: staged contrast; unexplained jargon | Explain dictionary typing, selection and collection invariants separately. |
| "Lean guarantees compiler soundness." | Unsupported scope | A checked theorem covers its formal model; compiler translation needs its own argument. |
| "Prove HKTs, generics and classes." | Conflated obligations | Standard components need source correspondence; local departures need separate justification. |

Rewrite scope: one assurance register, links and scoped gates in existing
plans, and backlog tracking. Preserve completed milestone status and the
separate approvals for record research, proofs and compiler integration.

## Catalogue after rewriting

| Passage | Pattern | Resolution |
|---|---|---|
| "source correspondence" | Garner: compressed technical term | The numbered policy explains it: name published rules and check their assumptions against Waxwing. |
| "coherence" | Technical term requiring a stated meaning | The class entry requires defining whether permitted elaborations change behavior and preserving explicit choices. |
| "Current standing" | Risk of confusing a required guarantee with an established result | Each row distinguishes implemented features, existing arguments, pending designs and research-only proofs. |

Final pass checked the register and inserted planning paragraphs for
unsupported proof claims, staged contrasts, redundant closers and buried
obligations. The register assigns evidence decisions; it does not approve
new proof projects. P001 remains complete. Class laws remain separate from
typed dictionaries, and source/lowering correctness remains separate from
constraint-model proofs. Links and existing qualifications are preserved.

Validation: documentation width and whitespace checks, plus local links.
No npm commands, compiler tests, oracle runs or Lean builds were run.
The other session's dossier and nested-oracle files were left untouched.
