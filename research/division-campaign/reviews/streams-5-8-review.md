# Streams 5 and 8: an adversarial review

Date: 2026-10-21. Base: 66e2b60 (tip of r005b-replan, dossier §18.21).
Reviewer: an independent subagent that wrote none of the material
reviewed. Scope: the two disagreements between Stream 5
(source/translation.md) and Stream 8 (split-irrelevance/statements.md,
ground-check.md); a third review of Stream 8's post-review fixes
(a4552b1); whether the two streams' statements combine into a recorder
specification (§18.20's gate). Four points added by the author during
the review are answered in §4. Nothing here edits the reviewed files.

Severities: **false** (a statement that is false as written),
**overclaim** (prose stronger than the evidence or the Lean),
**gap** (something neither modelled nor listed), **wording**.

## 0. Method and evidence

- Build: `SeveralTails.purs` restored from 43b3a28^ in this worktree,
  not staged, then `npm run build` (581 modules, no warnings). No Go
  build.
- Runner: a scratch copy of `source/run.mjs` that takes file names
  (Parse, Resolve, Check, Specialize; reports the first refusal).
  Probe files were scratch files, not committed; their full text is
  below so that each run can be repeated.
- Lean: `lake build Composition.SplitIrrelevance.Axioms` (36 jobs,
  clean); `#print axioms` gives `propext`, `Classical.choice`,
  `Quot.sound` for all 22 theorems listed in Axioms.lean, as stated.

The probes share one callee, §17.3's `divide`, with extra callback
parameters. Today an unforced split reaches past `CannotTell` only when
the caller *writes* it, by annotating a lambda parameter of type
`({ ...u }) -> …`. The checker's own diagnostic asks for this
(cmp-open below: "annotate this lambda's parameters"). So each pair
below is two texts that differ only in the written split. Both splits
of each pair satisfy `divide`'s `D` (`u disjoint s`, `v disjoint t`,
with `s = { a }`, `t = { b }`).

~~~waxwing
// cmp-c.wxw: u = { c }, v = { a, f }
fn divide(whole: { ...u, ...v }, left: { ...s }, right: { ...t },
    k: ({ ...u }) -> Bool): Text
  where u disjoint s, v disjoint t = "ok";
fn main(): Text =
  divide({ a: 1, f: fn(n: Int) => n, c: 2 }, { a: 2 }, { b: 3 },
    fn(p: { c: Int }) => p == p);
// cmp-cf.wxw: the same, with u = { c, f }, v = { a }:
//     fn(p: { c: Int, f: (Int) -> Int }) => p == p
// cmp-open.wxw: the same, unannotated: fn(p) => p == p
// pr-c.wxw, pr-cf.wxw: cmp-c, cmp-cf with -> Text and show(p)
~~~

~~~waxwing
// pk-crash-c.wxw (pk-crash-d.wxw: fn(p: { d: Int }) => true)
fn divide(whole: { ...u, ...v }, left: { ...s }, right: { ...t },
    g: (Int) -> { ...u }, k: ({ ...u }) -> Bool): Text
  where u disjoint s, v disjoint t = {
  let peek = fn(p: { ...u }) => show(p);
  peek(g(0))
};
fn main(): Text =
  divide({ a: 1, c: 2, d: 3 }, { a: 2 }, { b: 3 },
    fn(n: Int) => crash("boom"), fn(p: { c: Int }) => true);
// pk-crash-open.wxw: without k (the split left open)
// pk-absurd.wxw: no g, no k; peek(absurd(0)), where
//     fn absurd(n: Int): { ...p } = absurd(n);
// pk-absurd1.wxw: the same with one tail:
//     probe(w: { ...r }) { peek(absurd(0)) }; main: probe({ a: 1 })
// pk-part.wxw: a parameter part: { ...u }, peek(part); main passes
//     whole { a: 1, c: 2 } and part { c: 5 }
// pk-whole.wxw: peek(whole)
// eq-c.wxw, eq-d.wxw: divide with h: ({ ...u }) -> Int and k as in
//     cmp-c; main passes fn(p) => p.c for h and writes u = { c }
//     (eq-c) or u = { d } (eq-d); whole { a: 1, c: 2, d: 3 }
~~~

