# U1's bounded oracle: mark terms against FX008's path criterion

Evidence for the claim U1 of docs/plans/r0-amin-statements.md (§5): on
mark-constraint graphs of FX008's shape, a package of normalized mark
terms passing `holds` on every edge (with equalities taken as classes)
exists exactly when FX008's step-5 path criterion accepts. This is
**bounded evidence**, not a proof.

`oracle.mjs` computes three verdicts per graph and requires them to
agree: `path` (FX008 step 5 after merging equalities, a clash between
two different constants refusing), `sem` (for every valuation of the
rigid marks, a two-point assignment satisfying every edge exists, by
brute force), and `least` (the least term per equality class, then
`holds` on every edge). `run.mjs` also checks that any term assignment
passing `holds` on every edge makes `sem` true.

Families: every graph with one flexible position (all 20 directed
edges among it and four atoms N, M, k1, k2, atom-to-atom edges
included, times no equality or an equality with each atom); every graph
with two flexible positions over the 18 edges touching them, times each
single equality; 200,000 seeded random graphs with three or four
positions and up to two equalities; 200,000 random term assignments.

Result (2026-10-24, `node run.mjs`, about 43 s):

```text
one: 5242880 graphs, 5248 accepted
two: 2621440 graphs, 59232 accepted
random: 200000 graphs, 12122 accepted
sound: 200000 assignments, 2351 passing
normalization: holds(J∅, N) = true
no disagreement
```

The oracle was shown to detect two wrong constructions, each in a
scratch copy outside the repository: `holds` reading every rigid mark
as N (checking one ground valuation) gave 870,316 disagreements, and
least terms computed per position instead of per equality class
(review 3's T1-a) gave 7,029, the first a two-position graph whose
equality joins a position reached by k1 to one that must be N.

Limits: two rigid marks; at most four flexible positions; graphs are
abstract (it does not check that generation produces FX008's graph,
which is U6's coverage argument).
