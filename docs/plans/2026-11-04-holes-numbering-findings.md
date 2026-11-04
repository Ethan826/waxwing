# Holes numbering: do collection and renaming visit the same metas? (2026-11-04)

Lane D of the activation-prerequisites batch (dossier §18.161 (6);
proposal open question 8), on fdd52a3.

## Verdict

The invariant holds. On every body `holes` receives, every meta the
renaming meets is a key of the numbering, so the raw-meta arm at
Features/Check/Holes.purs:50 (`maybe meta identity`) is never taken. The
argument from the code is below. A bounded generated check and a corpus
check agree with it, and each has planted must-fail cases. There is no
src change. The fallback stays in the code: the argument says it is
unreachable and the two tests observe that, but the type of `holes`
does not enforce it.

Lowering never reads a hole's number (Specialize/Lower.purs:53 lowers
any `TVar (Hole _)` to the representative type, and :63 lowers a `Hole _`
record tail to no tail). So a collision could show only in the read-back
or the package, never in compile output. The checked declaration's
`row` keeps raw metas, which the code already records (see "Outside the
body").

## The argument from the code

`holes body` (Holes.purs:43-51) renames by `retype (rename renumber)`
with `named = numbering body`. `renumber (Hole m)` falls back to `Hole
m` when `m` is not a key. `Open` has only `Rigid` and `Hole`
(Internal.purs:25), so the fallback is taken exactly when the renaming
meets a `Hole m` that the numbering missed.

**Expression level: `foldTypes` (numbering) and `retype` (renaming),
Features/Check/Walk.purs.** `Node` has 33 constructors
(Internal.purs:64-101). Both walks handle the same 28 explicitly and
leave the same 5 (`Integer`, `Boolean`, `Local`, `UnitValue`, `Text`)
to a catch-all, and none of those 5 holds a type. For the 28, both walks
visit the node's own type, its instantiation, lambda and
handler-clause parameter types, fail-clause payloads and every
sub-expression (`blockParts`, `fieldValues`, `updateParts` and
`extensionParts` cover every item form). On patterns, both visit the
pattern's type, its field patterns and a `NamedRest`'s type. Those are
all the types an `Expr` holds, so the walks visit the same multiset of
type values. The order differs in places, which changes the numbers but
not the set.

**Type level: `foldHoles` (Holes.purs:63-80) and `rename`
(`substitute` with `{ types: TVar <<< f, rows: openRow <<< f }`,
Domain/Type/Core.purs:112-114, 152-191).** Constructor by constructor:

| `Ty` | `substitute` applies `f` to | `foldHoles` steps on |
| --- | --- | --- |
| `TVar v` | `v` | `v` if a hole (a rigid has no children and no rows) |
| `TData` | arguments; each row | `children` = arguments; `rowsOf` = rows |
| `TFun` spine | each parameter, row, and the result, via `stagesThrough identity` | `children` = the same spine's parameters and result (`spine` = `spineThrough identity`); `rowsOf` = each stage's row |
| `THandler l rows` | `l`'s arguments; `inference`; `clauses` when `Just` | `children` = `l`'s arguments; `handlerRowList` = `inference`, then `clauses` when `Just` |
| `TRecord` | each field type; each tail, through `types` | `children` = field types; `recordTail` = each tail |
| leaves | nothing | nothing |

On a row `Row labels tail`, `substituteRow` (Core.purs:176-183)
applies `f` to the tail when present and substitutes every label's
arguments; `foldRow` steps on the tail when present and folds every
label's arguments (`rowArguments`), and skips only an `isPure` row (no
label, no tail), which holds nothing. Marks (`Mark`, Domain/Row.purs:42)
are not of the variable type and neither walk touches them.

So `numbering body` meets every `Hole m` the renaming meets, and both
read the same `body`. The argument is read from the code at fdd52a3 and
is not mechanized. The generated check reads the `Node` constructors
from `data Node` in src/Domain/Checked/Internal.purs, checks each name
against the compiled module, and requires the samples to reach exactly
those. A constructor added later therefore fails it.

## Results

Generated agreement check, test/r0-holes-walks.test.mjs (fast; support
test/r0-holes-gen.mjs and test/r0-holes-walks.mjs), on the grammar
below, run unamended: 6,000 bodies (203,392 meta occurrences) and
15,000 standalone types (194,596 meta occurrences); all 33 `Node`
constructors reached; 5,375 of the 6,000 bodies hold two or more metas.

| walks | E | T (bodies) | H1 | H2 | T (types) |
| --- | --- | --- | --- | --- | --- |
| production | 0 | 0 | 0 | 0 | 0 |
| planted: numbering missing meta 0 | 0 | 0 | 4,637 | 4,017 | 0 |
| planted: `foldHoles` without label arguments | 0 | 5,209 | 0 | 0 | 9,141 |
| planted: `foldTypes` without named rests' types | 84 | 0 | 0 | 0 | 0 |
| planted: production `numbering` blind to named rests | 84 | 0 | 1 | 0 | 0 |

