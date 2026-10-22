# R0 refusal audit with bounded evidence (T-R0c)

Design stream T-R0c of the tranche authorized in dossier §18.66, written
2026-10-21 against `67ba706`. **Documents, statements and focused probes
only:** no compiler change, no proof. It audits each record-model refusal
today's checker can produce against research/division-campaign/remedy/
requirements.md §2.3 (classes a, b′, c1, c2, d, e, f) and §2.4 (three
grounds: (1) a rule on original recorded atoms and `D`, proved sound for
`ValidOpen` under ∀rigid/∃flexible; (2) a checked counter-instance, CX;
(3) solver failure; only (1) and (2) justify a semantic rejection).

Labels: **cited** (file:line or section), **checked** (a run recorded in
§7, today's compiler or the bounded oracle), **argued** (reasoning, not
checked), **proposed** (a statement or design choice for the author).
"Checked in the bounded model" means the sig-oracle's bounded semantics
(research/composition-assessment/sig-oracle/README.md, "The bounded
semantics"): a found rigid assignment satisfies `D` and the bounded
flexible search finds no solution of `B` there. It is evidence, not
`decideCall`; every refutation below is also argued by hand, and CX
itself stays unstated in Lean (requirements.md §4.4).

## 0. In brief

- **Every unification-time record refusal is an instance of a rule that
  is sound for its premises** (argued, §3): a ground clash, cancellation
  of a common tail, a label against a closed or rigid-only side, or a
  fact (`lacks`, `disjoint`) that `D` does not supply and that a
  single-label instance refutes (§2). What keeps them out of class c is
  premise status: each reads atoms rewritten by the online substitution
  (§1), so each is **class e by code path**, as requirements.md §2.3
  says. Forcedness of those bindings does not change that (§18.65).
  Every "c1" below is a **c1 candidate**: CX states only the top-level
  C1-H and C1-O (refute/statements.md §5, both expected true, not
  proved); nested, record-field, cancellation and `lacks`/`disjoint`
  rules are unstated (CX Q4; pending author Q10).
- **In every probe of those kinds a counter-instance exists and was
  checked in the bounded model** (17 problems, §7.2). No probe found one
  of them rejecting a valid program. A refuter built on the single-label
  lemma (§2) would turn each into c2 evidence that does not depend on the
  substitution, because the counter-instance is checked against the
  original problem.
- **Three refusals reject valid programs (checked):** H's rigid atom
  (`route`, p11), H's label atom (c01, a written label that either of
  two disjoint rigids may hold), and H on a rigid-plus-unknown merge
  (b03). All three are class d. D4 "Cannot tell" rejects a program whose
  split is **forced** (c21; class e).
- **`shareTails` is principal on every input it can reach** (argued,
  §4): no reachable record row holds both a rigid and an unknown tail,
  so its `rigids` are always empty, and on labels alone the bind rule is
  most general. The non-principal case with flexible field types exists
  in the model (checked in the bounded model, §4) but surfaces in rule
  H, not in `shareTails`. This moves one entry of requirements.md
  §2.3's class d (§6 item 1).
- Resolve-time `lacks` and disjointness refusals on body types are
  semantic, not static (c2 counter-instances checked in the bounded
  model). Resolve runs no CX check, so they belong in generation as
  definedness atoms decided by CX (§6 item 3; pending author Q4). `A
  record literal accepts at most one spread` is proposed as
  Unsupported, pending boundaries §7 Q3 / author Q4 (§6 item 4).

## 1. Where premises come from (cited)

- **Unification walks both sides first** (src/Features/Check/Unify.purs:
  103-106, `unifyAt`, then `unifyHeads` on both walked sides, :140-141),
  so a head clash (`_, _ → mismatch`, :166) compares types resolved
  through every binding made so far. The occurs check runs on the resolved type
  (Binding.purs:115-120).
- **Record rows are flattened through tail bindings** before every
  record step (UnifyRecord.purs:57-69; Disjoint.purs:39-49, 74-87): the
  residue, `homeless` and every row-store test see images under the
  substitution.
- **Row-store facts are original; their tests are not.** `lacks` and
  `apart` facts are recorded from written clauses, instantiated callee
  pairs, implied lacks and fresh rows (Disjoint.purs:131-134;
  Chain.purs:89-104), keyed by metas and passed to a meta's image when
  it is bound (RecordTail.purs:58-71, 101-118). The rows they are tested
  against are flattened images.
