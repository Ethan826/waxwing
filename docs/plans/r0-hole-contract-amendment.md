# The hole contract: `lacks` and `disjoint` at the default

Status: proposed rule, for review before implementation (author's
ruling of 2026-10-23). Shadow only. Amends W §1.5's syntactic check
(research/division-campaign/witness/statements.md, §1.5), as
implemented by Features.Check.Strategy.HoleContract (Task 4.4).

## What changes

Today (cited, HoleContract.purs `equational`): with the bindings
applied, a `B` atom that mentions a hole breaks the check unless it is
an equation with syntactically equal canonical sides. Every `lacks`
and `disjoint` atom that mentions a hole breaks it.

Amended rule. A `lacks` or `disjoint` atom of `B` that mentions a hole
breaks the check unless it is established at the defaults:

1. Apply the witness's bindings (a `Free` binding is its hole in its
   sort's position, as today), then every hole's default: a type hole
   is `Int`, a row hole is `{}` (cited: ReadBack.Type `settled`, the
   defaults W §1.5 and today's lowering use).
2. Judge the atom with G0's existing atom check, Strategy.Atoms
   `atomUnder`, against `facts problem`: only what `D` lists (`lacks`
   and `disjoint` on rigid rows), with both rows' definedness checked
   (no label twice, each tail lacking each field, tails pairwise
   apart).
3. `Right unit` establishes the atom. Any refusal (`Undefined`,
   `NotEntailed`, `Unsatisfied`) leaves it unestablished: every hole
   the atom mentions is broken, and the witness is `NoWitness
   (HoleContract v)`, `v` chosen as today.

Unchanged: the equation arm (still syntactic, holes not defaulted), the
`BQ` arm, the variable named, and Cov's order (coverage first). No new
procedure: steps 1 and 2 reuse `settled` and `atomUnder` as they are.

Not authorized and not implied: choosing a split, binding a hole to
anything but its default, or any general ambiguity policy.

## Why it is sound (argued)

Atoms states its judgement sound for every rigid assignment satisfying
`D` (cited, Atoms.purs header; argued there). Lowering fills each hole
with exactly the default of step 1, at every key. So an atom
established at the defaults holds at every key under the declared
hypotheses, which is what W §1.5's contract asks of the default
("the default satisfies the recorded atoms that mention it"). The
check stays sufficient, not complete: `atomUnder` entails only what
`D` lists, so a fact `D` implies without listing is not established
and the answer is `NoWitness`, never a refusal of the program.

## No contradiction, ever (argued, by construction)

The contract returns `Either NoWitnessReason Unit`. Its only failure is
`HoleContract v`, which is a compilation refusal: the verdict stays
Solved (W §1.6), and nothing in the contract builds a `Contradiction`,
a refuter or a diagnostic. An atom that fails at the default, even one
that fails at every value, is `NoWitness`.

## Boundary examples

Rigid `r`, `s`; `h`, `k` holes; `x`, `y` flexible variables.

Each case: the atom after bindings; what D lists; the result.

- E1. `x lacks a`, `x ↦ { ...h }`; D none. Admit: `{}` lacks `a`.
- E2. `x disjoint y`, `x ↦ { ...h }`, `y ↦ { ...r }`; D none. Admit.
- E3. As E2 with `y ↦ { b: Int, ...r }`; D none. NoWitness: `y`'s
  row is undefined (`r lacks b` not listed).
- E4. `x disjoint y`, `x ↦ { a: Int, ...h }`, `y ↦ { ...r }`; D
  `r lacks a`. Admit.
- E5. As E4; D none. NoWitness: `r lacks a` not entailed.
- E6. `x lacks b`, `x ↦ { a: Int, ...r, ...h }`; D none. NoWitness:
  undefined at the default (`r lacks a` not listed).
- E7. `x lacks a`, `x ↦ { a: Int, ...h }`; D none. NoWitness: fails
  at every value; the verdict stays Solved, no contradiction.
- E8. `x disjoint y`, `x ↦ { ...h }`, `y ↦ { ...k }`; D none. Admit:
  both are `{}`.
- E9. route's `{ ...r } = { ...h, ...r }` (`u ↦ { ...h }`); D
  `s disjoint t`. NoWitness, unchanged: an equation, unequal sides.
- E10. `{ a: Int, ...h } = { a: Int, ...h }`; D none. Passes,
  unchanged: equal sides, holes not defaulted.
- E11. `x lacks a`, `x ↦ { ...s }`, no hole; D none. Not judged by
  the contract, unchanged.

E7 is a witness G0 would not accept as a candidate (G0 judges the
settled σ, the same defaults); a hand-built or other adapter's witness
can still reach the contract, and gets `NoWitness`.

## Expected outcomes (argued; to be checked by the implementation)

The online strategy's witness binds σ before its hole defaults, and G0
accepted the settled σ, which applies the same defaults. So for the
online strategy every `lacks`/`disjoint` atom it meets is established
at the defaults, except where the witness has a `Free` binding for a
variable σ omits (G0 leaves it an unbound tail with no facts; the
contract defaults it to `{}`). Expected moves, `NoWitness HoleContract`
to `Witnessed`: test/fixtures/r005b/render-quiet-annotated.json main
(`r disjoint s` with `s` at `{}`) and R022's two probes
(test/r0-r022-probes.mjs). route's `u` stays `NoWitness`.

## Tests and mutants planned

- One test per row E1-E11 on hand-built witnesses through the
  production `substitutionWitness`, written first and seen failing
  where the outcome changes (E1, E2, E4, E8).
- Production path: R022's probes and render-quiet-annotated become
  `Witnessed` through `shadowDecisions`; RT8 re-pinned.
- Mutants: the new arm accepting every atom (E3, E5, E6, E7 fail); the
  arm judging without defaults (E1, E2, E4, E8 fail); `facts` replaced
  by empty facts (E4 fails); the old literal arm restored (E1 fails).
  A regression row for the defaults-skipped mutant.
