# Effect kinds, extensibility and guarantees: research spike

Status: research findings and candidate questions, 2026-10-24. No language rule,
implementation plan or theorem is approved by this note. No compiler code
changed. The baseline inspected is `main` at `2af6e40`; Claude's unmerged R0 and
a-min work is outside this source audit.

The author's goal is to distinguish recoverable failure, external inputs and
external commands, while allowing libraries to define useful effects. The author
objects to calling a computation `pure` when it can throw an unhandled
exception. Divergence, deliberate defects and resource safety need explicit
treatment too. A broad `IO` requirement alone would not answer these questions.

The sources supply established mechanisms for a small language core with an open
library vocabulary. The language must still enforce the guarantees of that
vocabulary, and foreign implementations remain a trust boundary. This is an
architectural candidate, not an adopted Waxwing design.

## 1. The different questions an effect annotation can answer

These properties need separate definitions. A single syntax may express several,
but we should not assume one from another.

| Property | What the programmer learns | Separating example |
|---|---|---|
| Required service | The caller must supply an implementation. | `Accounts` can have a constant fake or a network-backed handler. |
| External observation | Execution may consult information outside its explicit inputs. | A wall-clock read can change its result without writing application data. |
| External command | Execution may cause an externally visible action. | Sending a payment request is different from reading a configuration value. |
| Escaping failure | Evaluation may leave through a named failure family. | `Fail(ParseError)` differs from returning a `Result` value. |
| Mutable state | Evaluation may read or write a particular store. | Local scratch storage differs from a shared global cell. |
| Possible divergence | Evaluation may fail to terminate. | An infinite loop can perform no service operation. |
| Deliberate defect | Evaluation may abort through a construct such as `crash`. | An empty service row need not rule out an untracked defect. |
| Control and lifetime | A computation may suspend, resume, escape or be cancelled. | Resuming twice across a file scope differs from an ordinary call. |

These dimensions overlap. A network call can send a command, observe a reply,
fail and block. A filesystem read may change host metadata. A read/write
distinction must name the resource model and host contract; its English name
supplies no proof of physical noninterference.

An effect row usually describes permitted behavior, not an execution trace.
Permission to write does not prove that a write occurs. An unused label does not
by itself establish nondeterminism. Neither row membership nor a method
signature establishes ordering, rollback, idempotence or commutativity.

## 2. Candidate vocabulary to investigate

All names below are illustrative. The table proposes distinctions for research,
not new compiler constructors.

| Kind | Illustrative vocabulary | What could live in a library | What needs enforcement or a trusted boundary |
|---|---|---|---|
| Domain services | `Accounts`, `Database`, `BalanceApi` | Interfaces, adapters, fakes and assembly. | Handler effects must remain accounted for; declaring a service does not certify its implementation. |
| Typed failure | `Fail(DbError)`, `Fail(ParseError)` | Payload types, domain operations, recovery and conversion to values. | Abort routing, family identity, residual requirements and cleanup semantics. |
| Explicit environment | `Config`, `Reader(a)` | Interpret reads from an explicit immutable value. | Scope and handler identity; configuration loaded from disk still has an acquisition effect. |
| External observations | `Clock`, `Entropy`, `FileRead` | Domain wrappers and deterministic test handlers. | The actual external primitive, FFI declaration and accounting for captured authority. |
| External commands | `ConsoleWrite`, `FileWrite`, `NetworkSend` | Narrow APIs, buffering and in-memory interpretations. | Genuine external actions cannot be erased by merely handling a service label. |
| Pseudorandom computation | `Random` with an explicit seed | A deterministic generator and seed-threading interpreter. | Hidden entropy or global seed acquisition must not masquerade as explicit input. |
| Search or choice | `Choose`, `Yield` | Interpretation as first result, all results or another policy. | The selected continuation semantics; repeated resumption needs runtime support. |
| Local state | `State(a)` or a region-indexed store | A state-passing handler; local algorithms. | Escape and aliasing rules for real references, and generalization safety. |
| Shared state | Store-specific read/write capabilities | Abstract store interfaces and policies. | Atomicity, cross-thread visibility and scheduling are separate guarantees. |
| Divergence | An analysis result such as `div` | Libraries can expose algorithms with known termination arguments. | A whole-language termination claim needs analysis/proof and conservative propagation through calls and handlers. |
| Deliberate abort | A candidate `Abort` or defect annotation | Domain-specific checked failures remain ordinary library vocabulary. | An untracked abort primitive must not defeat the advertised guarantee. |
| Resources and concurrency | `Acquire`, `Await`, `Cancel` | Structured combinators over suitable core facilities. | Cancellation delivery, finalization, continuation multiplicity, foreign callbacks and ownership/lifetime rules. |

