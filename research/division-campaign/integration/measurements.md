# Size measurements: what a verified signature checker would face

Stream 7b, follow-up 1 of dossier §18.17 to Stream 7's reconnaissance
(recon.md, §5.1 step 3 and risk 1). Read-only. Written 2026-10-21
against `77e0fa3`. No compiler source was changed. The tool lives in
measure/; the run and the hand checks it starts with are in §6.

Status labels follow recon.md. **Checked** means computed by the tool
in measure/. **Not proved** marks the slicing numbers. They measure what
a slicing would leave, and no lemma says that slicing is sound.

## 0. In brief

- **Corpus.** 864 distinct sources resolved: 140 `.wxw` files, 99 JSON
  fixtures, 13 Markdown blocks, 212 strings from test data modules and
  400 programs from the two record generators (seeds 1-200 each).
  Together they hold 2,679 functions. 488 of them have a rigid record
  row: 180 hand-written, 308 generated. 44 sources were left out
  because parse or Resolve refused them (§2.4).
- **Rigid rows and labels.** Over every function, `|R|` is at most 4.
  Among functions with `|R| > 0`, `|L|` is at most 4 (generated) and at
  most 2 (hand-written). The largest `|L|` anywhere is 19, in a
  generated `main`, which has no rigid row.
- **checkAll's patterns.** Most enumerated is 2^4 = 16 patterns for one
  function: 41 generated functions (`|R| = 1`, `|L| = 4`) and 7
  hand-written ones (`restricted` in programs/p5.wxw and `noX` in the
  r005b fixtures with `|R| = 2`, `|L| = 2`; `det` with `|R| = 4`,
  `|L| = 1`). The total over all
  2,679 functions is 4,389 patterns. At most 2^3 of them are consistent
  with `D` in any one function.
- **bitCheck.** At most 2^9 vectors where `|R| > 0` (`three` and
  `merge3` in the r005b fixtures: 3 rigid and 6 flexible rows). At most
  2^18 anywhere, in generated `main`s with no rigid row.
- **On this corpus the exponential enumeration does not block.** P9s's
  `checkAll` and `bitCheck` stay at a few hundred cases at most for
  every function. The presence decider's `writtenCheck`, with its
  2^((|Rm|+|F|)·|L|) flexible search, would block: 2^270 for one
  generated `main`. Every function over 2^10 there has `|R| = 0`. Those
  are call-site problems, not signature problems (§4).
- **The corpus is not evidence about larger programs.** It is the
  repository's test suite for record rules, with small functions that
  each exercise one rule. The pattern count grows with every label
  written anywhere in a body. The synthetic `wide` (§6.1) has two rigid
  rows beside a ground 20-field record: 2^42 patterns, 2^2 after
  slicing.
- **Slicing (measurement, not proved).** Splitting a function into the
  connected components of its constraint variables changes little here.
  The largest pattern count stays 2^4, because in those functions one
  component already holds every label. The largest hand-written count
  drops from 2^4 to 2^2.6, and `writtenCheck` restricted to components
  holding a rigid row is at most 2^7.

## 1. What is counted

For each function, `P` is the signature problem the dossier defines
(Validity.lean `SigProblem`: rigid rows, rigid type variables, `D`,
`B`), approximated by the atoms the checker made (§2).

| Name | Meaning | Lean source |
|---|---|---|
| `R` | the signature's record row variables (`RecordSort`) | `P.rigidRow` |
| `Rm` | rigid rows that some atom mentions | Presence `mentioned` (D2Terms.lean:32) |
| `L` | labels written in `D` and `B` | `written P` (Sig/Generic.lean:53) |
| `L rel.` | labels in a component that holds a rigid row (§5) | none |
| `F` | record-row metas that some atom mentions | `flexMentioned` (Presence/Decide.lean:30) |
| patterns | 2^(\|R\|·\|L\|) | `patterns` = `subsets (pairs P)` (Patterns.lean:17-23) |
| consistent | patterns that `consistentS` keeps: per label, the subsets of `R` that hold it, no row lacking it in `D`, no two rows `D` declares disjoint | Patterns.lean:26 |
| bitCheck | 2^\|Rm\| rigid vectors, each with up to 2^\|F\| flexible ones: 2^(\|Rm\|+\|F\|) at worst | Presence/Decide.lean:81 |
| writtenCheck | 2^(\|Rm\|·\|L\|) patterns, each with up to 2^(\|F\|·\|L\|) choices | Presence/DecideValid.lean:34 |

