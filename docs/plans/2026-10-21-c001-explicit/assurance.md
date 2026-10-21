# Assurance gates for the explicit core

Status: statements and evidence plan for review. No new Lean work or
compiler implementation is authorized. No preservation theorem is claimed
proved. Primary-source correspondence is in [sources](sources.md).
Acceptance programs are proposed; reading them is not execution evidence.

## Separate claims and required arguments

| Claim | Proposed statement | Evidence required before implementation planning |
|---|---|---|
| Elaboration typing | If the annotated source derives `Gamma |- e:T => E`, then the target derives `|Gamma| |- E:|T|`, under translated named schemes and data declarations | Rule-by-rule induction; explicit construction/projection and scheme substitution cases for A or B after selection |
| Dynamic preservation | Source evaluation and target CBV evaluation agree on values/divergence and method invocation order, up to dictionary wrapper erasure | State both semantics; simulation with a closure-environment relation and exactly-once construction; typing alone does not supply this |
| Explicit selection | Each method use observes the dictionary value supplied to that lexical operand; well-typed rewrites do not replace it merely because carrier types coincide | Translation determinacy for fixed typed operands; closure/substitution argument; P3/P4 differential tests and deliberate default-substitution mutant |
| Specialization typing and behavior | Ground type substitution followed by specialization retains types and the preceding observation relation | Audit P001/FN001 graph edges, method field types and value captures; generated interpreter/backend comparisons; no claim from key uniqueness alone |
| Explicit resolution termination | Selecting a named operand/projection requires only finite syntax traversal, environment lookup and ordinary terminating monotype unification on finite types | State structural descent and occurs-check measure; there is no entailment search; user constructors are never evaluated by the checker |
| Finite code generation | Admitted declaration graphs generate finitely many type-specialization keys, regardless of the number of runtime dictionary values | Re-establish P001 §4.2 assumptions after desugaring; include all named references in closures; a resource cap is not its proof |
| Collection invariants | Under a stable lawful terminating key policy, insertion preserves uniqueness and ordered insertion preserves search order; rebuilding establishes destination invariants | Induction over enumeration/insertion, with exact collision and representative behavior; abstraction prevents forged representations |
| Algebraic laws | A chosen combine is associative, Eq is an equivalence, or Ord orders equivalence classes consistently | Independent obligations per policy; property suites supply bounded evidence; no conclusion from dictionary typing |

The target uses the existing pure function/data/product calculus, not a new
proof that the whole Waxwing runtime is safe. Progress/preservation for that
calculus must state primitives, match coverage and recursion. General
recursion permits divergence; progress must allow a next step rather than
promise a result. Effectful source constructs remain outside the model.

Typing preservation does not prove consistent selection: replacing product
with sum preserves a type while changing the result. Selection stability
does not prove associativity: subtraction preserves a chosen operation and
still violates the law. Terminating resolution does not imply terminating
user evaluation, nor finite specialization unless its graph argument holds.

## Soundness, completeness and restrictions

Soundness target: accepted derivations elaborate to well-typed target
programs under the stated fragment and assumptions. Full inference
completeness/principality for Waxwing is not promised. Relative checking
completeness for the annotated rules, after their explicit restrictions,
needs a separate argument; closed shapes alone do not prove it.

| Restriction beyond the broad C001 direction | Reason and cost | Challenge case / result |
|---|---|---|
| Type parameters have kind Type; no variable application head | Meets Int/Eq/Ord/Semigroup examples; excludes Functor(f) | `f(a)` rejected; K001 remains open |
| Closed fixed method set | Uses products; excludes open method composition | P2 accepted, arbitrary row-driven struct constructor outside fragment |
| Pure methods | Avoids effect/generalization interactions; permits divergence | Effectful comparer rejected even if operationally sensible |
| Monomorphic fields and locals | Keeps rank-1 named schemes | A single stored polymorphic `last` field is excluded; two named instantiations remain possible |
| Every evidence operand explicit | No search/ambiguity policy required | Missing d rejected even if only one candidate is visible |
| No superclass/default entailment | Avoids competing evidence paths | Ord does not automatically satisfy an Eq operand; write an adapter |
| No residual metas anywhere in this annotated core, including recorded reference vectors | Avoids hole replacement without tracking erased dictionary aliases in A | An observationally irrelevant phantom reference can be rejected; existing unconstrained P001 holes are outside this fragment |
| P001/FN001 graph restriction | Ensures finite specialization | Some finite recursive instantiation patterns remain rejected |
| Rebuilding for cross-policy combination | No identity solver needed; costs traversal/reinsertion | Equivalent fresh policies still rebuild; changed key equivalence may lose entries |
| Abstract collection constructors required | Protects invariant | A public raw tree constructor defeats the contract; production API blocked until hiding exists |