- **Shape decisions read the resolved type.** Field selection
  (Record.purs:146-176, `headOf state ty`), record patterns
  (RecordPattern.purs:37-58, "the type expected, under the
  substitution, decides"), the one-spread literal (Overlap.purs:42-61,
  the base's row as resolved).
- **H and D4 run at the end of a body, on the final substitution**
  (RowMerge/End.purs:47-63, 69-80; Function.purs:89), and the
  comparability and printability walks after them (Function.purs:96-97).
- **Resolve-time refusals read only written types and `D`**
  (Resolve/Lacking.purs:126-167; Resolve/Apart.purs:141-158): original
  by construction.

**Which bindings are choices** (argued). Outside H and D4 the online
solver binds only by: a meta to a type (Robinson, most general); a lone
meta to the whole other side, or one bare meta to another
(RowSettle.purs:31-44); `shareTails` (§4); and the `Merge` cases, which
"never guess" (RowMerge/Cases.purs:34). Each is forced by the atoms
it consumes on the inputs it can reach (§4 for `shareTails`). So today's
refusals before the end of a body rest on **forced** bindings. By the
author's added check (§18.65), forced bindings alone do not make a
refusal class c; this audit therefore keeps them in e and offers two
routes to c (§5).

This forcedness argument is the premise CX's C1-E needs
(`ClashAfterEntailedSound`, refute/statements.md §5: a clash after a
substitution entailed by the original body is sound). It is argued
here, not checked, and C1-E's use as the line between original and
chosen atoms is CX Q5 (pending author Q10). Even with C1-E proved,
the argument covers head clashes only; the record refusals of
§3.3-3.5 and §3.9 need their own rules on original atoms.

## 2. The single-label counter-instance lemma (proposed; argued)

**Setting.** `D` is a source signature's hypothesis set: `x lacks L`
atoms (written, or implied by a label written beside `...x` in the
signature) and `x disjoint y` atoms (written, or implied by two tails
written into one record) between rigid row variables; no equations and
no presence atoms. Rigid type variables are unconstrained by `D`.

**Lemma SL (statement, proposed).** Let `R` be a finite set of rigid row
variables, `l` a label and `τ` a closed type such that

1. no `x lacks …` in `D` with `x ∈ R` names `l`; and
2. no `x disjoint y` in `D` has both `x ∈ R` and `y ∈ R` (`x = y`
   included).

Let `θ_{R,l,τ}` map each `x ∈ R` to the one-field row `{ l: τ }`, every
other rigid row variable to `{}`, and every rigid type variable to any
closed type. Then `θ_{R,l,τ}` satisfies `D`, and every rigid row is
**atomic** there: empty, or the single field `l`.

*Argument.* A `lacks` atom on `x ∈ R` names labels other than `l`
(hypothesis 1), and `x` holds only `l`; on `x ∉ R` it holds of `{}`. A
`disjoint` atom with an empty side holds; one with both sides in `R` is
excluded (hypothesis 2). ∎

*Review (88c052d):* the adversarial reviewer found Lemma SL true as
stated. Corollary SL-H below was not separately confirmed.

**Instances.** `R = ∅` (every rigid row empty): `θ_∅`, which satisfies
every source `D`; it refutes any atom that requires a rigid row to
**have** a label. `R = { r }`: refutes `r lacks l`, and with a label
`z` not named in `D`, refutes `r disjoint r` and any atom that forces
`r` to be empty. `R = { r, s }` with a label `z` not named in `D`:
refutes `r disjoint s`. Hypothesis 2 excludes exactly the source
programs where `D` itself would protect the atom (and the class-b′
`r disjoint r`).

**Corollary SL-H (statement, proposed): when H's verdict is evidence.**
H decides whether some unknown can hold an atom, treating a rigid row
as indivisible and choosing one holder per label (Homes.purs:21-34).
At an atomic instance both assumptions are exact. Suppose every
exclusion H used for a refused atom is witnessed by **one** label `l`
and a set `R`: for a label atom, `l` is its label; for a rigid atom
`r`, `r ∈ R` and `l` is fresh unless an exclusion names a label (:32-33
names the label the meta lacks); each rigid partner whose missing
`lacks l` or missing pair excluded a meta is in `R`. Suppose further:

3. at `θ_{R,l}` no **constant** of the other side can take the atom:
   for a label atom, no rigid constant there is in `R`; for a rigid
   atom, `l` is not among the other side's labels and no rigid constant
   there is in `R`.

If `R` meets hypotheses 1 and 2, then `θ_{R,l}` satisfies `D` and the
refused predicate has no solution there, provided the bindings H read
are consequences of the original atoms (argued per case). When
hypothesis 2 fails because `D` declares two members of `R` disjoint,
no such instance exists and the refusal can reject a valid program:
c01 and p11 (§3.7). When hypothesis 3 fails, the atom can be cancelled
against a constant at the instance, which H, cancelling only equal
atoms, does not consider: b03 (§3.7). An exclusion that needs two
different labels is outside the corollary; evidence must then come from
a refuter.

**What it gives CX.** A refusal whose premises satisfy the lemma
produces a candidate `θ`; CX then needs `Sat θ D` (the lemma) and
`decideCall` false on `B` under `θ` (requirements.md §4.4). The second
is a check against the **original** recorded problem, so the
substitution that suggested `θ` is irrelevant to the evidence.

## 3. The refusals

Each entry: site (cited); premises (cited, §1); classification; the
rule's soundness statement (c1, prose) or counter-instance (c2); probes
and runs (checked, §7). Probe files are in
research/division-campaign/r0/probes/; `n…`, `p…` and `c21` are
research/division-campaign/source/examples/, run again here.

### 3.1 Head clash (Unify.purs:166; UnifyParts.purs:52-55)

`Expected X, found Y`. **Premises:** walked types (substituted).
**Class by code path: e.** Per instance:

- **c1 candidate, ground clash between original atoms** (a01:
  `fn f(): Int = true`, `E_TYPE 1:15 Expected Int, found Bool`).
  a01's atom is a top-level clash of base types, the shape CX's C1-H
  (`ClashSound`) states; C1-H is expected true, not proved. *Soundness
  statement for the wider rule (proposed):* if `B` contains `τ ≐ σ`
  whose sides, decomposed argument-wise through equal heads, reach two
  different head constructors (base types, arrow, record, a named type
  of another name or arity), then no flexible assignment satisfies `B`
  at any rigid assignment; since every source `D` is satisfiable
  (`clauseOnly_satisfiable`, cited), `¬ ValidOpen`. The earlier
  justification, "ground types are a free term algebra", does not hold
  for records, which are equal modulo label order and disjoint union;
  a record decomposition step needs its own argument. **n14** (a field
  type `Int` against `Bool` under one rigid tail, `{ a: Bool, ...r } ≐
  { a: Int, ...r }`) is a clash nested in a record: it needs the
  nested-clash rule, which CX does not state (CX Q4; pending author
  Q10). Named types are not in CX's Lean model.
- **c2, a rigid type variable against a head** (a02: `fn f(x: a): Int
  = x`, `E_TYPE 1:19 Expected Int, found a`). Counter-instance
  `a ↦ Bool`, checked in the bounded model. Two rigid type variables:
  `a ↦ Int`, `b ↦ Bool`.
- `TooDeep` (Binding.purs:40-41, 77-81) is a limit: **e**.

### 3.2 Occurs (Binding.purs:115-120; RecordTail.purs:139-145)

`Infinite type: …`. **Premises:** the resolved type. **Class by code
path: e; c1 candidate on original atoms** (a03: `fn(x) => x(x)`,
`E_TYPE 2:22 Infinite type: _ occurs in _ -> _`). *Soundness
statement:* if `B` forces `α ≐ C[α]` with `C` a non-trivial context,
no finite type solves it; model types are finite, so `B` has no
solution at any rigid assignment (argued). a03's atom `t1 ≐ t1 -> t2`
is the top-level type-variable shape CX's C1-O (`OccursSound`) states,
expected true and not proved; "forces" through other atoms, and the
row occurs check, are unstated (CX Q4). A record tail equal to
itself extended (a04, `m ≐ { a: Int, ...m }`) does not reach this check:
the common tail cancels and §3.3 refuses it, `E_TYPE 2:40 Expected
{ ..._ }, found { a: Int, ..._ }`. The effect-row `RowOccurs` is out of
scope (requirements.md §2.3, class a or f).

### 3.3 Record unification: `homeless` (UnifyRecord.purs:72-77; Homeless.purs:12-17)

The records' mismatch, `Expected { … }, found { … }`. **Premises:** both
sides flattened through bindings; common labels unified first, common
tails cancelled. **Class by code path: e.** The rule is sound for its
premises (argued):

- **Cancellation** (c1 candidate; unstated in CX, CX Q4): `X ⊎ M = Y
  ⊎ M` implies `X = Y` for disjoint unions of finite rows, whether `M`
  is rigid or flexible.
- **Residue label `l` against a side with no unknown:** if the other
  side is closed, c1 candidate (it lacks `l` at every instance;
  record-field rule unstated in CX, CX Q4); if it holds rigid tails,
  c2 by `θ_∅`.
- **Residue rigid `r` against a side with no unknown:** c2 by
  `θ_{{r},z}`, `z` not named in `D`.

Probes: a05 (`p: { ...r }` returned as `{ b: Int, ...r }`, `E_TYPE 1:39
Expected { b: Int, ...r }, found { ...r }`; a c1 candidate after
cancellation, and c2 by `θ_∅`, checked); a04 (c1 candidate, row occurs
by cancellation, unstated in CX; invalid with no rigid variable,
checked). The rules in this list are pending author Q10. A label twice
on one side
(UnifyRecord.purs:113-119) is said to be unreachable (cited, not
probed).

### 3.4 Bind and pair refusals: `Refused` and `Disjoint`

Sites: RecordTail.purs:58-71 (bind rule), Refused.purs:23-32,
Disjoint.purs:74-87 (`requireLack`), 102-109 (`tailPair`), 39-49
(`requireDisjoint`); texts Lacked.purs:32-47. **Premises:** original
facts (§1) tested against flattened images. **Class by code path: e.**
Per kind, the rule and the evidence:

| Refusal | Text | Rule (argued) | Probe | Evidence |
|---|---|---|---|---|
| `Forbidden` (D1) | `a is not allowed here: r lacks { a }` | a written lack against a label the row holds: a c1 candidate only when restated over original atoms (e.g. via a C1-E-style entailment) and proved; forcedness alone is insufficient | n10 | no rigid at the use; checked in the bounded model with `θ = {}` |
| `Overlap` (D2) | `Field x is in both records: r disjoint s` | a label on both sides of a pair: a c1 candidate only when restated over original atoms and proved; forcedness alone is insufficient (b01 reaches the label only through equations) | b01 | checked, `θ = {}` |
| `MayHold` (D3″) | `r may already have field b` | a rigid must lack `l`, `D` does not say so | b02, b04 | c2 by `θ_{{r},b}`, checked |
| `Unproven` (D3) | `u and v are not known to be disjoint; …` | two rigids must be disjoint, `D` does not say so | n06 | c2 by `θ_{{u,v},z}`, checked |
| `Twice` (D3′) | `t is in both records and may have fields` | a rigid apart from itself | n05 | c2 by `θ_{{t},z}`, checked |

b02 is `ext(p, { b: 1 })` with `ext`'s `s disjoint t` and `p: { ...r }`:
`E_TYPE 4:35 r may already have field b`. b04 reaches `MayHold` after
`shareTails` (§4): `s may already have field b`, where `b` came to `x`
only through `if … then x else y`. The `lacks`/`disjoint` rules of
this table are unstated in CX (CX Q4; pending author Q10).

### 3.5 The one-spread literal (Overlap.purs:42-61, 65-75, 100-110)

**Premises:** the base's row as resolved. **Class by code path: e.**

- `Duplicate field a` (E_DUPLICATE), a label the base's row already
  holds: c1 candidate (`base ⊎ { a }` needs the base to lack `a`;
  a definedness rule unstated in CX, CX Q4, pending author Q10) when
  the holding is original, as in d01 (`p: { a: Int, ...r }`,
  `{ ...p, a: 2 }`, `E_DUPLICATE 1:42`; checked).
- `r may already have field reviewed`, a rigid tail not known to lack
  the label (n03): c2 by `θ_{{r},reviewed}`, checked.

### 3.6 Field selection (Record.purs:139-176)

`name is not a field of { ...r }` (n02) and `Expected a record, found
a` (n11). **Premises:** the resolved head (`headOf state ty`). **Class
by code path: e.** n02: c2 by `θ_∅` (checked). n11: c2 by `a ↦ Int`
(argued; the shape of sig-oracle challenge `rec-sig`, cited). A
receiver of several tails reports a placeholder (Record.purs:160-161):
e.

### 3.7 Rule H (RowMerge/End.purs:47-63, 69-80; Homes.purs:21-34)

D6, rendered by Contradicted.purs: `… must be { ...r }, but neither u
nor v can hold r`, `… but neither u nor v can have field x`, `… so s
cannot hold r`. **Premises:** the final substitution, cancelled against
each waiting predicate. **Class: d** (requirements.md §2.3, confirmed).
H's exclusions, separated (argued):

| Homes.purs | Exclusion | Sound alone? |
|---|---|---|
| :29 | label `l`, the meta lacks `l` | yes, a fact |
| :30 | label `l`, a rigid partner of the meta not known to lack `l` | only if one instance makes every such partner hold `l` (Corollary SL-H) |
| :31 | rigid `r`, the meta apart from `r` | yes when every holder is so excluded: `θ_{{r},z}` |
| :32-33 | rigid `r`, the meta lacks a label `r` is not known to lack | assumes `r` indivisible |
| :34 | rigid `r`, a rigid partner of the meta not known apart from `r` | assumes `r` indivisible |

Valid programs it rejects (checked: today's run refuses, the bounded
oracle finds the translated problem valid):

- **p11 `route`** (rigid atom, :34): `E_TYPE 7:10 divide's { ...u, ...v
  } must be { ...r }, but neither u nor v can hold r`; oracle valid
  (225 rigid assignments). The model splits `r` by membership in `s`.
- **c01** (label atom, :30): `route(y: { ...s }, z: { ...t })` with
  `s disjoint t` calls `divide({ x: 1 }, y, z)`: `E_TYPE 7:10 divide's
  { ...u, ...v } must be { x: Int }, but neither u nor v can have field
  x`; oracle valid (125). `x` goes to `u` where `s` lacks it, to `v`
  otherwise: a written-label split (G1).
- **b03** (a rigid beside an unknown, against a label): `ext(p, y).b`
  inside a lambda, `p: { ...r }`: `E_TYPE 5:20 ext's { ...s, ...t }
  must be { b: _, ..._ }, so s cannot hold r`; oracle valid (9 under
  small bounds, 27 under the default ones). `y`'s row takes `b` exactly
  where `r` lacks it, and `b`'s flexible type follows `r`'s. Reading of
  the refusal (argued): the atom is `r`; the selection's fresh tail
  lacks `b`, so :32-33 excludes it; Corollary SL-H's hypothesis 3 fails,
  since at `r ↦ { b: τ }` the atom cancels against the constant `b`.

Refusals where a counter-instance exists (checked): **n04** (`route`
without `s disjoint t`), `θ: r, s, t ↦ { z1: Int }`, the Corollary SL-H
instance; **n09** (both parts lack `admin`, :29 only), `θ = {}`. So H's
verdict is sometimes right, but the rule is not sound; its refusal can
never be the ground for Contradiction, and a refuter must supply the
evidence separately.

### 3.8 D4, "Cannot tell" (Unresolved.purs:74; EndReport)

**Class: e** (requirements.md §2.3). Valid programs it rejects
(checked): **c21**, `acceptsParts(p: { ...r, ...s }) where s lacks {
admin }` called with `{ admin: false }`, `E_TYPE 6:16 Cannot tell how
acceptsParts's r and s split { admin: Bool }; …`. The oracle finds it
valid, and the split is **forced** (`s` lacks `admin` and nothing else
is left), so D4 refuses even when no choice exists (argued). Also f03
(§3.10).

### 3.9 Record patterns (RecordPattern.purs:37-125; PatternRow.purs:49-75)

**Premises:** "the type expected, under the substitution, decides"
(RecordPattern.purs:38-41). **Class by code path: e.** Per kind:

- `b is not a field of { a: Int, ...r }` (e01, pattern `{ b, ... }`):
  a rigid tail never supplies a field; c2 by `θ_∅`, checked.
- `Pattern is missing the rest of { a: Int, ...r }` (n07, a closed
  pattern): c2 by `θ_{{r},z1}`, checked.
- `Pattern is missing field b` (e03): c1 candidate on closed known
  rows (record-field rule unstated in CX, CX Q4; pending author Q10).
- **Arm order** (requirements.md §2.3, class f). e02 and e03 are one
  match with its two arms swapped (`{ a }` and `{ a, b, ... }` on a
  lambda's parameter). Both are refused, with different texts: e02
  `E_TYPE 4:10 b is not a field of { a: _ }`, e03 `E_TYPE 4:5 Pattern
  is missing field b; …`. The translated problem is invalid with no
  rigid variable (checked), so both are c1 candidates (no rigid
  variable, so `θ = {}` is also a counter-instance; the rule itself is
  unstated in CX). **Evidence that arm order
  changes the text, not the verdict, for this pair**; the general claim
  stays f. Growth by a hole tail binds the most general record holding
  the written labels (argued; RecordPattern.purs:62-64 says so).

### 3.10 Comparability (Comparable.purs:70-80)

Judged on the settled body (Function.purs:96). **The requirement atoms
`BQ` have no `ValidOpenR` yet** (requirements.md §11 item 2), so every
c below is conditional on it.

- `Type { ...r } is not comparable` (f01, `p == p` on `{ ...r }`): c2
  conditional, `θ: r ↦ { f: Int -> Int }` (argued; the oracle has no
  comparability atom).
- `Ambiguous type _ in comparison` (f02, `fn(x) => x == x`, never
  called): the problem is valid with `x ↦ Int` (argued). Not a semantic
  refusal: **e** (Unresolved) unless boundaries §7 Q5 makes it a P
  policy (pending author Q4). The two differ in text and code: e is an
  Unresolved verdict, P a refusal of a valid problem.
- "Judged on an unforced settled type" (requirements.md §2.3, class
  d): **not reached today.** f03 compares `left(w)` with a function in
  `w`; D4 refuses first, `E_TYPE 5:8 Cannot tell whether left's u or v
  has field a; …`, because the online solver never settles an unforced
  split (argued; checked for f03).

### 3.11 Printability (Printable.purs:54-57; Specialize/Printable.purs:113)

- At check, on a ground type: f04, `show(fn(n: Int) => n)`, `E_TYPE
  1:24 Expected a printable value, found Int -> Int`. c1 candidate,
  conditional on `ValidOpenR` (or on a ground definitional rule for
  `BQ`, pending author Q2): a type holding a function is not printable
  (a definition), on an original atom. CX states no `BQ` rule.
- At a specialization key: f05, `shown(p: { ...r }) = show(p)` called
  with `{ f: fn … }`, **refused at specialize**, `E_TYPE 1:36 Expected
  a printable value, found { f: Int -> Int }`. The key is forced by
  `main`'s call; the refusal judges `main`'s problem at that key. It is
  a semantic refusal outside the checker's verdicts (no Contradiction
  carries it); its class waits on `ValidOpenR` for `BQ`: **f**.

### 3.12 Resolve-time refusals (original by construction)

- `r may already have field a` on a body type (d02, a lambda parameter
  written `{ a: Int, ...r }`; Lacking.purs:126-167): refused at
  **resolve**, `E_TYPE 2:19`. c2 by `θ_{{r},a}`, checked: the written
  type is ill formed there.
- `r and s are not known to be disjoint; require r disjoint s in the
  signature` on a body type (n16; Apart.purs:141-158): resolve, c2 by
  `θ_{{r,s},z}`, checked.
- `A disjoint constraint must name two different row variables` (d03,
  `where r disjoint r`; Requirements.purs:72): **b′**. `...r` twice
  through a declared type (Apart.purs:82-91): b′ (cited, not probed).
- `A record literal accepts at most one spread` (n01): not a rule of
  `ValidOpen`; **proposed: Unsupported (a support boundary), pending
  boundaries §7 Q3 / author Q4** (§6 item 4).

The two body-type refusals above are c2 only as evidence: their
counter-instances were checked in the bounded model, but Resolve runs
no CX check, so today's refusal is not itself the c2 ground. Under R0
they belong in generation as the annotation's definedness atoms
(recorder-rules E13, `eq σ_k σ_k`), decided by CX like any other atom
(pending author Q4).

### 3.13 Limits, defects and placeholders

`TooDeep`, `Exhausted`, `Unexpected` and `Placeholder`
(UnifyFailure.purs:45-60; RowMerge/End.purs:107-113) are **e**: limits, broken
invariants, or work a later task does (cited). The several-tail
placeholder at specialization is W3 (requirements.md §2.3). Effect-row
refusals are outside this audit.

## 4. `shareTails` and principality (argued; bounded checks)

**The rule** (RecordTail.purs:120-131): two distinct unbound meta tails,
one per side, each with constants; each meta gets the other side's
fields and rigid tails beside one fresh remainder `ρ`, which lacks both
sides' labels and what either meta lacked. Called from RowSettle.purs:
47-55 when both residue sides are one meta plus constants.

**Statement P1 (proposed).** Let the residue be `F₁ ⊎ m₁ ≐ F₂ ⊎ m₂`
with `F₁`, `F₂` labelled fields only, `dom F₁ ∩ dom F₂ = ∅` (common
labels were unified field-wise first, UnifyRecord.purs:57-69) and
`m₁ ≠ m₂` flexible. Every solution `σ` satisfies `σ(m₁) = σ(F₂) ⊎ R`
and `σ(m₂) = σ(F₁) ⊎ R` with `R = σ(m₁) ∖ dom F₂`. So the binding
`m₁ := F₂ ⊎ ρ`, `m₂ := F₁ ⊎ ρ` is most general, **whatever the field
types**: each field keeps its own type, flexible or not. *Argument:* a
label of `F₂` is not in `F₁`, so `σ(m₁)` holds it with that field's
type; symmetrically for `F₁`; the rest of each side is the same row
`R`. The lacks it adds to `ρ` and the pairs it moves to the images
(RecordTail.purs:73-94) are consequences of the same atoms. *Review
(88c052d):* the adversarial reviewer found P1 correct.

**Statement P2 (proposed).** If a side's constants include a rigid tail
`r`, `F₁ ⊎ m₁ ≐ F₂ ⊎ r ⊎ m₂`, the bind rule is **not** most general in
the divisible model: at instances where `r` holds a label `b ∈ dom F₁`,
`b` can come from `r`, with `m₁` lacking it, when `b`'s field type can
equal `r`'s. The rule instead makes `r` lack `b` (a `requireLack` on a
rigid rest, RecordTail.purs:108-118), refusing with `r may already have
field b` unless `D` says so. Checked in the bounded model: with `D = r
lacks a` and `B = { b: β, ...m₁ } ≐ { a: Int, ...r, ...m₂ }` the
problem is **valid** (`share-rigid-flex`, β flexible), so that refusal
would reject a valid problem (class d); with `b: Int` fixed it is
**invalid** at `r ↦ { b: Bool }` (`share-rigid-fixed`), so there the
refusal coincides with a counter-instance (c2). The labels-only case is
valid (`share-labels`). *Review (88c052d):* the reviewer confirmed
`share-rigid-flex` valid and `share-rigid-fixed` invalid at `r ↦ { b:
Bool }`, as stated.

