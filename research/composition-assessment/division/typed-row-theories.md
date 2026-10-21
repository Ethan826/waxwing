# Typed row theories: can they divide a rigid row by another?

Source reading for the Waxwing record-composition dossier. This note reports
what the sources say. Sentences marked **[inference]** are mine and are not
source statements. It proposes no procedure.

The target problem is the "split"/"route" case:

    ∀ r s t. s disjoint t ⇒ ∃ u v. r = u ⊎ v ∧ u disjoint s ∧ v disjoint t

## Sources and coverage

| # | Source | Copy used | Coverage |
|---|--------|-----------|----------|
| 1 | Morris & McKinna, "Abstracting Extensible Data Types: Or, Rows by Any Other Name", PACMPL 3(POPL) Art. 12, 2019 | author copy `jgbm.github.io/pubs/morris-popl2019-rows.pdf` (28 pp., CC-BY); downloads/rose/morris2019.pdf | **Read in full** (pp. 12:1–12:28) |
| 2 | Hubers & Morris, "Generic Programming with Extensible Data Types", PACMPL 7(ICFP) Art. 201, 2023 | arXiv 2307.08759v2; downloads/roseext/hubers2023.pdf | **Read in full** §1–§7 (pp. 201:1–201:27). Reference list skimmed. Agda development not read |
| 3 | Chlipala, "Ur: Statically-Typed Metaprogramming with Type-Level Record Computation", PLDI 2010 | author copy `adam.chlipala.net/papers/UrPLDI10/UrPLDI10.pdf` (12 pp.); downloads/ur/ur.pdf | **Read in full** (two-column text extraction, interleaved but complete). The Coq formalization (src/coq) was not read |
| 4 | Leijen, "Extensible records with scoped labels", TFP 2005 | MSR copy, **draft rev. 76, 23 July 2005** (10 pp.), not the proceedings version; downloads/leijen/scoped.pdf | **Skimmed** (abstract, §1, operations list, unification theorems, related work) |
| 5 | Harper & Pierce, "A record calculus based on symmetric concatenation", POPL 1991 | Pierce's site has `merge.ps` (35 pp., PostScript); downloads/harper/merge.ps | **Not read.** PostScript is a program and I did not run Ghostscript on an untrusted file. Only secondary descriptions (from 1–3) are reported below |

No copies were found under /Users/ethan/Desktop/waxwing/research.

---

## 1. Morris & McKinna 2019 (Rose)

**Predicates.** There are only two forms: containment `ζ1 ≲d ζ2` and combination
`ζ1 ⊙ ζ2 ∼ ζ3` (Fig. 4, §4.1). There is no separate disjointness or lacks
predicate and no row-difference operator. In the simple theory, combination is
"defined only when ζ1 and ζ2 have disjoint label sets" (§2.2, p. 12:6). The
model is partial union on `L ⇀ T`, defined only if the domains are disjoint
(Example 3, p. 12:12). `ζ1 ⊙ ζ2` used as a type is sugar for the three-place
relation, "and the partiality that it provides" (§2.2, p. 12:5). The paper notes
that `ζ1 ≲ ζ3` is satisfiable exactly when there is a ζ2 with `ζ1 ⊙ ζ2 ∼ ζ3`,
and that this "characterizes the satisfiability" (§2.1, p. 12:4). That is a
remark about satisfiability. It is not an entailment rule.

**Entailment.** A row theory is ⟨R, ∼, ⇒⟩. Its ⇒ is required only to satisfy
monotonicity (assumptions are entailed) and transitivity (Def. 1, pp. 12:11–12).
⇒simp is "as given in Figure 1" (p. 12:12). Fig. 1 (p. 12:4) gives the rules for
**ground** rows only: containment by ⊆ on label/type pairs, and combination by
disjoint union ⊎ of label/type sets. Scoped rows use Fig. 3. Trivial rows use
Fig. 8, which adds combination ⇒ containment. Def. 2 (p. 12:12) requires models
to be sound with respect to ⇒. Nothing requires completeness.

