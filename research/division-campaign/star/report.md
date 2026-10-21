# `star` at useful scale: analysis, survey, strategies, measurements

Research under dossier §18.26: statements, design and measurement. No
proof, no compiler change, no adoption. Every statement below is
**proposed**; none is proved. The code here is research code. protocol.md
fixed the problem set, bounds and limits before the runs; its five
amendments are labelled there and summarized in §6.

Files: protocol.md; problems.mjs (families); region.mjs (per-label
region queries); schematic.mjs (schematic certificates, symbolic check,
instantiation); unify.mjs (search); generic.mjs (per-pattern reference
check, consistent-pattern enumerator); strategies.mjs (E, A, B);
crosscheck.mjs; measure.mjs, run-one.mjs, tables.mjs; results/
(measurements.json, tables.md, crosscheck.txt).

## 1. Why `star` is expensive

`star` n (integration/apps/scale.mjs), translated by hand under §17.1:
rigid rows `h`, `r_1..r_n`; written labels `f_1..f_n`; `D` holds
`h disjoint r_i`, `h lacks f_i` and `r_i lacks f_i` (the tail beside
`f_i`). Each `join(p_i, hub)` adds flexible rows `a_i`, `b_i` and the
atoms `{ f_i: Int, ...r_i } = { ...a_i }`, `{ ...h } = { ...b_i }`,
`a_i disjoint b_i`, `v_i = { ...a_i, ...b_i }`.

**Where `2^(n(n-1))` comes from.** Consistency is a product over labels
(`consistentPatterns`, Sig/SlicePatterns.lean). For `f_i`, `h` and
`r_i` are excluded by `lacks`. No declared pair excludes two of the
others, so every subset of `{ r_j : j ≠ i }` may hold `f_i`: `2^(n-1)`
holder sets per label. The product is `2^(n(n-1))`. P9s's own pattern
enumerator gives the same counts up to n = 4 (results/crosscheck.txt).

**Which bits matter to validity.** Take the substitution a row unifier
finds: `a_i := { f_i: Int | r_i }`, `b_i := { | h }`,
`v_i := { f_i: Int | r_i, h }`. Every obligation of the body is then
one of these:

| obligation | bits it reads | discharged by |
|---|---|---|
| `f_i` written beside the tail `r_i` | `(r_i, f_i)` | `r_i lacks f_i` |
| `f_i` composed with `h` | `(h, f_i)` | `h lacks f_i` |
| rests of `r_i` and `h` in one record (D1, W3) | none | `h disjoint r_i` |
| a label held by both `r_i` and `h` | `(r_i, l)`, `(h, l)` | `h disjoint r_i`, per label |
| the two sides of `v_i`'s equation | none: the same pieces on both sides | syntax |

No obligation reads a bit `(r_j, f_i)` with `j ≠ i`, the bits `D`
leaves free. Those `n(n-1)` bits change what the certificate *denotes*:
the generic row of `r_j` lists its present `f_i` fields. They do not
change whether it works. A pattern-indexed table still has to spell
each one out, because `checkAll`'s values are explicit field lists
(§15.2, `SG`). The exponential is in the certificate representation,
not in the validity question.

**What is genuinely dependent.**

- Bits interact across rows only through `D`, and only within one
  label: `lacks` removes a holder, `disjoint` forbids two holders of
  one label. Nothing in the presence reading of `D` links two labels.
- Bits interact across atoms only through flexible variables, that is,
  through the choice of certificate. Fix the certificate and each
  atom's truth at a pattern is a conjunction of per-label conditions
  on the rigid rows the substituted atom mentions.
- So, for a *fixed* certificate, the quantifier over patterns
  distributes over atoms, labels and nested fields, and each conjunct
  reads at most two holders of one label.

This does not contradict the slicing hunt's refutation of the
atom-level shortcut (`u = r; u lacks a`, slicing/design.md). That
shortcut was applied to the existential problem, where the choice of
`u` links the atoms. With the certificate fixed (`u := r`) the atoms
are `r = r` and `r lacks a`, and the second reads `(r, a)` directly.
Per-atom decomposition is only sound after the certificate is fixed.

