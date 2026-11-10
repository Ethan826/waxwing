# `certifyPackageSound`: what the package path relies on (dossier §18.174)

Status: **Pending**. This note names the argument the shadow path relies
on since the minting switch (§18.170). It does not establish soundness:
nothing here is proved. Solved verdicts carry `Pending
certifyPackageSound`; verdicts recorded before §18.174 keep their
original label, `certifySound`, which names the substitution-only argument
in docs/plans/r0-certify-argument.md.

Evidence labels, as in that note: **cited** (file and line read),
**checked** (a test runs it; the test is named), **argued** (reasoning
only), **owed** (stated, with no check yet).

## Setting

Online's `certified` hands the certificate's effect package P_in to
`certifyPackage` (Features.Check.Strategy.Substitution), the only code
that constructs `Certified` (checked: test/r0-minting-boundary.test.mjs,
row r0-minting-bypass). It runs `validate`'s composition:

1. `prerequisites`: record validation, the first `Unsupported`, and I3
   (Effects.Validate). Cited.
2. G0's check on `erase (settle P_in)`: the substitution the package
   denotes with each hole at its default. Cited.
3. `complete`, once, giving P_c. Cited.
4. `judgeObligations` on the settled completed package. Cited.
5. The witness `witnessOf problem P_c`, offered only if Cov (the hole
   contract included) accepts it; then `Certified Valid compilation`.
   Cited.

A read fault never reaches this: it declines as `EffectsUnread` (§18.170).

## Premises

- **P1. G0 is sound for the substitution it judges.** The standard check
  of a proposed unifier: `genericSubstitutionSound`, Pending, argued.
- **P2. The obligations are the A2 specification's**, judged on the
  completed package (docs/plans/2026-10-31-a2-specification.md; the
  validator's acceptance, dossier §18.149, §18.150). Checked by the A2
  validator suites; argued as a whole.
- **P3. The witness and the obligations read one value.** `completed` is
  bound once and both read it. Cited; checked by
  test/r0-forged-witness.test.mjs ('the separate pre-default field is
  not evidence', and the valid-Bool case's image).
- **P4. Cov and the hole contract keep a defaulted hole from compiling.**
  As for `certify`: checked by the forged-hole case and row
  r0-forged-hole-no-contract.

## Existing evidence

- Forged packages refused, each with a restored-defect row (§18.172).
- Corpus: every Solved witness defaulted equals the package's erasure
  (C2, test/r0-elab-corpus.serial.test.mjs); T1, T2 and T8 elaborate and
  compare the built IR.
- §18.174's comparison: across 3,061 declarations, the decisions before
  and after the label change differ only in the assurance label
  (.build/evidence/2026-11-09-label/).

## Unresolved obligations

1. **G0 on the input, not the completed package (owed, plan Task 15).**
   Step 2 judges `erase (settle P_in)`; the witness and obligations read
   P_c. The obligation is that G0 accepts `erase P_c` whenever it
   accepts `erase (settle P_in)` (Substitution.purs, "Owed (Task 15)").
   Completion only adds absent variables and forced effect tails
   (argued, from Effects.Complete); no check covers it.
2. **The analogue of C1 and C2 for the package path.** The
   substitution-only note argues defaulting and witness agreement for
   σ₀. Here C2's corpus check compares against the package's erasure,
   which is close to self-reference; the package and the type read-back
   agree by `Images.agreed` (ImageApart otherwise), not by this check.
3. **Completion's own correctness** beyond the A2 suites: argued.
4. **F14** stays unretired (held); this statement does not discharge it.