**Statement P3 (proposed): P2's case is unreachable today.** No record
row the checker builds holds both a rigid tail and an unknown one, so
`Share.rigids` is always empty. *Argument, by induction over the sites
that make rows:* rows written in a body name only the signature's
rigids; instantiated signatures and fresh rows (selection, patterns,
lambda parameters, the one-spread literal over an unknown base) hold
unknowns only; a row with two or more unknowns is desugared into one
fresh tail (Chain.purs:36-62), keeping its rigid tails only when the
written row had both, which the first two cases exclude; the `Merge`
cases build `L ⊎ R` only when `L` is closed or neither part has an
unknown, `t` minus `R`, or `L`'s fields beside a fresh tail
(Cases.purs:70-90); and each bind image takes one residue side's tails,
which are homogeneous by the hypothesis. Not checked: the code has a
path for rigid tails in desugared rows (Chain.purs:89-104), so an
instrumented run is the natural check before relying on P3. *Review
(88c052d):* P3 is argued only. The case the reviewer names for the
instrumentation is a row built by instantiation, such as `ext(p, y)`
returning `{ ...s, ...t }` with `s` bound to `r`: it must be shown
always desugared to one fresh tail before any binding reads it.

**Answer to requirements.md §2.3's class-f question** (argued, given P1
and P3): `shareTails` is principal on every input it can reach, so the
`lacks`/`disjoint` refusals that follow it rest on forced bindings.
Forced bindings do not make them class c (§18.65; §1). In b04 the
refusal coincides with a counter-instance (checked); that is one
probe, not a general claim. The flexible-field-type
choice P2 describes does arise from source, but rule H meets it at the
end of the body (b03, class d), not `shareTails`.

