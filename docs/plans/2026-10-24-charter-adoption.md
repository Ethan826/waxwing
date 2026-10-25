# Putting the Waxwing charter to work

Adoption record, 2026-10-24. The author approved the [charter][charter] and
requested its commitment to `main`, followed by a consistent README update.
Contributor guidance and links make the charter part of design review;
no compiler feature, new proof or live-checker switch is authorized.

## What the interview recorded

The author confirmed the direction below during the interview and then
approved the charter. These are not implementation authorizations. Where
an explicit answer changes earlier direction, the later answer governs
within its stated scope. Record the superseded guidance; ask again only
if applying the answer would substantially unsettle guarantees,
compatibility or architecture.

| Topic | Recorded direction | Charter |
|---|---|---|
| Audience | An experienced TypeScript/Effect programmer can become productive; deeper FP abstractions remain available. | Purpose |
| Lineage | Effect's business sense and use of theory at language level, with Haskell/PureScript joy and Koka/Unison/Effekt influences. | Lineage |
| Rows | Row polymorphism bridges structural composition and the intended FP style. | Lineage |
| Application code | Code should follow the business operation, without repetitive dependency passing or generator ceremony. | C1-C2 |
| Dependency rule | Requirements compose upward; lower-level components cannot name their higher-level assembly. Private construction dependencies do not leak to consumers. | C2 |
| Extension boundary | Prefer libraries and general primitives; some ceremony is acceptable to avoid distorting the language. | C3 |
| Platform | Official capability contracts and conventions, with replaceable providers; Effect Platform and OTel are precedents. | C4 |
| Foreign libraries | No library approval regime. Implement the interface to fulfill a platform capability. | C4 |
| Observability | Runtime facilities implement language-defined semantics; replaceable providers supply integrations. Effect-row visibility remains open. OTel is a candidate default. | C5 |
| Schemas | Reuse meaningful descriptions for parsing, test data and other interpretations; retain explicit domain/representation choices. | C6 |
| Trust | Rust-like encapsulation is acceptable. Discoverable unchecked assumptions and possible future audit tooling matter. | C7 |
| Theory | Connect established theory to real programming problems; sagas are a research candidate, not a core-language commitment. | C8 |
| Decision order | The latest explicit author answer governs within scope. Record supersession and raise substantial consequences before applying disruptive changes. | Scope |

Not decided: exact `pure` semantics, effect-kind taxonomy, unchecked
syntax, audit reporting/acknowledgment policy, schema representation,
provider selection machinery, context visibility in effect rows, or a
saga/workflow implementation.
These need separate designs. Existing R0/a-min gates remain unchanged.

## Document structure and alternatives

Keep a stable charter, this companion and the prose-review record. The
charter states the purpose and principles; this companion holds concrete
examples and the adoption steps. The README remains the entry point for
what exists today.

A single larger document would be easier to find initially, but would mix
enduring principles with the mechanics of adopting them. Distributing the
principles among existing direction plans would preserve their current
locations but leave readers to reconcile several sources. Separate
charter and guidance is the structure used for the approved charter.

## Concrete decision examples

These are review questions, not executable acceptance tests or evidence
that the current compiler supports the examples. Names are illustrative.

| Situation | What a design should explain | Principles |
|---|---|---|
| `checkout` uses `Database`; `DatabaseLive` needs `Config` and `Logger`. | How assembly supplies the provider without making every business caller require its private dependencies. | C1-C2 |
| A function needs `email` from an open record, and two service computations are combined. | Which extra fields and types are preserved, how requirements compose, what is inferred and how missing fields or capabilities are diagnosed. | Lineage, C1-C2 |
| A fake replaces the production database. | Which interface stays the same, which behavioral guarantees the fake implements, and what it cannot simulate. | C4 |
| A parser builds a domain value from JSON. | Which invariant construction establishes, how expected parse failures are represented, and which conversions lose information. State the prerequisites for each interpretation; an arbitrary predicate does not automatically supply a decoder, generator or decidable proof. | C6-C7 |
| A foreign parser can throw. | How the wrapper handles the exception or exposes the remaining obligation; a type assertion alone cannot remove it. | C7 |
| Logging/tracing is added to concurrent work. | Who owns context propagation, what the provider observes and how the application selects it. | C4-C5 |
| Inventory reservation is followed by payment. | The business aggregate defines which changes preserve invariants together; the adapter owns tables and keys. Explain retry, idempotency, compensation, crash recovery and provider assumptions separately. | C1, C3, C8 |
| A useful abstraction takes more library ceremony than special syntax. | Whether the library preserves the required guarantee; deeper integration needs a specific limitation and a general alternative. | C3 |
| A checker theorem is used to justify a compiler change. | The theorem's model and premises, correspondence with the implementation, and any remaining source/lowering obligations. | C8 |