**When one certificate cannot serve every pattern.** When a witness
must differ by pattern (`dep`, `divide2`, `divide3` below), it depends
on the bits read by the obligations a uniform candidate fails, and
only those need case splits.

## 2. Survey of established techniques

| technique | sources | fits? |
|---|---|---|
| per-label independence | presence fragment's `bitCheck` (Presence/Decide.lean, `bitCheck_iff`); per-label presence in row typing, Rémy, *Type inference for records in a natural extension of ML* (1989; 1994 version); validity of quantifier-free Boolean-algebra identities reduces to the two-element algebra, pointwise (standard; e.g. Givant and Halmos, *Introduction to Boolean Algebras*, 2009) | **Yes, for checking a fixed certificate** (§1). Used by A's and B's checker. It is not a certificate format by itself. |
| symbolic certificates: the most general unifier with rigid tails, checked by predicate entailment | Wand, LICS 1987; Rémy 1989; Gaster and Jones, *A polymorphic type system for extensible records and variants*, 1996; Jones, *Qualified Types*, 1994; Leijen, *Extensible records with scoped labels*, TFP 2005; Morris and McKinna, *Abstracting extensible data types*, POPL 2019 | **Yes.** The certificate is the solver's substitution with rigid rows left as tails. The check is entailment of the residual lacks and disjoint obligations from `D`, label by label. This is strategy A. |
| BDDs / ZDDs for the pattern set | Bryant, IEEE TC 1986; Minato, DAC 1993; ADDs/MTBDDs for valued leaves, Bahar et al., ICCAD 1993 | **Partly.** The consistent set of `star` is a product, so its BDD has `O(n²)` nodes: coverage is cheap to represent. An ADD of explicit per-pattern certificates has `2^(n(n-1))` distinct leaves. It helps only with schematic leaves, and then only where subtrees repeat, beyond B's trees. Using canonicity as a coverage proof adds a trusted BDD package or a verified one. Not prototyped. |
| lazy / CEGAR refinement | Clarke, Grumberg, Jha, Lu and Veith, CAV 2000 (JACM 2003); lazy abstraction, Henzinger, Jhala, Majumdar and Sutre, POPL 2002 | **Yes, as search.** Abstraction: a cube of fixed bits. Counterexample: the bit the symbolic check reports. Refinement: split on that bit. This is strategy B. |
| successive variable elimination (Flix) | Boolean unification, Martin and Nipkow, 1989; Madsen and van de Pol, *Polymorphic types and effects with Boolean unification*, OOPSLA 2020; Madsen, van de Pol and Henriksen, *Fast and efficient Boolean unification for Hindley-Milner-style type and effect systems*, OOPSLA 2023 | **Fits the case B handles badly** (`divide3`). A flexible row's presence at `(u, l)` as a Boolean formula over rigid bits is a Skolem function; the certificate would stay uniform where B needs `2^m` leaves. Needs presence formulas in the certificate and per-label formula validity in the checker. Worst case exponential. Not prototyped (§3.3). |
| SAT/SMT with an independently checked certificate | DRAT, Wetzler, Heule and Hunt, SAT 2014; verified checking, cake_lpr (Tan, Heule and Myreen); ∀∃ as 2QBF with Skolem-function certificates, Balabanov and Jiang, FMSD 2012 | **Not needed for `star`.** With the certificate fixed, "some consistent pattern violates it" splits into independent per-label instances of a few variables, decided directly. A SAT encoding would add a proof checker to the trusted base for no gain here. It becomes relevant if `D`'s presence reading ever links labels; equations in `D` are ignored by consistency today (§15.4). |
| slicing by flexible components | slicing/statements.md (S1); §18.26 | **Yes, within one pattern.** For a fixed pattern the existential splits exactly over components of flexible variables. B keeps one tree per component, so trees add instead of multiplying. |

## 3. Candidate strategies (proposed)

### 3.1 Strategy A: one schematic certificate

