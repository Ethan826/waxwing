# C001: explicit instances and dictionary passing

Status: author-approved design direction with the unknown-type rule held
open, 2026-10-21, extended by the 2026-10-23 rulings below. The author
agreed to the rulings in this chat and asked that they be recorded.
Examples remain proposed syntax; the executable baseline is labelled
separately. Implementation and new proof work require separate
authorization.

A client should accept a chosen implementation as a value. Two clients at
`Int` can use sum and product in the same program. A constructor can combine
independently supplied implementations, and specialization must retain those
values. Newtypes remain useful for domain distinctions and invariants.

Read [acceptance programs](programs.md), [the core rules](core.md),
[collection policies](collections.md), [source mapping](sources.md), and
[assurance obligations](assurance.md). [Review notes](review.md) retain the
adversarial findings and Humanizer/Garner review. [Handoff](handoff.md)
records the branch, checks and remaining hold.

## Scope and representation alternatives

The core has rank-1 named functions, fully applied nominal data types,
closed operation signatures and pure methods. Type parameters range over
values of kind `Type`; a function may accept another function as a value.
Here, first-order means type constructors cannot be variables. It does not
ban closures or functions that return dictionaries.

| Concern | A: ordinary operation records | B: dedicated class evidence |
|---|---|---|
| Source type | Closed structural record of functions; a dictionary name is an explanatory abbreviation | Nominal `Evidence(C, T)` with a checked class declaration |
| Construction | Record literal and ordinary function | Explicit evidence constructor and ordinary function |
| Method use | Field projection | Class method projection from a written evidence operand |
| Interchangeability | Equal field signatures give equal types, even if interfaces have different names | Different class identities remain distinct despite equal signatures |
| Composition | Named functions construct closed records | Named functions construct evidence from checked methods |
| Service overlap | Reuses records of functions directly | Needs a distinct source type; should share backend products and closure machinery |
| Laws | No law follows from record shape | No law follows from class membership |
| Search | None | None; nominal evidence does not imply search |
| Main cost | Interface names cannot distinguish equal shapes | Adds declarations, identity and conversion rules to explain |

Both proposed translations use products of monomorphic function values at
each use. That common target does not settle their source equivalence. The
comparison rules use `D(C, T)` for either representation. The approved
direction interprets it as A; it is not a third representation. All source
constructors and projections must
remain available to user-defined interfaces, with no special status for
Semigroup, Eq, Ord or Show.

The author selected A: ordinary structural operation records. B remains a
comparison alternative for future review; dedicated class evidence is
deferred. A uses existing records of functions and requires no open-row
composition or unfinished record-solver internals.

## Author rulings, 2026-10-21

1. Approved A for source dictionaries. Dedicated class evidence is deferred.
2. Approved the pure, closed-signature, rank-1 design boundary, with no
   inferred method effects or locally polymorphic fields. The unknown-type
   rule is held open: the blanket requirement to solve every type meta is
   not adopted. A follow-up must specify permitted operations and
   admissible stand-ins, including why a printable Int stand-in may be
   used. P001's current hole behavior remains unchanged.
3. Approved the collection contract: retain the governing dictionary;
   lookup and update take no replacement policy; cross-policy combination
   rebuilds under a written destination and collision rule. Structural
   reuse remains deferred pending a compatibility witness design.
4. Approved runtime dictionary parameters through specialization and the
   focused assurance gates. Preserve written choices; assess typing,
   selection/coherence, resolution termination and algebraic laws
   separately. Further proofs need reviewed statements and separate
   authorization. No Lean work is authorized here.

No approval is requested for implicit instance search, automatic derivation,
higher-kinded classes, law-dependent optimization, or full modules. Those
remain outside this tranche. No shared backlog, progress, direction, ADR or
record-research file belongs to this change.

## Author rulings, 2026-10-23

1. Resume and reconcile the existing explicit core. Implicit search,
   dedicated class evidence, superclasses and automatic derivation stay
   outside the first implementation. This is an initial tranche;
   higher-kinded abstractions (Functor, Monad) still need K001 and further
   design.