## 5. Routes to class c for the class-e refusals (proposed)

1. **Restate on original atoms.** For each rule in §3.1-3.6 and §3.9,
   state it over the recorded problem and prove it sound for
   `ValidOpen`: then generate-then-decide (§18.66 decision 1) can apply
   it to the complete problem. Candidates are listed per entry; none is
   proved, and only the top-level C1-H and C1-O are stated in CX (the
   rest is CX Q4; pending author Q10).
2. **Refuter from Lemma SL.** Use the refusal only to propose `θ` (the
   lemma's instance from the atom and the facts it named), then check
   `Sat θ D` and `decideCall` false on the original `B`. This needs CX
   (T-R0d) and no soundness proof per rule; a refusal whose `θ` fails
   the check stays Unresolved. It covers every c2 row of §7.2 except
   comparability and printability, which wait on `ValidOpenR`.

Either route keeps H, D4 and Ambiguous out of Contradiction: H is d
(§3.7), D4 is e, and Ambiguous is e unless boundaries §7 Q5 makes it a
P policy (pending author Q4; neither is a Contradiction).

## 6. Points that contradict or refine requirements.md §2

1. **Class d, "`lacks`/`disjoint` failures after `shareTails` with
   flexible field types":** not reachable through `shareTails` (P3,
   argued); the same non-principal choice is reached and refused by H
   (b03, checked). Proposed: move the example to H's row and close the
   class-f question on `shareTails` principality once P3 is checked.
   "A `lacks` refusal after `shareTails`" stays a valid **class-e**
   fixture (b04); the class-d fixture is b03 (H). Fixture lists that
   cite the old entry (generation-interface AT1, recorder-rules §9
   item 2) should name b04 and b03 explicitly.
