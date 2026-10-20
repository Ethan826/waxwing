# Open-row merge: rendering D4 and D6 (R005 Tranche B)

Status:
Approved 2026-10-17 with corrections; no implementation authorized

**Partly superseded** (the user, 2026-10-19, adopting QT-strict + Sym +
H): D4 and D6 keep their meaning (§0) and approved forms; the parts
tied to the custom solver (homes and forced moves in §1, R10.2, R10.3,
"quiet equations are never D4") are listed, with what replaces them,
in docs/plans/2026-10-19-row-merge-implementation-plan.md §1;
text changes await the user's review of that plan.

The user authorized (2026-10-17) pinning the rendering of D4 and D6,
the two diagnostics that draft 3 of the algorithm
(docs/plans/2026-10-16-open-row-merge-design.md, §10 and the to-do list
of §10.2) left Proposed. This file is that pinning: general forms,
rendering rules, and numbered examples, each with complete source, the
exact text, the primary location, the notes, and a source edit that
resolves it. Nothing here changes the algorithm; where an example shows
that a rendering needs something draft 3 does not record, it is listed
as a decision (§10), not adopted.

The user reviewed this file on 2026-10-17 and approved it with the
corrections recorded in §0; the body below has been corrected
accordingly. The Approved texts it reuses are user decision 7's: D2, D3
with the hint `require r disjoint s in the signature`, D3', D8, and D9
`A disjoint constraint must name two different row variables`.

## 0. The user's review (2026-10-17)

**The meaning of D4 and D6 (correction).** D4 means that the checker
could not resolve the constraints: it has established neither a
solution nor a contradiction. It does not mean that several solutions
exist. D6 means that the checker has established a contradiction caused
by an equation. The `Cannot tell …` text stays. Two counterexamples,
kept as fixtures in research/open-row-merge/ (README, "The two D4
counterexamples"), show why "several solutions" is the wrong reading:

- determinate.mjs: `m3 ⊎ m0 = m2 ⊎ m1` and `m0 ⊎ m1 = { a } ⊎ m2` have
  exactly one solution, and the checker ends in D4 (run 2026-10-17:
  `solutions: [{"m0":[],"m1":["a"],"m2":[],"m3":["a"]}]`, `expand=false:
  D4`);
- odd-cycle.mjs: `a ⊎ b = { x }`, `b ⊎ c = { x }`, `a ⊎ c = { x }`, each
  row's parts disjoint, have no solution, and the checker ends in D4
  (run 2026-10-17: `solutions: []`, `verdict: D4 pending=3`).

unresolved.mjs pins Unresolved with zero, one and several solutions
(the two above and a two-part sum with four), and perm.mjs counts every
D4 of its campaigns by its number of solutions (README). The solver's
result is three-way, `Solved`, `Contradiction` or `Unresolved`; D4 is
rendered only from `Unresolved`, D6 (and D1-D3'') only from
`Contradiction`, and no state is called ambiguous (the coordinator's
requirement of 2026-10-17, carried into the implementation plan,
docs/plans/2026-10-17-open-row-merge-plan.md).

An annotation can resolve inference or expose a contradiction; it does
not necessarily make the program valid. The resolving edits below are
edits that do make their example valid; a hint (R9) only names where
more information can be given.

**Decisions, approved with the user's wording.**

1. **R10.2 approved.** Preserve the specific fact responsible when
   pruning binds a row to `{}`; internal solving steps must not degrade
   an approved lacks/disjointness error into a generic shape mismatch.
2. **Equation reasons on committed and drained bindings approved.**
   Retain the causal equation after it leaves the pending store so
   Examples 14 and 17 report D6; merely having participated in some
   equation must not turn later errors into D6.
3. **Upper-bound explanations approved in principle.** Identify an
   equation that actually excludes the offending field; eager per-label
   storage is not required (retaining narrowing reasons and selecting at
   failure is acceptable); multiple sufficient reasons → deterministic
   source-based precedence, not arrival order.
4. **R5.** The owner's side is printed as written (variable names and
   the relevant nested row); the other side through the current
   substitution.
5. **Metadata.** Lambda-parameter names, record-part creation sites and
   instantiated type origins are recorded as diagnostic metadata, kept
   separate from satisfiability decisions.
6. **Lists and hints approved:** list every candidate part, consistent
   numbering across message and notes, the demonstrated annotation
   hints; no hint for Example 6. Adjustment to R3: deduplicate by part
   identity, not printed name; distinct parts that would get the same
   name are disambiguated with numbered parts and origin notes; never
   hide a candidate. Nested-field wording, the D6 forms and the
   example-specific locations are approved. The six prototype
   refusal-text differences (Appendix B) are requirements for
   implementing diagnostics, not grounds for changing expected
   classifications.

So the general forms of §2, rules R1-R11 as corrected here, and the
examples' texts, locations, notes and hints are Approved. §10 keeps the
questions as they were put, each marked with its outcome.

The examples use Tranche B's surface, which today's compiler rejects
(`Only one row tail is allowed`). The annotation forms the edits rely on
were checked on today's compiler (main at 98f1f34) where Tranche A can
express them: a lambda parameter annotated with a function type returning
a record, `b: {}` as a lambda annotation, a lambda annotation naming the
enclosing signature's row variable, and a lambda parameter annotated with
a declared type's record-row argument all check and run. Lambdas are
checked before their arrow meets the expected type, so today's compiler
reports a lambda's mismatch at the whole lambda (probed); the examples
use that span.

## 1. The names, reconciled with draft 3

- **D4, unresolved constraints.** Draft 3, §6 and §10: a pending
  equation that still has a constant (a label or a rigid tail) when the
  function body ends. The constant has two or more homes that forced
  moves cannot choose between, so the checker has established neither a
  solution nor a contradiction. That says nothing about how many
  solutions exist: there may be several (most examples below), exactly
  one (determinate.mjs) or none (odd-cycle.mjs) (§0). Quiet equations
  (no constants) are never D4 (§2.2).
- **D6, a contradiction caused by an equation.** Draft 3, §1.3, §2.5 and
  §10: the checker has established a contradiction whose reason is an
  equation (`Equated`): an upper bound violated, a fact the sum rule
  derived, or a constant of a pending equation left with no home. Rule
  R10 (§3) includes two more cases draft 3 leaves to other texts.
- **Other contradictions keep their own texts.** A failure that no
  equation causes is D1, D2, D2', D3, D3', D3'' or Tranche A's shape
  text, by the reason that excluded the placement (Examples 15, 16).

Both are E_TYPE, as all of draft 3's §10. A reader tells them apart by
the text, the location and the notes (§8); no new code is proposed.

## 2. General forms

`O` is the owner (§3, R1), `A`, `B`, `C` the parts, `l` a label, `t` a
rigid tail, `ROW` and `OTHER` rows printed by R5, `P` a field path (R6).