| Probe | Result |
|---|---|
| h1 (statements.md §1.1) | check: E_TYPE `Expected a printable value, found { f: Int -> Int }` |
| h3 | check: E_TYPE `Type { f: Int -> Int } is not comparable` |
| h4 | accepted through specialization |
| cmp-c | passes check; specialize: E_INTERNAL R005B placeholder (Task 8) |
| cmp-cf | check: E_TYPE 6:43 `Type { c: Int, f: Int -> Int } is not comparable` |
| cmp-open | check: `Cannot tell whether divide's u or v has field c; annotate this lambda's parameters` |
| pr-c | passes check; Task 8 placeholder |
| pr-cf | check: E_TYPE `Expected a printable value, found { c: Int, f: Int -> Int }` |
| pk-absurd1 | accepted through specialization |
| pk-absurd | check: `Cannot tell … no annotation can decide u and v` |
| pk-crash-open | the same `Cannot tell` |
| pk-crash-c, pk-crash-d | both pass check; Task 8 placeholder |
| pk-part | passes check (`part` fixes `u`); Task 8 placeholder |
| pk-whole | check: E_TYPE `Expected { ...u }, found { ...u, ...v }` |
| eq-c | passes check; Task 8 placeholder |
| eq-d | check: E_TYPE `Expected { c: Int, ..._ } -> Bool, found { d: Int } -> Bool` |

No program with several tails passes Specialize today, so no pair can be
*run* under two splits. Every run-time verdict below is therefore about
the reference evaluator (Lean) or derived, never observed.

## 1. Disagreement 1a: comparison

The author asks for two verdicts here: acceptance, and run-time output.

**Acceptance: Stream 8 is right; Stream 5's row C2 is false.** cmp-c and
cmp-cf are two valid splits of one call. Both satisfy `D`. One passes
check and the other is refused at check because the caller's comparison
operand has the split part's type. That is a split-dependent acceptance
outcome on today's compiler, with two tails and the split written as
the checker asks. It confirms Stream 8's prediction (statements.md §8,
"E2c's shape with `==`"), which until now rested on the one-tail
analogue h3/h4.

Stream 5's C2 is right only about the case it reasons from: a
comparison in the *generic* function, whose operand mentions a rigid
row. Comparable.purs:76-80 refuses that operand whatever the split
(rigid: `not comparable`; hole: `Ambiguous`). It does not cover a
comparison in the *caller* whose operand type is a flexible variable
that the instantiation solves. There the check runs on the solved
type, after the split is chosen. The same mistake affects Stream 5's S1
row: it calls printability's check-time part a pass for any tail or
variable ("so it passes"), and it places the split-dependent part
"after specialization". pr-cf is refused **at check** by printability
in the caller. For the caller's sites, both checks happen at check
time, and both depend on the split.

In Stream 8's terms this is (b), not (a): once comparability counts as
a requirement on the caller's flexible variable (clause (i) of
`Covers`, `ok k` = comparable), cmp-cf is an invalid split and cmp-c
the valid one. It is not evidence that two *valid* splits differ.

**Run-time output: no difference shown, and none is possible in the
projection-free fragment (derived, not proved).** In both cmp
programs the comparison sits in a lambda that `divide` never applies.
For `divide` to apply `k`, it needs a value of type `{ ...u }`, which
is §2's question. The reference evaluator gives no guarantee either
way about `==`, because λ-split has no equality operator. `ann_k`
stands for a comparison operand's *type*, and the Boolean result is
not modelled. So `eval_split` does not cover comparison output. The
derived argument: `==` compares two values. By R the values do not
depend on the split. A Go `==` that dispatches on the static type is
under A-go, as `show`'s printer is. Finding F5.

## 2. Disagreement 1b: the applied `peek`

**Verdict: Stream 8 is right about its fragment and about today's
compiler. Stream 5's claim ("once `peek` is applied and both splits are
printable, the printed output differs between two valid splits") is
false as stated. It holds only (i) with a projection (E3, excluded) or
(ii) for two *different programs* whose arguments fix different `u`,
which are not two splits of one call.** Stream 8's supporting argument
in §8 is incomplete, though its conclusion survives (F4).