These restrictions are proposed scope limits, not evidence that excluded
programs are unsound. If the checker cannot solve a future richer fragment,
it must distinguish that limitation from a proved contradiction. This
tranche does not reuse the record solver's Solved/Contradiction/Unresolved
machinery or assert it decides these programs.

## Focused checks after approval

1. Turn P1-P4 and N1-N12 into source fixtures for the selected syntax.
   Assert exact diagnostic category and location after wording review.
2. Compare an evaluator passing dictionaries as ordinary values with the
   specialized backend on generated closed programs. Freeze the generator
   grammar first: Int/Bool carriers, named rank-1 helpers, two same-carrier
   operands, constructor calls and returned captures. Report the grammar,
   counts and seeds; bounded agreement is not completeness.
3. Restore deliberate defects in isolated copies: use the first Int
   dictionary for all calls; deduplicate equal-typed operands; drop a
   captured dictionary; omit a named reference in a closure from the graph.
   Each relevant healthy fixture must fail on its corresponding defect.
4. Check collection semantics against a simple retained-policy list model,
   including ASCII exact/folded keys, up/down order, rebuilt collisions,
   representative retention, non-associative reducers, and already-lost
   entries. A structure-relabel mutant must miss key 3 in C3's tree.
5. Establish library law assumptions separately. Check Eq equivalence,
   comparator reflexivity/transitivity and agreement with induced equality,
   and combine associativity with independent generators. A bad Eq/Ord may
   break lookup guarantees while remaining type safe. Account for partial
   operations and divergence; `pure` is not a totality certificate.

Tests should observe results and chosen method traces, not merely compare
implementation internals. Trace observation belongs to an independent test
semantics, not effectful methods added to this pure source fragment.

## Proof scope and authorization boundary

For A, first require a written typing induction using ordinary product and
function rules and the source correspondence ledger. For B, add nominal
construction/projection and wrapper-erasure cases. These arguments must be
reviewed; calling the components standard is not a substitute.

If the selected rules introduce distinctive evidence scope or identity
interactions, propose a small mechanized elaboration/value-substitution
model with exact statements and inhabited examples. Seek the author's
approval before proof work; then review results separately before adoption.
Collection insertion/rebuilding can initially use an explicit invariant
argument plus adversarial tests. Static brands, generative identity or an
automatic compatibility calculus would need a new dossier. No blanket Lean
requirement follows from the assurance register.

Backend translation validation, effectful methods, local generalization,
module abstraction and exported polymorphic schemes are separate bridges.
Existing record proofs cover none of them merely by sharing record syntax.

## Existing printability and comparability overlap

Maintained source inspection, not a fresh compiler run:

- `src/Features/Check/Comparable.purs` rejects comparisons at rigid or
  ambiguous types and ground types containing functions/handlers. Ordinary
  equality/order still use structural compiler behavior. The corresponding
  source bodies are checked before specialization.
- `src/Features/Check/Functional.purs` tracks function/handler containment
  through data applications and record fields. `Printable.purs` uses it
  for print/show/crash and entry checks; specialization rechecks print
  sites in `src/Features/Specialize/Printable.purs` when types become ground.
- Go's `src/Format/Go/Compare.purs` and `RecordHelpers.purs` emit structural
  comparison helpers. No user-chosen dictionary governs those helpers.

A function-containing dictionary therefore cannot simply be printed or
compared structurally today. The future evidence checker must inspect
nominal evidence payloads too; a wrapper cannot hide a function from this
restriction. Explicit `equalWith(eq,x,y)` or `showWith(show,x)` could be
ordinary generic clients in either alternative; their chosen operations can
differ from current built-ins.

This tranche proposes coexistence, not an operator or print migration.
Recasting `==`, ordering, `show`, interpolation, Console.print, crash and
entry-result rendering needs a separate compatibility decision. It must
preserve documented formats or name intended changes, retain evidence at
generic sites, and resolve the Console-handler polymorphic-argument gap
noted in D001/D002. A pure `Show(a): a -> Text` can be composed with
effectful output; that observation does not implement a polymorphic Console
handler.

## Executable baseline evidence, separate from the proof plan

The later [baseline](baseline/README.md) checks existing record programs
through the compiler and Go, including captures, two same-typed operands,
source-order reversal and five stand-ins for unknown types. It distinguishes
matches to recorded current behavior from the separate uniformity gate. The
latter fails on the printing cases because the function stand-in is
nonprintable. Discarding an unknown value supplies acceptance evidence only.

The runner's eight result-record mutations check its exit gate; they do not
satisfy the proposed source/compiler mutation tests above. No universal
preservation, completeness or representative-independence claim follows. The
author approved the assurance gates and held the core's all-meta
restriction open; no replacement ambiguity rule is adopted.