`Random` deserves two examples: an explicit seed can make a simulation
reproducible, while reading fresh operating-system entropy cannot be replaced
with an ordinary input-free function. Similarly, `Config` can be provided as a
value after one external load. The effects of acquisition and later use need not
be identical.

## 3. What extensibility means

| Extension | Can it usually be a library? | Boundary |
|---|---|---|
| A new operation name and parameter/result types | Yes, with native effect declarations or an encoded effect library. | The compiler checks a general declaration rule rather than enumerating every service. |
| A handler implemented using existing effects | Yes, within the core's handler expressiveness. | Its residual effects, scopes and control behavior still need checking. |
| A new primitive backed by a host API | A library can package its binding. | Some host/runtime implementation and a trusted effect contract are unavoidable; no compiler fork is inherently required. |
| A new property such as “never writes,” “exactly once” or “commutes” | Only if the existing type/proof machinery can express and verify it. | Adding a label with that name does not establish the property. Otherwise this needs new verified rules or explicitly trusted evidence. |

This distinguishes an open set of effect names from an open set of compiler
reasoning principles. A generic checker can understand fresh names without
knowing their business meaning. It cannot infer arbitrary laws about those
names.

A small core could supply operation invocation, handling, row polymorphism,
scope rules and the required runtime control. Libraries could supply most named
services and their interpreters. External roots, meaning operations at the host
boundary, could be declared through a controlled FFI or resource interface.
Whether Waxwing adopts this split remains open.

Direct-style native effects do not require us to finish HKTs and class
resolution before allowing a new service declaration. Reimplementing the whole
mechanism as a Haskell-style library would instead depend on the host type
system's abstraction facilities and change the programming model. Waxwing
already has native declarations and handlers.

## 4. Prior art and its limits

The following are source readings, not claims that their theorems already apply
to Waxwing. Central sections were read beyond their abstracts.

