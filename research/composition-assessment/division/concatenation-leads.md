# Concatenation leads: source reading (2026-10-21)

Scope: leads on record concatenation and label-set constraints not covered
by the earlier readings (Rose, Rω, Ur, Leijen 2005, Martin–Nipkow, Flix).
No procedure is proposed. Plain sentences report a source, with a citation.
Sentences marked **[INF]** are my inference, not a statement of the source.

The three questions asked of each source:

- **Q-a**: can it express a row equal to "r outside s", where s is a row
  variable?
- **Q-b**: does it make a completeness or decidability claim that bears on
  ∀(rigid) ∃(flexible) checking under hypotheses?
- **Q-c**: what happens to field types when rows overlap?

## Sources and access

Local copies were kept outside the repository, one new directory each (not
stored here). No PostScript was opened or rendered. Text was extracted with
`pdftotext` (PDF) or `dvi2tty` (DVI).

| # | Source | Status | From |
|---|--------|--------|------|
| P1 | Pottier, "A Versatile Constraint-Based Type Inference System", Nordic J. Computing 7(4):312–347, 2000 | §1–§8 read in full; App. A: definitions, Thm 2 and the opening skimmed, rest of the proofs not read | cambium.inria.fr/~fpottier/publis/fpottier-njc-2000.pdf → `downloads/pottier-njc2000/` |
| P2 | Pottier, "A 3-Part Type Inference Engine", ESOP 2000, LNCS 1782 | Skimmed: the section list and greps only. It is the conference version of P1 and has the same §3–§5 structure. It has **no** filter constraints | cambium.inria.fr/~fpottier/publis/fpottier-esop-2000.pdf → `downloads/pottier-esop2000/` |
| P3 | Pottier, "A Constraint-Based Presentation and Generalization of Rows", LICS 2003, pp. 331–340 (long version, 13 pp.) | Read in full, except the complexity proof of §3.5, which was skimmed | cambium.inria.fr/~fpottier/publis/fpottier-lics03-long.pdf → `downloads/pottier-lics2003/` |
| R1 | Rémy, "Typing Record Concatenation for Free", POPL 1992, pp. 166–176. Read as INRIA RR 1739 (Aug 1992, 16 pp.); page numbers below are the RR's | Read in full | cambium.inria.fr/~remy/ftp/free-concatenation.pdf → `downloads/remy-popl92/` |
| R2 | Same title, in Gunter & Mitchell (eds), TAOOP, MIT Press 1993 | Skimmed. The text and section structure match R1 | cambium.inria.fr/~remy/ftp/taoop2.pdf → `downloads/remy-taoop/` |
| R3 | Rémy, "A case study of typechecking with constrained types: Typing record concatenation", Newton Institute workshop 1995 (DVI draft of 26 Dec 1996) | §1, §2 entailment, §4.3 and §5–§7 read; §3 proofs not read | cambium.inria.fr/~remy/work/sub-concat.dvi.gz → `downloads/remy-subconcat95/` |
| H1 | Harper & Pierce, "A Record Calculus Based on Symmetric Concatenation", POPL 1991, pp. 131–142 (scanned ACM PDF, OCR text) | Read in full, OCR quality permitting | static.aminer.org/pdf/20170130/pdfs/popl/wsz5tkzhyaxeugibktrgir7be6vjhfl4.pdf → `downloads/harper-pierce-popl91/` |
| H2 | Same authors, tech. report CMU-CS-90-157 (full version) | **Not read.** The only copy found was `merge.ps` (PostScript) at cis.upenn.edu/~bcpierce/papers/merge.ps, already at `downloads/harper/merge.ps`. Only its DSC header was looked at (dvips, 35 pages), and nothing was rendered. KiltHub (CMU) has a record, but it was not fetched | — |
| B1 | Baader, "On the Complexity of Boolean Unification", IPL 67(4):215–220, 1998. Read as LTCS-Report 97-03 (RWTH Aachen, 10 pp.) | Read in full | lat.inf.tu-dresden.de/research/reports/1997/Baader-LTCS-97-03.pdf → `downloads/baader-ltcs97/`. The report page lists only .ps.gz; the .pdf at the same path exists |