The missing-meta row is a wiring check: it removes a key after the
walk. It also shows why H1 is the property that decides it. In 620
bodies the raw meta 0 equals a hole number, so H2 (which reads only the
renamed body) passes and H1 fails. A fixed-body test pins that case. In
the last row, the production `numbering` runs on the body as the
stripped `foldTypes` sees it, and `holes` renames the whole body by the
result. A meta reached only through a named rest's type stays raw: H1
fails in the one body where that happens, and H2 does not. Most rest
metas also occur elsewhere in the body.

Corpus check, test/r0-holes-corpus.serial.test.mjs: a load hook
(test/r0-holes-capture.mjs, after scripts/differential-hook.mjs)
captures each body `holes` receives while `recheck` runs on every
corpus-loader declaration. Of 3,061 declarations, 2,823 bodies were
accepted; 280 hold a meta (17,696 occurrences). E, T, H1 and H2 hold on
all of them. The planted case drops each body's first meta and fails H1
on all 280. That is a wiring check; the evidence that a diverging walk
is caught comes from the generated test. The test asserts floors (over
1,000 bodies, over 200 with a meta), so it is not a pin.

The committed corpus check reaches `holes` through `checkFunction`
(compile and the read-back's `recheck`). D1's `build`
(Generate/Body.purs:123) was driven once, uncommitted, through the same
hook, using test/r0-elab-corpus-run.mjs's `sourceRows` (about 5
minutes, too slow for the serial suite). It captured 327,770 bodies,
8,453 with a meta, and E, T, H1 and H2 failed on none. By call stack,
320,100 came from Generate.Body (8,052 with a meta, 0 failures) and
2,820 from `checkFunction`. The script's third "other" counter came
out double, so it is not relied on. The check of every captured body
does not depend on that attribution.

## Outside the body: the checked declaration's row

The checked `row` (Function.purs:112) is resolved but not renumbered.
The code already records this: Trace/Types.purs:99-102 and
ReadBack/EffectPlaces.purs:8-10 say `recheck`'s checked row is not on
the trace's numbering. The hazard occurred once, when EffectPlaces'
`AtRoot` compared `matchRow row checked.row`. It is guarded at that
reader: scripts/regression-r0-t2-rows.mjs:48-56
(`r0-t2-rows-entry-root`) restores that defect, and
test/r0-t2-trace.test.mjs:201-202 and test/r0-t2-rows-entry.test.mjs:39-40
assert that the checked row keeps its raw meta, apart from the trace's
number. No other reader is guarded.

An uncommitted scratch run on the corpus: 881 of 2,823 accepted
declarations hold a meta in that row, some negative (-2 in
a3-fixed-carriers.wxw `main`). In 140 the same meta is also in the
body's numbering, and in 130 a raw row meta equals a body hole number
(a1-discard-dictionary.wxw `main`: row meta 0, while the body numbers
meta 3 as 0 and meta 0 as 1). The two other readers are Strip.purs:30
(marks only) and Specialize/Seeds.purs:83 (`mentionsTypeVariable`,
which ignores numbers). `checked.parameters` and `checked.result` hold
no metas by construction: they are `rigid` of the written signature
(Function.purs:110-111, Generate/Body.purs:120-121). In addition, 130
bodies carry `MarkMeta` marks. Marks are a separate number space that
`holes` does not touch.

## Other live-checker fallbacks (for the controller to file)

Each turns an unexpected shape into a value instead of a fault. Most
are argued unreachable because `rename`, `resolve` and `substitute`
keep an arrow an arrow; none is fixed here.

- Check/Scheme.purs:141-144 `flexibleRow`: non-arrow gives `openRow
  (Unify.Meta 0)`, an invented tail that is a real meta number.
