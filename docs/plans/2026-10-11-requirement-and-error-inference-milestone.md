# INF001: automatic requirement and error composition

Recorded 2026-10-11 at the user's request. Status: milestone requirements;
not an approved language specification or implementation plan. The user
explicitly requires error channels to compose both when assembling services
and in business logic. No compiler change is authorized by this document.

## Outcome

A named business function can call independently defined operations and
other functions without manually listing their combined service requirements
or error families. The compiler infers both channels. Providing an
implementation removes the capabilities it supplies and exposes its own
requirements and errors. Handling errors removes precisely the handled
families and preserves errors and dependencies of recovery code.

This is an ergonomic target as well as a representability target. Requiring
an application-specific error sum, conversion wrappers, explicit row
widening at every call, or moving every named function into a local lambda
does not satisfy it. Explicit contracts remain supported. Inference of
ordinary parameter and result types is a separate scope decision; an
explicit result type must not force a combined effect/error annotation.

The comparison is the supplied Effect route and its provision steps, plus
the user's subsequent requirement about errors at both stages. It is not a
claim of parity with the whole Effect runtime or ecosystem.

## Baseline and dependencies

At checkout `fx008` / 8144fda, existing compiled output passes 36 focused
signature/handler-type tests. Seven compiler probes confirm local lambda
inference, replacement of BalanceApi by HttpClient, family-wise error
handling, and rejection of a named route whose own effects are omitted.
These probes were exploratory, not committed acceptance tests, and did not
execute the emitted Go. This is evidence of today's gap, not of INF001.

Named signatures currently use a rigid ambient row. It passes callback
effects through; it cannot acquire a function's own undeclared effects.
`test/fx-signature.test.mjs` explicitly tests that rejection. FX008 preserves
this inference boundary while adding handler-abort tracking. INF001 must
define an intentional extension, including compatibility and migration.

Finish FX008 and FX001's remaining verification/review first. Coordinate
with FX007 (effect-polymorphic cleanup), R001/C001 (service records and
instance values), M001 (module interfaces), and CF001 (task boundaries).
R001 record rows are distinct from computational effect rows; do not make
record syntax a prerequisite without a demonstrated need. Existing handlers
may implement the provision contract. A new Layer abstraction needs its
own justification and resource-lifetime design.

## Two places errors must compose

**Service assembly.** Constructing Database can fail with ConnectionError;
constructing BalanceApi can fail with ConfigurationError. Composing their
constructors infers both errors and the required inputs. Supplying this
assembly to a business computation accounts for setup failures as well as
the business computation's failures, without a manually authored union.
Providing a service does not erase errors from invoking its operations.

**Business execution.** Database operations may fail with DatabaseError;
BalanceApi operations with NetworkError or ParseError. The route itself can
raise ValidationError or BusinessRuleError, including in branches after
successful service calls. Sequential calls, branches, helper functions and
recovery compose these errors automatically. Error types stay precise;
neither a universal catch-all error nor a runtime defect is a substitute.

Keep setup and operation contracts distinguishable. A setup error belongs
to construction, not to every method of the constructed service. Capturing
an HttpClient during construction may discharge that method's dependency;
it must not silently erase a NetworkError that the method can later raise.
Actual reachability determines the exposed error channel; the compiler is
not required to prove arbitrary predicates or eliminate dead branches.

## Reference scenario and required observations

These are semantic requirements, not proposed Waxwing syntax. `R` means
outstanding capabilities and `E` means possible typed error families. Set
notation below summarizes distinct families; it does not replace Waxwing's
ordered, scoped effect-row semantics.

| ID | Scenario | Required observation |
|---|---|---|
| A1 | Define named getUserRoute from independent Database, BalanceApi and Logger operations | Infer R = Database, BalanceApi, Logger; E = DatabaseError, NetworkError, ParseError, plus errors explicitly raised by the route. No combined row written. |
| A2 | Add ValidationError and BusinessRuleError in ordinary branches or a named helper | Infer both additional families; successful results still compose normally. |
| A3 | Replace BalanceApi with AcmeFintechLive requiring HttpClient | Infer residual R = Database, Logger, HttpClient. Preserve operation errors and add any reachable setup errors. |
| A4 | Compose service constructors with ConnectionError and ConfigurationError | Infer their combined setup E and R. An already constructed service does not retain errors belonging only to its earlier construction. |
| A5 | Construct and provide all implementations, then execute the route | No user capability remains; reachable setup and execution errors remain typed. Providing dependencies alone never makes the program infallible. |
| A6 | Handle NetworkError only | Remove NetworkError, preserve DatabaseError, ParseError and business errors. Recovery's own R and E join the result, including a newly raised NetworkError. |
| A7 | Handle setup errors separately from execution errors | Each boundary removes only errors from its enclosed computation; other errors remain visible. |
| A8 | Handle all remaining typed failures at the program root | The root has no outstanding user capabilities or typed failures; the existing permitted host Console behavior remains explicit. |
| A9 | Supply a fake BalanceApi requiring no HttpClient | The business function is unchanged; replacing the implementation changes residual requirements according to the fake's contract. |
| A10 | Remove one provision or one error handler | Reject at the appropriate boundary with the missing capability or remaining error family and useful source origins. |

Use a stateless fake for each operation and inject setup failures,
operation failures and route failures independently. Tests must demonstrate
the successful result and each failure/recovery path, including recovery
that fails with another family. Type assertions must observe exact residual
channels, not just compilation success or the first missing label.

## Composition requirements beyond the happy path

- **B1. Transitive and public composition.** Independently defined named helpers
  compose transitively, across source
  order and eventually module interfaces, without copying their combined
  rows into callers. Public inferred interfaces must expose both channels.