**Correction to the lead.** Leijen 2005 attributes the co-singleton filter
`(L / {l}) : r1 ⩽ r2` to his ref. [28], which is P3 (LICS 2003), not to P1
or P2 (ESOP 2000 is his [27]). Leijen has this at §9, "Related work". P1 and P2
use row terms `l : τ; ρ` and have no filters.

## P3: Pottier, LICS 2003 (filters)

**Constraint language.** "Let a filter L be a finite or cofinite subset of
L. Filters are machine representable and are preserved by finitary union,
intersection, and complement" (§2.3). The constraints are `∃α.C`, `C ∧ C`,
`true`, `false`, `τ ≤ τ`, `L : ρ1 ≤ ρ2` and `L : s ≤ ρ0 ? ρ1 ≤ ρ2`
(§2.3). Row terms other than variables and the constant row `∂τ` disappear:
"The introduction of filters compensates the omission of the standard row
constructor (ℓ : τ ; ρ)" (§2.4). `L : ρ1 ≤ ρ2` holds iff `ρ1.ℓ ≤ ρ2.ℓ` for
every ℓ ∈ L, and the conditional form is an implication at each ℓ ∈ L
(Fig. 3). A condition must have the form `s ≤ α`, with s prime (§2.3). The
abstract says the development needs only that filters be "preserved by
Boolean operations and enjoy a decidable emptiness test" (§1; §5). §5.1
(label hierarchies with cones) and §5.2 (k-dimensional rows, tree-automaton
filters) are flagged as speculative.

