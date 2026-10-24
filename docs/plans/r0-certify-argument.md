# `certify`: settling, defaulting and the witness (BACKLOG R030)

Since BACKLOG R026, G0's `certify` (Features.Check.Strategy.Substitution)
is the online strategy's whole acceptance, and settling, hole defaulting
and witness construction sit inside the trusted boundary. This note
states what `certify` relies on, labels each claim, and names the check
behind it. The author asked for it on 2026-10-24 (dossier §18.73).
Nothing here is proved; the online strategy's assurance is `Pending
certifySound`.

Evidence labels: **cited** (file and line read), **checked** (a test
runs it; the test is named), **argued** (reasoning only).

## Setting

The online search offers σ₀, its answer read back with every hole still
`holeVar n` (Strategy.ReadBack). `certify problem σ₀`:

1. settles: σ = `map settled σ₀` (Strategy.ReadBack.Type `settled`);
2. judges σ with G0's check (`checkSubstitution`, now private); on a
   refusal there is no acceptance;
3. builds the witness from σ₀, not σ: `substitutionWitness problem σ₀`
   (Strategy.Witness), whose bindings are W = `bindingsOf problem σ₀`
   and which is offered only if Cov, the hole contract included,
   accepts it;
4. returns `Certified Valid compilation`, the only acceptance a strategy
   can give.

No algorithm here is new. G0 is the standard check of a proposed
unifier (plan, P-G0); the defaults are today's lowering's; Cov and the
hole contract are W §4 and §1.5 (Task 4.4).

## Claims

**C1. The defaults the check judges are lowering's.** `settled`
replaces a type hole by `Int` and drops a hole from a record's tails,
recursively (cited: ReadBack/Type.purs `settled`). Lowering replaces a
type hole by the representative, `TInt` (cited: Specialize.purs
`specialize = specializeWith TInt`; Lower.purs `TVar (Hole _)`), and a
hole tail by no tail (cited: Lower.purs, `tail`'s `Hole _ → pure
Nothing`); a record-sorted slot's bare hole becomes a record whose only
tail is that hole, so it closes the same way (cited: Values.purs
`slotType`). Checked: test/r0-certify.test.mjs, C1's two tests (the
`settled` cases; a program with both kinds of hole compiles to `int32`
and a closed struct).

**C2. The witness, read with those defaults, is the σ the check
judged.** For every variable v that σ₀ binds, the binding W(v) read
with lowering's defaults, `Free n` being hole n at v's sort (`Int` for
a type, `{}` for a row; W §1.6), equals σ(v) = settled(σ₀(v)). For
every flexible variable σ₀ leaves out, W(v) is `Free m`, m above every
hole σ₀ mentions. Argued: `bindingsOf` makes `Free n` only from a bare
hole of v's own sort, whose settled form is that sort's default, and
keeps every other image as `Inline`, which lowering defaults as
`settled` does (C1). Checked: test/r0-certify.test.mjs (one Solved
witness agrees; a control witness of `Inline Bool` bindings is
reported) and test/r0-elab-corpus.serial.test.mjs, "C2", over all
1,989 Solved witnesses of the pinned corpus. Coverage is thin where it
matters most: the corpus has 5 `Free` bindings, 2 of them row-sorted.
A first version of the check read every `Free n` as a type hole and
reported the two row-sorted ones; the sort-aware reading above is W
§1.6's, and the product was not at fault.

**C3. A variable σ₀ leaves out is judged by the hole contract, not by
G0.** G0 judges σ with such a variable unbound; the witness defaults it
(C2), so whether that default may stand is the hole contract's
decision, which judges every `Free` binding against the atoms at the
defaults (Strategy.HoleContract). Argued; the contract's own tests are
test/r0-witness.test.mjs and test/r0-hole-arm.test.mjs, and
test/r0-forged-witness.test.mjs checks that a certificate forged to one
hole is Solved with `NoWitness HoleContract` and is not built.

**C4 (`build`'s, for context).** `build` turns `Free n` into hole n and
an image's holes into holes, which lowering then defaults (C1). Checked
only on the effect-erased projection: T2 and T8 compare `build`'s IR
with today's checked IR, holes renumbered (test/r0-elab-corpus.serial
.test.mjs). Effect rows, data-type row arguments and handler marks are
not compared (gate G-effect-rows).

`certifySound` is G0's `genericSubstitutionSound` together with C1-C3.

## Not covered

- No proof of any claim, nor of G0 itself (`genericSubstitutionSound`
  is Pending).
- C1 rests on reading three lowering sites; no test compares `settled`
  with lowering on every hole the corpus has, only on one program and
  through T2's equality with today's IR.
- C2's corpus evidence has 5 `Free` bindings.
- C4 is effect-erased.
