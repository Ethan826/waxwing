# Finite-base follow-up for the paused campaign

2026-10-21, Codex. Scope authorized by the author: investigate the
standing finite-base question and leave an answer for Claude. Other
campaign streams remain paused. No production compiler changes, D4,
backend work or solver integration.

## Findings

The singleton-base counterexample builds independently from checkpoint
`9c3b9b7` with Lean 4.35.0. That original file remains on its paused
branch; this change does not integrate the branch.

The obstruction extends beyond a singleton base universe. Given a finite,
duplicate-free list covering every base constant, add one branch per base
constant, one for functions and one for records. The new Lean files prove
that the resulting semantic row-equation family has finite solutions for
every finite input type, but no fixed presence choice for a named base
branch works across those inputs. Two-base and four-base cases instantiate
the general validity result; the two-base case also explicitly instantiates
the non-uniformity result.

The pattern is:

```text
u₁ ⊎ … ⊎ uₙ ⊎ uFunction ⊎ uRecord = { f: α }
uᵢ ⊎ mᵢ = { f: Baseᵢ }                  for every base constant
uFunction ⊎ mFunction = { f: β₁ → β₂ }
uRecord ⊎ mRecord = { f: { ...w } }
```

Exactly one part holds `f`. A base branch can hold it only when `α` is
that base; the function and record branches cover their respective shapes.
Every type has one of these shapes in the model. Each remainder supplies
the target field when its part is empty. The negative argument covers all
solutions, not only the particular construction used for existence.

The model already permits arbitrarily nested functions and records.
Infinitely many such types do not substitute for infinitely many opaque
base constants. Adding an unlisted base makes this same finite family
invalid; the new theorem `general_family_missing_base` checks that control.
This explains why a two-base oracle misses the singleton example: the
example must grow a second base branch before it is valid again.

## Exact proof boundary

Files in `research/composition-proofs/Composition/TypedAttack/`:

| File | Result |
|---|---|
| FiniteShapes.lean | Complete finite base lists cover all model types; canonical finite partitions exist. |
| FiniteCompatibility.lean | Necessary branch conditions force a base arm's presence to follow the input type. |
| FiniteEquations.lean | Finite parts and remainders satisfy the actual disjoint row-composition equations. |
| FiniteObstruction.lean | Arbitrary shape-correct targets are allowed; every solution has the forced-presence property. Two-/four-base instances and an omitted-base control. |
| FiniteAudit.lean | Axiom report for the new results. |

The main theorems are `general_family_valid` and
`general_family_no_uniform` in namespace
`Composition.TypedAttack.FiniteShapes`. Their premises include a complete
base list; validity also requires that list to have no duplicates.
Finiteness covers targets, part rows and remainder rows at every depth.
The non-uniformity result permits arbitrary witness rows, so it excludes
finite uniform witnesses as well.

This is a branch-indexed semantic equation family using the existing
`G`, `Row`, `compose` and `composeAll`. It is not a generated Nat-indexed
`SigProblem`, and no theorem connects that encoding or Waxwing source to
these equations. The branch targets stand for the base, arrow-component
and record-row choices shown above. An AST encoding and its correspondence
would complete that formal bridge. Do not report the general finite-base
`SigProblem` theorem as already proved.

An independent agent reviewed the definitions and proofs. It found no
false theorem and confirmed that the later equation files close the
initial omission of remainder rows. It emphasized the unproved AST/source
bridge and the distinction between necessary conditions and full equations.

## Waxwing source reachability

`probe.mjs` builds three source scaffolds. All parse and resolve with the
existing compiled checker; all are refused at Check with an unresolved
split. `probe-results.json` records the exact diagnostics. These are
static probes; no scaffold was executed or emitted as Go.

A polymorphic `gate` takes a whole row and a pair of rows for each branch.
Passing singleton records makes its fresh call-site variables satisfy the
equation shape above. A crashing function supplies an unconstrained arrow;
`recordAny` supplies an open record. Thus the obligation can arise through
ordinary source calls without dedicated existential syntax. The scaffold
is deliberately contrived and includes a crashing helper; it is not an
application example or a useful runtime implementation.

The four-base scaffold is not established as valid Waxwing. Actual types
include `TData`, effect-bearing `TFun` and `THandler`, in addition to the
four builtins and records (src/Domain/Type/Core.purs). For example, a nominal
`Box` input is not covered by the six branches. The nominal source probe
records today's unresolved check, not a correct contradiction result.
Neither that refusal nor the concrete Int probe isolates the new theoretical
limitation from the current solver's existing inability to decide the split.

Consequently there is no demonstrated failure of `route`, ordinary record
composition, generics, HKTs or classes. What is refuted is the unrestricted
uniform-presence approach for the closed finite-base equation model.
Transfer to Waxwing's intended generic semantics is still a question.

## What Claude should do next

1. Read this note before restarting the D3a/D3b streams. Do not keep treating
   the singleton as harmless merely because the oracle has two bases.
2. Decide and state the generic type universe: does an abstract type range
   over a closed per-program list of type heads, or an extensible universe
   including fresh nominal types? Finite builtin primitives alone do not
   answer this. No language-policy change is adopted here.
3. For the closed finite-head interpretation, extend the counterexample to
   every admitted constructor and check its source relevance. For an
   extensible interpretation, justify the fresh-opaque-type assumption and
   the mapping of witnesses back into realizable source types.
4. If retaining the current finite-base model, revise D3a's scope or propose
   richer witnesses. Type-shape-dependent choices in an internal witness
   language are a candidate, not an approved runtime typecase feature.
5. Ask the oracle to generate one arm per base and to include the enlarged
   family as a deliberate separation control before any further no-gap run.
6. Preserve the previous approval boundaries. D3b's sound transfer results
   and the presence proofs are not refuted by failure of this completeness
   claim. D4 and production integration remain unauthorized.

## Reproduce and trust

From the repository root, with the pinned Lean toolchain:

```sh
cd research/composition-proofs
lake build
lake env lean Composition/TypedAttack/FiniteAudit.lean
```

For the source probes, from the repository root after an ordinary compiler
build:

```sh
node research/division-campaign/finite-base-followup/probe.mjs
```

The source probes used the existing `output/` modules; they did not build
the compiler afresh. They record observations on that build, not a clean
compiler verification. The quiet-machine verify owed by the paused campaign
has not been run by this task.

Lean validation: the original singleton target builds in an isolated copy;
the full proof library with the new modules builds there. Final validation
and the new axiom report are recorded in this directory. New files contain
no proof placeholders or declared axioms; reported dependencies are only
`propext`, `Classical.choice` and `Quot.sound`. The finite-base semantic
extension is local derived work, explicitly exposed for review under
ADR 014. No external publication or push.