Do not turn these into one universal integration test. Each milestone
selects a relevant example and defines its own observable success and
failure cases. Existing working examples stay useful even when a research
candidate proves unsuitable.

## Adoption steps and status

1. Done: the author approved the charter on 2026-10-24. Open subsystem
   mechanisms remain labelled as open.
2. Done: `AGENTS.md` points to the charter for substantive design and
   review. `CLAUDE.md` retains its delegation to that single source of
   engineering instructions. Principle identifiers avoid duplicated text.
3. Queued in this documentation task: add a prominent README summary and
   charter link, preserving the distinction between existing behavior,
   plans and proved model results.
4. Done: language, tooling and schema direction notes link to the charter.
   Historical implementation snapshots remain dated records, not current
   evidence. Reconcile any substantive conflict in its own decision.
5. Done: `docs/engineering.md` points to the decision note below. Use it
   for architectural decisions and new features, not routine spelling
   fixes. It is a review convention, not a semantic compliance gate.
6. Deferred until a suitable design is authorized: check the mechanisms
   against one real pending design before extending them. A candidate is
   the next authorized SCH001 schema design, comparing
   a schema AST with a Schemable-style interface. This does not restart
   SCH001 or choose its representation. Record whether the guidance
   clarified a choice or merely added paperwork.

Contributor instruction, recorded in `AGENTS.md`:

> Consult `docs/waxwing-charter.md` when designing or reviewing language,
> library, runtime and tooling changes. Identify the relevant principles,
> explain material tradeoffs and name any departure. The charter does not
> authorize additional work. Apply the author's latest explicit decisions
> within scope and record any earlier guidance they supersede.

### Decision note

- Which concrete programmer problem does this solve?
- Which charter principles bear on the choice, and how?
- What ordinary library or published mechanism was considered?
- What guarantee is claimed, under which assumptions, with what evidence?
- If special integration is needed, what cannot a library adequately do?
- Does the proposal depart from an approved rule or charter principle?

Use the answers in the design's existing rationale and assurance sections
where they fit. A separate form is unnecessary when those sections already
answer them. An intentional departure needs the author's explicit
approval, with the conflict and reason recorded in the decision. A newer
explicit answer can supply that approval within its scope; do not ask for
it again unless applying it would cause substantial disruption.

These mechanisms are review conventions. A link check can establish that
a document exists; it cannot establish that a design follows it.
No semantic compliance gate or package approval system is proposed.

## Existing records and follow-ups

| Record | Relationship | Status/next action |
|---|---|---|
| [Language direction][language] | Earlier intent, milestone scopes and dated implementation snapshots. | Charter pointer added; retain historical snapshots and reconcile conflicts explicitly. |
| [Tooling direction][tooling] | PKG001 already distinguishes source libraries, FFI and providers. | Charter pointer added; provider machinery remains separate design work. |
| [Schema direction][schema] | Already records parsing plus multiple interpretations. | Charter pointer added; representation choices stay open. |
| Effect-kinds research (separate workstream) | Contains candidate guarantees and separating cases. | Its local research notes are outside this charter commit. The charter does not settle strict purity or an effect taxonomy. |
| [ADR 015][backends] | Adopted backend priorities and direct FFI. | Preserve; no backend amendment proposed. |
| Saga and durable-workflow support | Interview research direction. | Candidate; investigate library composition and published calculi before proposing integration. |
| `wxw --audit` | Interview example of inspectable trust. | Candidate; reporting scope and reachability evidence need a separate design. |
| Adoption steps above | How the charter becomes discoverable and routinely consulted. | Contributor guidance and direction links added; README follows in the next commit. The design pilot remains deferred. |

The prose loop and its limitations are recorded in the
[editorial record][review]. No compiler, Lean or runtime behavior changed.

[charter]: ../waxwing-charter.md
[language]: 2026-10-08-language-direction.md
[tooling]: 2026-10-08-tooling-direction.md
[schema]: 2026-10-10-schema-direction.md
[backends]: ../adr/015-backend-priorities-and-service-bindings.md
[review]: 2026-10-24-charter-prose-review.md