**Declared types.** Generality `(P1|σ1) ⊒ (P2|σ2)` (Fig. 9, p. 12:20) needs
entailment of the more general scheme's predicates from the less general
scheme's predicates (the qualified-type rule of Fig. 9). Theorem 11
(Principality) follows Jones 1994 and uses Algorithm M (p. 12:20). The paper
describes no improvement or simplification step. Coherence (Def. 13–14, Thm. 15,
p. 12:21) uses a functional-dependency closure that propagates determinacy in
one direction only: from fv(ζ1, ζ2) to fv(ζ3) of each `ζ1 ⊙ ζ2 ∼ ζ3`. Example
(p. 12:20): `prjL ∘ prjR` is incoherent because z2 appears only in its
qualifiers.

**Decidability.** §1 (p. 12:2) claims "principal types and decidable type
inference". There is no theorem specifically about deciding entailment.

**Related-work claims (secondary).** Harper–Pierce use constrained
quantification `∀a#ζ⃗.A`, meaning instantiations must be disjoint from the
listed ζ⃗. Their primitives "project only single fields, not subrecords", and
the system cannot express Wand's problem (§5, pp. 12:23–24). Gaster–Jones use
`ζ\ℓ` (lacks). Ur needs an explicit, routinely written disjointness witness (p.
12:24).

## 2. Hubers & Morris 2023 (Rω)

Predicates are the same: `ρ ≲d ρ` and `ρ ⊙ ρ ∼ ρ` (Fig. 8, p. 201:14).

**Entailment.** The minimal theory M (Fig. 12, p. 201:18) has these rules:
axiom, refl and trans of containment, ≡, lifting of ≲ and ⊙ over type
application, and ⊙ ⇒ ≲L and ⊙ ⇒ ≲R. The simple theory S (Fig. 13) adds rules for
concrete rows only. The authors say: "There are more generic entailment rules
that could be useful… For example, combination gives a least upper bound for the
containment relation… we regard further extension of the entailment relation as
an orthogonal concern" (§4.5, p. 201:19).

**The "remainder" problem, stated by the authors.** In eqΣ, "all we know is that
{l ⊲ u} ≲ z; while logically this implies that there must be a 'remainder' of z
less {l ⊲ u}, we do not have access to it" (§3.4, p. 201:12). Their fix is not
an entailment rule. They change the typing rules of ana/syn/fold so that the
body is polymorphic in the remainder: `∀ l u y. {l ⊲ u} ⊙ y ∼ ρ ⇒ …`
(t-ana3/t-syn3, p. 201:12). For non-commutative theories they use `y1 ⊙ {l⊲u} ∼
z, z ⊙ y2 ∼ ρ` (§3.5). Only the Agda model has `_delete_` (a row minus one
index) and `recombine : ρ pick n ⊙ ρ delete n ∼ ρ` (§5.4, p. 201:24). These
exist only in the semantics.

**Meets and intersections.** On a lifted `z1 → z2` over finite rows, the authors
ask: "Should we interpret z1 → z2 as undefined if the label sets of z1 and z2
are not identical? Or restrict it to the intersection of those label sets?" They
do neither and lift only over a single row (§3.3, p. 201:11).

**Limits they state.** "We have no way to impose conditions on the relationship
between an entry in a row and the remainder, other than that provided by the row
combination predicate" (§7, p. 201:27). Labels are interpreted as the unit type,
with "no runtime comparison or manipulation of labels" (§1 and §5.1).

**Metatheory.** The theorems are soundness of kinding, entailment, equivalence
and typing, by Agda denotation (§5). The mechanized entailment covers the
minimal theory only (§5, p. 201:19). There is no inference, decidability or
completeness result. Type reconstruction is future work (§7).

## 3. Chlipala 2010 (Ur / Featherweight Ur)

**Syntax.** Rows have kind `{k}`. The constructors are `[]`, `[c = c]`, `c ++
c`, `map` and the guarded type `[c ∼ c] ⇒ τ` (Fig. 1). There is no type-level
difference or intersection. The only value-level removal is `e − c`, for a
single name c, typed from `$([c = τ] ++ c′)` to `$c′` (Fig. 4). The author says
that disjointness is "the sole variety of constraint" and that "from this base,
it is easy to define other constraints, including record equality and inclusion"
(§3.1).

**Disjointness prover (§4.1).** When an assumption `r1 ~ r2` is introduced, each
side is decomposed by D: a singleton `[c1=c2]` becomes `{[c1]}`, `++` becomes a
union, a variable stays atomic, and `map f c` becomes D(c). The prover then adds
the symmetric closure of the Cartesian product of the two sides as atomic facts.
To prove a goal, every pair from the decomposed goal must be a known fact or two
distinct constant names. If an unresolved component remains, the goal "is not
provable yet" and is revisited later. Disjointness is on **names only**, because
D discards field types.

