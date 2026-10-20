# Bounded oracle for the record composition dossier

`oracle.mjs` checks claims C1, C2, C7 and C10 and the §5 table of
docs/plans/2026-10-20-record-composition-dossier.md by enumeration:
every row over the labels `a`, `admin`, `x`, `y`, `extra` with field
types `Int`, `Bool`, `Text` (1,024 rows, 1,048,576 pairs). It is
evidence on finite cases, not a proof and not a complete reference
(the dossier's C4 would be needed for that). Research only; not part
of `npm run verify`.

Run: `node research/composition-assessment/oracle/oracle.mjs` (exit 0
when every check holds; about 1.3 s).

Result (2026-10-20): 18 of 18 checks hold.

Mutants (copies in a scratch directory, not kept), to show the checks
can fail:

- `disjointUnion` made biased (overlap allowed, as Wand's D4): C1,
  program 3's overlap and program 4 without `lacks` fail (5 solutions
  instead of 2); 15 of 18 hold.
- D8 without its `f = absent` condition (Wand's D7 per label): C2
  fails; 17 of 18 hold.
