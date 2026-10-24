# U1's bounded oracle: mark terms against FX008's path criterion

Evidence for U1 of docs/plans/r0-amin-statements.md (§5): on
mark-constraint graphs of FX008's shape, a package of normalized mark
terms passing `holds` on every edge, with equalities taken as classes,
exists exactly when FX008's step-5 path criterion accepts. **Bounded
evidence, not a proof**; it does not test that generation produces
FX008's graph (U6).

- `oracle.mjs`: three verdicts per graph: `path` (FX008 step 5 after
  merging equalities; two different constants in one class clash),
  `sem` (for every valuation of the rigid marks, a two-point assignment
  satisfying every edge exists, by brute force) and `least` (the least
  term per equality class, then `holds`), the last built from an
  injected construction and `holds`.
- `families.mjs`: the graph families, each run against injected
  implementations.
- `cases.mjs`: the forgery cases of §12, translated by hand into their
  mark obligations, each judged under revision 3.2's obligations and
  under the earlier set that had the hole, beside an honest control.
- `run.mjs`: the real implementations; must show no disagreement.
- `mutants.mjs`: three wrong implementations injected into the same
  families; each must be detected.

## Result (2026-10-24, `node run.mjs`, about 83 s)

```text
pairs36: {"pairs":36}, 0 disagreements
one: {"graphs":5242880,"accepted":5248}, 0 disagreements
two: {"graphs":12058624,"accepted":102752}, 0 disagreements
random: {"graphs":200000,"accepted":7690}, 0 disagreements
sound: {"refusedGraphs":2562208,"refusedTried":17776800,
  "refusedPassing":0,"acceptedGraphs":59232,"acceptedTried":573280,
  "acceptedPassing":93696}, 0 disagreements
case cleanup (§7a): honest false, forged false, forged (revision 3) true
case cleanup control (nofail Log): honest true
case owned C forged empty (N1): honest false, forged false,
  forged (revision 3.1) true
case owned C control (caller nofail Log): honest true
case let-bound failing handler (N5): honest false, forged false,
  forged (revision 3.1) true
case let-bound handler control (no fail): honest true
case inclusion with extra effects (N4): accepted under inclusion,
  refused under revision 3.1's equality
no disagreement
```

(The `sound` line is wrapped here; the program prints it on one line.)

Families:
- `pairs36`: all 36 ordered pairs of the six spellings over two rigid
  marks (`J ∅` included): `holds` against the meaning over all four
  valuations (the author's check of §18.78, now in the repository).
- `one`: one flexible position, every subset of the 20 directed edges
  among it and the atoms N, M, k1, k2 (atom-to-atom included), times no
  equality or an equality with each atom.
- `two`: two flexible positions, every subset of the 18 edges touching
  them, times none, one or two of the nine single equalities (46
  options).
- `random`: 200,000 seeded graphs with three or four positions, edges
  among all nodes, and up to four equalities (constant clashes
  included).
- `sound`: on the two-position family with at most one equality, every
  term assignment (five terms per free class): on graphs whose meaning
  fails, assignments tried and passing (must be 0); on graphs whose
  meaning holds, assignments tried and passing, reported separately.

## Detection (`node mutants.mjs`, about 74 s)

```text
ground: pairs36 10, one 281472, cases 0 (detected)
unnormalized: pairs36 1 (detected)
perPosition: two 6240, random 120 (detected)
```

`ground` reads every rigid mark as N; `unnormalized` omits `norm`;
`perPosition` computes least terms per position instead of per class
(review 3's T1-a). The forgery cases hold no rigid marks, so `ground`
does not change them; the families detect it.

Limits: two rigid marks; at most four flexible positions; the cases are
hand translations of the programs in §12, not compiler output.