- **Certificate.** One map from flexible variables to *schematic
  values*: generic values that may contain a piece `{ r, ex }`, rigid
  row `r`'s generic contents minus the written labels `ex`, rest
  included. At pattern `π` a piece denotes
  `{ l: A(r, l) | π(r, l), l ∉ ex } ∪ { ρ_r: R(r) }`. Instantiating
  every piece at `π` gives an ordinary `SG` certificate, `inst σ π`.
- **Search** (untrusted): row unification with rigid tails, plus a
  per-label split guess (unify.mjs).
- **Checker**: `checkSym P σ region` evaluates `B` under `σ` and checks
  every record expression and atom (D1, D2, W3 at every depth) with four
  region queries (region.mjs): `possible(r, l)`, `must(r, l)`,
  `possibleBoth(r, s, l)`, `nonEmpty`. For A the region is every
  consistent pattern.
- **Coverage.** There is no coverage object. The check quantifies over
  the whole consistent space through the queries, which are exact only
  because that space is a product of per-label families closed under
  removing a holder (SC2). The coverage cost is the per-label index
  plus the query answers, timed apart.

### 3.2 Strategy B: per-component lazy refinement

- **Certificate.** One binary decision tree per connected component of
  flexible variables (an atom with none is its own component), over
  bits `(r, l)`. Each leaf holds a schematic certificate binding only
  that component's variables. At a pattern, follow each tree to a leaf
  and merge the leaves.
- **Search** (untrusted), per node: the component's unifier result;
  unification at the cube's representative pattern (forced holders
  only), lifted back to pieces; P9s's bounded generic search on the
  component, lifted. If none passes, split on the free bit the failing
  check reported (CEGAR). If the failure names no free bit, the
  component is Unresolved.
- **Checker**: `checkSym` at each leaf, over the region its cube cuts
  out.
- **Coverage.** `verifyCoverage`, a walk independent of search: every
  atom of `B` in exactly one component; each leaf binds only its
  component's variables; each root cube empty; each split on a bit free
  in its cube, with children extending the cube by that bit false and
  true. One visit per node, timed apart. Covers means: every consistent
  pattern reaches, in every tree, exactly one leaf whose cube it
  satisfies.

### 3.3 Proposed, not prototyped: presence-formula certificates (C)

Pieces with a projection (`r ∩ S`, no rest) or, more generally, a
Boolean presence formula per `(u, l)` over the rigid bits of `l`
(Rémy's presence variables, with Flix-style Boolean unification as the
search). This would make `divide3` uniform. It extends the certificate
language and needs per-label validity of Boolean formulas in the
checker. It is new machinery under ADR 014 and needs approval before
any prototype.

### 3.4 Soundness obligations (named; none proved)

| name | statement (proposed) | needed by |
|---|---|---|
| SC1, instantiation | `den (inst σ π)` is the value the schematic certificate denotes under `genAssign P π`, and `inst σ π` is an `SG` certificate, so K1 applies | A, B |
| SC2, region queries | for a non-empty region (consistent patterns that agree with a cube): `possible r l` iff some pattern of the region has `π(r, l)`; `must r l` iff all do; `possibleBoth` likewise; `nonEmpty` iff the region has a pattern. Depends on CP (product form) and on lacks/disjoint being antitone, as in K5 | A, B |
| SC3, symbolic check sound | `checkSym P σ region = true → ∀ p ∈ region, checkCert P p (inst σ p) = true` | A, B |
| SC4, acceptance | `checkSym P σ (all consistent) = true → Accepts P`, from SC3, K4 and K5, with no table built; then `ValidAll P` and `ValidFin P` by `s1`, `s1_fin` | A |
| SB1, components | if components partition `B`'s atoms and each leaf binds only its own variables, the merged certificate passes `checkCert` at `p` whenever each component's leaf does. Uses `holdsG_congr` (K7a, Congr.lean) | B |
| SB2, tree coverage | `verifyCoverage = true →` every consistent pattern reaches exactly one leaf per tree and lies in that leaf's cube | B |
| SB3, acceptance | SB1, SB2 and SC3 at each leaf give `Accepts P` | B |
| SC3′, exactness (optional) | the converse of SC3. Not needed for soundness; it makes a reported failing bit meaningful for refinement | B's search |