As the author asked, each candidate must give `peek` a well-typed
argument, without silently adding a projection and without fixing the
split. Every construction I found fails one of these three tests:

| Candidate | Well typed? | Projection? | Fixes the split? | Counts? |
|---|---|---|---|---|
| `peek(whole)` (pk-whole) | no: `{ ...u }` against `{ ...u, ...v }` with rigid `v` | — | — | no |
| `peek(left)` | no: rigid `s` is not `u` | — | — | no |
| a parameter `part: { ...u }` (pk-part) | yes | no | **yes**: `part`'s type is `u`'s image at the key, so `v` is `whole ∖ u` | no |
| a parameter of type `{ l: Int, ...u }`, `{ box: { ...u } }`, or a callback `(X) -> { ...u }` returning a written record | yes | no | **yes**: the caller's value or lambda body equates `u` with a ground row | no |
| `pick(whole)`, `pick: ({ ...p, ...q }) -> { ...p }` | yes | **yes**: no source body has this type except a projection primitive or foreign function (E3) | no | no |
| a callback `g: (Int) -> { ...u }` passed `fn(n) => crash("boom")`, split written by a second lambda (pk-crash-c/-d) | yes | no | no: `crash`'s result type is unconstrained; the split comes from `k`'s annotation, the same in kind as cmp-c/cmp-cf | **candidate, but no value**: `g(0)` crashes before `show` runs; the output (the crash report for "boom") is the same under both splits |
| `absurd(0)`, `fn absurd(n: Int): { ...p } = absurd(n)` (pk-absurd1 accepted; pk-absurd) | yes | no | no | **candidate, but no value**: it diverges; with the split open, `CannotTell` refuses it today |

So the precise sense in which both streams are partly right:

