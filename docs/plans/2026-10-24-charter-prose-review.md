# Editorial record: Waxwing charter

2026-10-24. Covers [the charter][charter], [its adoption proposal][adoption]
and the short progress/handoff entries added for this draft.

Used the `humanized-prose-review` workflow and its Humanizer 3.1.0
reference: read both initial drafts in full, catalogued passages,
rewrote, re-audited and performed an editorial challenge using Garner,
Fowler, Orwell and Williams's plain-style principles. This was the
writer's own review, not an independent agent review or a technical proof.

The author's conversation is the voice and intent reference. Preserve
Effect's business practicality and functional foundations, the joy of
Haskell/PureScript, rows as the structural bridge, and the effect-language
lineage. Avoid turning those influences into implementation claims.

## First audit and changes

| Initial passage | Problem | Revision |
|---|---|---|
| "the expressive pleasure of Haskell and PureScript" | Formal wording weakens the author's repeated use of joy. | Retained the author's word, "joy". |
| "the host-language encodings required by a TypeScript library" | Overgeneralizes what every library requires; hides which native facilities matter. | Named effects, nominal types and higher-kinded abstraction as the intended native support. |
| "follows from calling both of them rows" | An argumentative aside distracts from the actual distinction. | Stated the separate record/effect rules and the inference obligations directly. |
| "its aggregate's consistency boundary" | Assumes application readers know a DDD term. | Explained an aggregate as the unit whose changes preserve business invariants together. |
| "Interface conformance establishes typing" | Can imply foreign code itself has been checked. | Restricted the claim to declared types and kept foreign correctness separate. |
| "Imports or naming conventions should not silently install behavior" | So broad that it could prohibit ordinary module use. | Named runtime providers and interceptors as the relevant hidden installation. |
| "The author values the Schemable approach" | Narrates the interview instead of stating the design influence. | Named the influence and linked the existing open schema design. |
| "Construct values so their representation preserves the intended invariant" as a linked opening | The principle and attribution blur together. | Kept the principle and named the essay supporting its modeling approach. |
| "make strict purity ... implemented or approved designs" | Awkward verb and object; confuses intent with delivery status. | Stated that this draft adopts none of those subsystem designs. |

## Second audit and corrections

| Passage or issue | Correction |
|---|---|
| "its presence would not certify their correctness" | Replaced the ambiguous pronoun with "An audit cannot certify their correctness". |
| Laws listed beside implementation obligations | Added the need to state when compiler correctness relies on a behavioral law. An ordinary algebraic law and a soundness assumption need not be the same thing. |
| A long reference definition exceeded the width rule | Moved its URL onto its own continuation line; preserved the target exactly. |
| Named capabilities and libraries | Kept `Database`, `DatabaseLive`, `Config`, `Logger`, `fp-ts`, `traverse` and `Reader` in code styling. Effect remains a project name. |

## Final editorial challenge

- Purpose precedes machinery. The opening states the intended programming
  experience and audience before principles or adoption mechanics.
- Concrete actors own each concern: business service, provider, runtime,
  application assembly and wrapper author. Replaced ambiguous subjects.
- Kept qualifications that carry meaning: research model versus compiler,
  provider interface versus behavior, candidate tools versus guarantees,
  and intended facilities versus shipped language features.
- Read both revised documents through at speaking pace. Removed the
  awkward break between domain/storage meanings and their qualification.
- Kept headings and principle identifiers because future decisions need
  stable references. Lists and tables express actual alternatives,
  examples or recorded direction; there are no decorative bold labels.
- Preserved the deliberate negative constraints on hidden dependencies,
  unsafe assertions and core-language expansion. Each answers an explicit
  concern raised by the author; these are not invented objections.
- Retained alternative document layouts as recommendations, not as an
  author decision. Activation of contributor rules remains proposed.

No actionable prose issue was identified in that pass. The subsequent
Claude review below found wording and scope issues, including two awkward
line breaks that the earlier speaking-pace pass had missed. The first
pass was an editorial judgment, not independent review.

## Sources and scope

Re-read Effect's Layers and Platform documentation, Koka's book, Unison's
ability documentation, the Effekt paper, the Types as axioms essay,
OpenTelemetry's component description and Rust's unsafe chapter. These
support the specific precedents linked in the charter. They establish no
Waxwing theorem. The charter's comparison is a record of intended lineage,
not a ranking of those projects or a claim of exclusive capabilities.

Read the existing README, language/tooling direction, schema direction,
ADR 015, repository prose rules and the available Claude project memory.
Some dated direction passages describe older compiler states. The draft
records those as material to reconcile, without treating them as current
implementation evidence.

Validation record: the first width check found one long reference
definition. The next found two prose lines lengthened during revision.
All three were reflowed without changing their meaning. Final checks
cover repository width, tracked-diff whitespace, and all reference
definitions and local targets in the three new documents.
No compiler tests, npm task, Lean build or source-program run was needed
or performed for this documentation draft.