**Fit with K1-K7.** Neither strategy needs new semantics. Both end in
`Accepts`, K6's target, so by K7 (`accepts_iff_checkAll`) they accept
nothing that some `checkAll` table would not, and by K8 neither can
certify `splitSig`/`route`. SC4 and SB3 are new theorems beside K6, not
replacements; `checkAll` stays the reference. If authorized, the Lean
files would be Sig/Schematic.lean (values, SC1), Sig/Region.lean (SC2,
with CP), Sig/SymCheck.lean (SC3, SC4) and Sig/Trees.lean (SB1-SB3).

## 4. Measurements

Machine: the author's laptop (darwin), Node 26.6, one child process per
measurement, 60 s and a 4096 MB heap each (protocol.md). Times in ms.
"Coverage" is the cost of establishing that the certificate covers
every pattern `checkAll` would require, measured apart from checking:
E's re-enumeration plus a hash lookup per pattern; A's per-label index
plus region queries; B's tree walk, component partition and region
queries. The pattern count used for reporting is timed apart too
(`countMs` in results/measurements.json) and is in no column below.
Full tables for every size: results/tables.md.

### 4.1 `star` (valid)

| n | log2 patterns | strategy | search | certificate | check | coverage (work) | RSS MB |
|---|---|---|---|---|---|---|---|
| 3 | 6 | E | 5.8 | 64 entries, 65 KB | 2.1 | 0.1 (64 lookups) | 62 |
| 4 | 12 | E | 177 | 4,096 entries, 6.1 MB | 103 | 3.1 (4,096 lookups) | 114 |
| 5 | 20 | E | **limit: 60 s** | | | | |
| 4 | 12 | A | 0.9 | 948 B | 0.6 | 0.1 (41 queries) | 56 |
| 64 | 4,032 | A | 1.4 | 15.6 KB | 4.0 | 0.3 (641) | 64 |
| 1024 | 1,047,552 | A | 10.4 | 258 KB | 203 | 2.3 (10,241) | 85 |
| 16384 | 268,419,072 | A | 545 | 4.3 MB | 55,507 | 38 (163,841) | 360 |
| 32768 | | A | **limit: 60 s** | | | | |
| 4 | 12 | B | 0.8 | 4 leaves, 1.0 KB | 0.6 | 0.7 (44 queries, 4 nodes) | 55 |
| 64 | 4,032 | B | 1.4 | 64 leaves, 16.9 KB | 4.5 | 1.4 (704, 64) | 65 |
| 1024 | 1,047,552 | B | 8.6 | 1,024 leaves, 279 KB | 251 | 8.3 (11,264, 1,024) | 84 |
| 12288 | 150,982,656 | B | 335 | 12,288 leaves, 3.4 MB | 34,654 | 79 (135,168, 12,288) | 287 |
| 16384 | | B | **limit: 60 s** | | | | |

`star-read` (a field read after each join) behaves the same: E's last
finished size is 4 (limit at 5); A and B finish 12288 and hit the time
limit at 16384.

**Comparison with E.** E finished up to n = 4 (`2^12` patterns) and
hit the 60 s limit at n = 5 (`2^20` patterns), on `star` and
`star-read`. Every comparison with E is therefore at n ≤ 4, where E, A
and B agree (valid). Beyond n = 4 E cannot run, and nothing is compared
with it. At n = 4, E's table is 6.1 MB against A's 948 bytes, and its
coverage is 4,096 lookups against 41 region queries.

**What grows.** For `star`, A's certificate and coverage work are
linear in n (10n + 1 queries). A's checking time is quadratic as
implemented: `equal` visits every written label for every record
equation, `O(|B|·|L|)`, which is what reaches the time limit. B adds a
leaf per component (n), so its certificate is about 8% larger than A's
and its coverage walk is linear in nodes. Neither enumerates patterns.

### 4.2 Honest failure: the invalid controls