`checkAll` builds every subset and then filters by `consistentS`, so
it pays for all 2^(|R|·|L|) patterns. "Consistent" counts what an
enumerator that skipped inconsistent patterns would pay. That would be
a new definition and needs a lemma that it lists the same patterns.

Lean's `mentioned` and `flexMentioned` are lists with repeats, and
`vecs` doubles once per element (D2Terms.lean:204-207), repeats
included. The counts here are over distinct indices. A port that does
not deduplicate pays more.

bitCheck decides only the rest-region half of the presence fragment
(flat rows). It is counted because the stream asked for it. P9s's
`checkAll` checks a certificate and searches nothing.

## 2. How it was measured

### 2.1 Recording

measure/measure.mjs copies output/ (the built compiler) into a scratch
directory. In the copy, a wrapper is appended to five modules, and each
wrapper logs its call before passing it on:

| Wrapped | Source | Logged as |
|---|---|---|
| `unify` | Check/Unify.purs:68 | `eq left right` |
| `requireLack` | Check/Disjoint.purs:74 | `lacks tail label` |
| `requireApart` | Check/Disjoint.purs:95 | `apart one other` |
| `seedApart` | Check/Disjoint.purs:133 | `apart one other`, D when both are rigid |
| `addLackTable` | Check/Lacks.purs:40 | `lacks tail labels`, D when the tail is rigid |
| `made` | Check/RowMerge/Predicate.purs:36 | `merge left right result` |

Each function is checked once, alone, by `recheck`
(Check/Function.purs:34), with the logger on. That is the same call
Features/Check.purs:42 makes.

Classification follows recon.md §3.3. A fact seeded on rigid tails
belongs to `D`, since only `own` (Function.purs:124) seeds rigid
tails. Everything else belongs to `B`.

### 2.2 What the log over- and under-counts

- **Propagation is logged too.** RecordTail.purs:113-118 hands a bound
  meta's lacks on to its image's tails through `addLackTable` and
  `requireLack`. RowMerge/Cases.purs:143 adds lacks for a fresh meta.
  Both follow from `B` and the solution so far. They use only labels
  already in `B`, so `L` is unchanged, but they can join slices,
  making the sliced counts upper bounds.
- **Merge cases are not logged.** They unify through `unifyPlain`
  (Unify.purs:78), which is not wrapped.
- **One predicate, two calls.** Chain.purs:60-61 and Desugar.purs:49-50
  each evaluate `predicateFor` twice per predicate and keep one result.
  `made` is therefore called twice with the same result meta, and the
  tool counts the predicate once (metrics.mjs). A recorder hooked at
  `made` would face the same thing (recorder-interface.md §3).
- **Reverts are not undone.** A postponed effect pair that reverts
  (Subst.purs:51-65) drops its atoms from the substitution but not from
  this log.
- **Diagnostic re-unification is logged.** Argument.purs:65 unifies
  again to word a refusal. It only affects functions already refused.
- **Overlap.purs:89-96 is not logged.** It checks `lacks r l` for a
  rigid base without `requireLack`. The label also appears in the
  extension's `eq` atom, so `L` is unchanged.
- **Effect rows are left out.** Their label arguments are walked for
  record types.

### 2.3 Slicing, as measured

Each atom is cut into groups. Two records whose levels are unified
together form one group of their labels and tails. Fields both sides
hold are unified one level down. A field on one side only joins its
field type's variables to the level's group. Arrows, data types with
the same constructor, and equal base types are matched part by part.
Any other pair, such as a type meta against a type, is one coarse
group of everything in both. A slice is a connected component of the
variables, together with the labels of its groups. Groups with no
variable (ground records) belong to no slice. The coarse groups only
ever join components, so each sliced count is an upper bound for this
slicing.

### 2.4 The corpus and what was left out

measure/corpus.mjs collects, deduplicated by source text:

- every `*.wxw` file outside node_modules, .claude, .build and output;
- every JSON fixture under test/fixtures with a string `source`;
- every waxwing-fenced block in Markdown under docs/, research/ and at
  the top level (snippets without `main` get `fn main(): Int = 0;`);