## Claude review and disposition

The author supplied Claude's read-only review on 2026-10-24. Its verdict
was "needs targeted fixes, not substantial revision". Checked the findings
against both drafts, ADR 014, ADR 015, ADR 011, the effect-namespaces
rules, the language-before-target direction and `CLAUDE.md` before editing.
The review made no file changes and ran no checks.

| Finding | Disposition and reason |
|---|---|
| 1. Runtime ownership could settle scope semantics or ambient logging. | Applied: runtime implements language-defined semantics; context visibility in effect rows stays open. This preserves runtime support without selecting an effect taxonomy. |
| 2. C8 loosens ADR 014. | Applied: cited ADR 014 and named the need, textbook alternative/cost, argument, reproducible evidence and explicit approval requirements. |
| 3. Construction failures assigned to assembly. | Applied: used construction, preserving lazy or other provider mechanisms as separate choices. |
| 4. Interview direction labelled settled. | Partly accepted: retitled the section and separated recorded direction from charter/adoption approval. The author's explicit confirmations remain confirmations, not unanswered questions. |
| 5. Well-founded extensions and sound account overreach. | Applied: libraries carry application features; deeper integration specifies guarantees with evidence appropriate to scope. No extension API is selected. |
| 6. Plugin has two meanings. | Applied: runtime integrations are providers; compiler/plugin integration remains a distinct design subject. |
| 7. Missing built-ins rule. | Applied after checking ADR 011 and the namespace rules. Named the ordinary syntax/naming principle. Any temporary departure needs its own approval and follow-up, not a blanket exception. |
| 8. Missing pragmatics and approachable syntax. | Applied: added typed results, exhaustive matching, diagnostics, dependable tooling and Algol-like syntax from the earlier direction. |
| 9. Marked boundary could imply a keyword. | Applied: explicitly kept the marking mechanism open. |
| 10. Missing structural row example. | Applied: added an open-record and service-composition example covering preserved fields/types, inference and diagnostics. |
| 11. Duplicate instructions in AGENTS and CLAUDE. | Applied: proposed a pointer only in `AGENTS.md`; retain `CLAUDE.md`'s delegation to it. No instruction was activated. |
| 12. Unnamed pilot. | Applied as a proposal: the next authorized SCH001 schema design is a candidate. This neither starts it nor selects a representation. |
| 13. Low paperwork risk; retain the small decision note. | Retained: answers fit existing design rationale; no extra form is required. |
| 14. Repeated defensive negatives. | Partly accepted: removed the evaluation-strategy aside and repeated authorization sentence. Moved the arbitrary-predicate limitation into the concrete schema example rather than losing it. |
| 15. Ambiguous dependency, recovery, typing and stack language. | Applied: named application components, retained visibility of a handler's own failures until handled, specified declared-type conformance and replaced effect-stack jargon. |
| 16. Aggregate guidance belongs in an example. | Applied: moved the aggregate/table-key distinction to the reservation/payment example, preserving the author's boundary. |
| 17. Reflow artifacts. | Applied: repaired both reported breaks and a new short line introduced by the edits. |

The author then instructed that the latest explicit answers govern unless
applying them substantially unsettles the design. Recorded that precedence
in the charter and adoption proposal. Older ADRs remain relevant evidence;
they do not veto a newer explicit author decision. Scope and implementation
authorization remain distinct.

Re-ran the prose loop over the corrections. The final editorial pass
checked actors, source precedence, overloaded terms, dangling references,
line breaks and preservation of the author's stated intent. The Effect /
Haskell / PureScript / row-polymorphism / effect-language lineage is
unchanged. This is the writer's check of the fixes, not a second review by
Claude. The first post-review width pass caught one merged progress-note
line; it was reflowed. Final width, whitespace and local-reference checks
follow the edits.

[charter]: ../waxwing-charter.md
[adoption]: 2026-10-24-charter-adoption.md

## Approval and adoption pass

The author approved the charter on 2026-10-24 and requested a commit to
`main`, followed by a README update. Updated the approval status and added
contributor guidance, engineering guidance and links from the existing
direction notes. Subsystem design questions remain open. No implementation
or proof work is authorized by these links.

Prose audit: replaced "awaits author review" and future adoption language
with the actual approval and per-step status. Kept the schema pilot
explicitly deferred. Removed the link to an uncommitted effect-kinds note
from the committed adoption record; that research is a separate workstream.
Re-read the revised passages for actor, scope, repetition and chronology.
Claude's earlier findings and the writer's checks remain labelled as such.

The adoption pass's first width check found one long line created by a
replacement. Reflowed it and the adjacent short lines, preserving wording.
The approved charter retains the interview's mission and eight principles;
status changes do not claim implementation of any planned capability.
