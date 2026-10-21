# Star measurements: protocol, fixed before running

Research code under dossier §18.26's authorization: statements, design
and measurement only. Nothing here changes the compiler, and nothing is
proved. This file and problems.mjs were committed before any strategy,
oracle or measurement ran. A later change to either is an amendment and
is labelled as one, with the reason.

## Problem set

problems.mjs. The families and sizes are below. Each strategy runs the
sizes in order and stops at the first size that exceeds a resource
limit. That size and limit are recorded.

| family | sizes |
|---|---|
| `star`, `star-read` | 1, 2, 3, 4, 5, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024 |
| `star-undeclared`, `star-unlacked`, `star-cross` | the same (`star-cross` from 2) |
| `dep` | 1, 2, 3, 4, 6, 8, 12, 16, 32, 64, 128 |
| `divide` | 1, 2, 3, 4, 6, 8, 10, 12, 14, 16 |
| `route` | once |

Regression set: sig-oracle's 23 challenges (challenges.mjs) and the 12
source-boundary problems (source-boundary.mjs), with their recorded
bounded and P9s verdicts as the reference. A strategy that accepts a
problem recorded as bounded-invalid is a candidate unsoundness and is
reported first.

## Strategies and the baseline

- **E, exhaustive (baseline).** Every pattern consistent with `D`,
  enumerated as the product of per-label allowed holder sets
  (`consistentPatterns`, Sig/SlicePatterns.lean). One certificate per
  pattern, found by unification on that pattern's generic rigid
  assignment, checked with sig-oracle's generic semantics. The raw
  `checkAll` count `2^(|R|·|L|)` is reported beside it, not enumerated
  past `2^22`.
- **A, uniform schematic certificate.** One certificate whose values may
  name rigid rows as tails. Search: row unification with rigid tails.
  Check: a per-label symbolic check against every consistent pattern.
- **B, per-component lazy refinement.** Flexible variables split into
  connected components. Each component gets a decision tree over
  presence bits `(r, l)`, refined only where the symbolic check reports
  a failing bit. Leaves hold schematic certificates.

## Costs, measured separately

For each strategy and size: search, certificate size, checking, and
coverage. Wall time by `process.hrtime`, heap by `process.memoryUsage`
after a forced collection where available, counts by instrumentation.

| cost | E | A | B |
|---|---|---|---|
| search | unify per pattern | unify once | unify or bounded generic search per tree node |
| certificate size | table entries, JSON bytes | one certificate, JSON bytes | tree nodes, leaves, JSON bytes |
| checking | generic semantics per pattern | symbolic check, atom by atom | symbolic check per leaf |
| coverage | every consistent pattern has a table entry | see below | tree is a partition of each component's space; components partition `B` |

"Covers" for each, fixed here:

- **E**: for every pattern `checkAll` keeps (consistent with `D`'s
  lacks and disjoint atoms), the table holds an entry with the same set
  of pairs. Verified by enumerating the consistent patterns again and
  looking each one up by its canonical key. Cost: enumeration plus
  lookups, timed apart from checking.
- **A**: the single certificate is claimed for the whole consistent
  space. The symbolic check discharges "every consistent pattern"
  through per-label queries (`possible(r, l)`, `must(r, l)`,
  `possibleBoth(r, s, l)`), which are exact only because the consistent
  space is a product of downward-closed per-label families. Coverage
  cost: building that per-label index and answering the queries, both
  counted and timed apart from the rest of checking.
- **B**: for each component, the root cube is empty, every internal
  node splits on one bit its cube leaves free, its two children extend
  the cube by that bit false and true, and every leaf carries a
  certificate. Components: every atom of `B` lies in exactly one
  component, and each component's certificate binds only its own
  flexible variables. Verified by a walk independent of search. Cost:
  nodes visited and time.

## Resource limits

- 60 seconds wall time per strategy, family and size, enforced by
  running each in a child process.
- Node heap limit 4096 MB (`--max-old-space-size=4096`).
- E: at most `2^22` consistent patterns. Above it, E answers
  Unresolved (budget) without enumerating.