**Row unification (§4.3).** It cancels matching components. If one side reduces
to a single unification variable, it substitutes. If each side is one
unification variable plus non-overlapping singletons, it rewrites both in terms
of one fresh variable. Otherwise it tries reverse-engineering unification, and
if that fails the constraint stays unsolved.

**Status.** "Type inference for Ur is undecidable, and we have no theorems that
support our choice of inference procedure" (§1). The left-to-right rewrite
system is "conjecture[d]" terminating and confluent once commutativity is
removed (§4). The paper claims empirical sufficiency (§6, Fig. 5).

**Dividing rows.** §2.3 `selector` threads a `rest :: {Type}` with `[rest ~ r]`
through a **folder**, which is a programmer- or compiler-supplied permutation of
a record's fields (§2.1, §4.4). It moves fields "from rest to r" one name at a
time. This splits a row by iterating over its own fields. It does not split by
membership in another row.

**Related-work claim.** Harper–Pierce have "row-quantified types that include
general disjointness constraints like those in Ur, but without discussion of
type inference" (§7).

## 4. Leijen 2005 (skimmed)

The operations are selection, single-label restriction `r − l` and extension.
Concatenation is not a primitive ("many calculi use record concatenation as the
primitive", related work). Theorems 1–2 state that row unification is sound and
complete. Related work cites Pottier's filter constraints such as `(L / {l}) :
r1 ⩽ r2`, a "co-singleton filter". **[inference]** Pottier (ESOP 2000) and Rémy,
"Typing record concatenation for free", are leads for label-set complement or
filter constraints. I did not read them.

---

## Answers

**Q-a. Row difference or meet.** None of 1–4 has a type operator for "r outside
s" or for r ∩ s.
- Rose and Rω can *state* a candidate split as predicates. **[inference]** "u
  disjoint s" can be written `u ⊙ s ∼ w` with fresh w in the simple theory,
  since ⊙ is defined only on disjoint labels (§2.2, Ex. 3). But no rule
  *produces* such a u from r and s.
- Rω gets single-label remainders by binding them universally in ana/syn/fold
  bodies (§3.4). Real deletion exists only in the Agda model (§5.4).
- Ur has single-name value removal `e − c`, and fold-based splitting along a
  row's own fields (§2.3).

**Q-b. Completeness for "split".**
- No source claims entailment completeness.
- **[inference]** Rose (Fig. 1, Def. 1) and Rω (Figs. 12–13) entail non-ground
  predicates only by assumption, transitivity, lifting and ⊙ ⇒ ≲. None of these
  introduces a fresh ⊙ whose result is a rigid r. So with rigid r, s, t, the
  goal `u ⊙ v ∼ r, u ⊙ s ∼ w1, v ⊙ t ∼ w2` is not derivable for any expressible
  u, v. Even the choice u = r, v = ∅ needs `r ⊙ s ∼ w1`, which is not assumed.
  Also, u and v are not in the Def. 13 closure, which goes from ζ1, ζ2 to ζ3
  only, so a scheme with u and v only in its qualifiers would fall outside Def.
  14.
- **[inference]** Ur: `u ++ v ≡ r` has two unification variables against a rigid
  atom, which matches none of the §4.3 rules, so it stays unsolved. `u ~ s` with
  u unknown is "not provable yet" (§4.1). The language has no syntax in which to
  write the witness.
- Rω §4.5 explicitly leaves stronger generic rules as future work.

**Q-c. Overlapping field types.**
- Rose simple containment is ⊆ on label/type *pairs*, so `(x◃Double)` is not
  contained in the pixel row (§2.1). Combination of rows that share a label is
  undefined whatever the types are (Ex. 3).
- Rω evidence pairs index maps with type equalities (§5.3). It considers and
  rejects intersection for `z1 → z2` (§3.3).
- Ur disjointness ignores types entirely (D, §4.1).
- None of these sources has an "agree on shared labels" notion.
- Harper–Pierce: not read.

**Q-d. Decidability.**
- Rose claims decidable inference and principal types (§1, Thm. 11) but has no
  entailment-decidability theorem.
- Rω has soundness only (§5).
- Ur states its inference is undecidable and heuristic (§1, §4).
- Leijen proves unification sound and complete for extension and restriction
  only (Thms. 1–2).
