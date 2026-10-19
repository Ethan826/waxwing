# Case 1g against the installed PureScript compiler

Evidence for docs/plans/2026-10-19-row-merge-implementation-plan.md
(Task B0, case 1g). The adopted design solves a `Merge` whose parts hold
no unknown (only fields and the signature's rigid row variables) by
writing its result as the row of both parts. PureScript solves the
corresponding wanted `Union` by matching a given `Union` from the
signature through the dependency left right -> union
(src/Language/PureScript/TypeChecker/Entailment.hs `matches`, lines 275
and 735-750, tag v0.15.16). These are different operations; run.mjs
shows where they agree.

`node run.mjs` (needs `purs` 0.15.16 on PATH) writes each case as a
module over Prim.Row, compiles it alone in a fresh temporary directory
and compares the outcome with the recorded one; exit 1 on a difference.
research/row-merge-qt/qt-given.mjs runs the same six programs, as the
rows a Waxwing body makes, through the adopted configuration.

## Output (2026-10-19, purs 0.15.16, node v26.6.0; both exit 0)

| Case | purs | Adopted design (qt-given.mjs) |
|---|---|---|
| `merge a b` under the given `Union r s rs` | accept | accept, result `{ ...R, ...S }` |
| `merge b a` under the same given | NoInstanceFound | accept, the same result |
| `merge a b` with no given (Waxwing: `where r disjoint s`) | NoInstanceFound | accept; without the clause, refused (D3) |
| `merge (ext "a" a) b` under the given | accept (case 3 moves `a`, then the given matches) | accept, `{ a, ...R, ...S }` |
| `merge (merge a b) c` under `Union r s rs`, `Union rs u rsu` | accept | accept |
| `merge a (merge b c)` under the same givens | NoInstanceFound | accept, `{ ...R, ...S, ...U }` |
| self-call `both a = both a` under `Union u v uv` (B3 follow-up) | accept | waits: no case solves `Merge U ?v {U, V}` |
| a forwarding wrapper `fwd x k = both x k` | accept | waits at `both(x, k)` |
| a wrapper through a lambda `\y -> h (merge x y)` | accept | waits; annotating the lambda repairs it |
| O4: `Union r s t`, `Lacks "admin" s`, `t` = `(admin :: U)` | NoInstanceFound | waits; nothing at the call repairs it |

The expectations in run.mjs were written before the first run; every
one held.

## Reading

Where a given exists for the same parts, in the same orientation and
association (after case 3 has moved known labels), matching it and
writing the symbolic union give the same result: the given's result
variable is, in Waxwing's notation, the row `{ ...r, ...s }`. Waxwing's
1g also fires where PureScript has no matching given: the parts
swapped, another association, or no `Union` given at all but
disjointness entailed by a `where` clause or an implying row. There 1g
is broader than PureScript. Its justification does not rest on a given
(implementation plan §2.3a): when neither part has an unknown, every
solution gives the result the same value, the disjoint union of the
parts' fixed atoms, which is the symbolic row, well formed exactly when
the parts' disjointness is entailed.