- **B2. Higher-order and staged composition.** Higher-order forwarding preserves
  relationships between callback
  requirements and errors. Partial application, stored local functions and
  returning a function preserve the correct stage's latent channels.
- **B3. Sharing and scoped multiplicity.** Repeated calls sharing one
  capability/failure occurrence do not invent
  extra requirements. Nested scoped handlers still preserve multiplicity
  and select the right occurrence. Do not implement rows as plain sets.
- **B4. Recovery and translation.** Error recovery and deliberate contextual
  translation remain available.
  Translating one family replaces that family's contribution; it does not
  require wrapping every unrelated error or erase recovery's own failures.
- **B5. Open error rows and payload identity.** Generic composition must
  preserve open error rows without enumerating
  their concrete families. Today's prohibition on `Fail(a)` and today's
  shared key for `Fail(Error(Int))` / `Fail(Error(Bool))` need explicit
  treatment. Specify which guarantees use generic rows and which need a
  broader failure representation; do not claim arbitrary error-union
  parity while leaving incompatible same-family payloads unexamined.
- **B6. Contracts and termination.** Explicit effect/error contracts remain
  checkable. `with pure` keeps its
  meaning. Omitted/inferred contracts must have unambiguous syntax and
  useful diagnostics; recursive inference must terminate or reject with
  a source diagnostic, never silently drop a constraint.
- **B7. Abort information.** Preserve FX008's abort information through
  inference and provision.
  Error composition must not reopen the cleanup soundness hole. This
  milestone does not assert that FX007's generic bracket gap is fixed.

- **B8. Handler-site failure scope.** A failure raised by an implementation
  clause must retain its installation context. Pin the existing witness:
  an outer handler for E encloses installation of an implementation whose
  operation raises E; an inner handler for E encloses only the invocation.
  The implementation failure reaches the outer handler. Evidence:
  `test/fx-oracle.test.mjs`, "a clause failing past an inner handle of its
  family reaches the outer". The design must preserve this behavior or
  explicitly review an intentional semantic change; inferring E must not
  silently change which handler catches it.

## Design alternatives and recommendation

1. **Explicit inference marker on named declarations (recommended starting
   point).** Keep existing contracts stable; let callers request inference
   for both channels with one mechanism. The marker's spelling and scheme
   rules require a design. Requiring a marker is acceptable; requiring a
   list of the resulting families is not.
2. **Infer when the own row is omitted.** Closest surface match to the
   supplied example, but changes today's ambient-row contract and needs a
   deliberate migration and public-interface policy.
3. **Keep explicit named rows and infer only local lambdas.** Preserves
   today's behavior but does not satisfy A1. Record it as the baseline,
   not a completed implementation of this milestone.

No alternative is selected by recording these requirements. The design
must compare principal schemes/constraints, generalization, recursive
declaration groups, explicit-contract checking, and exported interfaces.
It must specify error propagation through handler clauses and construction
without exposing private implementation dependencies in service contracts.
Document which current accepted/rejected programs change and why.

## Evidence and completion gate

The [assurance register][assurance] adds a design gate: state why inferred
schemes justify checking and preserve requirements, typed failures and
FX008 marks. Cover callbacks, residual constraints, handler provision,
recovery, local generalization and recursive declaration groups. Specify
completeness, principal schemes and termination as separate claims.

Compare the published rules used with Waxwing's adaptations. Require a
reviewed local soundness argument before implementation planning; propose
focused Lean statements for distinctive generalization/cleanup interactions
where practical. This schedules an evidence decision, not proof work.
The existing record proofs do not discharge these obligations.

Inference foundations: the [assessment][foundations] maps published
inference conditions (HM(X), EMLTI, Jones 1995, OutsideIn(X), Koka) to
this milestone; O10-O14, O16 and O18 are its open rows, IF7 and IF8 its
candidate statements (proposals, not authorized proof work).

[assurance]: 2026-10-21-type-system-assurance-register.md
[foundations]: 2026-10-22-inference-foundations-assessment.md

Before an implementation plan, write and review a language design covering
the decisions above, including syntax, solving/termination, diagnostics,
error-family identity, setup-versus-execution behavior and FX008 marks.
Then use the project's writing-plans skill for a test-first plan grounded
in those decisions. This requirements document is not that plan.

The plan must assign A1-A10 and B1-B8 individually to exact compile-time
observations and executable tests. No broader composition obligation may
be discharged solely by incidental generated coverage. Include an independent
reference model for composition,
bounded generated cases across helper/handler boundaries, and regression
proofs restoring defects that lose requirements or errors. Record residual
limitations separately from established guarantees. Run `npm run verify`
and the whole-branch review before declaring the implementation complete.

Full Layer lifecycle, shared acquisition/memoization, cancellation, async
execution, general resumable handlers and value-level extensible variants
are separate projects. INF001 must deliver the service-construction and
business-error composition above without implying these broader features.

## Sources and provenance

- User-supplied PureScript comparison and Effect route/Layer example,
  discussed 2026-10-11; subsequent explicit requirement that error channels
  compose at assembly and business-logic time.
- [Effect Layers](https://effect.website/docs/v4/requirements-management/layers):
  construction tracks provided services, construction errors and inputs.
- Local effects design: `2026-10-09-effects-design.md`, sections 1-2;
  abort-tracking design: `2026-10-10-abort-tracking-design.md`, sections 3/7.

Conceptual influence only; no external implementation copied. Followed
project brainstorming for the milestone brief and verification guidance
for claims. Design approval and implementation planning remain future work.