2. Modules: the first core is permitted within one program; modules remain
   a v1 goal. An explicit-only core needs no cross-module instance search
   or coherence, because the selected dictionary travels as a value.
   Production invariant-sensitive collections need representation hiding
   (M001) before claiming users cannot forge malformed maps or sets. That
   dependency is explicit and does not block other dictionary work.
3. Prelude: yes, ordinary and small. It holds the canonical homes for
   optional values, lists and the basic operation interfaces, and may
   re-export common definitions. Importing it registers no instance choices
   and does not change the meaning of generic code. Its file organization
   does not block the dictionary core, and existing names are not renamed
   incidentally.
4. ADR 005: separate structural diagnostics from customizable operations.
   Eventually Eq and Ord are ordinary interfaces with explicit alternatives
   (and derivation where supported). The first explicit core keeps the
   existing operators and structural printing and adds dictionary-based
   operations; operator and default-selection sugar are decided
   separately. The compiler's structural, expression-like diagnostic
   printer is distinct from a user-selected renderer, and an arbitrary
   renderer need not print parseable text.
5. R0 relation (Pr-1): R0's `pr τ` and `cmp τ` atoms describe today's
   structural printing and comparison during the shadow migration. They are
   not renamed `Show τ` and `Eq τ`, because a supplied renderer can print a
   value that structural printing refuses; the contracts differ. The ValidR
   holder set is metadata for existing structural behaviour, not the
   meaning of future classes. A generic function using a selected renderer
   receives it explicitly; ordinary dictionary calls carry their
   requirement through ordinary parameter types.
6. Assurance follows [assurance.md](assurance.md): reviewed arguments for
   typing, evaluation order, preservation of explicit choices and finite
   specialization, plus adversarial tests for default substitution, lost
   captures and conflation of same-typed dictionaries. Dictionary selection
   is deliberately observable: sum and product dictionaries for Int stay
   different values, and specialization must never collapse them because
   their types coincide. The record-constraint proofs (record composition
   dossier) do not establish dictionary elaboration, selection or
   compilation correctness. Lean work is for a small distinctive claim if
   review exposes one. Algebraic laws stay separate: a well-typed semigroup
   dictionary does not establish associativity. The published basis is
   Jones's qualified types (evidence passing); the work is a precise
   correspondence and an audit of Waxwing's adaptations.
7. Sequencing: design reconciliation now, with implementation against a
   stable integration boundary. Finishing R0's switch first is a practical
   preference, not a prerequisite. The concrete open hold remains the
   unknown-type and ambiguity policy (2026-10-21 decision 2).

### First-core decisions (2026-10-23)

Corrections. The 13 compiling baseline sources do not establish that the
core needs no checker change. The unknown-type and ambiguity hold and
ValidR's F-a are related but distinct. F-a asks what every permitted
instantiation of a generic type must support; a hole asks what type the
compiler may choose at a use. One ruling cannot settle both.

1. Interface names: bring forward a small transparent type-alias feature
   (the BACKLOG R008 slice). Aliases are parameterized, transparent
   abbreviations for existing types, with terminating expansion and no new
   type identity. No associated types, type-level computation or implicit
   selection. This keeps the ordinary-record representation; a wrapping
   constructor would introduce the deferred distinction. The first useful
   delivery may include a small R008 tranche alongside C001. Prototype
   fixtures keep expanded record signatures until aliases land. Alias
   substitution and expansion go into the assurance argument.
2. Collections: include demonstrations and acceptance contracts (retained
   ordering and equality, lookup, update, rebuilding under an explicit
   destination policy). Cross-module examples are kept as requirements.
   Production invariant-sensitive maps and sets wait for representation
   hiding; that does not block dictionaries, instance constructors or
   generic clients. Exposed raw trees are no substitute.
3. Integration boundary: start with a library-and-tests tranche using
   ordinary records, functions, captures and dictionary arguments, with no
   class-specific search or evidence machinery. A complete gap inventory
   comes first, classifying the baseline into intended positives already
   supported; positives needing corrected signatures; positives needing
   aliases or another separately approved feature; intentional negative
   controls; and interpreter or backend gaps. It then names exactly which
   compiler changes, if any, remain. The shared-specialization fixture and
   the deliberately baked-in first dictionary are priority tests.