| ID | Case | Form |
|---|---|---|
| D4 | two homes, named owner | `Cannot tell whether O's A or B has field l` |
| D4 | three or more homes | `Cannot tell which of O's A, B or C has field l` |
| D4 | the constant is a rigid tail | the same with `holds t` for `has field l` |
| D4 | parts are lambda parameters | `Cannot tell whether p or q has field l` (no owner) |
| D4 | some part unnamed | `Cannot tell which part of ROW has field l` (`O's ROW` when there is an owner) |
| D4 | nested | `(in field P)` after the parts: `Cannot tell whether O's A or B (in field P) has field l` |
| D4 | hint | `; ` and the hint of R9, when one applies |
| D6 | one part at fault | `O's ROW must be OTHER, so A cannot have field l` |
| D6 | no home, two parts | `O's ROW must be OTHER, but neither A nor B can have field l` |
| D6 | no home, three or more | `O's ROW must be OTHER, but none of A, B or C can have field l` |
| D6 | the constant is a rigid tail | `cannot hold t`, `can hold t` |
| D6 | nested | `O's ROW (in field P) must be OTHER, …` |
| D6 | no owner | `ROW must be OTHER, …`, the parts named by R1 |

Draft 3's samples are instances: `Cannot tell whether merge's r or s has
field x`; `merge's { ...r, ...s } must be { x: Int, y: Int }, so r
cannot have field z`; `…, but neither r nor s can have field x`. Draft
3's ownerless D4, `Cannot tell which part of { ..._, ..._ } has field
x`, becomes `{ ..._1, ..._2 }` with notes (R2, R8).

## 3. Rendering rules

**R1. Naming the parts.** In order of preference:

1. A meta that instantiates a variable of the equation's `Owner` (a
   callee or constructor use, design §1.3) prints as that variable, with
   `O's` written once before the list or the row. A meta the solver made
   inside the image of exactly one such variable (a commit's remainder)
   prints as that variable: it is the unknown rest of it.
2. A meta that is the whole record row of an unannotated lambda
   parameter prints as the parameter's name (Example 9). Draft 3's
   §10.2 item 3 asks for this; `Owner` does not record it today.
3. Any other unsolved record meta prints as `..._n` (R2).

Rigid tails print as written; type metas inside field types print `_`,
as today.

**R2. Numbering unknown parts.** Within one diagnostic, `..._1`,
`..._2`, … number the unnamed record metas in order of first appearance
in the text, then in the notes; one meta keeps one number in the text
and every note. Numbers restart in each diagnostic and appear only in D4
and D6. A diagnostic with exactly one unnamed part prints `..._`, as
Tranche A does.

**R3. Which parts are listed.** Only the homes: the parts that may still
hold the constant (design §2.1, step 7), deduplicated by part identity,
not by printed name (user's adjustment, §0). Distinct parts that would
print with the same name are disambiguated as numbered parts (R2) with
an origin note each (R8); no candidate is ever hidden. For D6 with no
home, the parts that were homes before the excluding facts. Two parts:
`whether A or B`, `neither A nor B`; three or more: `which of A, B or
C`, `none of A, B or C`. Order: the owner's variables by first written
occurrence in the owner's declaration (draft 3's §10.1 proposed detail),
lambda parameters by position, unnamed parts by number. **No
abbreviation**: every listed part is a variable written in one
declaration, a parameter of one lambda, or a spread item, so the list is
bounded by source the reader can see (decision 7).

**R4. Which constant.** The first constant with two or more homes:
labels before rigid tails, labels in label order (design §7). Example 8
names `y` because `x` already has one home.

**R5. Printing rows.** Draft 3's §10.1 (Approved): fields by label, then
rigid tails by first written occurrence in the enclosing signature; then,
proposed here, owner-named parts in R3's order and `..._n` last. The
owner's side prints as the owner wrote it (`merge's { ...r, ...s }`); the
other side prints through the substitution at the time of the report.
Draft 3's §1.3 says both rows print through the substitution; printing
the owner's side resolved would lose the names `O's` refers to. Approved
(§0, decision 4): the owner's side as written, with its variable names
and the relevant nested row; the other side through the current
substitution.

**R6. Nested positions.** When the waiting equation is nested in a
field type (design §2.6), `(in field P)` names the path from the outer
equation's rows: `P` is the labels joined by `.`, outermost first
(`inner`, `outer.inner`). D4 puts it after the parts, D6 after the
owner's row (Examples 4, 5). A step that is not a field is named in
words after the path, `(in the result of field k)` or `(in argument 1 of
field k)`; no example below exercises it.

**R7. Locations.** D4: the site of the unification that deferred the
equation, kept when the equation is re-examined; a nested equation has
the outer one's site; one deferred again at an effect pair's retry has
that pair's site (design §6). D6: the expression being checked when the
failure was found (draft 3's location rule 1).

**R8. Notes.** D4, in this order:

1. `A and B are written here` (`A, B and C …`) at the owner's written
   row that holds them (the callee's result or parameter type, or the
   constructor's payload type), when there is an owner.
2. `..._n comes from here` at the expression that introduced each
   unnamed home (a spread item, an argument, an access), in number order.
3. `OTHER is required here` at the written type the other side came
   from, when it was written somewhere other than the primary span.

D6, in this order:

1. `required here` at the equation's site (draft 3's P9).
2. `excluded here` at the written reason of each fact that removed a
   home, in R3's order, when that span differs from the primary span and
   from note 1: a clause's label, the later tail of an implying type,
   the earlier spread item, or another equation's site (Example 14).

Notes 2 and 3 of D4 need spans draft 3 does not record: a creation span
for each record meta, and the span of the written type an instantiated
row came from. Approved (§0, decision 5) as diagnostic metadata, kept
separate from satisfiability decisions.

**R9. Hints (D4 only),** by where the homes come from; each names an
annotation the language permits (draft 3's §10, docs/language.md):

| Homes come from | Hint |
|---|---|
| a callee used as a value | `pass a lambda with annotated parameters in place of O` |
| a partial application | `pass a lambda with annotated parameters in place of this partial application of O` |
| a lambda's unannotated parameters, or unnamed parts inside a lambda | `annotate this lambda's parameters` |
| a constructor | `write O's row arguments in the enclosing signature or in a lambda parameter's annotation` |
| a named call whose other types never mention the variables | `no annotation can decide A and B, which belong to this call of O` (amended 2026-10-19, implementation plan §10 decision 20; was: none, Example 6) |

Draft 3's optional suffix `or state the parts in the enclosing
signature` (inside a generic function) is not exercised by any example
here and stays Proposed.

A hint names where more information can be given. The annotation it
suggests can resolve inference or expose a contradiction; it does not
necessarily make the program valid (§0). An annotation that exposes a
contradiction turns D4 into D6 or another contradiction text: in
Example 1, `fn(p: { x: Int }, q: { x: Int }) => merge(p, q)` is D2.

**R10. Which text a contradiction gets.**

1. D6 when the placement that fails depends on an equation: a violated
   upper bound (Examples 3, 5, 13, 19), a constant of a pending
   equation with no home (Example 14), and, beyond draft 3, a label
   that a commit placed (Example 14 in the other order) or a binding
   the drain made (Example 17). The last two need a binding made by a
   commit or the drain to keep its causal equation after the equation
   leaves the pending store, as `arrivedAt` keeps its span. Approved
   (§0, decision 2), with its limit: merely having participated in
   some equation must not turn a later error into D6; only the equation
   that caused the failing placement counts.
2. Otherwise the text of the strongest reason that removed the home,
   by draft 3's precedence (§1.3): D1 for a written `lacks`, D2 or D3''
   for a disjointness, Tranche A's shape text for `Implied` and
   `Spread`. This holds also when the sum rule pruned a lone meta's
   bound to nothing and U4 bound it to `{}`: the report is the lack
   that pruned it, never `Expected {}, found …` (Appendix B shows why
   it is needed). Approved (§0, decision 1): the specific fact
   responsible is preserved; internal solving steps must not degrade
   an approved lacks or disjointness error into a generic shape
   mismatch.
3. For a violated bound, the equation named is one that actually
   excludes the offending atom. Approved in principle (§0, decision
   3): eager per-atom storage is not required; retaining the narrowing
   reasons and selecting at failure is acceptable. When several
   equations each suffice, a deterministic source-based precedence
   chooses (the earliest site), never arrival order (Example 19).

**R11. Several at once.** One diagnostic per program, as today. At the
end of a body, D4 for the pending equation with the earliest site; for
one equation, the constant of R4.

## 4. More than two tails

Example 1 is the two-tail case (and the function-reference owner of §6);
Examples 2 and 3 are three tails, unresolved and contradicted.

### Example 1. Two tails, through a function reference

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = apply0(merge);
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether merge's r or s has field x; pass a lambda with annotated parameters in place of merge` |
| Primary | the argument `merge` (line 4): its requirement against `(a, b) -> { x: Int, y: Int }` deferred the equation |
| Note 1 | `r and s are written here`, at merge's result type, line 1 |
| Note 2 | `{ x: Int, y: Int } is required here`, at apply0's parameter type, line 3 |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  |                                     -------------- 1
2 |   where r disjoint s = { ...a, ...b };
3 | fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
  |                        ------------------ 2
4 | fn main(): Int = apply0(merge);
  |                         ^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = apply0(fn(p: { x: Int }, q: { y: Int }) => merge(p, q));
```

The annotated parameters bind `r := { x: Int }` and `s := { y: Int }` at
`merge(p, q)`; the lambda's result is the closed `{ x: Int, y: Int }`,
so nothing waits.

Prototype: run 1: D4, 4 solutions; fix: accept, 1 solution.

### Example 2. Three tails, unresolved (D4)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply0(f: (a, b, c) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = apply0(merge3);
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell which of merge3's r, s or t has field x; pass a lambda with annotated parameters in place of merge3` |
| Primary | the argument `merge3` (line 6) |
| Note 1 | `r, s and t are written here`, at merge3's result type, line 3 |
| Note 2 | `{ x: Int, y: Int } is required here`, at apply0's parameter type, line 5 |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  |                                                   -------------------- 1
4 |   = merge(merge(a, b), c);
5 | fn apply0(f: (a, b, c) -> { x: Int, y: Int }): Int = 0;
  |                           ------------------ 2
6 | fn main(): Int = apply0(merge3);
  |                         ^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply0(f: (a, b, c) -> { x: Int, y: Int }): Int = 0;
fn main(): Int =
  apply0(fn(p: { x: Int }, q: { y: Int }, w: {}) => merge3(p, q, w));
```

Each part is annotated; `w: {}` says that `t` is empty. Three parts get
the `which of` form (rule R3); nothing is abbreviated.

Prototype: run 2: D4, 9 solutions; fix: accept.

### Example 3. Three tails, contradicted (D6)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply3(f: (a, b, c) -> { x: Int, y: Int, z: Int }, w: c, p: a,
    q: b): Int = 0;
fn main(): Int = apply3(merge3, { v: 3 }, { x: 1 }, { y: 2 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D6, Approved; E_TYPE |
| Text | `merge3's { ...r, ...s, ...t } must be { x: Int, y: Int, z: Int }, so t cannot have field v` |
| Primary | the argument `{ v: 3 }` (line 7), the expression being checked when `t`'s bound excluded `v` (rule 1) |
| Note 1 | `required here`, at the argument `merge3`, the equation's site |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
4 |   = merge(merge(a, b), c);
5 | fn apply3(f: (a, b, c) -> { x: Int, y: Int, z: Int }, w: c, p: a,
6 |     q: b): Int = 0;
7 | fn main(): Int = apply3(merge3, { v: 3 }, { x: 1 }, { y: 2 });
  |                         ------ 1
  |                                 ^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply3(f: (a, b, c) -> { x: Int, y: Int, z: Int }, w: c, p: a,
    q: b): Int = 0;
fn main(): Int = apply3(merge3, { z: 3 }, { x: 1 }, { y: 2 });
```

`t := { z: Int }` lies within its bound; `p` binds `r`, the drain then
binds `s`, and `q` checks against it.

Prototype: run 3: refuse, 0 solutions; fix: accept.

## 5. Nested field types

The unresolved field is identified by `(in field inner)` in the text
(R6); the location is the outer equation's site.

### Example 4. Nested field type, unresolved (D4)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn wrap(a: { ...r }, b: { ...s }): { inner: { ...r, ...s } }
  = { inner: merge(a, b) };
fn apply0(f: (a, b) -> { inner: { x: Int, y: Int } }): Int = 0;
fn main(): Int = apply0(wrap);
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether wrap's r or s (in field inner) has field x; pass a lambda with annotated parameters in place of wrap` |
| Primary | the argument `wrap` (line 6): the nested equation takes the outer equation's site (design §2.6) |
| Note 1 | `r and s are written here`, at the row inside wrap's result, line 3 |
| Note 2 | `{ x: Int, y: Int } is required here`, at the row inside apply0's parameter type, line 5 |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn wrap(a: { ...r }, b: { ...s }): { inner: { ...r, ...s } }
  |                                             -------------- 1
4 |   = { inner: merge(a, b) };
5 | fn apply0(f: (a, b) -> { inner: { x: Int, y: Int } }): Int = 0;
  |                                 ------------------ 2
6 | fn main(): Int = apply0(wrap);
  |                         ^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn wrap(a: { ...r }, b: { ...s }): { inner: { ...r, ...s } }
  = { inner: merge(a, b) };
fn apply0(f: (a, b) -> { inner: { x: Int, y: Int } }): Int = 0;
fn main(): Int = apply0(fn(p: { x: Int }, q: { y: Int }) => wrap(p, q));
```

As in Example 1. The outer equation cancels `inner` once; only the
nested one waited.

Prototype: run 4 (the nested equation alone; labels only): D4, 4
solutions; fix: accept.

### Example 5. Nested field type, contradicted (D6)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn wrap(a: { ...r }, b: { ...s }): { inner: { ...r, ...s } }
  = { inner: merge(a, b) };
fn apply1(f: (a, b) -> { inner: { x: Int, y: Int } }, q: b): Int = 0;
fn main(): Int = apply1(wrap, { z: 1 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D6, Approved; E_TYPE |
| Text | `wrap's { ...r, ...s } (in field inner) must be { x: Int, y: Int }, so s cannot have field z` |
| Primary | the argument `{ z: 1 }` (line 6) |
| Note 1 | `required here`, at the argument `wrap`, the outer equation's site |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn wrap(a: { ...r }, b: { ...s }): { inner: { ...r, ...s } }
4 |   = { inner: merge(a, b) };
5 | fn apply1(f: (a, b) -> { inner: { x: Int, y: Int } }, q: b): Int = 0;
6 | fn main(): Int = apply1(wrap, { z: 1 });
  |                         ---- 1
  |                               ^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn wrap(a: { ...r }, b: { ...s }): { inner: { ...r, ...s } }
  = { inner: merge(a, b) };
fn apply1(f: (a, b) -> { inner: { x: Int, y: Int } }, q: b): Int = 0;
fn main(): Int = apply1(wrap, { y: 1 });
```

`s := { y: Int }`; the drain then binds `r := { x: Int }`, the only
remaining home.

Prototype: run 5: refuse, 0 solutions; fix: accept.

## 6. Owners

How the text names the owner:

- a named function call: `split's` (Example 6);
- a named constructor: `Both's` (Example 7);
- a function reference: `merge's` (Example 1, and 2, 4, 12, 18);
- a partial application: `merge3's`, the callee's own variables, the
  bound ones omitted (Example 8);
- no named owner, lambda parameters: the parameters, no possessive
  (Example 9);
- no named owner and no parameter: `which part of { ..._1, ..._2 }`,
  with a note per part (Example 10).

### Example 6. Owner: a named function call

```wxw
fn split(p: { ...r, ...s }): Int = 0;
fn main(): Int = split({ x: 1, y: 2 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether split's r or s has field x` |
| Primary | the argument `{ x: 1, y: 2 }` (line 2) |
| Note 1 | `r and s are written here`, at split's parameter type, line 1 |

```text
1 | fn split(p: { ...r, ...s }): Int = 0;
  |             -------------- 1
2 | fn main(): Int = split({ x: 1, y: 2 });
  |                        ^^^^^^^^^^^^^^ error
```

Resolving edit:

```wxw
fn split(p: { ...r }): Int = 0;
fn main(): Int = split({ x: 1, y: 2 });
```

Hint (rule R9, amended 2026-10-19 by the implementation plan's §10
decision 20; the text was approved with no hint): `; no annotation can
decide r and s, which belong to this call of split`. No annotation at
this call can resolve it, because nothing in `split`'s type outside the
parameter mentions `r` or `s`. The
edit is to the signature: a function that never separates the parts
needs one tail. The other side is the primary expression itself, so
there is no `is required here` note.

Prototype: run 6: D4, 4 solutions; fix (one tail): accept.

### Example 7. Owner: a constructor (§8 without the annotation)

```wxw
type Both(...r, ...s) = Both({ ...r, ...s });
fn main(): Int = { let b = Both({ x: 1, y: 2 }); 0 };
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether Both's r or s has field x; write Both's row arguments in the enclosing signature or in a lambda parameter's annotation` |
| Primary | the argument `{ x: 1, y: 2 }` (line 2), as in design §8 |
| Note 1 | `r and s are written here`, at Both's payload type, line 1 |

```text
1 | type Both(...r, ...s) = Both({ ...r, ...s });
  |                              -------------- 1
2 | fn main(): Int = { let b = Both({ x: 1, y: 2 }); 0 };
  |                                 ^^^^^^^^^^^^^^ error
```

Resolving edit:

```wxw
type Both(...r, ...s) = Both({ ...r, ...s });
fn example(): Both({ x: Int }, { y: Int }) = Both({ x: 1, y: 2 });
fn main(): Int = { let b = example(); 0 };
```

The user's example (design §8): the result annotation fixes `r` and `s`
through the record-row arguments. The other form of the hint, `let use =
fn(b: Both({ x: Int }, { y: Int })) => 0;` followed by `use(Both({ x: 1,
y: 2 }))`, resolves it the same way.

Prototype: run 7 (as annotation.mjs): D4, 4 solutions; fix: accept.

### Example 8. Owner: a partial application

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply0(f: (b, c) -> { x: Int, y: Int, z: Int }): Int = 0;
fn main(): Int = apply0(merge3({ x: 1 }));
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether merge3's s or t has field y; pass a lambda with annotated parameters in place of this partial application of merge3` |
| Primary | the partial application `merge3({ x: 1 })` (line 6) |
| Note 1 | `s and t are written here`, at merge3's result type, line 3 |
| Note 2 | `{ x: Int, y: Int, z: Int } is required here`, at apply0's parameter type, line 5 |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  |                                                   -------------------- 1
4 |   = merge(merge(a, b), c);
5 | fn apply0(f: (b, c) -> { x: Int, y: Int, z: Int }): Int = 0;
  |                        -------------------------- 2
6 | fn main(): Int = apply0(merge3({ x: 1 }));
  |                         ^^^^^^^^^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply0(f: (b, c) -> { x: Int, y: Int, z: Int }): Int = 0;
fn main(): Int =
  apply0(fn(q: { y: Int }, w: { z: Int }) => merge3({ x: 1 }, q, w));
```

The partial application already bound `r := { x: Int }`, so `x` has one
home and the text names only `s` and `t`, the homes of the first waiting
label, `y` (rule R4). The note marks the whole result type, where `s`
and `t` are written.

Prototype: run 8: D4, 4 solutions; fix: accept.

### Example 9. No named owner: an unannotated lambda

```wxw
fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = apply0(fn(p, q) => { ...p, ...q });
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether p or q has field x; annotate this lambda's parameters` |
| Primary | the lambda `fn(p, q) => { ...p, ...q }` (line 2): its arrow is unified with the parameter type at the argument, which is where today's compiler reports a lambda's mismatch |
| Note 1 | `{ x: Int, y: Int } is required here`, at apply0's parameter type, line 1 |

```text
1 | fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
  |                        ------------------ 1
2 | fn main(): Int = apply0(fn(p, q) => { ...p, ...q });
  |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^ error
```

Resolving edit:

```wxw
fn apply0(f: (a, b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = apply0(fn(p: { x: Int }, q: { y: Int }) =>
  { ...p, ...q });
```

No callee owns the rows, but each is the whole record of a lambda
parameter, so the text names the parameters (rule R1).

Prototype: run 9: D4, 4 solutions; fix: accept.

### Example 10. No named owner: unnamed parts

```wxw
fn build(k: (Int -> a, Int -> b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = build(fn(f, g) => { ...f(1), ...g(2) });
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell which part of { ..._1, ..._2 } has field x; annotate this lambda's parameters` |
| Primary | the lambda (line 2) |
| Note 1 | `..._1 comes from here`, at the spread item `f(1)` |
| Note 2 | `..._2 comes from here`, at the spread item `g(2)` |
| Note 3 | `{ x: Int, y: Int } is required here`, at build's parameter type, line 1 |

```text
1 | fn build(k: (Int -> a, Int -> b) -> { x: Int, y: Int }): Int = 0;
  |                                     ------------------ 3
2 | fn main(): Int = build(fn(f, g) => { ...f(1), ...g(2) });
  |                                         ---- 1
  |                                                  ---- 2
  |                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ error
```

Resolving edit:

```wxw
fn build(k: (Int -> a, Int -> b) -> { x: Int, y: Int }): Int = 0;
fn main(): Int = build(fn(f: Int -> { x: Int }, g: Int -> { y: Int }) =>
  { ...f(1), ...g(2) });
```

The rows are the results of `f(1)` and `g(2)`, not a parameter's whole
record, so they print as numbered unknown parts (rule R1) and each part
gets a note at the expression that introduced it.

Prototype: run 10: D4, 4 solutions; fix: accept.

## 7. Resolved later versus unresolved at the end

D4 is decided only when the body ends (design §6). An equation that
waits is not an error while it waits; a later argument, binding or
annotation may still resolve it.

### Example 11. Resolved by a later argument (no error)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply2(f: (a, b) -> { x: Int, y: Int }, p: a, q: b): Int = f(p, q).x;
fn main(): Int = apply2(merge, { x: 1 }, { y: 2 });
```

| Step | Substitution and store |
|---|---|
| `merge` against `(a, b) -> { x: Int, y: Int }` | `?a := { ...?r }`, `?b := { ...?s }`; `{ ...?r, ...?s } ~ { x: Int, y: Int }`: `x` and `y` each have two homes; the sum rule bounds `?r` and `?s` by `{ x, y }`; deferred, site `merge` |
| `{ x: 1 }` against `a` | `?r := { x: Int }`, within its bound; the drain re-examines the equation: `{ x: Int, ...?s } ~ { x: Int, y: Int }` cancels `x` and binds `?s := { y: Int }` (step 6); the equation is gone |
| `{ y: 2 }` against `b` | an ordinary check against `{ y: Int }` |
| end of `main` | nothing pending: no D4 |

Accepted; prints 1. The first argument alone already resolves it: once
`r` is known, `s` is the rest. Prototype: run 11, accept with the one
solution, also after `p` alone.

### Example 12. Unresolved at the end of the body

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply1(f: (a, b, c) -> { x: Int, y: Int, z: Int }, p: a): Int = 0;
fn main(): Int = apply1(merge3, { x: 1 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether merge3's s or t has field y; pass a lambda with annotated parameters in place of merge3` |
| Primary | the argument `merge3` (line 6), where the equation was deferred; re-examination keeps the site (design §2.6) |
| Note 1 | `s and t are written here`, at merge3's result type, line 3 |
| Note 2 | `{ x: Int, y: Int, z: Int } is required here`, at apply1's parameter type, line 5 |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  |                                                   -------------------- 1
4 |   = merge(merge(a, b), c);
5 | fn apply1(f: (a, b, c) -> { x: Int, y: Int, z: Int }, p: a): Int = 0;
  |                           -------------------------- 2
6 | fn main(): Int = apply1(merge3, { x: 1 });
  |                         ^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply1(f: (a, b, c) -> { x: Int, y: Int, z: Int }, p: a): Int = 0;
fn main(): Int = apply1(fn(p: { x: Int }, q: { y: Int }, w: { z: Int }) =>
  merge3(p, q, w), { x: 1 });
```

The later argument `{ x: 1 }` bound `r` and the drain removed `x` from
the equation, but `{ y, z }` still has two homes when `main` ends. The
text reflects the state at the end: `r` is no longer a home, so it is
not named.

Prototype: run 12: D4, 4 solutions; fix: accept.

## 8. Contradiction versus unresolved constraints

| | D4: unresolved constraints | D6: contradiction from an equation |
|---|---|---|
| What the checker established | neither a solution nor a contradiction; there may be several solutions, one or none (§0) | a contradiction caused by an equation: no solution exists |
| Solver result | `Unresolved` | `Contradiction` |
| When | when the function body ends | as soon as found, mid-body |
| Text | begins `Cannot tell`; names the homes | `… must be …, so A cannot …` or `…, but neither …` / `none of …` |
| Location | where the equation was deferred | the expression being checked |
| Notes | `… are written here`, `… comes from here`, `… is required here` | `required here` at the equation's site, `excluded here` |
| Hint | where an annotation can give more information, if anywhere | none |
| What fixes it | more information, an annotation or an argument, which resolves inference or exposes a contradiction | a different value or type |

Examples 13 and 14 are D6. Examples 15 and 16 are contradictions no
equation causes, so they keep their Approved texts. Example 17 is a
contradiction found after the drain solved the equation.

### Example 13. Contradiction: a bound excludes a label

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply1(f: (a, b) -> { x: Int, y: Int }, p: a): Int = 0;
fn main(): Int = apply1(merge, { z: 1 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D6, Approved; E_TYPE |
| Text | `merge's { ...r, ...s } must be { x: Int, y: Int }, so r cannot have field z` |
| Primary | the argument `{ z: 1 }` (line 4) |
| Note 1 | `required here`, at the argument `merge`, the equation's site |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn apply1(f: (a, b) -> { x: Int, y: Int }, p: a): Int = 0;
4 | fn main(): Int = apply1(merge, { z: 1 });
  |                         ----- 1
  |                                ^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply1(f: (a, b) -> { x: Int, y: Int }, p: a): Int = 0;
fn main(): Int = apply1(merge, { x: 1 });
```

Review F6's case, with one argument. `r := { x: Int }`, and the drain
binds `s := { y: Int }`.

Prototype: run 13: refuse, 0 solutions; fix: accept.

### Example 14. Contradiction: a label with no home

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): Int = 0;
fn noX(p: { ...u }, q: { ...v }): Int where u lacks { x }, v lacks { x }
  = 0;
fn main(): Int = apply(merge, noX);
```

| Part | Rendering |
|---|---|
| Diagnostic | D6, Approved; E_TYPE |
| Text | `merge's { ...r, ...s } must be { x: Int, y: Int }, but neither r nor s can have field x` |
| Primary | the argument `noX` (line 6), whose unification gave both parts the lack |
| Note 1 | `required here`, at the argument `merge`, the equation's site |
| Note 2 | `excluded here`, at the `x` of `u lacks { x }`, which became `r`'s |
| Note 3 | `excluded here`, at the `x` of `v lacks { x }`, which became `s`'s |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): Int = 0;
4 | fn noX(p: { ...u }, q: { ...v }): Int where u lacks { x }, v lacks { x }
  |                                                       - 2
  |                                                                      - 3
5 |   = 0;
6 | fn main(): Int = apply(merge, noX);
  |                        ----- 1
  |                               ^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn apply(f: (a, b) -> { x: Int, y: Int }, g: (a, b) -> Int): Int = 0;
fn noX(p: { ...u }, q: { ...v }): Int where u lacks { y }, v lacks { x }
  = 0;
fn main(): Int = apply(merge, noX);
```

Now `x` has one home, `r`, and `y` has one, `s`: both are committed.
Under draft 3 as written this program's text depends on the order of the
facts (see rule R10 and Appendix B).

Prototype: run 14: refuse in both orders, 0 solutions; fix: accept.

### Example 15. Contradiction without an equation: an overlap (D2)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn main(): Int = merge({ x: 1 }, { x: 2 }).x;
```

| Part | Rendering |
|---|---|
| Diagnostic | D2, Approved; E_TYPE |
| Text | `Field x is in both records: r disjoint s` |
| Primary | the later argument `{ x: 2 }` (line 3) |
| Note 1 | `first written here`, at where `r`'s `x` arrived (`arrivedAt`) |
| Note 2 | `required here`, at merge's clause |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
  |         ------------ 2
3 | fn main(): Int = merge({ x: 1 }, { x: 2 }).x;
  |                        -------- 1
  |                                  ^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn main(): Int = merge({ x: 1 }, { y: 2 }).x;
```

Each argument binds a lone meta, so no equation waits and the failure is
not D6: `s` lacks `x` by `merge`'s written clause.

Prototype: run 15: refuse, 0 solutions; fix: accept.

### Example 16. Contradiction without an equation: no evidence (D3)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn size(p: { ...q }): Int = 0;
fn pair(a: { ...r }, b: { ...s }): Int = size(merge(a, b));
fn main(): Int = pair({ x: 1 }, { y: 2 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D3, Approved (text and hint); E_TYPE |
| Text | `r and s are not known to be disjoint; require r disjoint s in the signature` |
| Primary | the argument `b` of `merge(a, b)` (line 4) |
| Note 1 | `required here`, at merge's clause |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
  |         ------------ 1
3 | fn size(p: { ...q }): Int = 0;
4 | fn pair(a: { ...r }, b: { ...s }): Int = size(merge(a, b));
  |                                                        ^ error
5 | fn main(): Int = pair({ x: 1 }, { y: 2 });
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn size(p: { ...q }): Int = 0;
fn pair(a: { ...r }, b: { ...s }): Int where r disjoint s
  = size(merge(a, b));
fn main(): Int = pair({ x: 1 }, { y: 2 });
```

The names are `pair`'s rigids (location rule 4). Writing `where r
disjoint r` instead is D9, `A disjoint constraint must name two
different row variables` (Approved), at the clause's second `r`.

Prototype: run 16: refuse (evidence), 0 solutions; fix (the hypothesis):
accept.

### Example 17. Contradiction after the equation was solved

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply3(f: (a, b, c) -> { x: Int, y: Int }, p: a, q: b, w: c): Int = 0;
fn main(): Int = apply3(merge3, { x: 1 }, { y: 2 }, { z: 3 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D6, Approved (draft 3 as written gives the shape text); E_TYPE |
| Text | `merge3's { ...r, ...s, ...t } must be { x: Int, y: Int }, so t cannot have field z` |
| Primary | the argument `{ z: 3 }` (line 6) |
| Note 1 | `required here`, at the argument `merge3`, the equation's site |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
4 |   = merge(merge(a, b), c);
5 | fn apply3(f: (a, b, c) -> { x: Int, y: Int }, p: a, q: b, w: c): Int = 0;
6 | fn main(): Int = apply3(merge3, { x: 1 }, { y: 2 }, { z: 3 });
  |                         ------ 1
  |                                                     ^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn merge3(a: { ...r }, b: { ...s }, c: { ...t }): { ...r, ...s, ...t }
  = merge(merge(a, b), c);
fn apply3(f: (a, b, c) -> { x: Int, y: Int, z: Int }, p: a, q: b,
    w: c): Int = 0;
fn main(): Int = apply3(merge3, { x: 1 }, { y: 2 }, { z: 3 });
```

By the time `{ z: 3 }` is checked, the drain has solved the equation (`t
:= {}`, step 6), so under draft 3 nothing is pending and the report is
Tranche A's `Expected {}, found { z: Int }` at the argument, with no
note: review F6's complaint again. The proposed rule R10 keeps the
equation as the reason of a binding the drain made, so the text is D6.

Prototype: run 17: refuse, 0 solutions; fix: accept.

## 9. The rest of draft 3's §10.2

Item 4 (a constructor) is Example 7. Items 5 and 6 follow.

### Example 18. A rigid tail with two homes (`holds t`)

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn use(f: (a, b) -> { ...r }, p: { ...r }): Int = 0;
fn outer(p: { ...t }): Int = use(merge, p);
fn main(): Int = outer({ x: 1 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D4, Approved; E_TYPE |
| Text | `Cannot tell whether merge's r or s holds t; pass a lambda with annotated parameters in place of merge` |
| Primary | the argument `merge` (line 4), amended 2026-10-20 (implementation plan §10 decision 21, T6: a predicate from the result type is located at the use); approved first as the argument `p`, which brought the constant `t` |
| Note 1 | `r and s are written here`, at merge's result type, line 1 |
| Note 2 | `{ ...t } is required here`, at outer's parameter type, line 4 |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  |                                     -------------- 1
2 |   where r disjoint s = { ...a, ...b };
3 | fn use(f: (a, b) -> { ...r }, p: { ...r }): Int = 0;
4 | fn outer(p: { ...t }): Int = use(merge, p);
  |             -------- 2
  |                                  ^^^^^ error
5 | fn main(): Int = outer({ x: 1 });
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn use(f: (a, b) -> { ...r }, p: { ...r }): Int = 0;
fn outer(p: { ...t }): Int = use(fn(a: { ...t }, b: {}) => merge(a, b), p);
fn main(): Int = outer({ x: 1 });
```

The lambda annotation names `outer`'s own variable, as the language
allows. A tempting wrong edit, `b: { ...t }`, is D3', `t is in both
records and may have fields` (Approved), at `b` in `merge(a, b)`, noted
`required here` at merge's clause.

Prototype: run 18: D4, 2 solutions; fix: accept; wrong edit: refuse
(evidence).

### Example 19. A bound met from two equations

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn both(f: (h, q) -> { x: Int, y: Int }, g: (h, w) -> { y: Int, z: Int },
    k: h): Int = 0;
fn main(): Int = both(merge, merge, { z: 1 });
```

| Part | Rendering |
|---|---|
| Diagnostic | D6, Approved; E_TYPE |
| Text | `merge's { ...r, ...s } must be { x: Int, y: Int }, so r cannot have field z` |
| Primary | the argument `{ z: 1 }` (line 5) |
| Note 1 | `required here`, at the first `merge`, the site of the equation that excludes `z` |

```text
1 | fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
2 |   where r disjoint s = { ...a, ...b };
3 | fn both(f: (h, q) -> { x: Int, y: Int }, g: (h, w) -> { y: Int, z: Int },
4 |     k: h): Int = 0;
5 | fn main(): Int = both(merge, merge, { z: 1 });
  |                       ----- 1
  |                                     ^^^^^^^^ error
```

Resolving edit:

```wxw
fn merge(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = { ...a, ...b };
fn both(f: (h, q) -> { x: Int, y: Int }, g: (h, w) -> { y: Int, z: Int },
    k: h): Int = 0;
fn main(): Int = both(merge, merge, { y: 1 });
```

The first `merge` bounds `r` by `{ x, y }`, the second (sharing `r`
through `h`) narrows it to `{ y }`. With `{ x: 1 }` instead the text
names the second equation, `merge's { ...r, ...s } must be { y: Int, z:
Int }, so r cannot have field x`, noted at the second `merge`. Draft 3's
`Bound` keeps one `why`, the last narrowing, so it would name the second
equation for `z` too, which is false (`z` is in that row); see R10 and
decision 4.

Prototype: run 19: refuse, 0 solutions (with `{ x: 1 }` too); without
the argument D4, 2 solutions; fix: accept.

## 10. Decisions for the user

Outcomes (2026-10-17, §0): 1 approved, with D4 and D6 redefined; 2
approved with its limit; 3 approved; 4 approved in principle (selection
at failure allowed, source-based precedence); 5 approved; 6 approved as
metadata kept apart from satisfiability; 7 approved, with R3's
deduplication by part identity; 8 approved, no hint for Example 6.

1. The general forms of §2 and the rules R1-R9 and R11, as D4 and D6's
   rendering.
2. R10.1: D6 also for a label a commit placed and a binding the drain
   made. Needs such bindings to keep their equation. Without it,
   Example 14's text depends on the order of the facts (D6 one way,
   D1 naming `noX`'s `v` the other) and Example 17 is `Expected {},
   found { z: Int }` with no note.
3. R10.2: a meta that U4 bound to `{}` because a lack pruned its bound
   reports that lack. Without it, the step order of design §2.1 (the
   sum rule, step 5, before one meta alone, step 6) turns Tranche A's
   D1 into a shape mismatch whenever the residue is one lacked label
   (Appendix B), which slice 1's differential would catch as a
   regression.
4. R10.3: an upper bound keeps, per excluded atom, the equation that
   excluded it (draft 3's `Bound` has one `why`). Without it Example 19
   with `{ z: 1 }` names the wrong equation.
5. R5: the owner's side printed as written, not through the
   substitution (refines a sentence of design §1.3).
6. R1.2 and R8: naming lambda parameters, `..._n comes from here`, and
   `… is required here` need a parameter name per meta, a creation span
   per record meta, and the written type's span on an instantiated row.
7. R3: no abbreviation of the list of parts.
8. R9: the hint wordings, and no hint for a named call (Example 6).

# Appendix A: prototype classification

The research prototype (research/open-row-merge/, labels only, field
types ignored) classifies each example's row problem as `accept`,
`refuse` or `D4`, and the brute-force oracle counts its solutions. It
cannot check texts, locations, nesting or owners. Nested examples are
run as their inner equation; the lambda examples as the equation their
rows make. The script below, saved as diag.mjs in a scratch directory,
was run from the repository root on 2026-10-17 at 98f1f34 as `node
<scratch>/diag.mjs research/open-row-merge`; it is kept here rather than
in the repository because this change is documentation only. Since
2026-10-17 it is also research/open-row-merge/diag.mjs (`node diag.mjs
.` from that directory), whose output was compared with the one below
and is identical.

```js
// Classifies the examples of docs/plans/2026-10-17-open-row-merge-
// diagnostics.md with the research prototype (labels only).
// Run: node diag.mjs <path to research/open-row-merge>
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = pathToFileURL(resolve(process.argv[2]) + '/');
const { verdict, row, tail } = await import(new URL('drive.mjs', dir));
const O = await import(new URL('oracle.mjs', dir));
const dis = (a, b) => ({ k: 'dis', l: tail(a), r: tail(b) });
const eq = (l, r) => ({ k: 'eq', l, r });
const has = (m, ...ls) => eq(tail(m), row(ls));
const lacks = (v, l) => ({ k: 'lacks', v, l });
const H0 = { lacks: {}, apart: [] };
const run = (name, steps, H = H0) => {
  const metas = [...new Set(steps.flatMap(c => (c.k === 'lacks' ? [c.v]
    : [...c.l.tails, ...c.r.tails])).filter(O.isMeta))].sort();
  const atoms = [...new Set(steps.flatMap(c => (c.k === 'lacks' ? [c.l]
    : [...c.l.fields, ...c.r.fields, ...c.l.tails, ...c.r.tails]))
    .filter(a => !O.isMeta(a)))].sort();
  const v = verdict(H, steps);
  const n = O.allSolutions(metas, atoms, H, steps).length;
  console.log(`${name}: ${v.v}${v.why ? ` (${v.why})` : ''}; ${n} sol.`);
};
const two = [dis('m0', 'm1')];
const three = [dis('m0', 'm1'), dis('m0', 'm2'), dis('m1', 'm2')];
const sum2 = r => eq(row([], ['m0', 'm1']), r);
const sum3 = r => eq(row([], ['m0', 'm1', 'm2']), r);
const xy = row(['x', 'y']), xyz = row(['x', 'y', 'z']);
const fix2 = [...two, has('m0', 'x'), has('m1', 'y'), sum2(xy)];
run('1', [...two, sum2(xy)]);
run('1 fix', fix2);
run('2', [...three, sum3(xy)]);
run('2 fix', [...three, has('m0', 'x'), has('m1', 'y'), has('m2'),
  sum3(xy)]);
run('3', [...three, sum3(xyz), has('m2', 'v')]);
run('3 fix', [...three, sum3(xyz), has('m2', 'z'), has('m0', 'x'),
  has('m1', 'y')]);
run('4 (inner equation)', [...two, sum2(xy)]);
run('4 fix', fix2);
run('5', [...two, sum2(xy), has('m1', 'z')]);
run('5 fix', [...two, sum2(xy), has('m1', 'y')]);
run('6', [...two, sum2(xy)]);
run('6 fix (one tail)', [eq(tail('m0'), xy)]);
run('7 (annotation.mjs order)', [...two, sum2(xy)]);
run('7 fix', [...two, sum2(xy), has('m0', 'x'), has('m1', 'y')]);
run('8', [...three, has('m0', 'x'), sum3(xyz)]);
run('8 fix', [...three, has('m0', 'x'), has('m1', 'y'), has('m2', 'z'),
  sum3(xyz)]);
run('9', [...two, sum2(xy)]);
run('9 fix', fix2);
run('10', [...two, sum2(xy)]);
run('10 fix', fix2);
run('11', [...two, sum2(xy), has('m0', 'x'), has('m1', 'y')]);
run('11 after p only', [...two, sum2(xy), has('m0', 'x')]);
run('12', [...three, sum3(xyz), has('m0', 'x')]);
run('12 fix', [...three, has('m0', 'x'), has('m1', 'y'), has('m2', 'z'),
  sum3(xyz), has('m0', 'x')]);
run('13', [...two, sum2(xy), has('m0', 'z')]);
run('13 fix', [...two, sum2(xy), has('m0', 'x')]);
run('14', [...two, sum2(xy), lacks('m0', 'x'), lacks('m1', 'x')]);
run('14 lacks first', [...two, lacks('m0', 'x'), lacks('m1', 'x'),
  sum2(xy)]);
run('14 fix', [...two, sum2(xy), lacks('m0', 'y'), lacks('m1', 'x')]);
run('15', [...two, has('m0', 'x'), has('m1', 'x')]);
run('15 fix', [...two, has('m0', 'x'), has('m1', 'y')]);
run('16', [{ k: 'dis', l: tail('R'), r: tail('S') }]);
run('16 fix', [{ k: 'dis', l: tail('R'), r: tail('S') }],
  { lacks: {}, apart: [['R', 'S']] });
run('17', [...three, sum3(xy), has('m0', 'x'), has('m1', 'y'),
  has('m2', 'z')]);
run('17 fix', [...three, sum3(xyz), has('m0', 'x'), has('m1', 'y'),
  has('m2', 'z')]);
run('18', [...two, sum2(row([], ['T']))]);
run('18 fix', [...two, eq(tail('m0'), row([], ['T'])), has('m1'),
  sum2(row([], ['T']))]);
run('18 wrong fix', [{ k: 'dis', l: tail('T'), r: tail('T') }]);
const bound = [...two, sum2(xy), dis('m2', 'm3'),
  eq(tail('m0'), tail('m2')), eq(row([], ['m2', 'm3']), row(['y', 'z']))];
run('19 no argument', bound);
run('19', [...bound, has('m0', 'z')]);
run('19 with { x: 1 }', [...bound, has('m0', 'x')]);
run('19 fix', [...bound, has('m0', 'y')]);
run('lone meta, lack, { x }', [lacks('m0', 'x'), has('m0', 'x')]);
run('lone meta, lack, { x, y }', [lacks('m0', 'x'), has('m0', 'x', 'y')]);
```

Output (the run number is the example number):

```text
1: D4; 4 sol.
1 fix: accept; 1 sol.
2: D4; 9 sol.
2 fix: accept; 1 sol.
3: refuse (mismatch: no home for undefined); 0 sol.
3 fix: accept; 1 sol.
4 (inner equation): D4; 4 sol.
4 fix: accept; 1 sol.
5: refuse (mismatch: no home for undefined); 0 sol.
5 fix: accept; 1 sol.
6: D4; 4 sol.
6 fix (one tail): accept; 1 sol.
7 (annotation.mjs order): D4; 4 sol.
7 fix: accept; 1 sol.
8: D4; 4 sol.
8 fix: accept; 1 sol.
9: D4; 4 sol.
9 fix: accept; 1 sol.
10: D4; 4 sol.
10 fix: accept; 1 sol.
11: accept; 1 sol.
11 after p only: accept; 1 sol.
12: D4; 4 sol.
12 fix: accept; 1 sol.
13: refuse (mismatch: no home for undefined); 0 sol.
13 fix: accept; 1 sol.
14: refuse (lacks: m1 has x); 0 sol.
14 lacks first: refuse (mismatch: no home for x); 0 sol.
14 fix: accept; 1 sol.
15: refuse (mismatch: no home for undefined); 0 sol.
15 fix: accept; 1 sol.
16: refuse (evidence: R disjoint S); 0 sol.
16 fix: accept; 1 sol.
17: refuse (mismatch: no home for undefined); 0 sol.
17 fix: accept; 1 sol.
18: D4; 2 sol.
18 fix: accept; 1 sol.
18 wrong fix: refuse (evidence: T disjoint T); 0 sol.
19 no argument: D4; 2 sol.
19: refuse (mismatch: no home for undefined); 0 sol.
19 with { x: 1 }: refuse (mismatch: no home for undefined); 0 sol.
19 fix: accept; 1 sol.
lone meta, lack, { x }: refuse (mismatch: no home for undefined); 0 sol.
lone meta, lack, { x, y }: refuse (lacks: m0 lacks x); 0 sol.
```

Every classification agrees with the example: D4 for each D4 example
(these happen to have 2, 4 or 9 solutions; D4 itself claims nothing
about the count, §0), `refuse` with no solution for each D6, D2, D3 and
Example 17, and `accept` with one solution for Example 11 and
every resolving edit. The kind of refusal is the prototype's, not the
compiler's text; Appendix B lists where it differs from the text
proposed.

# Appendix B: where the prototype's refusal differs from the text

The prototype reports a refusal's kind (`upper`, `lacks`, `overlap`,
`evidence`, `mismatch`). That kind is what draft 3's step order
produces, so it shows which texts need R10.

- **Examples 3, 5, 13, 17, 19 and 15 report `mismatch`**, not `upper` or
  `overlap`. The sum rule (step 5) narrows the lone meta's bound by the
  argument's labels, U2 removes what it lacks or the old bound
  excludes, the bound becomes empty, U4 binds the meta to `{}`, and the
  residue `{} ~ { z }` is a mismatch. Without R10 the compiler would
  print a shape text for each, including Example 15, where D2 is
  Approved.
- **A lone meta with one lacked label** (Tranche A's D1, e.g. design
  §1.6 P1): `lacks m0 x; m0 ~ { x }` refuses with `mismatch` but `lacks
  m0 x; m0 ~ { x, y }` with `lacks`. The kind depends on whether the
  pruned bound is empty (decision 3). Runs `lone meta` in the output.
- **Example 14 depends on order.** Equation first: `x` is committed to
  `s` once `r` lacks it, then `s`'s lack fails (`lacks: m1 has x`; D1
  by precedence). Lacks first: `x` has no home (`mismatch: no home for
  x`; D6). R10.1 makes both D6.
- **A cosmetic defect in the prototype:** when neither side of a residue
  has a meta and only the right side has constants, solver-solve.mjs
  `examine` prints `no home for undefined` (it takes the first constant
  of the left side). Verdicts are unaffected. Recorded as BACKLOG R018.

No example's class (accept, refuse, D4) differed from what the design
predicts. The user's review (§0, decision 6) makes these differences
requirements for implementing the diagnostics (R10), not grounds for
changing any expected classification.