2. **Class d, "printability/comparability judged on an unforced settled
   type":** not reached today; D4 refuses first (f03). The live cases
   are Ambiguous (valid, refused: e unless a P policy, §3.10) and
   printability at a specialization key (f, waiting on `ValidOpenR`).
3. **Class a lists "Resolve/*":** the body-type `lacks` and disjointness
   refusals at resolve (d02, n16) are semantic: each has a
   counter-instance checked in the bounded model, so the label "static
   rule" is inaccurate. They cannot stop generation as c2 refusals,
   because c2 needs a CX check that resolve does not run. Proposed:
   carry them into generation as recorder-rules E13 definedness atoms
   and let CX decide them (pending author Q4); a program-wide Resolve
   stop would also hide every other declaration.
4. **`A record literal accepts at most one spread`** (n01) is a
   resolve-time refusal reported as E_TYPE; docs/language.md states it
   as a language rule. **Proposed: Unsupported (a support boundary),
   pending boundaries §7 Q3 / author Q4.** If the author agrees,
   T-R0e's support boundaries should name it.
5. **D4 refuses forced splits** (c21, checked valid): stronger than
   "solver incompleteness" in the usual sense, worth stating in T-R0a's
   reason ADT.
6. **H is not uniformly unsound:** its :29 exclusion and the "every
   holder apart from `r`" case are sound (§3.7); n04 and n09 are
   refused correctly. The class stays d because the rule as a whole is
   not.

