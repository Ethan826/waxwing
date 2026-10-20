# Bounded oracle for the record composition dossier

`oracle.mjs` checks claims C1, C2, C7a, C7b and C10 and the §5 table
of docs/plans/2026-10-20-record-composition-dossier.md by enumeration:
every row over the labels `a`, `admin`, `x`, `y`, `extra` with field
types `Int`, `Bool`, `Text` (1,024 rows, 1,048,576 pairs). It is
evidence on that fixed domain only: not a proof, and not a complete
reference. The dossier's C4 would not change that (a reduction's bound
depends on the input; no fixed domain covers every input). Research
only; not part of `npm run verify`.

Run: `node research/composition-assessment/oracle/oracle.mjs` (exit 0
when every check holds; about 3 s).

Result (2026-10-20, second revision of the dossier): 23 of 23 checks
hold, including the counterexample that refutes the dossier's first
statement of C7 (`r = { x: Bool }`: `r lacks { x }` is refuted, `x ∈
r : Int` is not entailed). C10 searches, for each of 2,401 declared
instances, every flexible pair meeting the parameter types.

Mutants (copies in a scratch directory, not kept), to show the checks
can fail:

- `disjointUnion` made biased (overlap allowed, as Wand's D4): C1,
  program 3's overlap and program 4 without `lacks` fail (5 solutions
  instead of 2). Run on the first revision (15 of 18).
- D8 without its `f = absent` condition (Wand's D7 per label): C2
  fails (17 of 18 on the first revision; 22 of 23 on the second).
- Program 6's promise without `extra`: C10 fails (22 of 23).