| Source | What it contributes | What not to inherit without review |
|---|---|---|
| Pretnar, [An Introduction to Algebraic Effects and Handlers][tutorial], §§2-4 and §6.5 (2015) | Operations, interpreters, state passing and a distinction between requests and actual external actions. | State in this tutorial is not a proof of arbitrary heap-reference safety. |
| Leijen, [Koka: Programming with Row-polymorphic Effect Types][koka], §§2.2, 2.5 and 6 (2014); [core definitions][koka-core] | Distinct exceptions, divergence and state; scoped state encapsulation. `pure` is an alias allowing exceptions/divergence, while the empty row is `total`. | The alias is a naming choice; Waxwing need not adopt it. The paper's formal fragment does not cover all current implementation facilities. |
| Brachthäuser, Schuster and Ostermann, [Effects as Capabilities][effekt-2020], §§1.1-1.6, 3-5 (2020) | Lexical capabilities and contextual effect polymorphism; explains effect safety separately from purity. | An empty contextual annotation does not imply no side effects. This differs from Waxwing's dynamically scoped handlers. |
| [Effekt FFI][effekt-ffi], “Captures” | Host functions declare captured resources, including user-declared external resources. | Foreign annotations are trusted. A user-declared resource is not a proof that foreign code respects its label. |
| [Flix primitive effects][flix-primitive] and [handlers][flix-handlers] | Separates primitive external effects from algebraic effects that handlers can reinterpret. | Its broad `IO` grouping is not the requested granularity. The primitive-effects page flags itself as pending rewrite. |
| Kiselyov, Sabry and Swords, [Extensible Effects][extensible], §§2-5 (2013) | Effects and interpreters represented in a Haskell library, with the request set reflected in types. | This does not replace the host's rules for partiality, primitive effects or unsafe facilities. |
| [Unison abilities][unison] and [user-defined abilities][unison-new] | Extensible requests, handlers and explicit empty ability sets. | [Unison's `bug`][unison-bug] can abort without a failure in the signature; an empty ability set is not the author's desired no-abort guarantee. |
| [Idris 1 Effects tutorial][idris], introduction and dependent effects | Library-defined effect vocabularies and resource protocols, using dependent types. | This is historical Idris 1 material; it relies on stronger types than Waxwing currently has and does not by itself solve cancellation. |
| Kammar and Pretnar, [No Value Restriction Is Needed][value-restriction], §§3-4 (2016) | A sound polymorphic calculus for algebraic effects, and an explicit discussion of state expressiveness. | §4.2 argues that general references need additional features; it is not a proved universal impossibility theorem. Do not transfer the generalization result to an extended Waxwing heap unchecked. |

A concrete Haskell-library boundary is visible in
[`effectful-core` 2.6.1.0][effectful]. It offers
`runPureEff :: Eff '[] a -> a`, but also an unconditional `MonadThrow`
instance for `Eff es`. The list need not contain an exception effect for
`throwM` to be available. This was checked in API documentation, not by
running Haskell. It is a reason to inspect escape hatches rather than
infer guarantees from a library's use of “pure.”

The Effekt reading needs several distinct papers:

- [Effects, Capabilities, and Boxes][boxes] (2022), §§4.3-4.5 and 5.2,
  tracks capabilities in boxed first-class computations. Its effect-safety
  result prevents calling a capability without its delimiter. It does not
  prove arbitrary termination, external purity or resource finalization.
  §5.3 leaves a full formal treatment of inference to future work.
- [Region-based Resource Management in Continuation-Passing Style][regions]
  (2022), §§4.6-4.7, 5 and 7, supplies typed resource scopes, exceptions and
  a preserving CPS translation. General resumptive effects remain future
  work in that paper; the theorem is not a general cancellation result.
- [Multiple Resumptions and Local Mutable State, Directly][multishot]
  (2025), §6, makes a backend limit explicit. Sequential repeated
  resumption works, but reentrant resumption aborts at runtime. Earlier
  Effekt backends allowed it. This is a backend-specific limitation, not
  an impossibility theorem; a source purity promise must account for it.

Library extensibility also has a scoped-operation boundary. In
[Effect Handlers in Scope][scope] (2014), §§8-11, Wu, Schrijvers and Hinze
separate where a computation is scoped from how its effects interact.
First-order handlers can implement a particular `catch`; independently
reinterpreting scoped constructs such as `catch` or `local` requires more
machinery. Neither a flat set nor a list of effect names chooses whether
state survives failure.

[Freer Monads, More Extensible Effects][freer] (2015), §§2.4-3 and 7,
shows another library implementation route: represent computations as
requests plus continuations. Its region example uses abstraction and
higher-rank types and restricts incompatible interactions. Dedicated
machine-stack capture is therefore not logically required, but some
faithful continuation representation is. Native direct style and an
encoded computation datatype have different costs and ergonomics.

A particularly relevant additional lead is Ahman and Bauer's
[Runners in Action][runners] (2020), §§3-5 and Theorem 7. Runners offer a
restricted way to implement operations over resources, with a separate
finalization construct and a formal finalization guarantee under the
paper's assumptions. They deliberately restrict general handlers;
external kill signals are an explicit qualification. The formal calculus
uses well-founded computation trees, and combining runners with general
handlers and unrestricted recursion remains future work (§9). It is a
candidate for the external-resource boundary, not a drop-in solution for
Waxwing's full handler and recursion design.

## 5. Purity questions to settle before spelling

There are at least four useful promises:

1. No outstanding request for a handler from the caller.
2. No external interaction, hidden external inputs or escaping language
   failure/abort; behavior depends on explicit inputs under the chosen
   observation model. Nontermination is a separate choice.
3. Guaranteed termination as well as the chosen purity promise.
4. Correct resource release under the selected exits and cancellation
   behavior.

Promise 1 is weaker than promise 2 in capability designs with captured
resources. Promise 4 does not follow from the first three: release can itself
fail, diverge or interact externally.

A fully handled `Fail(ParseError)` may be an internal implementation choice with
a deterministic successful result. Decide whether the desired `pure` guarantee
forbids escaping failure or forbids even an internal, fully handled failure
operation. Those policies differ. Neither requires calling an unhandled throw
pure.

Deliberate `crash`, a host exception, non-exhaustive matching, unsafe casts,
cancellation, out-of-memory failure and divergence need separate entries in the
contract. Excluding physical resource exhaustion from a language theorem does
not justify allowing arbitrary deliberate aborts. The contract must name its
assumptions.

For foreign code, compile-time annotations cannot prove that arbitrary
JavaScript obeys a claim. Choices include an audited binding boundary,
restricted host interfaces, validation where feasible, or an explicit unsafe
boundary. A typed effect contract alone is not an OS sandbox.

## 6. Waxwing baseline and compatibility

This pass read `docs/language.md` (“Rows,” “Handlers,” “Cleanup,” “Defects” and
“Limits”) and the original FX001 design. It did not run programs. These are
documented rules, not independently verified semantics:

- Effects and `Fail(E)` families are already user-visible vocabulary.
- Handlers are dynamically scoped; closures keep no installed handler.
- `Console` and `Fail` are compiler-provided; their handler types are
  uninhabited. Printing is a compiler special case pending library work.
- Only immediate-resumption service clauses and aborting failures exist;
  general `ctl`/`resume` behavior is reserved, not implemented. Library
  examples depending on those facilities cannot be copied into this core
  unchanged.
- `nofail` constrains typed abort through handler frames for cleanup.
  It does not establish external purity or termination.
- `with pure` does not exclude `crash` or divergence. Mutable state and
  recording fakes are not present in this baseline.

Consequently the existing compiler is a compatibility reference. Each retained
rule needs a semantic purpose and evidence. The new effect-kind research does
not authorize changing FX008, R0's validator, source syntax or the lowering
path. In particular it does not reopen the record proofs.

The current a-min review addresses faithful checking of today's effect rules. A
separate design is needed for stronger purity promises. We should record which
a-min obligations are semantic safety requirements, which preserve historical
behavior, and which depend on assumptions about foreign code or runtime exits.

## 7. Fixed separating examples for the next spike

These are proposed experiments, not programs run in this pass. Freeze the
syntax/semantic fragment and expected observations before any oracle run. Use
source-native minimal examples in each reference language; keep illustrative
Waxwing syntax explicitly separate from accepted syntax.

| Case | Pair to distinguish | Required evidence |
|---|---|---|
| E01 | Empty requirements versus deliberate `crash`. | Does the proposed purity contract accept either? Record compile and runtime outcomes separately. |
| E02 | Failure that escapes versus the same failure caught and converted to a value. | State the observable guarantee and residual requirement. |
| E03 | A constant `Clock` fake versus a wall-clock binding. | The real observation remains accounted for after handling the service. |
| E04 | Explicit seeded randomness versus entropy or a hidden global seed. | Repeated equal-input runs and inferred contracts; finite runs cannot prove determinism. |
| E05 | Returning a buffered log versus actually writing the console. | Trace records genuine external output, not merely a request that was intercepted. |
| E06 | A callback without resources versus one capturing output authority. | Store, return and invoke it after its defining scope where the source language permits this. |
| E07 | Two independent state instances versus aliased/shared state. | No accidental handler capture or unsound generalization. |
| E08 | Non-escaping scratch state versus a reference or closure that escapes. | State the region/capture rule and show a rejected near miss. |
| E09 | Printing before failure versus failure before printing. | Handling failure must not pretend an already committed write was undone. |
| E10 | An unknown new library effect versus a new guarantee named `ReadOnly`. | Ordinary extensibility succeeds; the law requires evidence beyond its name. |
| E11 | Finalization on normal return, typed failure, defect, cancellation and continuation discard. | One explicit exit matrix, including finalizer failure and divergence. |
| E12 | A continuation resumed once, twice or after its resource scope ends. | Source guarantees and backend limitations; no assumption that service handlers already provide this. |
| E13 | An honest foreign declaration versus one lying about effects or throwing a host exception. | Identify what is checked, wrapped, trusted or unsafe. |
| E14 | A recursive loop with no operation versus terminating recursion. | Termination is not inferred from an empty service row. |
| E15 | A same-named handler installed by a caller versus a callback's defining scope. | Choose dynamic or lexical meaning explicitly and check abstraction safety. |
| E16 | A scoped operation such as `bracket` versus an ordinary first-order request. | Establish which core operations make the library encoding faithful. |

## 8. A bounded route to decisions

The next work should answer questions, with an exit criterion for each pass.
More pages or more passing examples alone do not close a pass.

| Pass | Deliverable and stopping condition | What it does not authorize |
|---|---|---|
| P1: promises | A one-page glossary for purity, totality, failure, external observation, command, state and abort; agreed scope and explicit exclusions. | New syntax or changes to existing acceptance. |
| P2: correspondence | Map each promise to published rules, identify the core/library/FFI owner, and list exact Waxwing departures. | Claiming a cited theorem already covers Waxwing. |
| P3: separating programs | Implement the applicable E01-E16 pairs in bounded, frozen fragments; record version/backend, source, expected result, actual result, traces and unknowns. | Treating an expected result as proof or silently changing the grammar after a run. |
| P4: candidate design | Compare a traditional observable-effect reading, an explicit capability/capture reading and a stated combination; include costs and counterexamples. | Treating a combination of published mechanisms as automatically sound. |
| P5: statements and adversarial review | State the exact no-unhandled-failure and no-unaccounted-external-action claims; include substitution, handlers, captures, FFI assumptions and cleanup. Approve statements before proofs. | Proving all of Waxwing or implementing an unreviewed validator. |
| P6: evidence and implementation scope | Choose published arguments, targeted Lean lemmas, executable checks and correspondence evidence for each claim; plan one bounded implementation tranche. | Counting model proofs as implementation or backend proofs. |

The promising default to investigate is an open vocabulary of services and
failure families over a small enforcement core, with explicit external roots and
separate promises for failure, termination and lifetime. It matches the author's
direction while leaving its precise typing rules and syntax undecided.

## 9. Alternatives worth comparing

| Candidate | Existing mechanism | Main cost or unresolved correspondence |
|---|---|---|
| Traditional effect rows | Koka-style behavior summaries with an open operation vocabulary. | Need a deliberately chosen meaning of `pure`, complete primitive accounting and rules for callbacks, state and abort. |
| Capabilities plus capture tracking | Effekt/System C scope and capture discipline. | Changes the reading of annotations and closure/handler scope; generic inference is not settled by the 2022 soundness theorem. |
| Library-encoded requests | Haskell free/freer effects or Idris's indexed Effects. | Needs suitable type abstraction, possibly higher-rank/dependent features, and explicit computation composition. Host escape hatches remain. |
| Restricted external runners | Ahman-Bauer resource interpreters and finalization. | Restricts control; combining their formal result with general handlers and recursion needs further work. |

The source mechanisms are published. Combining them, adding new kind
classifications, or asserting stronger Waxwing guarantees is an adaptation
requiring its own correspondence and adversarial review under ADR 014. No
candidate has been adopted, and no claim of superiority is established by this
reading.

## 10. Research ledger and handoff

All rows remain open unless marked as a source finding. No policy was selected
by a reader or coordinator.

| ID | Status | Question or finding | Owner and next action |
|---|---|---|---|
| EF-PURE | Candidate | What must `pure` exclude, including deliberate defects and fully handled failures? | Author decides after P1's examples. |
| EF-ROOT | Candidate | How are external observations and commands named, captured and propagated? | Design owner compares row and capability rules in P2-P4. |
| EF-OPEN | Source finding; Waxwing adaptation open | Library declarations/interpreters are established; arbitrary new semantic guarantees are not supplied by fresh labels. | Design owner specifies the generic declaration rule and trusted extension boundary. |
| EF-STATE | Candidate | Is the first state feature state passing, scoped references or general heap cells? | Freeze a fragment and check E07/E08 before a generalization claim. |
| EF-CONTROL | Candidate | Which resumption, cancellation and foreign-callback contracts will be supported? | Control/concurrency owner supplies E11/E12/E16 and exit semantics. |
| EF-FFI | Candidate | Which host assertions are trusted, and which failures are translated? | FFI owner supplies E13 and audit requirements for JS then LLVM. |
| EF-INFER | Candidate | How do generic callbacks, captured resources and exported schemes preserve these promises? | Inference owner supplies the exact extension to INF001; existing record theorems do not discharge it. |
| EF-ASSURANCE | Candidate | Which rules come from semantics and which merely preserve today's compiler? | Validator owner labels each obligation; investigate conflicts instead of copying behavior automatically. |

Two read-only research passes covered Effekt and library extensibility.
A final bounded review of this synthesis against the Effekt readings found
no material issue. It was not an independent review of every other source
or of the Waxwing implementation. The prose review is recorded in
[the editorial note](2026-10-24-effect-kinds-prose-review.md).

Research only. No npm command, compiler build, new oracle, implementation or
proof was run. Source findings were checked by reading; proposed experiments
have not run. The earlier Microsoft-hosted Koka PDF timed out; the arXiv copy
was read instead. Two guessed Flix chapter URLs were unavailable; claims here
use the accessible primitive-effects and handlers pages.

[tutorial]: https://www.eff-lang.org/handlers-tutorial.pdf
[koka]: https://arxiv.org/pdf/1406.2061
[koka-core]: https://koka-lang.github.io/koka/doc/std_core-source.html
[effekt-2020]:https://se.cs.uni-tuebingen.de/publications/brachthaeuser20effekt.pdf
[effekt-ffi]: https://effekt-lang.org/tour/ffi
[flix-primitive]: https://doc.flix.dev/primitive-effects.html
[flix-handlers]: https://doc.flix.dev/effects-and-handlers.html
[extensible]: https://okmij.org/ftp/Haskell/extensible/exteff.pdf
[unison]:https://www.unison-lang.org/docs/language-reference/abilities-and-ability-handlers/
[unison-new]:https://www.unison-lang.org/docs/fundamentals/abilities/writing-abilities/
[unison-bug]:https://www.unison-lang.org/docs/fundamentals/control-flow/exception-handling/bug/
[idris]: https://docs.idris-lang.org/en/latest/effects/introduction.html
[value-restriction]: https://arxiv.org/pdf/1605.06938
[effectful]:https://hackage-content.haskell.org/package/effectful-core-2.6.1.0/docs/Effectful.html
[boxes]:https://se.cs.uni-tuebingen.de/publications/brachthaeuser22effects.pdf
[regions]: https://pl.cs.uni-tuebingen.de/publications/schuster22region.pdf
[multishot]:https://se.cs.uni-tuebingen.de/publications/muhcu2025multiple.pdf
[scope]: https://www.cs.ox.ac.uk/people/nicolas.wu/papers/Scope.pdf
[freer]: https://okmij.org/ftp/Haskell/extensible/more.pdf
[runners]: https://arxiv.org/pdf/1910.11629