4. Prelude names for the first tranche: `Maybe`/`Nothing`/`Just`;
   `List`/`Nil`/`Cons`; `Ordering`/`Less`/`Equal`/`Greater`; and the
   structural operation interfaces `Eq`, `Ord`, `Semigroup`, `Show`. Logical
   homes are documented before module syntax exists; a later Prelude can
   re-export them. There is no second optional type named `Option`; a
   later rename would be a deliberate migration. Importing the Prelude
   registers no instance choices. Structural printing and comparison stay
   separate from explicitly supplied `Show` and `Eq`.
5. Pure-stage ergonomics: keep current semantics for this tranche.
   Acceptance fixtures use correct per-stage annotations. The syntax is
   recorded as unfinished UX with two follow-ups: diagnostics must display
   the effect-row difference instead of identical-looking expected and
   found types; and a small syntax design compares clearer ways to express
   uniformly pure multi-stage functions while keeping different effects at
   different stages expressible. No silent arrow-default change within
   C001.

Parameterized data (`List(a)`, `Maybe(a)`, collections) stays in the
acceptance suite. It is an R0 switch prerequisite: R0 must earn its
`DataApplication` support before switching those programs. It is not a
reason to weaken library goals. Shadow operation keeps today's acceptance
meanwhile.

The ambiguity question stays separate and open. Adopt neither "every hole
must be solved" nor "any stand-in is harmless". A follow-up specifies which
unresolved variables may be defaulted, how their remaining obligations are
checked, and whether the choice affects selected operations or observable
behaviour.

Authorized: documentation corrections now; after the boundary is pinned,
the three focused assurance arguments of assurance.md. No new Lean campaign
follows.

## Future compatibility

K001 may add constructor variables later; this fragment uses only fixed
constructor arities. M001 must define class/type identity, visibility and
exported schemes; the cross-module collection example assumes only ordinary
value transfer. It does not require functors, generativity or path types. A
future implicit layer would have to elaborate to explicit operands while
preserving written choices. Its scope, ambiguity and termination rules
remain undesigned. Automatic derivation would construct dictionaries by
these same public rules, subject to its own design. Algebraic law evidence
and optimization permissions require separate contracts.

## Authorization and later record decisions

The author's C001 request in this chat authorizes "design documents,
illustrative programs and bounded exploratory probes" and explicitly asks
for "ordinary operation records and dedicated class evidence" to be
compared. That is the authority for documenting option B. It authorizes no
class implementation or language-policy adoption. The later agreement
records A as the design direction; it adds no implementation authorization.

The branch was rebased onto `c341109`, including the record-composition
dossier §18.29-§18.31. §18.31's ban on new class machinery in that research
scope remains in force. Its adopted direction also applies here: generic
bodies are checked under rigid, opaque variables, including unused bodies;
adding an unrelated type must not change their acceptance. This is not a
parametricity theorem or a typed-completeness claim. Operation dictionaries
here supply methods. They supply neither type-shape evidence nor evidence
for row decomposition and do not solve the record-research obligations.

## Executable baseline follow-up

The [ordinary-record baseline](baseline/README.md) records current compiler,
Go and interpreter outcomes separately. Its gate exits 0 only when those
pinned outcomes match. Known contract rejections and parser gaps remain
explicit. The [effects-syntax note](effects-syntax-usability.md) explains
the broader usability concern exposed by the per-stage pure annotations.

The original discarded-value probes are consistent with current hole
handling, not evidence that arbitrary stand-ins are harmless. Additional
printing probes accept four stand-ins but reject a function stand-in as
nonprintable during specialization. These acceptance differences are
recorded; no type-safety failure or replacement ambiguity policy is claimed.
Decision 2 holds the all-meta restriction open. The h1/h2 difference is an
acceptance difference; it establishes no safety defect or differing printed
result. The next design question is the operation-specific ambiguity
boundary. Recording this question authorizes no additional work.