Nothing found contradicts the three grounds of §2.4 or decision 1.

## 7. Run record

### 7.1 Compiler probes (checked, 2026-10-21)

Setup: `src`, `scripts`, `package.json`, `spago.yaml`, `spago.lock`,
`output/` and `.spago/` copied from /Users/ethan/Desktop/waxwing (its
`src`, `scripts`, `package.json`, `spago.yaml` and `spago.lock` equal
`67ba706` by `diff -rq`; `output/` was copied, not rebuilt, so its
agreement with `src` is assumed) to a session scratch directory, with
`GOCACHE`, `GOPATH`, `GOMODCACHE`, `GOTMPDIR` inside it and
`GOPROXY=off`; the copy was deleted afterwards. For each file:
`node scripts/waxwing.mjs run <file>` (exit status, wire diagnostic),
and a phase harness that
runs `Format.Parse.parse`, `Features.Resolve.resolve`,
`Features.Check.check` and `Features.Specialize.specialize` in order,
as research/division-campaign/source/run.mjs does, printing the first
refusing phase. Every run below exited **1** with the diagnostic shown;
the harness's phase and position agreed with it.

| Probe | Phase | Diagnostic |
|---|---|---|
| a01-clash-ground | check | `E_TYPE 1:15 Expected Int, found Bool` |
| a02-clash-rigid | check | `E_TYPE 1:19 Expected Int, found a` |
| a03-occurs-type | check | `E_TYPE 2:22 Infinite type: _ occurs in _ -> _` |
| a04-occurs-row | check | `E_TYPE 2:40 Expected { ..._ }, found { a: Int, ..._ }` |
| a05-record-homeless | check | `E_TYPE 1:39 Expected { b: Int, ...r }, found { ...r }` |
| b01-overlap-pair | check | `E_TYPE 5:8 Field x is in both records: r disjoint s` (notes: first written here 5:5; required here 1:43) |
| b02-mayhold-forced | check | `E_TYPE 4:35 r may already have field b` (notes: r is introduced here 4:13; required here 1:56) |
| b03-mayhold-share | check | `E_TYPE 5:20 ext's { ...s, ...t } must be { b: _, ..._ }, so s cannot hold r` |
| b04-share-meta-only | check | `E_TYPE 8:10 s may already have field b` |
| c01-h-label | check | `E_TYPE 7:10 divide's { ...u, ...v } must be { x: Int }, but neither u nor v can have field x` |
| d01-extend-duplicate | check | `E_DUPLICATE 1:42 Duplicate field a` (note: first written here 1:36) |
| d02-body-type-lacking | resolve | `E_TYPE 2:19 r may already have field a` (note: r is introduced here 1:11) |
| d03-same-disjoint | resolve | `E_TYPE 1:41 A disjoint constraint must name two different row variables` |
| e01-pattern-rigid-field | check | `E_TYPE 2:5 b is not a field of { a: Int, ...r }` |
| e02-pattern-order-ab | check | `E_TYPE 4:10 b is not a field of { a: _ }` |
| e03-pattern-order-ba | check | `E_TYPE 4:5 Pattern is missing field b; add it or end the pattern with ...` |
| f01-compare-rigid | check | `E_TYPE 1:30 Type { ...r } is not comparable` |
| f02-compare-ambiguous | check | `E_TYPE 2:20 Ambiguous type _ in comparison` |
| f03-compare-split | check | `E_TYPE 5:8 Cannot tell whether left's u or v has field a; no annotation can decide u and v, which belong to this call of left` (note: u and v are written here 1:16) |
| f04-print-ground | check | `E_TYPE 1:24 Expected a printable value, found Int -> Int` |
| f05-print-key | specialize | `E_TYPE 1:36 Expected a printable value, found { f: Int -> Int }` |
| n01-undeclared-merge | resolve | `E_TYPE 2:19 A record literal accepts at most one spread` |
| n02-missing-field | check | `E_TYPE 1:31 name is not a field of { ...r }` |
| n03-extend-unlacked | check | `E_TYPE 1:37 r may already have field reviewed` |
| n04-route-unclaused | check | `E_TYPE 6:10 divide's { ...u, ...v } must be { ...r }, but neither u nor v can hold r` |
| n05-pass-twice | check | `E_TYPE 3:31 t is in both records and may have fields` |
| n06-wrapper-no-fact | check | `E_TYPE 3:44 u and v are not known to be disjoint; require u disjoint v in the signature` |
| n07-closed-pattern-rigid | check | `E_TYPE 2:3 Pattern is missing the rest of { a: Int, ...r }; end the pattern with ...` |
| n09-accepts-parts-both-lack | check | `E_TYPE 6:3 acceptsParts's { ...r, ...s } must be { admin: Bool }, but neither r nor s can have field admin` |
| n10-both-call-has-a | check | `E_TYPE 7:23 a is not allowed here: r lacks { a }` |
| n11-tyvar-not-record | check | `E_TYPE 1:22 Expected a record, found a` |
| n14-retype | check | `E_TYPE 1:53 Expected { a: Bool, ...r }, found { a: Int, ...r }` |
| n16-body-type-two-tails | resolve | `E_TYPE 2:25 r and s are not known to be disjoint; require r disjoint s in the signature` |
| p11-route | check | `E_TYPE 7:10 divide's { ...u, ...v } must be { ...r }, but neither u nor v can hold r` |
| c21-accepts-parts | check | `E_TYPE 6:16 Cannot tell how acceptsParts's r and s split { admin: Bool }; no annotation can decide r and s, which belong to this call of acceptsParts` |

