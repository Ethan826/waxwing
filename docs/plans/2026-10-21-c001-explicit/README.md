# C001: explicit instances and dictionary passing

Status: bounded design proposal, 2026-10-21. Nothing here adopts language
policy or implements compiler behavior. Design examples use proposed syntax;
the executable baseline is labelled separately. The author must choose the
representation before implementation planning.

A client should accept a chosen implementation as a value. Two clients at
`Int` can use sum and product in the same program. A constructor can combine
independently supplied implementations, and specialization must retain those
values. Newtypes remain useful for domain distinctions and invariants.

Read [acceptance programs](programs.md), [the core rules](core.md),
[collection policies](collections.md), [source mapping](sources.md), and
[assurance obligations](assurance.md). [Review notes](review.md) retain the
adversarial findings and Humanizer/Garner review. [Handoff](handoff.md)
records the branch, checks and outstanding decisions.

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
rules use `D(C, T)` for whichever representation the author chooses. It is
not a third representation. All source constructors and projections must
remain available to user-defined interfaces, with no special status for
Semigroup, Eq, Ord or Show.

Recommendation for review: try A first because records of functions already
exist. B merits adoption if nominal interface identity or a later checked
class interface has a demonstrated benefit. Neither is selected here.
Neither requires open-row composition or the unfinished record solver.

## Decisions for the author

1. Choose A or B for source dictionaries. If B, approve explicit public
   construction and nominal class identity without implicit search.
2. Approve this pure, closed-signature, rank-1 tranche as a design boundary.
   Methods have no inferred effects or local polymorphic fields. All type
   metas must be solved in this core, including phantom reference
   instantiations. These restrictions limit
   this tranche only; P001's broader hole policy remains unchanged.
3. Approve the collection contract: retain the governing dictionary;
   lookup and update take no replacement policy; cross-policy combination
   rebuilds under a written destination and collision rule. A fast raw
   merge needs a separate compatibility witness design.
4. Approve runtime dictionary parameters through specialization and the
   focused assurance gates. Further proofs need reviewed statements and
   separate authorization. No Lean work is proposed for execution now.

No approval is requested for implicit instance search, automatic derivation,
higher-kinded classes, law-dependent optimization, or full modules. Those
remain outside this tranche. No shared backlog, progress, direction, ADR or
record-research file belongs to this change.

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
class implementation or language-policy adoption; representation selection
remains a decision for the author.

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
Decision 2's all-meta restriction remains pending.