**Record typings (§4).** Access: `∀βφ[{ℓ} : φ ≤ ∂(Pre β)]. {φ} → β`.
Non-strict extension:
`∀βφ1φ2[{ℓ} : ∂(Pre β) ≤ φ2 ∧ (L \ {ℓ}) : φ1 ≤ φ2]. {φ1} → β → {φ2}`
("a cosingleton filter to indicate that all fields other than ℓ have the
same status"). Symmetric concatenation:
`L : Abs ≤ φ1 ? φ2 ≤ φ3 ∧ L : Abs ≤ φ2 ? φ1 ≤ φ3 ∧ L : Pre ≤ φ1 ? φ2 ≤ Abs`.
Asymmetric concatenation "requires a slight extension of our framework"
(§4; §5.3, lifting constructors to rows).

**Q-a.** A filter is a constant label set. It cannot mention a row
variable, so there is no filter "labels outside s" (§2.3 definition).
**[INF]** Rows here are total maps from labels to field types, with Abs as
an ordinary value, and constraints are pointwise. A pointwise conditional
over the full filter L can relate u's field at ℓ to r's field at ℓ, guarded
by s's field at ℓ. Guards must be lower-bound tests `s ≤ α` (§2.3), and
conclusions are inequalities, not equations. That is how P3 types
concatenation, which is itself a pointwise division by presence.

**Q-b.** The paper decides **satisfiability**, not entailment. Thm 3
states that C and its closure are logically equivalent. Thm 4 states that a
closed C not containing `false` is satisfiable. Thms 5–6 give soundness and
completeness of the algorithm with respect to the closure. Thm 7 gives
O(n³ m log m), where m is the number of labels apparent in C. §3.3 stresses
that solution sets are preserved, against Palsberg and Zhao's
satisfaction-equivalence. Entailment `C1 ⊩ C2` is defined (Def. 7), but no
decision procedure is given. **[INF]** Checking a declared scheme with
rigid variables needs entailment (∀ rigid ⇒ ∃ flexible), so P3's theorems
do not cover the split problem as stated. Its filters do not quantify over
row-dependent label sets either.

**Q-c.** Under symmetric concatenation, the third constraint
`Pre ≤ φ1 ? φ2 ≤ Abs` rejects overlap. Abs and Pre are incomparable, with
a common supertype ⊤field, so width subtyping exists. Pre ≤ Abs is ruled
out "because that is required to assign a sound type to record
concatenation" (§2.1 Example 1). Field contents are compared by subtyping
(`Pre τ1 ≤ Pre τ2`).

## P1: Pottier, NJC 2000 (P2 is its conference version)

The system is HM(SRC): subtyping, Rémy row terms `r : τ; τ'` and `∂τ`, and
conditional constraints `s ≤ τ0 ? τ1 ≤ τ2` with s prime (§2.2, Fig. 1).
Row sorts are `Row(R)`, with R a finite set of row labels (§2.2 sorting).
Field lattice: Bot ≤ Abs, Pre τ ≤ Either τ ≤ Any (§5.1, Fig. 4).
Asymmetric `φ2 ≤ Either τ2 ∧ Abs ≤ φ2 ? φ1 ≤ φ3 ∧ Pre ≤ φ2 ? Pre τ2 ≤ φ3`.
Symmetric: four conditionals, the last two `Pre ≤ φi ? φj ≤ Abs` (§5.1).
§5.2 reads the same schemes with row variables: "the row machinery allows
us to replicate these constraints over an infinite set of labels". The
paper does not prove the operation types sound (§1, "we believe this is a
straightforward task").

- **Q-a.** No construct mentions labels outside a row variable. Sorts carry
  only finite constant label sets (§2.2). **[INF]** Same pointwise remark as
  for P3.
- **Q-b.** App. A, Thm 2: "If C is weakly closed, then C has a solution".
  App. A "does not have rows" and only says that adding them "should not
  pose any foreseeable difficulty" (App. A opening). No entailment decision
  is claimed in what I read.
- **Q-c.** Symmetric: rejection via the `Pre ≤ φ ? … ≤ Abs` constraints.
  Asymmetric: the right field's `Pre τ2` wins (§5.1).

## R1/R2: Rémy, "Typing record concatenation for free"

**Encoding.** A record is translated to a tagged abstraction over an input
row: `{}† = Tag(λu.u)`, `{a = M}† = Tag(λu.{u with a = M†})`,
`(M ∥ N)† = Tag(λu. Untag N† (Untag M† u))`, with access
`(M.a)† = ((Untag M†) {}).a` (§1.2). "Concatenation is then composition"
(Conclusion). Typed in Π∥ with record types `{ρ ⇒ ρ'}`, "I am a record
which given any input row of fields ρ returns the output row ρ'" (§2.2). The
primitive types for symmetric concatenation (§2.2) are:

    {}   : {ρ ⇒ ρ}
    .a   : {a : abs; ρ ⇒ a : pre(α); ρ'} → α
    {a=_}: α → {a : abs; ρ ⇒ a : pre(α); ρ}
    \a   : {a : ε; ρ ⇒ a : ε'; ρ'} → {a : θ; ρ ⇒ a : θ; ρ'}
    ∥    : {ρ1 ⇒ ρ2} → {ρ2 ⇒ ρ3} → {ρ1 ⇒ ρ3}

Removal needs a new primitive, `{_ but a from _}`: "This construct has never
been introduced in the literature before" (§1.3). Its type is
`(a : ε; ρ) → (a : ε'; ρ') → (a : ε'; ρ)` (§2.2). The underlying system Π
is Rémy's ML with flags. Its rows are written `ρ^L`, "rows defining all
labels but those in L", with L a finite set of labels, and the equations are
left commutativity and `abs = (a : abs; abs)` (§2.1). "As in ML, any
typeable expression possesses a principal type" (§2.1). The inference
engine of Π∥ "is exactly the one of Π; only the primitives have changed"
(§2.2 Examples).

**Q-a.** No. The superscript L is a syntactic finite set of concrete
labels, and "all occurrences of the same row variable should be preceded by
the same set of labels" (§2.1). Nothing expresses "the labels of row s".
**[INF]** In Π∥ a record's field set is implicit in its transformer type.
Splitting a record type `{ρ ⇒ ρ'}` into two composable transformers is an
existential over function-typed factors (∃g h. f = h ∘ g). Plain ML
unification on rows does not express this, and R1 makes no claim about it.

**Q-b.** Principality and unification-based inference are inherited from
Π (§2.1, §2.3). There is no checking against declared polymorphic
signatures. R1 also lists limits. ML let-polymorphism blocks some programs
that need "retyping functions" (§2.2). `reverse r s = if true then r ∥ s
else s ∥ r` gets "too weak a type" (§2.3). Wand's system types more by
using conjunctive types, at the cost of "disjunction of principal types"
(§2.3).

**Q-c.** "It is not concatenation which is symmetric or not, but record
fields themselves!" (§2.2, Asymmetric concatenation). Strict extension
makes a field symmetric, so overlap is rejected because the input field
must be abs. Free extension `{!a = _} : α → {a : ε; ρ ⇒ a : pre(α); ρ}`
makes it asymmetric, and fields "can be redefined with values of possibly
incompatible types" (same section, example `ab`).

**R3 (Rémy 1995/96 case study), short.** It adds a type operator `τ1 @ τ2`
that may occur only on the left of a constraint, with propagation rules
`τ1 @ Pre τ0 ≤ τ ⇒ Pre τ0 ≤ τ` and `τ1 @ Abs ≤ τ ⇒ τ1 ≤ τ` (§4.3). It
distinguishes rigid record types (template Abs) from flexible ones
(template Either) (§5, §7). Entailment: Rémy defines `⊩+` by consistency
under all extensions and states "it is not clear whether the relation ⊩+
is decidable", then takes any transitive relation satisfying an extension
property (§2). The abstract says: "We do not address the practical issues of
type inference here." P1 §5 states that its approach is inspired by this
paper.

## H1: Harper & Pierce, POPL 1991

**Calculus λ∥.** It is explicitly typed and second order. Record types are
`a | Empty | l:t | r\l | r1∥r2`, and quantification is `∀a#R. t` with R a
list of record types (§2.1). There is no subsumption. "[T]he form of
constraint used in λ∥ can only be used to express negative information about
record type variables" (§1). "[N]o expression of the form a\l, where a is a
variable, is ever well formed" (§2.2). Compatibility `r # s` means r and s
are mergeable, "symmetric, respects type equivalence, and is insensitive to
the types ascribed to fields" (§2.2, Fig. 3). For a variable,
`a#rᵢ` follows from membership of rᵢ in a's declared list (Fig. 3 and
Fig. 8 algorithmic rules: `a #⇒ b` iff `a ∈ S*` or `b ∈ R*`, where S and R
are the declared lists). The normal form of a record type is
`a1 ∥ … ∥ an ∥ l1:t1 ∥ … ∥ lk:tk` (Thm 2.3.1.4). Type application `e[r]`
checks `r # R` (Fig. 2). λ∥ cannot express "the function that takes any
record and gives it an l field with value 5" (§1).

- **Q-a.** No. Restriction applies only to fields known to be present, and
  a\l is ill formed for a variable a (§2.2). There is no difference
  operator on variables, and no existential row variables. Instantiation is
  explicit `e[r]`.
- **Q-b.** It claims decidable type checking for λ∥: confluence modulo ≈
  (Thm 2.3.1.1), decidable ≈ (Cor. 2.3.1.3), algorithmic compatibility
  sound and complete (Thm 2.3.2.1), and type synthesis sound and complete
  (Thm 2.3.3.1). Decidability for the extension λ∥ω, which adds recursive
  types, "remains open" (§3). **[INF]** Compatibility of variables is read
  off declared lists, so `a # b` for distinct variables holds only if it was
  declared. There is no derived disjointness and no witness search. The
  split problem's ∃ u v has no counterpart because the programmer supplies
  the instances. A split would have to be written as explicit merges of
  declared variables.
- **Q-c.** Overlap is rejected. "[T]o achieve the effect of overriding, it
  is necessary to restrict on the fields to be overridden before forming the
  merge" (§2.2). Compatibility ignores field types: `l:t # l':t'` iff
  l ≠ l' (§2.2).

R1 §2.3 and §3.1 give a translation of H1's primitives under its encoding.
In H1's own types (R1's rendering): `∥ : ∀α ∀β#α. α → β → (α ∥ β)` and
`.a : ∀α ∀β#a. ({a : α} ∥ β) → α`. R1 states that each of the two systems
types some programs the other cannot (`either`, `reverse`).

## B1: Baader, Boolean unification complexity

**Setting.** E_BA is the equational theory of Boolean algebras (§3). There
are three problem kinds (Def. 2): elementary (only BA symbols), with
constants (extra free constants), and general (extra free function
symbols). Lcr adds a linear order that restricts which constants may occur
in which variables' images (Def. 3).

**Main results.**

- Thm 4(2): "The decision problems for E-unification with constants and
  for the conjunctive AE fragment of E can be reduced to each other in
  linear time". A conjunctive AE sentence is ∀-block, then ∃-block, then a
  conjunction of equations (§2).
- Thm 6: a simple BA-sentence (any prefix, matrix a single `s = 1`) "is
  valid in E_BA" iff it "is valid in the initial model B2". The proof is via
  Horn-sentence preservation under reduced products and Ershov's theorem.
  The note says this need not hold for non-Horn sentences or sentences with
  negation.
- Lemma 5: any conjunction of equations reduces to a single `s = 1`.
- Thm 8: elementary unification is NP-complete; unification with constants
  is **Π₂ᵖ-complete**; lcr and general unification are PSPACE-complete.
- Conclusion: E_BA "is unitary for unification with constants".

**Q-a.** In BA terms, "r outside s" is the term `r ∧ ¬s`. Complement is in
the signature (§3). Labels-as-sets is my reading, not Baader's: he treats
abstract Boolean algebras.

**Q-b.** These are the closest results to the ∀∃ shape. **[INF]** The
split, read on label sets only, is the sentence
`∀ r s t. s ∧ t = 0 ⇒ ∃ u v. u ∨ v = r ∧ u ∧ v = 0 ∧ u ∧ s = 0 ∧ v ∧ t = 0`.
B1's sentences have no hypotheses. The hypothesis `s ∧ t = 0` is itself a
BA equation. Substituting its most general solution (for example
`t ↦ t ∧ ¬s`, a reproductive solution) turns the problem into a
conjunctive AE sentence. B1 then gives decidability (Π₂ᵖ), and Thm 6 says
two-valued (per-label) evaluation suffices. Here the witness is
`u = r ∧ ¬s`, `v = r ∧ s`. Caveats: (i) B1's free constants are
uninterpreted, so concrete labels as atoms of a powerset algebra are not
covered by B1 as stated; (ii) Thm 6 is limited to the simple (positive,
Horn) sentences.

**Q-c.** Not applicable. There are no field types, and only domains are
Boolean.

## Not read (optional item 5)

- Palsberg & Zhao, "Efficient type inference for record concatenation and
  subtyping", LICS 2002. Cited in P3 §1 and §3.3 for an O(n⁵) non-compositional
  algorithm that makes arbitrary choices in "esat-closure".
- Sulzmann, record concatenation as a custom HM(X) instance. Cited in P1
  §5 [27] as using "special-purpose concatenation constraints".
- Pottier, "Simplifying subtyping constraints: a theory", Inf. & Comp.
  170(2), 2001. Cited by P3 [12]. This is the place to look for
  **entailment** results in this family. Not fetched.
- Wand, "Type inference for record concatenation and multiple
  inheritance", LICS 1989. Cited by R1 and H1 for disjunctive constraints.
- A web search for "row difference"/"record subtraction" with ∀∃
  completeness found nothing on point. Hits included Castagna-style
  "Polymorphic Records for Dynamic Languages" and "Towards Algebraic
  Subtyping for Extensible Records", seen only as third-party summaries and
  not read.