- every string that writes `fn name(` and is exported by
  test/*programs.mjs, *forms.mjs or *lambdas.mjs, at any depth of arrays
  and plain objects;
- `generate(seed)` of test/fx-gen-record-extension.mjs and
  test/fx-gen-record-patterns.mjs for seeds 1-200 (`SEEDS` changes it).

Not collected: programs written inline in `*.test.mjs` files, mostly as
concatenated quoted strings, which would mean running the tests;
programs that exported functions build; the scale generators.

**Two spreads.** Resolve at `77e0fa3` refuses `{ ...a, ...b }`
(Resolve/Record.purs:73-80, `SecondSpread`), and Task 7 is unmerged.
That refusal cost 67 sources, among them 58 of the 76 r005b fixtures.
measure/joins.mjs rewrites each such literal, on the parsed program,
as a single spread of calls to

~~~waxwing
fn wxJoin(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = wxJoin(a, b);
~~~

The call writes the same labels and the same rigid rows as the literal.
It adds two row metas, one `Merge` and one apart pair per join, so `F`
is inflated for these functions while `L` and `R` are not. 217
functions come from rewritten sources; the worst-case table marks them
`(j)`.

**Left out (44 sources):**

- parse: 10. Three are `.wxw` files (negative/syntax.wxw, intended;
  editors/vscode/fixtures/text-literals.wxw;
  test/fx008-probes/rev6/around4.wxw) and seven are Markdown sketches in
  older syntax.
- Resolve: 34. Seven are `.wxw` files: four fx008 probes with `Fail
  needs a concrete error family`, rev6/con.wxw with `Invalid handler
  effect`, programs/p7.wxw with `mergeWith` unbound, and
  negative/unbound.wxw, which is meant to fail. The other 27 are 17
  Markdown snippets and 10 test/fx-cleanup-programs.mjs cases. Nearly
  all of them name a function, type or local that the snippet does not
  define.

## 3. Results (checked)

Run of `node research/division-campaign/integration/measure/measure.mjs
<scratch>` at `77e0fa3` (§6). Counts are log2.

| origin | sources | not resolved | functions | R > 0 | from joined sources |
|---|---|---|---|---|---|
| .wxw files | 140 | 10 | 275 | 27 | 23 |
| JSON fixtures | 99 | 0 | 304 | 142 | 190 |
| Markdown blocks | 13 | 24 | 28 | 11 | 4 |
| test data modules | 212 | 10 | 869 | 0 | 0 |
| generated (seeded) | 400 | 0 | 1203 | 308 | 0 |

All 2,679 functions:

| measure | p50 | p90 | p99 | max |
|---|---|---|---|---|
| R | 0 | 1 | 2 | 4 |
| L | 0 | 7 | 15 | 19 |
| L rel. | 0 | 1 | 4 | 4 |
| flex rows | 0 | 6 | 12 | 18 |
| log2 patterns | 0 | 1 | 4 | 4 |
| log2 consistent | 0 | 0 | 0 | 3 |
| log2 bitCheck | 0 | 6 | 12 | 18 |
| log2 writtenCheck | 0 | 18 | 120 | 270 |
| log2 sliced patterns | 0 | 1 | 4 | 4 |
| log2 sliced bitCheck | 0 | 1 | 5 | 9 |
| log2 sliced writtenCheck | 0 | 1 | 4 | 7 |

Hand-written functions with `|R| > 0` (180):

| measure | p50 | p90 | p99 | max |
|---|---|---|---|---|
| R | 2 | 3 | 4 | 4 |
| L | 0 | 1 | 2 | 2 |
| L rel. | 0 | 1 | 2 | 2 |
| flex rows | 3 | 5 | 6 | 6 |
| log2 patterns | 0 | 2 | 4 | 4 |
| log2 consistent | 0 | 1 | 2 | 3 |
| log2 bitCheck | 5 | 8 | 9 | 9 |
| log2 writtenCheck | 0 | 4 | 7 | 7 |
| log2 sliced patterns | 0 | 2 | 2.6 | 2.6 |
| log2 sliced bitCheck | 5 | 8 | 9 | 9 |
| log2 sliced writtenCheck | 0 | 2 | 7 | 7 |

Generated functions with `|R| > 0` (308): `|R| = 1` and `|F| <= 1` in
every one. `|L|` p50 2, max 4. Patterns max 2^4, and exactly one is
consistent in each: the generators write `{ k: T, ...r }`, so `r` lacks
every label written beside it. bitCheck at most 2^2, writtenCheck at
most 2^8.

Functions over a threshold (all 2,679):

| log2 cases | > 10 | > 20 | > 30 | > 40 |
|---|---|---|---|---|
| patterns | 0 | 0 | 0 | 0 |
| consistent | 0 | 0 | 0 | 0 |
| bitCheck | 66 | 0 | 0 | 0 |
| writtenCheck | 298 | 265 | 247 | 232 |
| sliced patterns | 0 | 0 | 0 | 0 |
| sliced bitCheck | 0 | 0 | 0 | 0 |
| sliced writtenCheck | 0 | 0 | 0 | 0 |

Every function over 2^10 in writtenCheck is a `main` with `|R| = 0`.

Worst by patterns, ties broken by writtenCheck. `(j)`: two spreads
joined (§2.4). One row stands for its copies: the 41 generated
functions at 2^4, and the `-annotated`, `-fix` and twin fixtures with
equal sizes.

| function | origin | R | Rm | L | L rel. | F | pat. | cons. | bit | wr. | sl. pat. | slices |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| g0 | generated: fx-gen-record-extension@2 | 1 | 1 | 4 | 4 | 1 | 4 | 0 | 2 | 8 | 4 | 1 |
| restricted | composition-assessment/programs/p5.wxw (j) | 2 | 2 | 2 | 2 | 0 | 4 | 2 | 2 | 4 | 2 | 2 |
| noX | r005b/diag-14-fix.json (j) | 2 | 2 | 2 | 2 | 0 | 4 | 2 | 2 | 4 | 2 | 2 |
| noX | r005b/render-split.json | 2 | 2 | 2 | 2 | 0 | 4 | 2 | 2 | 4 | 2 | 2 |
| det | r005b/determinate.json (j) | 4 | 2 | 1 | 1 | 0 | 4 | 3 | 2 | 2 | 2 | 1 |
| f0 | generated: fx-gen-record-patterns@11 | 1 | 1 | 4 | 4 | 0 | 4 | 0 | 1 | 4 | 4 | 1 |
| noX | r005b/render-none-control.json | 3 | 3 | 1 | 1 | 0 | 3 | 0 | 3 | 3 | 2.6 | 3 |
| tagged | r005b/design-mixed-fixed.json (j) | 2 | 2 | 1 | 1 | 5 | 2 | 0 | 7 | 7 | 2 | 1 |
| forwarded | composition-assessment/programs/p6-neg.wxw (j) | 2 | 2 | 1 | 1 | 3 | 2 | 0 | 5 | 5 | 2 | 1 |
| wrap | r005b/diag-04.json (j) | 2 | 2 | 1 | 0 | 3 | 2 | 1.6 | 5 | 5 | 0 | 1 |
| wrapR | r005b/render-nested.json | 2 | 2 | 1 | 0 | 3 | 2 | 1.6 | 5 | 5 | 0 | 1 |
| promote | examples/records.wxw | 1 | 1 | 2 | 2 | 1 | 2 | 0 | 2 | 4 | 2 | 1 |

Worst bitCheck with `|R| > 0`: `three` (r005b/design-generic-three,
`(j)`) and `merge3` (r005b/diag-02, -03, -08, -12, -17 and their fixes,
`(j)`), 3 rigid and 6 flexible rows: 2^9. Worst writtenCheck:
`main` of generated fx-gen-record-patterns@113, `|L| = 15`, `|F| = 18`:
2^270. The worst hand-written `main` is examples/records.wxw's,
`|L| = 6`, `|F| = 9`: 2^54.

Distributions with `|R| > 0` (488 functions): `|R|` = 1: 358, 2: 104,
3: 22, 4: 4. `|L|` = 0: 124, 1: 138, 2: 117, 3: 68, 4: 41. Patterns
(log2) = 0: 124, 1: 119, 2: 127, 3: 70, 4: 48.

## 4. Is the enumeration a practical blocker?

**On this corpus, no (checked).** `checkAll` would enumerate at most 16
patterns for any function, and 4,389 over the whole corpus. bitCheck
enumerates at most 2^9 rigid-and-flexible vectors for a function with a
rigid row.

Two things limit what that says.

1. **The corpus is small-function by construction.** In it, generic
   functions write few labels (`|L| <= 4` wherever `|R| > 0`). Concrete
   labels are written at call sites, in `main` (`|L|` up to 19). That
   pattern may hold for application code, where generic helpers touch
   a few labels and concrete records sit at the uses. It is a
   hypothesis; the corpus cannot test it. `wide` (§6.1) is the
   counterexample shape: one generic body that also builds an unrelated
   20-field record gives 2^42.
2. **Call-site problems are another matter.** Every function over 2^10
   in writtenCheck is a monomorphic `main`. With no rigid row, P9s
   faces one pattern and a certificate check. Deciding those bodies
   without a certificate is the presence decider's flexible search,
   2^(|F|·|L|), or stream 6's `decideCall`. That is the place where an
   enumerating decider is infeasible already on this corpus (2^54 for
   examples/records.wxw). Integration should keep the online solver
   as the search there and check its certificate, not decide by
   enumeration (recon.md §6 question 1).

## 5. Slicing (measurement only, not proved)

| | max over hand-written, R > 0 | max over all |
|---|---|---|
| patterns | 2^4 | 2^4 |
| sliced patterns | 2^2.6 | 2^4 |
| writtenCheck | 2^7 | 2^270 |
| sliced writtenCheck, slices with a rigid row | 2^7 | 2^7 |

On this corpus slicing barely changes `checkAll`'s count. 466 of the
488 functions with a rigid row have one slice, and their labels already
meet a rigid row. It matters when a body writes labels that never meet
a rigid row: `wrap` and `wrapR` (`L rel.` = 0) and the synthetic `wide`
(2^42 → 2^2).

Two lemmas would justify the sliced counts. Neither is proved or
stated in Lean.

- **S1 (independence).** If `D ∪ B` splits into parts with disjoint
  variables, `P` is valid iff each part is. Plausible for ∀∃ over
  disjoint variables. It needs the composition-definedness side
  conditions to stay inside a part, which the cut in §2.3 does not
  check.
- **S2 (irrelevant pairs).** A pair `(r, l)` with `l` written only in
  parts not holding `r` does not change the verdict.

Labelling the alternatives as recon.md §5.1 step 9 does: a proved
slicing lemma, a consistent-only enumerator (§1), or a symbolic
checker. The measurements do not force any of them for this corpus.

## 6. Reproduction and checks

~~~sh
git checkout 43b3a28^ -- src/Features/Check/SeveralTails.purs  # build only
npm run build
node research/division-campaign/integration/measure/measure.mjs \
  <scratch-dir> --json <scratch-dir>/results.json
git rm --cached -q src/Features/Check/SeveralTails.purs
rm src/Features/Check/SeveralTails.purs; rm -rf <scratch-dir>
~~~

It takes a few seconds after the build. `<scratch-dir>` receives a
copy of output/ (about 80 MB). `SEEDS=<n>` sets the generated programs
per generator (default 200).

### 6.1 Hand checks the run starts with

measure/expect.mjs holds six programs with hand-computed sizes. The
run stops if any one differs:

| function | hand computation |
|---|---|
| `g` (monomorphic) | no rigid row, no label, one pattern, no slice |
| `get(x: { a: Int, ...r }) = x.a` | `R = {r}`, `L = {a}`: 2^1 patterns; `r lacks a` is implied, so one consistent; access makes one row meta |
| `h` with `where r disjoint s, r lacks { b }`, body `0` | `R = {r, s}`, `L = {b}`: 2^2; consistent `{}`, `{s}`; one slice |
| `k(x: { a: Int, ...r }, y: { b: Int, ...s })` | 2^4 patterns, 2^2 consistent; two slices of 2^1 |
| `wide`: `k` beside a ground 20-field record | `L` = 21: 2^42 patterns; one slice `{r, s}` with `{a}`: 2^2 |
| `route` (dossier §17.3) | three rigid rows, no label: one pattern; one `Merge` |

The first run found two tool defects that the checks caught: empty
seeded lack tables were counted as `D` atoms, and the doubled `made`
call (§2.2) counted one `Merge` twice. Both are fixed in metrics.mjs.

## 7. Questions for the author

1. Is the corpus representative enough to settle risk 1 for now, or
   should a larger application-shaped program (examples/ grown, or a
   ported real program) be written before recon.md §5.1 step 5?
2. Given §4, point 2, should the integration plan state that call-site bodies
   (`|R| = 0`) are never decided by enumeration, only checked from the
   online solver's certificate?
3. Is the `wxJoin` rewrite acceptable as a stand-in for two-spread
   literals in these measurements, or should they wait for Task 7?
4. Should S1 and S2 (§5) be stated as candidate lemmas for the proof
   dossier, or left until a corpus needs them?
