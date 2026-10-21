# Prior-art mapping and local departures

Primary sources read on 2026-10-21. No implementation code was copied. Live
fp-ts API pages are identified by section and their published "Added in"
versions below; they are not an immutable source snapshot. An attempted
versioned raw-source fetch failed, so no claim relies on it. Jones page
numbers below are the page numbers printed in each PDF.

## Published rules actually used

[Jones, A theory of qualified types, revised paper][qualified], §2,
Figure 1, gives variable, application, abstraction, qualification and
quantification rules; §3, Figure 2, makes evidence abstraction/application
explicit. The latter correspond to introducing an evidence parameter and
applying it. Its evidence beta rule substitutes the supplied evidence. These
are the foundations for the optional explicit binder in core.md. Waxwing's
annotated declarations and explicit operands omit inference of predicate
entailments. This proposal does not inherit the paper's principal inference
result for Waxwing.

[Jones, Coherence for qualified types, RR-989][coherence], §1.1 Figure 1,
states entailment properties, including substitution closure; §1.3 Figure 2
gives a joint source/target typing relation, with `(=>I)` introducing a
lambda and `(=>E)` passing evidence. §5 Figure 7 is syntax directed; §6
Figure 8 integrates inference and translation. §7 Definition 5 and Theorem 5
give a sufficient coherence condition using an unambiguous principal scheme
in that framework. The proposal uses those translation rules. It supplies no
general entailment relation and claims no inherited coherence conclusion.
Two explicit operands may intentionally disagree at the same carrier;
erasing their distinction and demanding equal observations would be false.

[fp-ts Semigroup][semigroup], `Semigroup`/`Magma` shape and `last`,
`reverse`, `struct`, `concatAll` sections supply the concrete API precedents
for explicit dictionaries, selected constructors and a seeded fold. `last`,
`reverse` and `struct` are documented from v2.10.0. P2 uses a fixed closed
record in place of TypeScript's mapped-type `struct`; it promises no
arbitrary row traversal. Associativity is an obligation, not a field.
[fp-ts number][number], `SemigroupSum` and `SemigroupProduct` (v2.10.0),
show alternatives at the same `number` carrier. Waxwing uses Int and its own
arithmetic, so JavaScript numeric laws are not imported.

[fp-ts ReadonlyMap][map], `lookup`, `modifyAt`, `updateAt` and `union`,
show explicit Eq and collision operations in collection APIs; `keys` takes
Ord. These signatures are precedents for supplying policies. They do not
retain a governing dictionary in the map type and do not establish this
proposal's collection invariants. The retained-policy/rebuilding contract is
a Waxwing API adaptation, not a claim about fp-ts's guarantees.
[fp-ts Ord][ord], `fromCompare`, `equalsDefault`, `reverse` and `contramap`,
supply precedents for constructing comparisons and deriving Eq from a
comparison. This tranche adopts no automatic superclass path.

[OCaml 5.3 Map.Make][mlmap] and [Set.Make][mlset] document a functor from
an ordered type to a map/set API, with collection type `t` and operations
such as add/find/union. They are the primary-source precedent for the
abstract policy-family alternative. They do not establish generative
identity for arbitrary runtime dictionary values, nor settle Waxwing's
module system. No claim that every distinct functor application produces an
incompatible type is made.

## Exact rule-to-source and departure ledger