| family | E | A | B |
|---|---|---|---|
| `star-undeclared` (one `h disjoint r_n` dropped) | Unresolved to n = 4; limit 60 s at 5 | Unresolved ("rests n, 0 not declared disjoint") to 12288, 34 s; limit 60 s at 16384 | Unresolved, same cause, to 8192; limit 60 s at 12288 |
| `star-unlacked` (one `h lacks f_n` dropped) | Unresolved to 4; limit at 5 | Unresolved ("row 0 may hold f_n") to 16384; limit at 32768 | Unresolved, same cause, to 8192; limit at 12288 |
| `star-cross` (`j_1.f2` read) | Unresolved to 5 (37 s); budget `2^22` exceeded at 6 | Unresolved (search: no unifier) to 32768 (16 s); no limit within the sizes | Unresolved at 2 by its search budget (`2^20` candidates); sweep stopped there |
| `route` | Unresolved | Unresolved (rests 0, 1 undeclared) | Unresolved |

No strategy answered valid on any of them; the bounded oracle finds each
`star` control invalid at n ≤ 3 (§5). B reaches the time limit before
A on these because it builds every passing component's tree before
reaching the failing one, and its fallback search runs on the failing
one; it stops at the first failing component, but in `star-undeclared`
that component is the last.

### 4.3 Pattern-dependent witnesses

| family | E (largest finished; limit) | A | B: leaves at the largest size | B: search / check / coverage at that size |
|---|---|---|---|---|
| `dep` k | k = 8: 65,536 entries, 72.5 MB, 3.7 s; budget `2^22` exceeded at k = 12 | Unresolved at every k | k = 128: 256 leaves (2 per component), 42 KB | 21.6 / 7.5 / 2.0 ms |
| `divide2` m | m = 16: 131,072 entries, 51.9 MB, 3.5 s | Unresolved | m = 16: 2 leaves, 317 B | 1.0 / 0.6 / 0.3 ms |
| `divide3` m | m = 16: 65,536 entries, 24.9 MB, 2.0 s | Unresolved | m = 16: **65,536 leaves (`2^m`)**, 43.1 MB | 1,362 / 3,142 / 1,925 ms |
| `divide` m | m = 16: 65,536 entries | valid, 98 B | 1 leaf | |

`dep`: B's certificate is linear in the number of components (E's is
`4^k`): refinement stays inside each component. `divide3` is the
negative result: one component whose witness needs a projection of a
rigid row (u takes exactly r's `a_j` fields; it may not hold r's rest).
No schematic value expresses that, so B's tree has `2^m` leaves, about
E's table size, and its coverage walk costs as much as E's lookups.
Compression did not help there. B's leaf budget (`2^16`) is reached
exactly at m = 16 and would be exceeded at m = 17. The fixed sizes stop
at 16, so no limit was recorded for B on `divide3`.

## 5. Cross-checks

results/crosscheck.txt (rerun after amendment 5). 0 flagged.

- **Regression set** (23 sig-oracle challenges, 12 source-boundary
  problems): E, A and B agree with the recorded P9s verdict on all 35.
  None accepts a recorded bounded-invalid problem. `split` and `route`
  stay Unresolved, as K8 requires.
- **Bounded oracle** (SMALL bounds, existential split by flexible
  component, `boundedValid` unsplit as a control on `star` 1, which
  agrees): `star` valid at 1-3; `star-read` valid at 1-2, **timeout**
  (120 s) at 3; the three `star` controls invalid at every size run;
  `dep`, `divide`, `divide2`, `divide3` valid at 1-2; `route` valid.
  Every acceptance by A or B is of a problem the oracle finds valid
  (or, for `star-read` 3, did not finish).
- **Instantiation**: every certificate A or B accepted was instantiated
  at every consistent pattern (up to 64 per problem here) and checked
  with sig-oracle's generic semantics and P9s's side condition: no
  failure. Wherever A's symbolic check failed, some instantiation failed
  too (e.g. `star-unlacked` 3: 64 of 80 pass), so no case showed the
  check rejecting a certificate that works at every pattern.
- **Pattern counts**: P9s's `patterns` and `consistentPatterns` agree
  for every `star` family at n ≤ 4.
