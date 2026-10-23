# The hole contract: `lacks` and `disjoint` at the default

Status: corrected after review (2026-10-23), on the author's ruling of
that day. Shadow only. Amends W §1.5's syntactic check (research/
division-campaign/witness/statements.md), Strategy.HoleContract.

## The rule

Today (cited, HoleContract.purs `equational`): with the bindings
applied, a `B` atom mentioning a hole breaks the check unless it is an
equation with syntactically equal sides, so every `lacks`/`disjoint`
atom mentioning a hole breaks it. Amended: such an atom breaks the
check unless it is established at the defaults, that is unless
`atomUnder (facts problem) (settled <$> images) entry` is `Right unit`
(cited: Strategy.Atoms `atomUnder`, `facts`; ReadBack.Type `settled`:
a type hole `Int`, a row hole no tail; `images` as today, a `Free`
binding its hole in its sort's position). `atomUnder` applies the
substitution itself and checks both rows' definedness (no label twice,
each tail lacking each field, tails pairwise apart) from D's listed
facts only. Its refusals for these atoms are `Undefined` or
`NotEntailed` (`Unsatisfied` arises only for equations and `Ff`). On a
refusal every hole the atom mentions is broken: `NoWitness
(HoleContract v)`, `v` chosen as today (first in `Ord Var` order).

Unchanged: the equation arm (syntactic, holes not defaulted, and it
checks no definedness), the `BQ` arm, Cov's order. Atoms mentioning no
hole are not judged. D holds facts about rigid rows only (cited,
Generate/Signature.purs; Atoms.purs header), so no fact about a hole
exists, and `settled` removes hole tails before facts are consulted.
The verdicts here do not depend on the type default: field types need
only be defined, and `Base` and `TVar` both are (argued). Not implied:
split selection, a non-default hole binding, an ambiguity policy.
No contradiction (cited): `holeContract` returns `Either
NoWitnessReason Unit`, its only `Left` is `HoleContract v`, and
HoleContract.purs imports no `Contradiction`; Solved stays (W §1.6).

## Soundness (argued) and its limit

Atoms states its judgement sound for every rigid assignment satisfying
D (cited, Atoms.purs header; argued there, for generic candidates).
For a hole of the checked IR, lowering fills it with these defaults at
every key (cited: Specialize.purs:47 `specialize = specializeWith
TInt`, the injected representative; Lower.purs:53 `TVar (Hole _)` to
the representative, :63 `tail`, `Hole _ → pure Nothing`; Values.purs:99
`slotType`). So an atom established at the defaults holds at every key,
as W §1.5 asks. Limit: a `Free n` that Witness.purs makes for a
variable σ omits (BACKLOG R023) has no checked-IR hole; lowering does
not read witnesses yet, so its default is the contract's convention, an
open obligation Task 6's lowering must adopt (R023). Sharing a number
with a checked-IR hole does no harm here: both get the same
sort-positional default.

## The arm never refuses an online witness (argued; checked by RT8)

For σ's own keys, a binding's image equals σ's value, and
`ReadBack.read` sets `substitution = settled <$> unsettled`, so the
arm's substitution is the one G0 accepted. For a variable σ omits, G0
judged it as a tail with no facts; the arm puts `{}` or `Int` there,
and in `rowDefined`, `rowLacks` and `rowsApart` a tail only adds
conjuncts. So G0's acceptance implies the arm's (monotonicity), and a
witness is built only on acceptance (Strategy.purs `checked`). Check:
after the re-pin, no RT8 `HoleContract` arises from a lacks/disjoint
atom. The arm still matters: it removes today's three refusals, and it
is the real check for hand-built witnesses, other adapters, Adapt-N,
and any drift between G0's and the contract's defaults.

## Boundary examples

Rigid `r`, `s`; holes `h`, `k`; flexible `x`, `y`. Atom; D; result.

- E1. `x lacks a`, `x ↦ { ...h }`; none. Admit.
- E2. `x disjoint y`, `x ↦ { ...h }`, `y ↦ { ...r }`; none. Admit.
- E3. As E2, `y ↦ { b: Int, ...r }`; none. NoWitness (undefined).
- E4. `x disjoint y`, `x ↦ { a: Int, ...h }`, `y ↦ { ...r }`;
  `r lacks a`. Admit.
- E5. As E4; none. NoWitness (`r lacks a` not entailed).
- E6. `x lacks b`, `x ↦ { a: Int, ...r, ...h }`; none. NoWitness.
- E7. `x lacks a`, `x ↦ { a: Int, ...h }`; none. NoWitness (any value).
- E8. `x disjoint y`, `x ↦ { ...h }`, `y ↦ { ...k }`; none. Admit.
- E9. route's `{ ...r } = { ...h, ...r }`; `s disjoint t`. NoWitness.
- E10. `{ a: Int, ...h } = { a: Int, ...h }`; none. Passes, unchanged.
  So does `{ a: Int, ...r, ...h }` on both sides, undefined at every
  value: the equation arm checks no definedness (unchanged).
- E11. `x lacks a`, `x ↦ { ...s }`, no hole; none. Not judged.
- E12. `x disjoint x`, `x ↦ { ...h }`; none. Admit: true only at `{}`.
  With `x ↦ { ...r, ...h }`: NoWitness (not entailed).
- E13. `x lacks b`, `x ↦ { a: Int, ...h }`; none. Admit.
- E14. `x lacks a`, `x ↦ { ...r, ...s, ...h }`; `r lacks a`, `s lacks
  a`. NoWitness (tails not apart); adding `r disjoint s`: Admit.
- E15. `x lacks c`, `x ↦ { a: { b: Int, ...r, ...h } }`; none.
  NoWitness (undefined at depth); with `r lacks b`: Admit.
- E16. `x lacks b`, `x ↦ { a: hole }` (a type hole); none. Admit.
- E17. `x disjoint y`, `x ↦ { a: Int, ...h }`, `y ↦ { a: Int, ...k }`;
  none. NoWitness, both holes broken, `x` (first in `Ord Var`) named.
- E18. A hole admitted by E1's atom that also sits in an unequal
  equation, or fails a `BQ` atom: NoWitness (the arms combine).
- E19. Hand-built σ omitting `x`, B `x lacks a`: `x` is `Free`, so
  `{}`: Admit (NoWitness under the literal rule; R023's hole).

## Expected outcomes, tests and mutants

Expected (argued; checked by the implementation): r005b/
render-quiet-annotated main and R022's probes move from `NoWitness
HoleContract` to `Witnessed`; route's `u` stays `NoWitness` (E9).

Tests for E1-E19 through the production `substitutionWitness`,
written first; RED for the admitted ones that change. Production path
and RT8 re-pin. Mutants, each with its killing examples: the arm
accepts every atom (E3, E5-E7); judges without defaults (E1, E2, E4,
E8, E12); empty facts (E4); the literal arm restored (E1); the equation
arm judged at the defaults by `atomUnder` (E9; regression row); the
arm judging hole-free atoms: equivalent (argued), since a refused
atom breaks only the holes it mentions; its killable form, a refused
hole-free atom breaking every hole, fails E11 (a `Free` hole beside).

Follow-up (not here; BACKLOG): Cov has no sort or genericity check for
hand-built witnesses (a row variable bound to `Inline (TVar hole)`
hides its hole); reusing `generic` on the settled images would fit.
