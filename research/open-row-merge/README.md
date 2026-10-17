# Open-row merge: prototype and oracle

Evidence for docs/plans/2026-10-16-open-row-merge-design.md (R005
Tranche B), kept in the repository before the design relies on it (user
decision 9, 2026-10-17). These are toys, not the compiler: JavaScript,
labels only (field types are ignored), no imports from output/, nothing
built. They need only `node` (any version with ES modules) and run from
this directory.

Maintained, not part of `npm run verify`: scripts/width.mjs checks these
files' 80 columns like every tracked .mjs and .md file; the 250-line
limit holds by review, since the structure gate scans only src, test,
scripts and tools/style/src (docs/engineering.md, "Research scripts").

## Encoding

A row is `{ fields: [label], tails: [var] }`. Labels are lowercase, a
meta is `m<n>`, a rigid is uppercase. A problem is a list of steps:
`{ k: 'eq', l, r }` (unify two rows), `{ k: 'dis', l, r }` (require them
disjoint) and `{ k: 'lacks', v, l }`. Hypotheses on rigids are
`{ lacks: { R: ['a'] }, apart: [['R', 'S']] }` in the oracle's encoding;
drive.mjs converts them for the solver (`apart: ['R|S']`).

Verdicts: `accept`; `refuse` (a hard error: overlap, lacks, evidence,
upper, mismatch); `D4` (an equation still waiting with a constant at the
end, the design's ambiguity error).

## Files

| File | What it is |
|---|---|
| solver.mjs | the solver's public surface (re-exports) |
| solver-facts.mjs | state, lacks, apart pairs, upper bounds, the bind rule, creation-site disjointness |
| solver-solve.mjs | the residue, homes, the sum rule, commits, deferral with identity and normal form |
| solver-drain.mjs | the drain, the optional `expand` (not adopted), read-outs |
| oracle.mjs | the independent brute force: every assignment of metas to atom sets, and the least solution (the meet, when it is a solution) |
| drive.mjs | runs the solver on steps, recording creation-site obligations before each equation, draining after each step |
| random.mjs | seeded generators (mulberry32-style and LCG) and one-in-three helpers |
| perm.mjs | random problems in five constraint orders against the oracle |
| programs.mjs, programs-gen.mjs | program-shaped merge trees and raw problems against the oracle |
| shared.mjs | review F2's 392 shared-parameter programs |
| both.mjs | `both(merge, merge)` |
| chain.mjs | `h(merge × n)`, quiet equations |
| growth.mjs | chain with constants, and random large problems |
| sat13.mjs | uniquely satisfiable one-in-three systems |
| switch.mjs, switch2.mjs | the hardness construction of the design's §2.7 |
| removal.mjs | `without` over a two-tail receiver |
| determinate.mjs | a determinate system the solver rejects |
| annotation.mjs | user decision 1's `Both` example |

The session originals were in the scratchpad: d2/solver2.mjs (now the
three solver files), review/bf.mjs (oracle.mjs), d2/drive2.mjs,
d2/perm3.mjs (perm.mjs), d2/run2.mjs (programs.mjs), d2/cx1.mjs
(both.mjs), d2/cx2.mjs (chain.mjs) and the others under their own names;
determinate.mjs and annotation.mjs are new.
They were reflowed to 80 columns and split under 250 lines; on the seeds
below each one's output was compared with its original and was identical
(timings aside). Changes in behaviour, all deliberate: programs.mjs uses
oracle.mjs instead of the first author's oracle (same output on seeds 3
and 5, 1,000 problems, with and without SHARE); perm.mjs, shared.mjs and
sat13.mjs no longer run draft 1's solvers, which were not preserved, so
their draft 1 columns are gone.

## Commands, seeds and expected output

Small runs (each a few seconds at most), last run 2026-10-17:

| Command | Checks | Expected |
|---|---|---|
| `node perm.mjs 21 2000` | S, H, L, C1, C2, C3 on raw problems | `unsound`, `dishonest`, `notLeast`, `orderDiff`, `d4OnePendingWithLeast` 0; accept 2010, refuse 7655, D4 335; `d4WithLeast` 0 |
| `DENSE=1 node perm.mjs 21 2000` | the same, dense two-meta sums | defects 0; accept 2900, refuse 3090, D4 4010; `d4WithLeast` 50, no `c3fail` |
| `node perm.mjs 22 2000` | raw, another seed | defects 0; accept 1995, refuse 7675, D4 330 |
| `DENSE=1 node perm.mjs 22 2000` | dense | defects 0; accept 2875, refuse 2955, D4 4170; `d4WithLeast` 65 |
| `node programs.mjs 1 4000` | soundness, honest refusal, leastness on program-shaped and raw problems | no `BUG-*`, `accept-*` or `INCOMPLETE-*` key; `shaped:accept` 729, `raw:accept` 469 |
| `SHARE=1 node programs.mjs 1 4000` | the same with shared parameters | no defect or `INCOMPLETE-*` key; `shaped:accept` 708 |
| `node shared.mjs` | review F2's family | `{"total":392,"least":186,"d4Least":0,"unsound":0}` |
| `node both.mjs` | `both(merge, merge)` | `accept`; one solution `m0 = {}`, `m1 = { x }`, `m2 = {}`, `m3 = { y }`, also the least |
| `node chain.mjs` | quiet equations do not multiply | every n up to 40: accept, `parts(z)=2`, `apart=n`, `pending=n-1`, `fresh=0` |
| `node growth.mjs` | growth of solver-made metas | D4 with `stuck=n-1` for z = { a, b }, then accept with `fresh=0`; random: worst `fresh` 12 for P 28, C 7, `maxParts` 11 |
| `node sat13.mjs` | the pinned hard instances | five unique instances, each `verdict: D4`; 40 pairs of distinct solutions, meet a solution 0 |
| `node switch.mjs` | a least solution exists iff the formula is unsatisfiable | `{"instances":400,"phiSat":379,"phiUnsat":21,"agree":400,"disagree":0}` |
| `node switch2.mjs` | the solver on the hard side | `{"D4":308}` |
| `node removal.mjs` | design §5.2 | D4 while waiting; `m9 = { y }` with x in either part; `.x` on the rest refused (`m9 lacks x`); no part with x refused |
| `node annotation.mjs` | design §8 | `accept` with `m0 = { x }`, `m1 = { y }` in both orders; `no annotation: D4` |
| `node determinate.mjs` | the stated incompleteness | one solution, which is the least; `expand=false: D4`; `expand=true: accept` with it |

Environment switches for perm.mjs: `DENSE=1` (dense generator),
`EXPAND=1` (build the `k × l` basis for a quiet equation beside a stuck
one; the design does not adopt it), `NOSUM=1` (no sum-rule lacks or apart
facts). For programs.mjs: `SHARE=1`.

The campaign behind the design's Appendix A, seeds 21 to 28 at 12,000
problems each, five orders, so 480,000 runs per generator (about 10
seconds per seed and generator):

```sh
for s in 21 22 23 24 25 26 27 28; do
  node perm.mjs $s 12000 | head -1
  DENSE=1 node perm.mjs $s 12000 | head -1
done
```

Recorded totals (draft 2, 2026-10-17): defects 0, order differences 0,
C1 violations 0; D4 with a least solution 3,205 runs (dense) and 45
(raw), all with two pending equations sharing a meta (C3). Seed 21 was
rerun from this directory on 2026-10-17 and matched the recorded line
exactly: dense accept 17325, refuse 19185, D4 23490, `d4WithLeast` 350;
raw accept 11940, refuse 45965, D4 2095, `d4WithLeast` 5.

## What the evidence does not show

Labels only. Field types (so nested equations inside fields),
provenance and diagnostic texts, effect rows (so rollback by effect
settling and the joint fixpoint with the settle rounds), specialization
and lowering are absent. The design's compiler test plan covers those
(§12, "Evidence limits"). The properties checked are necessary
conditions and measured rates, not a completeness proof.