b04 was first run without `where s lacks { a }`; it then reported `s
may already have field a` at 8:10 (the label `x.a` gives directly), and
the clause was added so that the reported label is the one `shareTails`
brings.

### 7.2 Bounded oracle (checked in the bounded model, 2026-10-21)

research/composition-assessment/sig-oracle copied to scratch; a script
there called `boundedValid` on each hand translation below and, for a
stated counter-instance, `sat` on `D` and `hasSolution` on `B` at it.
Rigid rows are numbered from 0, flexible rows from 3; `t1`, `t2` are
flexible type variables; `t0` a rigid one. Default bounds are the
README's; **small** bounds use one unwritten label and flexible field
types `Int`, `Bool` (to keep three flexible rows tractable).

| Problem (probe) | D | B | Bounds | Verdict; counter-instance |
|---|---|---|---|---|
| a01 | — | `Int ≐ Bool` | default | invalid; `{}` |
| a02 | — | `t0 ≐ Int` | default | invalid; `t0 ↦ Bool` |
| a03 | — | `t1 ≐ t1 -> t2` | default | invalid; `{}` |
| a04 | — | `3 lacks a`, `{ ...3 } ≐ { a: Int, ...3 }` | default | invalid; `{}` |
| a05 | `0 lacks b` | `{ ...0 } ≐ { b: Int, ...0 }` | default | invalid; `0 ↦ {}` |
| b01 | — | `{ ...3 } ≐ { x: Int }`, `{ ...4 } ≐ { x: Int }`, `3 # 4` | default | invalid; `{}` |
| b02 | — | `{ ...3 } ≐ { ...0 }`, `{ ...4 } ≐ { b: Int }`, `3 # 4` | default | invalid; `0 ↦ { b: Int }` |
| b03 | — | `0 # 3`, `{ ...0, ...3 } ≐ { b: t1, ...4 }` | small; default | **valid** (9; 27) |
| b04 | `0 lacks a` | `{ ...3 } ≐ { a: t1, ...4 }`, `{ ...3 } ≐ { b: t2, ...5 }`, `3 # 0` | small | invalid; `0 ↦ { b: Int }` |
| c01 | `0 # 1` | `{ x: Int } ≐ { ...3, ...4 }`, `3 # 0`, `4 # 1` | default | **valid** (125) |
| c21 | — | `4 lacks admin`, `{ ...3, ...4 } ≐ { admin: Bool }` | default | **valid** (1) |
| d01 | `0 lacks a` | `{ ...3 } ≐ { a: Int, ...0 }`, `3 lacks a` | default | invalid; `0 ↦ {}` |
| d02 | — | `0 lacks a` | default | invalid; `0 ↦ { a: Int }` |
| e01 | `0 lacks a` | `{ a: Int, ...0 } ≐ { b: t1, ...3 }` | default | invalid; `0 ↦ {}` |
| e02, e03 | — | `{ ...3 } ≐ { a: t1 }`, `{ ...3 } ≐ { a: t1, b: t2, ...4 }` | small | invalid; `{}` |
| n02 | — | `{ ...0 } ≐ { name: t1, ...3 }` | default | invalid; `0 ↦ {}` |
| n03 | — | `0 lacks reviewed` | default | invalid; `0 ↦ { reviewed: Int }` |
| n04 | — | `{ ...0 } ≐ { ...3, ...4 }`, `3 # 1`, `4 # 2` | default | invalid; `0, 1, 2 ↦ { z1: Int }` |
| p11 | `1 # 2` | as n04 | default | **valid** (225) |
| n05 | — | `{ ...3 } ≐ { ...0 }`, `{ ...4 } ≐ { ...0 }`, `3 # 4` | default | invalid; `0 ↦ { z1: Int }` |
| n06 | — | `{ ...3 } ≐ { ...0 }`, `{ ...4 } ≐ { ...1 }`, `3 # 4` | default | invalid; `0, 1 ↦ { z1: Int }` |
| n07 | `0 lacks a` | `{ a: Int, ...0 } ≐ { a: t1 }` | default | invalid; `0 ↦ { z1: Int }` |
| n09 | — | `3 lacks admin`, `4 lacks admin`, `{ ...3, ...4 } ≐ { admin: Bool }` | default | invalid; `{}` |
| n10 | — | `3 lacks a`, `{ ...3 } ≐ { a: Int, name: Int }` | small | invalid; `{}` |
| n16 | — | `0 # 1` | default | invalid; `0, 1 ↦ { z1: Int }` |
| share-rigid-flex (§4) | `0 lacks a` | `{ b: t1, ...3 } ≐ { a: Int, ...0, ...4 }` | small | **valid** (9) |
| share-rigid-fixed (§4) | `0 lacks a` | `{ b: Int, ...3 } ≐ { a: Int, ...0, ...4 }` | small | invalid; `0 ↦ { b: Bool }` |
| share-labels (§4) | — | `{ b: t1, ...3 } ≐ { a: t2, ...4 }` | small | **valid** (1) |