- B: at most `2^16` leaves per component, at most `2^20` candidate
  flexible assignments per leaf search. Exceeding either answers
  Unresolved (budget) for that component, and so for the problem.
- Bounded oracle: 120 seconds per problem.

Every strategy answers Valid or Unresolved, never Contradiction.
Unresolved records its cause: no certificate found, failed check,
budget or time.

## Cross-checks

1. **Bounded oracle** (sig-oracle/bounded.mjs, `SMALL` bounds as in
   slicing/problems.mjs: unwritten `z1`; rigid fields `Int`, `Bool`;
   flexible fields `Int`, `Bool`; type values `Int`, `Bool`, `{}`).
   Star families at n = 1 and 2, and n = 3 if it finishes in time;
   `dep` and `divide` at 1 and 2; `route`. For a fixed rigid
   assignment the existential splits exactly over connected components
   of flexible variables (atoms sharing a flexible row or type
   variable, at any depth), since no atom reads two components'
   variables and `D` reads none. Each component is solved with
   bounded.mjs's `findSolution`. `boundedValid` runs unmodified on
   `star` n = 1 as a control on the split. A strategy accepting a
   problem the oracle finds invalid is a candidate unsoundness.
2. **P9s** (sig-oracle/p9s.mjs): its `patterns` count is compared with
   E's enumeration at every size where `2^(|R|·|L|) ≤ 2^20`. Its
   bounded flexible search is too large for star at n = 2 (four
   flexible rows over at least 13 field types), so P9s verdicts are
   compared on the regression set only.
3. **Instantiation.** Wherever the consistent count is at most `2^16`,
   every certificate A or B accepts is instantiated at every consistent
   pattern and checked with sig-oracle's generic semantics and P9s's
   side condition. Any failure refutes the symbolic check's soundness.
   Where A's symbolic check fails, at least one pattern's instantiation
   must fail too; otherwise the check is incomplete for its own
   certificate, and that is reported.
4. **E agreement.** Wherever E finishes, its verdict is compared with
   A's and B's.

## Amendments

1. **`divide2` added** (after a pilot of E, A and B at sizes 2 and 3 of
   every family, before any measurement or oracle run). The pilot showed
   `divide` uniformly valid by `u := r`, `t := {}`, so its prediction
   for A was wrong and it does not exercise pattern-dependent witnesses.
   `divide2` adds `u lacks c`, which forces the division. Sizes as
   `divide`; oracle at 1 and 2. `divide` stays in the set with its
   wrong prediction recorded. The pilot also changed E's per-pattern
   search: unification alone guesses at splits, so E fell back to no
   certificate on `dep`. E now falls back, per flexible component, to
   the bounded generic search at that pattern (P9s's search restricted
   to the component). E is the reference, so its search should be at
   least as strong as B's.

2. **Search strengthened** (pilot only, before measurement or oracle
   runs). B's brute-force leaf search exceeded its `2^20` candidate
   budget on `divide2` at m = 2. Search is untrusted, so it was
   extended, not the budget: (a) a split guess in the unifier assigns
   each leftover label to the first open tail that no `lacks` atom
   forbids, and a rest (`ρ<r>` or a piece) to the first tail no
   `disjoint` atom with a rigid row forbids; (b) B tries unification at
   the cube's representative pattern, lifted, before the brute-force
   search. Checking and coverage are unchanged.
3. **`divide3` added** (same pilot). With (2), `divide2` needs one bit
   at every m, so it no longer tests pattern-dependent witnesses at
   scale. `divide3` forces a projection that no schematic value
   expresses (problems.mjs). Prediction: valid; A Unresolved; B valid
   with `2^m` leaves. Sizes and oracle sizes as `divide`.
4. The pilot also showed that counting consistent patterns by listing
   each label's holder sets runs out of heap at `star` n = 64. The
   count is now computed in closed form when a label's candidate
   holders carry no declared disjoint pair (generic.mjs). This affects
   reporting only.

## Reported

For each strategy: the largest size finished, the first size that hit a
limit and which limit. Where E cannot finish, the tables say so and
give the last size at which the comparison with E finished.