- **Predictions**: all match except `divide` (A was predicted
  Unresolved; it is uniformly valid by `u := r`). Recorded in amendment
  1, not corrected.

## 6. Amendments (protocol.md) and what they change

1. `divide2` added after a pilot showed `divide` uniform.
2. Search strengthened after the pilot: a per-label split guess in the
   unifier, and unification at the representative pattern in B. Search
   only; checking and coverage unchanged.
3. `divide3` added: with (2), `divide2` needs one bit.
4. Closed-form pattern count (listing holder sets ran out of heap at
   n = 64). Reporting only.
5. After a first measurement run, discarded: the time limit at
   n = 1024 was spent in the reporting count and in a quadratic set
   rebuild in component code. The count is now timed apart, and the star
   sizes continue to 32768 so that a limit is actually reached. The
   cross-checks were rerun.

All amendments came after runs on the fixed set, and each is labelled
with its reason. None widened an oracle bound or a resource limit.

## 7. Honest limits

**What remains exponential.**

- **E** on every family: `2^(n(n-1))` for `star`. It is the reference
  and stays usable only to n = 4 under 60 s.
- **B on witnesses needing a projection** (`divide3`): `2^m` leaves in
  one component, so certificate size, checking and coverage are all
  exponential in the number of labels the witness must sort. Only a
  richer certificate language (§3.3) would change that.
- **B's brute-force fallback search** (P9s's search per component):
  exponential in labels and flexible rows of the component. It is
  reached only when unification fails. On `star-cross` its `2^20`
  budget stopped B at n = 2.
- **A and B checking** are polynomial in these runs, quadratic as
  implemented, and reach the 60 s limit at n = 16384 (A, `star-read`)
  and n = 12288-16384 (B). Their search and coverage work stay small:
  coverage was at most 0.1% of A's check time at the largest sizes.
- Not measured: a component whose atoms meet many rigid rows at many
  labels with declared disjointness among them. There, possibleBoth and
  the per-label families are still polynomial to query, but B's
  refinement could branch on many bits.

**What produces Unresolved** (never Contradiction):

- a failed check whose failure names no free bit: undeclared rests
  (`star-undeclared`, `route`), a written label against a forced holder
  (`star-unlacked`), a written field with no possible holder
  (`star-cross`);
- search finding no candidate: unifier clash plus brute-force search
  over its budget (`star-cross` in B);
- E's pattern budget (`2^22`), B's leaf budget (`2^16`), the 60 s and
  4096 MB limits;
- every problem outside `Accepts` (K8: `split`, `route`), whatever the
  search does.

`star` itself is no longer a reason for an accepted language limit at
six rows: in these runs A and B certify it to n = 12288 and beyond,
with certificates linear in n and no pattern enumeration. That is a
measurement of research code against unproved obligations SC1-SC4 and
SB1-SB3, not a guarantee.

## 8. Questions for the author

1. **A as the primary path.** Should the proved checker grow a
   schematic-certificate check (SC1-SC4) beside `checkAll`, with the
   solver's substitution as the certificate? It accepts only what
   `Accepts` accepts (K7).
2. **B's scope.** Is per-component refinement (SB1-SB3) worth stating
   for proof now, or only after a ported program shows
   pattern-dependent witnesses in practice?
3. **Projection / presence formulas (§3.3).** `divide3` is exponential
   for B. Should a projection piece (`r ∩ S`) or Boolean presence
   formulas be investigated as new machinery under ADR 014?
4. **Useful scale.** No numeric acceptance threshold has been given.
   Is "A certifies `star` n = 12288 in 35 s, linear certificate,
   quadratic check" the kind of figure you want, or should the
   benchmark fix a target (n and time) first?
5. **Check cost.** A's check is quadratic only because `equal` visits
   every written label. A sparse version (only labels some piece may
   hold) is an implementation change with the same obligations. Should
   it be measured, or left until implementation?
6. **The bounded oracle at `star-read` 3** timed out at 120 s. Is a
   larger oracle budget wanted for that one cross-check?
