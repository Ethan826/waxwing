# BAPA (Kuncak, Nguyen and Rinard): source reading

Read for dossier §13.7, conjecture CR (region granularity of the
unwritten labels of rigid rows). This note reports what the papers give.
It proposes no procedure and no adaptation. Where a sentence is this
reader's inference rather than a statement of a paper, it says so.

## What was read, and from where (2026-10-20)

- Main source. Viktor Kuncak, Huu Hai Nguyen, Martin Rinard,
  "Deciding Boolean Algebra with Presburger Arithmetic", JAR 36(3),
  2006, pp. 213–239. Read in full: the author preprint (Kluwer style,
  footer "main.tex; 12/07/2006", 34 pages) from EPFL Infoscience, record
  110248. Page numbers below are the preprint's (p.N), not the
  journal's. Theorem and lemma numbers are the preprint's.
- Later work, skimmed (abstract, introduction, definitions, main
  theorems; proofs not checked):
  - Wies, Piskac, Kuncak, "Combining Theories with Shared Set
    Operations", FroCoS 2009 (LNCS 5749). EPFL Infoscience 161293.
    §§1, 3, 4 (Theorem 3), 4.4, 5.
  - Yessenov, Piskac, Kuncak, "Collections, Cardinalities, and
    Relations", VMCAI 2010. EPFL Infoscience 161289. §§1, 3 (Fig. 3,
    §3.3), 4 (Lemma 4, Theorem 5).
  - Kuncak, Rinard, "Towards Efficient Satisfiability Checking for
    BAPA", CADE 2007. EPFL Infoscience 110254. Abstract, §1 only.