- Check/Entry.purs:22-26 `resolvedRow`: non-arrow returns the row
  unresolved (feeds the checked `row` and `finish`'s row).
- Check/Entry.purs:43-46 (`main` only): non-arrow gives `Row []
  Nothing`, so the Console-only check has no label to reject.
- Check/Walked.purs:36-39 `walkedRow`: non-arrow returns it unwalked.
- Check/DeclarationUse.purs:129-131 `arrowRow`: non-arrow gives
  `closedRow`, dropping the row. Check/Function.purs:151-154 `current`:
  non-arrow gives `Row [] Nothing` for the declared ambient row.
- Features/Check/Generate/Body.purs:129-134 `rowOf` (D1 generation):
  the same `Row [] Nothing` fallback as `current`.
- Features/Check/Trace/Types.purs:172-175 `onRow` and
  Features/Check/Trace.purs:105-106 `finish`'s renumber: already R036
  (2), task T4.
- Features/Check/RowMerge/Desugar.purs:47 `freshRow`: `maybe (Meta 0)
  identity (Array.head metas)`, an invented meta 0, guarded by :42
  (fewer than two metas return before `first` is read).
- Domain/Type/Core.purs:128-130 (`stagesThrough`'s no-arrow arm) and
  :138-140 (`foldStages`' `_ → rest`): argued never taken by
  construction in their comments.

Excluded. Generate/Declared.purs:52-54 (`Left MarkShape`) fails closed.
Feed.purs:61 (`positionOf`), FeedOrder.purs:61 (`earliest`) and :106
(`earliestOf`) default a position to 0, which affects order only, with
no meta and no row involved. Generate/Translate.purs:110 (`rowOf`'s
`closedRow` for an instantiated occurrence) is D1's documented fallback
(§12.1), not a live-checker one.

## Generated agreement check: grammar and bounds (fixed before running)

Written before the first run. Any amendment is listed below under
"Amendments", with the result before and after.

Seeds 1, 2 and 3; per seed 2,000 bodies and 5,000 standalone types,
drawn with `mulberry` (test/row-merge-gen.mjs). Bodies are structural
values of the checked IR, not well-typed programs: the walks under test
are structural and read no typing invariant.

Types, `ty(d)`, depth budget 3 for a body's types and 4 for a
standalone type; at depth 0 only leaves:

- leaves: `TInt`, `TBool`, `TUnit`, `TText`, `TVar (Hole m)`,
  `TVar (Rigid r)`;
- `TData id args rows`: 0-2 type arguments, 0-2 row arguments;
- an arrow spine of 1-3 arrows, each `TFun parameter row result`;
- `THandler (Label effect args Unmarked) { inference, clauses }`: 0-2
  label arguments, `clauses` `Nothing` or `Just row`;
- `TRecord { fields, tails }`: 0-3 fields under distinct sorted labels,
  0-3 tails, each `Hole m` or `Rigid r`, sorted.

Rows, `row(d)`: 0-2 labels, each `Label effect args Unmarked` with 0-2
arguments of `ty(d - 1)`, effect `UserEffect 0`, `FailEffect` or
`ConsoleEffect`; tail `Nothing`, `Just (Hole m)` or `Just (Rigid r)`.

Metas `m` are drawn from 0-7 and rigids `r` from 0-2, so repeats and
collisions between a raw meta and a hole number are common.

Bodies, `expr(d)`, depth budget 3; at depth 0 only the five leaf nodes
(`Integer`, `Boolean`, `Local`, `UnitValue`, `Text`). Otherwise each of
the 33 `Node` constructors is equally likely, with:

- instantiations of 0-2 types; argument and part arrays of 0-2
  expressions;
- `Match` with 0-2 arms; patterns to depth 2: `Wildcard`, `Bind`,
  `IntLit`, `BoolLit`, `Ctor` with 0-2 fields, `Record` with 0-2 fields
  and rest `NoRest`, `IgnoredRest` or `NamedRest local ty`;
- `Lambda` with 0-2 parameters; `Handler` with 0-2 clauses of 0-2
  parameters; `Handle` with 0-2 fail clauses (payload a type);
- `Block` with 0-2 items, each `Let`, `Defer` or `Discard`;
  `RecordExtension` with 0-2 items, each `Given` or `Spreading`.

Every expression and pattern carries `ty(3)`.

Properties checked per sample (each named in the test):

- E: the types `foldTypes` visits and the types `retype` changes are
  the same multiset of type values (by reference).
- T: for each such type, and for each standalone type, the multiset of
  metas `foldHoles` steps on equals the multiset of metas `rename`'s
  function is applied to, and equals the metas found by a generic walk
  of the runtime value (every `Hole` instance anywhere in it).
- H1: every meta the generic walk finds anywhere in the body is a key
  of `numbering body`.
- H2: the metas in `holes body` are exactly the values of `numbering
  body`, which are 0 to n - 1.

Planted must-fail cases: a numbering missing one meta whose raw number
collides with a hole number (H1 fails; H2 alone would pass); a
`foldHoles` run on the type with its label arguments removed (T fails);
a `foldTypes` run on the body with named rests' types replaced (E
fails).

## Amendments

None to the grammar or bounds. One coverage assertion was loosened
after the first run: "more than 90% of bodies hold two or more metas"
became "more than 80%" (observed 5,375 of 6,000, 89.6%). The threshold
was a test parameter, not part of the grammar; E, T, H1 and H2 were 0
failures on that first run, before and after.