Each stated counter-instance above also passed the direct check: `D`
holds and the bounded flexible search fails at it. Where the oracle's
own first witness differed (it may pick `z2` for `z1`, or `b` for `a` in
b04), both were refuting. Translations are by hand and keep only the
atoms the refusal needs (a selection's result type, for instance, is
dropped); n10's `Text` field is `Int`. Comparability and printability
have no oracle atom and were not run.

**Dropped atoms and the verdicts (argued; reviewed).** Dropping atoms
can only add solutions. For an **invalid** verdict that is harmless: a
counter-instance of a sub-body refutes the whole body (C1-M; the
whole-problem form is the CX-P statement the reconciliation review
proposes for CX). For a **valid** verdict it is not sound in general,
so each valid entry is justified here. The adversarial reviewer
re-derived b03 and c01 (and b04, invalid) from the probe sources and
found the dropped atoms to be defining equations or definedness-
implied; c21 and p11 are argued the same way from their sources.

- **b03.** Dropped: the instantiation of `ext`'s `s` to `p`'s `r` (a
  defining equation; the translation writes `0` for it); `t` against
  `y`'s parameter type, and the lambda's and `f`'s types (defining
  equations of variables no other atom constrains); the selection's
  result type (defining `t1`); `{ b: t1, ...4 }`'s `4 lacks b`
  (definedness-implied by the kept equation); the body's `0` against
  `Int` (trivially true). `ext`'s `s disjoint t` is kept, as `0 # 3`.
- **c01.** Dropped: `divide`'s `s`, `t` instantiated to `route`'s `s`,
  `t` (defining equations, substituted into the kept `3 # 0`, `4 #
  1`); `3 # 4` from `{ ...u, ...v }` (definedness-implied by the kept
  `{ x: Int } ≐ { ...3, ...4 }`); the literal's `1` against `Int` and
  the result `Int` against `Int` (trivially true).
- **c21.** Dropped: `3 # 4` from `{ ...r, ...s }` (definedness-implied
  by the kept equation); `false` against `Bool` and the result `Bool`
  against `Bool` (trivially true).
- **p11.** Dropped: `divide`'s `s`, `t` instantiated to `route`'s `s`,
  `t` and `x`'s row to `0` (defining equations, substituted into the
  kept atoms); `3 # 4` (definedness-implied); the result `Int` against
  `Int` (trivially true).

The reviewer did not re-derive c21 and p11 under this heading
(c21 is listed among its re-checked verdicts); their lists are this
document's reading of the sources.

## 8. Open items

- Check P3 (an instrumented run, or a proof over the row-making sites)
  before closing the `shareTails` question; the run must cover rows
  built by instantiation (§4, the reviewer's `ext(p, y)` case).
- Lemma SL was found true as stated by review; Corollary SL-H is still
  a statement for review. The refutation half needs CX's `decideCall`
  and substitution lemma.
- `ValidOpenR` for `BQ` (or a ground definitional rule) decides
  §3.10-3.11 (pending author Q2).
- The arm-order claim is checked for one pair only.
- Every c1 candidate waits on CX stating its rule (CX Q4, Q5; pending
  author Q10).
- The second spread (§3.12, §6 item 4), the resolve-time body-type
  checks (§6 item 3) and Ambiguous (§3.10) wait on author Q4.

## Revision log (reviews of 88c052d)

Two read-only reviews of the tranche at 88c052d: the interface
reconciliation (findings A1-I2, author questions Q1-Q10) and the
adversarial soundness review (findings 1-9). "Author Q<n>" below and
above means the reconciliation's Q<n>.

**Applied.**

- Reconciliation A6: §3.12 and §6 item 4 now say "proposed:
  Unsupported, pending boundaries §7 Q3 / author Q4"; §0 likewise.
- Reconciliation F4: every c1 entry not stated in CX is relabelled a
  c1 candidate (§0, §3.1, §3.2, §3.3, §3.4, §3.5, §3.9, §5); a01 and
  a03 are placed under C1-H and C1-O (stated, not proved); n14 moves
  to "needs nested clash"; the free-term-algebra argument is withdrawn
  for records.
- Reconciliation F5: §1 says its forcedness argument is the premise
  CX's C1-E needs, and that it covers head clashes only.
- Reconciliation G1 with adversarial 9(e): the body-type resolve
  checks stay c2 as evidence; §3.12 and §6 item 3 now say resolve
  cannot stop generation on c2 without a CX check, and propose
  carrying them into generation as E13 definedness atoms.
- Reconciliation G2: Ambiguous is e unless boundaries §7 Q5 makes it a
  P policy (§3.10, §5, §6 item 2).
- Reconciliation G4: §6 item 1 keeps b04 as the class-e fixture and
  names b03 as the class-d one.
- Adversarial 7: the `Forbidden`/`Overlap` rule column now says "a c1
  candidate only when restated over original atoms and proved;
  forcedness alone is insufficient"; §4's claim is limited to b04.
- Adversarial 9(f): §7.2 lists, per valid entry (b03, c01, c21, p11),
  the dropped atoms and why each is a defining equation,
  definedness-implied or trivially true.
- Reviewer confirmations recorded: Lemma SL true as stated (§2); P1
  correct and P2's two problems as stated (§4); P3 argued only, with
  the instantiation case to instrument (§4, §8).

**Pending.**

- Author Q4: the second spread, the resolve-time body-type checks and
  Ambiguous.
- Author Q10 (CX Q4, Q5): stating the nested-clash, record-field,
  cancellation, row-occurs and `lacks`/`disjoint` rules, and C1-E as
  the line for c1.
- Author Q2: `BQ` before `ValidOpenR` (f04's ground rule, §3.10-3.11).
- P3's instrumented run (no new probes in this revision).
- c21's and p11's dropped-atom lists are this document's reading; the
  reviewer re-derived b03, c01 and b04 only.
- The whole-problem refutation of a sub-body (CX-P, reconciliation F3)
  is cited as proposed; CX owns it.

**Disagreements.** None. One scope note: reconciliation A6 also
suggests that boundaries and recorder-rules change how the second
spread is recorded; those edits belong to their documents and are not
made here.