- Not read. The CADE 2005 version ("An algorithm for deciding
  BAPA"); Feferman and Vaught 1959; Zarba's papers; Ohlbach and Koehler
  1998 ("bridging functions"); Piskac and Kuncak on multisets; Revesz
  2004. Cited below only as the papers above describe them.
- No PDF is stored in the repository.

## 1. The logic

- Syntax (Fig. 3, p.5). Two sorts: sets and integers. Set terms:
  variables, 0, 1, ∪, ∩, complement. Integer terms: Presburger terms,
  `MAXC`, and `|B|`, the cardinality of a set term. Atoms: `B1 = B2`,
  `B1 ⊆ B2`, `T1 = T2`, `T1 < T2`, `K dvd T`. Formulas close under
  ∧, ∨, ¬ and ∃, ∀ over both sets and integers, with arbitrary
  alternation. There is no element sort and no element constant;
  an element is a set with `|e| = 1` (Figs. 4–6, p.7). FroCoS 2009
  (Fig. 3, p.5) adds an `obj` sort and singleton `{x}`.
- Sets of what. Subsets of a finite universe U of uninterpreted
  elements, with `MAXC = |U|` in every model (p.6). §8.1 (pp.25–26)
  extends this to all subsets of a countable set, adding `inf(b)` (is
  `b` infinite) and letting `|b|` be 0 for infinite `b`. That section
  is a sketch ("we argue"); it claims the complexity results carry over.
- Decidability. Theorem 3 (p.15): algorithm α maps every BAPA
  sentence to an equivalent PA sentence. With a PA decider, a decision
  procedure. Decidability itself is credited to Feferman and Vaught
  1959 (§2, p.5).
- Complexity. Lemma 7 (p.18): `size(α(F)) ≤ 2^(c·size(F))`, the
  same number of quantifier alternations, more precisely `O(n·S·2^S)`
  for `S` set variables (p.19). Lemma 8 (p.19): a sentence of size `n`
  with `m` alternations is in `STA(∗, 2^(2^(O(mn))), m)`. Theorem 9
  (p.19): BAPA is `STA(∗, 2^(2^(n^O(1))), n)`-complete, the complexity
  of PA. Pure BA sentences (no cardinalities): Theorem 11 (p.21),
  `STA(∗, 2^O(n), n)`. Quantifier-free BAPA: NP-complete (CADE 2007,
  abstract); the JAR paper has only the small-model Theorem 13 (p.27).
- Experience (§7, p.24): fast for at most 4 set variables, under
  10 s for 5, out of memory beyond 5 (Omega Calculator).

## 2. The mechanism

- Separation (§4, pp.11–12). Prenex form; replace `b1 = b2` and
  `b1 ⊆ b2` by `|b| = 0` atoms; write each set term as a union of
  cubes, the Venn regions `∩ xi^±` of the `n` set variables
  (`2^n` of them); replace `|t|` by the sum of its cubes' counts; name
  each cube's count `li`. Result: formula (1), a quantifier prefix over
  `∃+ l1..lm. ∧ |si| = li ∧ G1` with `G1` pure PA.
- Elimination of one set quantifier (pp.12–14). The key step is
  Lemma 1 (p.13): for finite pairwise disjoint sets `b1..bn` and
  naturals `ki, li`, there is a finite set `y` with
  `|bi ∩ y| = ki ∧ |bi ∩ yᶜ| = li` for all `i` iff `|bi| = ki + li`
  for all `i`. The proof picks any subset of `bi` of size `ki`. So
  `∃y` becomes `∃+` over the split counts of each coarser region, and
  `∀y` becomes `∀+` the same way (∀-step, p.14). Integer quantifiers
  pass through unchanged. Lemma 2 and Theorem 3 (pp.14–15): each step
  preserves equivalence.
- The region-reduction statement. No theorem in the JAR paper is
  phrased as "truth depends only on region cardinalities". It is what
  Lemma 2 and the form (1)/(2) give: after separation a formula's set
  variables occur only through `|s|` for regions `s`, so its truth
  under an assignment is a PA formula of the region counts (§6, pp.21–
  22, for formulas with free variables). The explicit statement is
  FroCoS 2009 Lemma 1 (p.6), "which follows from [JAR]": for a
  finite U, a relation on `p` sets is BAPA-definable iff the set of
  vectors of its `2^p` Venn-region cardinalities is semilinear.
- What it needs of the universe. Lemma 1 needs nothing beyond
  finiteness of the `bi`: elements carry no structure, so any subset
  of the right size does. The language has no element-level symbol
  (Fig. 3), and that absence is the only reason elements of one region
  are interchangeable. The paper states no indistinguishability or
  automorphism lemma. Infinite universes: Lemma 12 (p.25) replaces
  Lemma 1 with a version tracking `inf` flags ("an infinite set can
  always be split into a set of the desired size and another infinite
  set, or into two infinite sets").
- Region counts. The reduction keeps region cardinalities. An
  existential set may take part of a region (Lemma 1 splits each `bi`
  into `ki` and `li` elements). Even for pure BA, Lemma 10 (p.20)
  shows that after `r` elimination steps a region count matters up to
  `min(w, 2^(r−1))`; only the quantifier-free base case depends on
  empty versus non-empty alone (p.20).
- Fewer regions (§6.1, pp.22–23): known empty regions drop out
  (attributed to Ohlbach and Koehler); when eliminating `y`, only the
  set variables sharing a term with `y` need regions.

## 3. Transfer to the Waxwing problem

Labels as elements, a row's domain as a set. This reader's mapping; the
paper does not discuss records.

| Part of the problem | Covered by JAR BAPA? |
|---|---|
| `∀` rigid, `∃` flexible, one alternation | yes: set quantifiers, any alternation (Fig. 3) |
| rows' domains as sets of labels | yes, as set variables |
| `disjoint r s` | yes: `dom r ∩ dom s = 0` |
| `⊎` defined only on disjoint domains | yes, as an added `= 0` atom (this reader's encoding) |
| infinitely many labels | §8.1 sketch: countable universe |
| rows finite | §8.1: `inf(dom r) = 0`; finite U makes every set finite |
| written labels as distinct constants | no constants; singletons `\|x\| = 1`, pairwise disjoint (FroCoS: `{x}`) |
| `lacks l`: `l ∉ dom r` | yes, via the singleton |
| record equation, presence part | yes: set equality of the unions |
| record equation, per-label field types | no |
| field types differing by row at one label | no |
| rigid field types, universally quantified | no |
| nested records (a field type is a record) | no |
| rigid type variables (`recSig`) | no |

What the read papers offer for the "no" rows:

- JAR 2006. Nothing. Related work (p.28) mentions Ohlbach and
  Koehler's "bridging functions" for quantifier-free BA and says "we
  expect" the techniques generalize; not done there.
- VMCAI 2010 (skimmed). QFBAPA-Rel (Fig. 3, §3): sets, unary total
  functions, `n`-ary relations, images `f[B]`, inverse images; the
  quantifier-free fragment, NEXPTIME-complete (Theorem 3). §3.3
  (p.10): BAPA with quantified formulas and one unary function's
  images is undecidable (it defines `x = yz`, Hilbert's tenth
  problem). The construction uses cardinality (`|f⁻¹[e]| = k`), which
  Waxwing's atoms lack, so it does not settle the Waxwing case; it does
  mean no quantified BAPA-with-functions result exists to borrow. The
  same paragraph cites Gurevich and Shelah (LICS 2003, not read) for
  decidability of quantification over sets with one function symbol.
- FroCoS 2009 (skimmed). Satisfiability of quantifier-free
  combinations of formulas from several logics sharing only set
  variables (§4, condition 6), finite universes only (footnote 2,
  p.4). Theorem 3 (p.7): decidable when each logic has a computable
  BAPA reduction, i.e. its projection onto the shared sets is a BAPA
  formula. Given for WS2S, two-variable logic with counting (which has
  binary relations), Bernays–Schönfinkel–Ramsey, and quantifier-free
  multisets (`obj → int` attributes, §4.4, Theorem 13). This is the
  closest thing to "sets plus per-element attributes", but it projects
  attributes away under an existential and decides satisfiability,
  which is a different shape from Waxwing's ∀∃ (this reader's
  observation).
- CADE 2007 (abstract only). Quantifier-free BAPA in NP. Nothing on
  attributes.

## 4. Region reduction and per-element attributes

The JAR paper does not address it. Its reduction is proved for a
language with no element-level symbols, and Lemma 1's proof uses
exactly that: any subset of a region of the right size works. Nothing
there shows that two elements of one region remain interchangeable
when a formula also constrains a per-element attribute such as a field
type.

The later papers handle attributes logic by logic, with separate
proofs. VMCAI 2010 Lemma 4 ("Models modulo Venn regions", p.11) lets a
single relation be completed to unions of products of regions, by a
monotonicity argument specific to that fragment. FroCoS 2009's
reductions refine regions by the attribute logic's own types (star
types for two-variable logic, §4.2; 1-types for the
Bernays–Schönfinkel–Ramsey class, §4.3, p.13). Neither states
a general lemma, and neither covers quantified set formulas combined
with attributes.

## 5. Obligations a typed-record version would leave open

What the papers leave undischarged. None of these is a plan.

1. Attribute indistinguishability. That two unwritten labels in the
   same region are interchangeable when rows carry field types, under
   ∀ rigid / ∃ flexible quantification. No read paper proves it.
2. Rigid field types per label. A rigid row's field types range
   over all types, independently at each label; quantifying over them
   is quantifying over a function from labels to types, outside BAPA.
3. Field-type equations across rows. A record equation equates the
   types at each shared label; one label may have different types in
   two rigid rows. Not a set constraint.
4. Nested records and type variables. A field type or rigid type
   variable may itself be a record (`recSig`), so attributes are not a
   flat sort.
5. Counts versus emptiness. BAPA keeps region cardinalities, and in
   pure BA they matter up to `2^(r−1)` after `r` eliminations
   (Lemma 10). Whether Waxwing's positive atoms (no negation, no
   cardinality, no `≠ ∅`) need only emptiness per region is not
   answered by the paper.
6. Partial regions. Lemma 1 lets an existential set take part of a
   region; whether a flexible row ever needs that in Waxwing's language
   (as opposed to whole regions, CR) is open.
7. Infinite universe with finite rows. §8.1 is a sketch with
   "inf" flags; its Lemma 12 is stated, the generalized algorithm is
   not given.
8. Written labels as constants. Encoded as singleton sets; their
   distinctness and their place in the quantifier prefix are the
   encoder's to justify.
9. Decidability with attributes. VMCAI 2010 §3.3 shows quantified
   BAPA plus a unary function is undecidable. Waxwing lacks
   cardinality, so the result does not apply directly, but no read
   paper gives a decidable quantified logic of sets with attributes.