| Proposed component | Published foundation | Waxwing adaptation and evidence still owed |
|---|---|---|
| Explicit evidence binder/application | Jones revised §3 Fig. 2; RR-989 §1.3 Fig. 2, qualification introduction/elimination | Operand is written; preserve lexical identity and evaluation order; local typing induction |
| Named generic instantiation | Jones revised §2 Fig. 1 quantification; existing P001/FN001 | Mandatory schemes, rigid body variables, no local generalization; audit substitution |
| Record construction/projection | Existing R001 closed records and FN001 function values | A uses those rules; B adds nominal class checking and erases wrappers; prove its construction/projection cases locally |
| Dictionary constructors | fp-ts Semigroup last/reverse/struct | Ordinary named functions; fixed closed shape; no derive engine |
| Evidence substitution | Jones revised §3 evidence beta; RR-989 Fig. 1 trans/close | CBV value substitution, closures, exactly-once evaluation; behavior preservation argument required |
| Selection stability | Explicit operands plus the translation above | Deterministic lexical translation for a fixed typed program; no theorem about forgotten evidence or global search |
| Specialization | P001 §4.2 finite-key argument; FN001 §6 value-reference extension | Runtime dictionary parameters; audit hidden named references and dictionary carrier holes; differential checks still needed |
| Collection rebuilding | Explicit Eq/collision API precedent in fp-ts ReadonlyMap | Retain one governing policy and rebuild every source entry under destination; insertion invariant conditional on laws |
| Abstract-family alternative | OCaml 5.3 Map.Make/Set.Make API | M001 type identity and abstraction not designed here |

Published results apply under their own calculi and assumptions. The sources
above do not prove Waxwing's effect interactions, specialization, Go
lowering, or collection representation. The target's closed products can use
existing record lowering; no open-row constraints are generated by this
proposal's dictionary forms.

## Novelty audit under ADR 014

No new solver, resolution calculus or compatibility decider is introduced.
Ordinary functions, products, explicit evidence abstraction/application and
rebuilding by insertion supply the mechanisms. The following local rules are
adaptations requiring author review, not published Waxwing theorems:

- Runtime evidence remains a parameter in type-specialized code. Its
  integration with P001/FN001 requires the stated preservation audit.
- Reject residual type metas throughout the annotated core, including
  named-reference vectors. This conservative annotation boundary avoids
  dictionary-origin tracking in A and is stronger than necessary in
  some programs. Existing P001 unconstrained holes remain outside it.
- Pure monomorphic methods, no superclass entailment and fixed closed
  composition helpers restrict the initial fragment.
- Retained-policy maps with explicit destination rebuilding, enumeration
  order, collision order and representative retention are an API design.
- B's class identity and explicit wrapper erasure, if selected, extend
  source typing beyond ordinary records; backend sharing is not a proof.

Genuinely new machinery proposed for this tranche: none identified in this
source audit. A future scheme inferring value-level dictionary identity,
proving behavioral compatibility automatically, or adding branded policy
families would require another source search and a separate dossier. This
absence claim is limited to the mechanisms specified here; it is not a claim
of historical originality or a completed proof of their integration.

## Local inputs and status cautions

Read from the original checkout, including its uncommitted edits:
`AGENTS.md`, `CLAUDE.md`, README, bootstrap, findings, engineering,
`docs/next-session.md`, current progress, the three requested plans and
BACKLOG C001/K001/M001. The handoff opening still says the campaign stopped;
the latest progress entry says Claude resumed remaining approved research.
Neither authorizes this tranche to change or depend on that research.

The module direction is preferences/open questions. The assurance register
requires distinct preservation, selection, termination and law evidence.
P001's historical "Nothing is implemented" status is stale relative to ADR
007 and maintained source. Its rules remain a design reference, not fresh
test evidence. The assurance register is untracked in the source checkout
and therefore absent from this branch's base; this document records its
relevant obligations without importing others' changes. Input SHA-256 hashes
are retained in [inputs.json](inputs.json). They record what was read, not
ownership or a claim the source checkout cannot advance.

[qualified]: https://web.cecs.pdx.edu/~mpj/pubs/rev-qual-types.pdf
[coherence]: https://web.cecs.pdx.edu/~mpj/pubs/RR-989.pdf
[semigroup]: https://gcanti.github.io/fp-ts/modules/Semigroup.ts.html
[number]: https://gcanti.github.io/fp-ts/modules/number.ts.html
[map]: https://gcanti.github.io/fp-ts/modules/ReadonlyMap.ts.html
[ord]: https://gcanti.github.io/fp-ts/modules/Ord.ts.html
[mlmap]: https://ocaml.org/manual/5.3/api/Map.Make.html
[mlset]: https://ocaml.org/manual/5.3/api/Set.Make.html