- Stream 8 says there is "no value of type `{ ...u }`" to apply `peek`
  to without fixing `u` or projecting. As a statement about *values*,
  that holds. As written in §8, as a two-way case split ("either a
  parameter of type `{ ...u }` … or a projection"), it is incomplete:
  `{ ...u }` can also come from a callback's result or from a field or
  extension of a parameter, and well-typed *expressions* of type
  `{ ...u }` exist that fix nothing (pk-crash, pk-absurd). Those
  expressions crash or diverge, so `show` never receives a value. The
  conclusion survives, and it survives for a stronger reason than the
  case split: `eval_split` (Run.lean) holds for every projection-free
  term, whatever its type and wherever its values come from, so no
  enumeration is needed. The enumeration in §8 should be replaced by a
  citation of R, plus a note on the bottom-typed expressions.
- Stream 5 is right that *if* a value of type `{ ...u }` whose labels
  the split decided reached `show`, the output would show the split.
  Such a value needs a projection: (a) belongs to E3, not to the
  projection-free fragment. Stream 5's inference that decision 3 "is
  needed even with a complete constraint model" for this reason is
  unsupported. Decision 3 may still be needed, for E2′ (inference
  order), E5 (R010 admissibility) and A-go (Go is unmodelled), but not
  because of `peek`.

Caveat on the "no value" cases: the λ-split model has no `crash`. Its
`none` covers both stuck and out-of-fuel, so pk-crash and pk-absurd
are equal in the model (both `none`). In the compiler, a crash prints
its argument, and that argument does not depend on the split. Derived.

## 3. Third review of Stream 8's post-review fixes (a4552b1)

The diff touches statements.md (§1.2 forcing wording; §2 `{}` row,
split-variant convention, `CannotTell` row; §4 the new "Ground check
silent" item and C's standing; §5 the typed-position row; §6 the
second-review table; §8 new), ground-check.md (§2 references row, §3
G1, §5.3 G2) and a comment in Defs.lean. I checked each fix against the
Lean and the code.

### 3.1 Soundness pass

Confirmed as fixed:

- `req_of_covers` states what §4 and ground-check.md §5.3 now attribute
  to it, provided its premise is kept (F7). With `Req₀` or `Req₁`,
  `Req g θ'` gives `Sat θ' (D g)`, so the call-edge check of `D`
  holds.
- `accepted_split` uses `SplitVariant` only to transport `Req`
  (`obtain ⟨_, _, _, _, hR⟩`), as V1's fix says.
- Boundary.lean:25-26 is `e2c`'s `loc`, which sets row 4 by hand. V2's
  citation is accurate.
- `param_image` proves that `{ ...u, ...v }` is defined at both
  witnesses (W6).
- §1.2's uniqueness derivation is correct: `u ⊆ { a, f }`, `a ∉ u`
  (disjoint from `s`), `f ∉ u` (`Pr`), so `u = {}`.
- `eval_split`'s Lean statement matches R's prose: every pair of keys,
  projection-free `t`, and `ρ` of projection-free values.
- `covers_req₁_iff` matches §4's M1 bullet.

New findings:

- **F7 (wording).** §4's "Ground check silent": "Under `Covers`, every
  copy that specialization creates meets its callee's interface." The
  Lean (`req_of_covers`) needs the root's `Req f θ`. Copies created
  from a root whose own interface fails are not covered. Under
  `Req₁`, E2c's split-1 `main` is such a root. Fix: "from any
  declaration and key whose interface holds".
- **F10 (overclaim, ground-check.md §3, G1's fix).** "Any other such
  defect would give a silently wrong layout." A field type copied from
  the wrong row can also give Go that fails `go build`, a type mismatch
  at a call boundary, which is loud. "Silently" is not established for
  every other defect. Fix: "any other such defect is not caught by the
  specializer; it may give a wrong layout or Go that does not
  compile".
- **F15 (wording, Examples.lean against §4's E2-formal).** `e2`'s `Req`
  is written by hand (`f ≠ 1 ∨ (Sat θ divideD ∧ Printable …)`), not as
  `Req₁ (e2 w)`. It is equal to `Req₁` by inspection (divide's only
  local site is `site 0` at `uTy`; `main` and the rest have no sites
  and `D = []`), but no lemma states this. §4 says "Under M1". Either
  add `e2_req₁ : (e2 w).Req = Req₁ (e2 w)` or say "a hand-written
  instance of M1".
- **F12 (wording, §2 split variants).** V2's fix says the encoding is a
  convention. The probes show what the convention hides: today the
  only way to pass an unforced split through check is to write it as a
  caller-side annotation (cmp-open's diagnostic). The two splits are
  then two texts, the annotation is itself a typed site (cmp-cf's
  refusal is *at* it), and "same bodies and `ty`" holds only because
  the annotation is encoded as `wit`/`loc` and not as text. Say so,
  and note that the written split's annotation is where the caller-side
  requirement fails.
- The new §8 has two findings, F4 (§2 above) and the comparison point,
  which is correct (§1 above).

No statement in §4 is false against the Lean. The theorems are what
they say. The open soundness questions are in what the prose around
them says the model covers (F6, F14 below).

### 3.2 Completeness pass (statements.md §7's narrowing)

What else makes acceptance split-dependent, and is neither modelled nor
listed?

- **F6 (gap, and an overclaim in §3.3 and §7).** The caller's own
  equations. eq-c and eq-d are two splits that both satisfy `D`. The
  caller's `fn(p) => p.c` refuses one at check. That is a body
  constraint (`B`, Stream 5's R6), not a requirement site, and λ-split
  has no equations: `SiteOk` tests only definedness and `ok`, and no
  site can say "`u` has `c`". §4 defines "valid in the model" as
  clause (i) plus clause (ii), with no `B` in it. So a split can be
  "valid in the model" and still be refused by the checker. §3.3 says
  clause (i) stands for "the check-time judgments that see the
  instantiation", and §7 says acceptance covers them. Equations are
  such judgments, and they are not covered. This does not make C
  false, since C's `Accepted` is about sites only. It does narrow C.
  Fix: in §4, "valid in the model" presupposes that the split solves
  the caller's and the callee's `B`. In §7, acceptance covers
  requirement sites, and equation failures belong to validity
  (Stream 5's translation), not to this model. The missing
  copy-placement theorem in ground-check.md §5.3 is the same gap.
- **F11 (gap).** The type-depth limit (Unify.purs:105, `TooDeep`, more
  than 1,000 levels; Stream 5's C4) is a check-time refusal whose
  trigger depends on the size of the solution, so in principle on the
  split. Stream 8 lists the key limit but not this one. List it beside
  the key limit, as a resource bound.
- **F5 (gap).** `==`'s run-time result is not in λ-split (§1 above).
  R does not cover comparison output. Either add an `eq` term or list
  it among the unmodelled operations.
- **Holes versus written parts at caller sites.** These are listed
  ("holes versus chosen parts"), but the probes add a fact: with the
  split open, `CannotTell` refuses first (cmp-open, pk-crash-open), so
  the `Ambiguous` route that §1.3 describes is not what the user sees
  with several tails. This is wording only. The row stays correct.
- Checked and already listed: R010, `CannotTell`, the key limit, the
  Task 8 placeholder, `Fail` payloads, effects, patterns and control
  flow, diagnostics order, Go (A-go).

### 3.3 R010 and inference (the author's two decisions)

Semantic validity and R010 admissibility are separate properties.
Passages that conflate them:

- **F13 (wording).** statements.md §1, third bullet: "That is (a) for
  today's rules, unless R010 is relaxed or its admissibility is counted
  as part of split validity". §1.5, last sentence: "make 'admissible
  under R010' part of what makes a split valid". §2's excluded table:
  "two valid splits can differ". The dossier, §18.21 item 3: "counting
  admissibility in split validity". In Stream 5's C1 row: "it restricts
  which solutions count". Fix: E5 shows that two *valid* witnesses can
  differ in *admissibility*, and admissibility, not validity, decides
  acceptance in a recursive group. The remedy is to choose among valid
  and admissible witnesses, or to relax R010. Validity is unchanged.
  E5 is also not (a) in §18.17's sense ("genuinely observable
  differences"). Its difference is in acceptance, and nothing is
  observed at run time.

Inference remains a goal. E2′ shows that choosing a split first and
then inferring an interface from it is unstable. It does not show that
inference must make acceptance arbitrary. Passages that overclaim:

- **F14 (overclaim).** §1, second bullet: "if requirements are
  *inferred* … the difference is genuine (a) again". §1.4: "Each split
  is valid in its own inferred model, so the difference is genuine:
  (a)", and "choosing it is a selection rule again". §5's table:
  declared form "needed: E2′". §7: "interfaces must be declared …
  Inferred interfaces are E2′". The dossier, §18.21's questions: "C
  needs that declared form; inferred interfaces bring back (a) through
  E2′". What is proved: C holds for interfaces shared by the two
  variants (declared form). What E2′ shows (derived, reviewer-checked):
  split-first inference gives two interfaces. Not shown: that every
  inference does so. An inference that computes the requirement
  together with the split, for instance the weakest per-region
  requirement §1.4 itself exhibits for `route`, is a principal-
  interface computation, not an arbitrary split selection. Whether one
  exists in general, with two requirement kinds, is open (§1.4 says
  "none of this is proved", correctly). Fix: replace "needed" with "C is
  proved for"; replace "inferred interfaces are E2′" with "interfaces
  inferred from a split chosen first are E2′"; drop "a selection rule
  again", or qualify it as "unless the inference is principal".
- Stream 5 makes no inference overclaim. Its §3.2 item 3 states the ∀
  reading and the current template rule side by side.

## 4. The author's added points

1. Comparison: acceptance and output have separate verdicts in §1.
   Acceptance: split-dependent when the requirement is not counted, run
   today (cmp-c, cmp-cf). Output: not shown to differ, and not
   modelled (F5).
2. Applied `peek`: §2's table checks each candidate against the three
   conditions and says which one disqualifies it. None counts. The two
   that pass all three conditions (pk-crash, pk-absurd) produce no
   value.
3. **Ground checking and lowered layouts (F8, overclaim).**
   ground-check.md §6's table row "Gap it closes: the link from a
   certificate table to the layouts actually lowered", the paragraph
   under it ("validates, at the keys used, that what the specializer
   lowered is a solution of that same recorded problem"), and the
   dossier §18.21 ("it does close the gap between a certificate and the
   layouts lowered") all say too much. The check evaluates recorded
   atoms on bindings at a key. It reads those bindings from the same
   lowering it is meant to check (the key's lowered rows and types).
   It does not inspect the Go structs, the field order, the conversion
   at a call boundary, or whether the value passed as `whole` has the
   layout the copy expects (Task 8's layout identity). A defect shared
   by the lowering and the check's own evaluation of types passes
   unseen. Suggested wording for §6's row: "Gap it narrows: whether the
   bindings the specializer computed at each reached key satisfy the
   recorded constraints. Whether lowering and Go emission implement
   those bindings is not checked; that needs a separate argument or
   test (A-go, Task 8)." And for the paragraph: "the ground check
   checks, at the keys used, that the bindings the specializer computed
   satisfy the same recorded problem. It is evidence about the
   bindings, not about the layouts or the Go built from them."
4. **"Linear" (F9, overclaim).** ground-check.md §4 says "Total O(Σ
   over keys of Σ atoms of label counts): linear in the size of the
   specialized program times the atoms per declaration", and §7 says
   "cheap (linear, no solver)". Three qualifications are missing:
   - the representation traversed is the *ground* image at each key,
     after tails are flattened into label sets (`singleTail` splices
     each tail's layout fields) and nested records are lowered. Its
     size is the lowered size, not the source size;
   - interning is not constant time: `internLayout` sorts the fields
     (`sortFields`) and looks them up in a `Map` keyed by field arrays,
     so each record node costs O(k log k + k log L) for k fields and L
     layouts so far;
   - the number of keys is that of the specialized program, which can
     be exponential in source size (it is capped at 10,000 today).
   Suggested wording: "Per key, the cost is linear in the total size
   of the atoms' ground images (flattened rows and lowered nested
   types), up to the sorting and map lookup of interning (a log
   factor). Summed over the keys the program reaches, it is linear in
   the size of the specialized program's lowered types, not in source
   size; the number of keys is bounded only by the key limit. Not
   measured."

## 5. Do the two streams combine into a recorder specification?

§18.20's gate needs "a complete recorder specification … and a checker
whose guarantees cover exactly what was recorded". Mismatches that
matter to it:

| # | Topic | Stream 5 | Stream 8 | Why it matters |
|---|---|---|---|---|
| M1 | requirement atom | `printable τ` in `B` at each site, plus a row-level clause `r printable` in `D` passed to callers as `lacks` is; a field-level reading is "outside set terms" (§3.3) | `ok k` on the site's *ground* type at the local key; the forcing argument (§1.2) places `f` by its type, which is field-level | The recorder must choose. A row-level clause keeps set terms, but a split search at a generic call must then propagate it through `r|T`. A ground predicate needs typed atoms, which the presence results do not cover (Stream 8 says so) |
| M2 | comparability | not a requirement (C2, false: §1) | a requirement kind (`ok`) | Must be recorded on caller-side flexible types (cmp-cf) |
| M3 | when caller-side requirements are judged | S1: after specialization only | clause (i): at check time, at the local key | pr-cf and h1 are refused at check, so the recorder must capture caller-side requirement atoms during check |
| M4 | where a callee's requirement lives | `D` (a declared clause); under the ∀ reading `divide` is invalid without one | `Req`, either declared (C applies) or `Req₁` from local sites (inferred; outside C when sites depend on the split) | The same choice as F14: a declared clause matches Stream 8's declared form; `Req₁` matches neither Stream 5's ∀ reading nor C |
| M5 | `B` | every body atom (R1-R16), including definedness (R5, R14) | none; definedness through `ann` sites at every typed position (a convention) | C's guarantee does not cover `B` (F6). A checker whose guarantees cover what was recorded needs either a copy-placement theorem or a narrowed claim |
| M6 | fragment | update, removal, patterns, `match`, `let` translated (R7-R10, R15-R16) | excluded | C covers less than the recorder records; the gap must be stated in the checker's guarantee |
| M7 | R010 | side condition on witnesses | excluded, rule on form | They agree; both should say admissibility, not validity (F13) |
| M8 | holes | S6: lowered as the empty rest | excluded | They agree; the recorder must keep a hole that a requirement mentions ambiguous (ADR 007, condition 1) |
| M9 | calls and references | R11, R12 instantiate `D_f` into `B` | clause (ii), `Req g` at the witness; a reference as an eta-expanded call | They agree in shape; R11 must also instantiate any requirement clause (M1, M4) |

Where they agree: printability is (b) for E2, R010 sits outside the
constraint atoms, a bare reference behaves as a call, and the
undetermined-hole default is a hidden canonical split.

## 6. Findings

| # | Where | Severity | One line | Correction |
|---|---|---|---|---|
| F1 | translation.md §3.1 C2, §3 intro, §3.3 close; dossier §18.18 | false | comparison "never separates two valid splits" | false at caller sites (cmp-c/cmp-cf); restrict to comparisons in the generic function, and add comparability as a requirement kind |
| F2 | translation.md §3.1 S1 | false | the check-time part "passes"; the split-dependent check happens "after specialization" | caller sites are judged at check on the solved type (h1, pr-cf) |
| F3 | translation.md §3.2 "also shows (a)"; dossier §18.18 | false | applied `peek` gives different output under two valid splits | holds only with a projection (E3) or across different programs; drop it, or restate as E3 |
| F4 | statements.md §8 | overclaim | a two-way case split on where `{ ...u }` comes from | incomplete (callbacks, fields, bottom-typed expressions); cite R instead |
| F5 | statements.md §2, §4 R | gap | `==`'s result not modelled | add an `eq` term, or list it as unmodelled |
| F6 | statements.md §3.3, §4 "valid in the model", §7 | gap / overclaim | the caller's equations `B` are not in `Covers` | state that validity presupposes `B`; narrow §7 (eq-c/eq-d) |
| F7 | statements.md §4 "Ground check silent" | wording | the root hypothesis `Req f θ` is dropped | add it |
| F8 | ground-check.md §6; dossier §18.21 | overclaim | "closes the gap" to lowered layouts | wording in §4 above |
| F9 | ground-check.md §4, §7 | overclaim | "linear" without saying in what | wording in §4 above |
| F10 | ground-check.md §3 | overclaim | other defects give "a silently wrong layout" | "a wrong layout or Go that does not compile" |
| F11 | statements.md §2, §5, §7 | gap | the type-depth limit is not listed | list it with the key limit |
| F12 | statements.md §2 | wording | the written split is an annotation in the caller's text | say so; it is also where caller-side requirements fail |
| F13 | statements.md §1, §1.5, §2; translation.md C1; dossier §18.21 | wording | admissibility treated as part of validity | keep the two separate (§3.3 above) |
| F14 | statements.md §1, §1.4, §5, §7; dossier §18.21 | overclaim | inference said to bring back (a) | limit to inference from a split chosen first |
| F15 | Examples.lean against §4 | wording | `e2`'s `Req` is a hand-written M1 instance | a lemma `= Req₁`, or say so |

## 7. Questions for the author

1. Is a written split by caller-side annotation (the checker's own
   suggestion, cmp-open) what decision 3 means by "written"? If so, a
   requirement failing at that annotation (cmp-cf) is the programmer's
   own text and is (b). Should the diagnostic say which requirement
   rules the written split out?
2. Comparability and printability at caller sites: record them as
   atoms on flexible variables at check time (M2, M3), or require a
   declared clause on the callee's row (M1, M4)? The second keeps set
   terms. The first is what the compiler does today.
3. Should Stream 8's C be extended with the caller's `B` (equations),
   so that "valid in the model" means a solution, or should C stay a
   statement about requirement sites with validity proved elsewhere?
4. Stream 5's F3: withdraw the `peek` (a) claim, or restate it as an
   E3 example? It also carries the justification it gives for decision
   3.
5. Inference (F14): should statements.md be restated so that its only
   claim is that interfaces inferred from a split chosen first are
   unstable, leaving principal requirement inference open?
