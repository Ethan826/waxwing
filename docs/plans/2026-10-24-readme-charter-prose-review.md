# README review: approved charter and platform direction

2026-10-24. The author approved the charter, requested its local `main`
commit, then asked for a consistent README with the new material in a
prominent position. Charter commit: `19f49c7`. This pass changes prose only.

Read the README in full before editing. Used the `humanized-prose-review`
workflow and its Humanizer reference, followed by Garner, Fowler, Orwell
and Williams's plain-style concerns. Existing code blocks and examples
are preserved; no new source program or corpus fixture is introduced.

## Initial catalog

| Existing passage or omission | Problem for this README | Change |
|---|---|---|
| "Waxwing is an experimental functional language for composing services and typed failures." | Describes the mechanism but omits the author's central motivation. | Lead with Effect's practical business programming and Haskell/PureScript abstraction, then state the prototype's limits. |
| Rows only introduced as a feature in a list | The structural bridge is not explained in the mission. | State the intended bridge to TypeScript's structural flexibility near the top. |
| Effect and `ZIO` first framed as inference references far down the README | Lineage appears narrower than the charter's application/platform ambition. | Add early lineage and platform direction, with explicit delivery status. |
| "including failures from constructing services" | Can imply private construction failures propagate to every operation. | Place construction requirements/failures at construction. |
| "without a separate layer abstraction" | Accidentally rules out an assembly representation the charter leaves open. | Specify native rows and handlers plus library assembly conventions, leaving the mechanism open. |
| "Installing a BalanceApi implementation that calls HttpClient replaces the BalanceApi requirement with HttpClient" | Flattens captured construction dependencies into business consumers. | Describe acquired providers separately from scoped handlers that leave additional effects outstanding. |
| No early platform/schemas/instrumentation/trust account | Omits new charter material relevant to application authors. | Add a short section after the first executable service example, before the records details. |
| No charter navigation link | Readers cannot find the source of the direction. | Add a prominent introductory link and a documentation-list entry. |

## Claims to preserve in the rewrite

- Effect remains a project name; `fp-ts`, capabilities, identifiers and
  language forms use code styling where appropriate.
- Row polymorphism is a design bridge, not a claim of general subtyping,
  complete inference or implemented arbitrary record composition.
- Effects and explicit rows exist. HKTs, generic dictionaries, platform
  assembly, stronger purity contracts and typed FFI remain planned work.
- API conformance does not establish foreign behavior or algebraic laws.
- Runtime implements language-defined semantics; this pass does not choose
  ambient logging or a particular effect-kind taxonomy.
- Saga/workflow investigation does not select a core-language feature.
- Model proofs, source correspondence, typed-code construction and lowering
  keep their existing separate assurance limits.
- The existing motivating example remains high on the page. New platform
  material follows the first service program rather than preceding it.

## Review scope

The rewrite is checked against the approved charter and its adoption
record. It adds no historical novelty claim and no inherited theorem.
The prose loop and documentation checks do not replace tests of language
behavior; no compiler behavior changes in this task.

## Rewrite audit and corrections

| Draft passage | Problem | Correction |
|---|---|---|
| "manually assembling effect stacks" | Reintroduced jargon already removed from the charter for this audience. | Used layers of wrappers tied to combinations of dependencies. |
| "Today the compiler targets Go and is written in PureScript" | Dropped the existing self-hosting qualification. | Restored that it is not yet self-hosted. |
| "Direct FFI remains available" | In a direction section, could still imply an implemented binding facility. | Explicitly labelled typed FFI planned while retaining direct use as a design goal. |
| "the route still requires only BalanceApi" | Could erase the route's other public requirements from the example. | Stated that the route avoids acquiring HttpClient and retains its other requirements. |
| "not built-in features on the roadmap" | Awkward status wording could imply a rejected library capability. | Kept research status and stated that no built-in workflow feature is selected. |
| "Schemata-TS" | Package naming/style differed from the `fp-ts` convention. | Used `schemata-ts` with code styling and kept Schemable as the abstraction name. |

The second pass checks concrete subjects, removes short reflow artifacts
and preserves the original examples and existing assurance sections.
An independent read-only review follows this writer's audit; its report
will be recorded separately from the writer's own editorial pass.

## Independent review and final editorial pass

A fresh read-only reviewer returned Ready with fixes. It found no
substantive fidelity issue and one minor finding: two new prose lines
exceeded the width limit. Reflowed those paragraphs; a subsequent pass
caught one adjacent line joined during the first repair, so reflowed the
whole prototype-status paragraph without changing its wording.

The reviewer read the complete README, the diff from `2af6e40`, the approved
charter, adoption record, writer's audit, schema direction and ADR 015.
It confirmed the separation between construction dependencies and scoped
handler effects, labelled future capabilities, retained prototype limits,
and no inherited-theorem or historical-novelty claim. No external-link,
compiler or proof check was performed. It reported no exemptions, escape
hatches or denied calls.

The final Garner/Fowler/Orwell/Williams pass kept the mission before the
implementation snapshot, retained concrete provider examples and repaired
short line-break artifacts. References make the source of design direction
inspectable; no subsystem mechanism is chosen by describing that direction.

Final checks: all 14 original README code blocks are unchanged; reference
definitions and local targets resolve; whitespace and repository width
checks pass after the repairs. No npm, compiler or Lean command was run.
The author reviewed and approved the README update, requesting that the
first Effect mention be linked. It now uses the existing `effect-library`
reference, preserving the destination. Reflowed that opening paragraph and
rechecked width and whitespace. The author then explicitly authorized
committing and pushing the charter-related work and README only; separate
effect research and the Claude handoff are outside that authorization.
