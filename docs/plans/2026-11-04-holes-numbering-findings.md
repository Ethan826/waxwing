# Holes numbering: do collection and renaming visit the same metas? (2026-11-04)

Lane D of the activation-prerequisites batch (dossier §18.161 (6);
proposal open question 8), on fdd52a3.

## Verdict

The invariant holds. On every body `holes` receives, every meta that
the renaming meets is a key of the numbering, so the raw-meta arm at
Features/Check/Holes.purs:50 (`maybe meta identity`) is never taken,
and no raw meta can sit in a renamed body beside a hole number. The
argument from the code is below; a bounded generated check and a
corpus-wide check agree with it, and each has a planted must-fail case
that fails. No src change: Holes.purs is on the lowering boundary and
is not edited. The fallback stays in the code. That it is unreachable
is argued here and observed by the two tests, which run under verify;
nothing in the type of `holes` enforces it.

One adjacent observation outside the question's scope (the body) is
recorded under "Outside the body": the checked declaration's `row`
field keeps raw checker metas. No reader compares those numbers with
the body's hole numbers today.

## The argument from the code

`holes body` (Holes.purs:43-51) computes `named = numbering body` and
renames with `retype (rename renumber) body`, where `renumber (Hole m)`
is `Hole (lookup m named)`, falling back to `Hole m` when `m` is not a
key. `Open` has two constructors (Domain/Checked/Internal.purs:25),
so the `rigid → rigid` arm takes only `Rigid`. The fallback is taken
exactly when the renaming applies `renumber` to a `Hole m` whose `m`
the numbering did not record. Two walks have to agree for that never to
happen.

**Expression level: `foldTypes` (numbering) and `retype` (renaming),
Features/Check/Walk.purs.** `Node` has 33 constructors
(Internal.purs:64-101). Both walks handle the same 28 explicitly and
leave the same 5 (`Integer`, `Boolean`, `Local`, `UnitValue`, `Text`)
to a catch-all; none of the 5 holds a type or an expression. For each
of the 28, both visit the node's own type, then the same type-holding
parts: instantiations (`FunctionRef`, `CtorRef`, `Call`, `Construct`,
`OperationRef`, `Perform`, `Handler`), lambda and handler-clause
parameter types, fail-clause payloads, and every sub-expression,
including block items (`blockParts` covers `Let`, `Defer` and
`Discard`), literal, update and extension fields (`fieldValues`,
`updateParts`, `extensionParts` cover `Given` and `Spreading`). On
patterns, `foldPattern` and `retypePattern` both visit the pattern's
type, each `Ctor` and `Record` field pattern, and a `NamedRest`'s type;
the other shapes hold no type. The only types in `Expr` are these
(`ty`, `Instantiation`, `Param.ty`, `FailClause.payload`, `Pattern.ty`,
`NamedRest`'s type), so the two walks visit the same multiset of type
values. Order differs in places (a handler clause's body before its
parameters in `foldTypes`); order changes the numbers, not the set.

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
label, no tail), which holds nothing. Marks (`Mark`, Domain/Row.purs:43)
are not of the variable type and neither walk touches them.

So on every type, `foldHoles` steps on every hole occurrence that
`rename` applies its function to. With the expression level, every
`Hole m` the renaming meets in `body` was met by `numbering body`, and
the lookup succeeds. `numbering` and `holes` read the same `body`
value, so no change between the two walks is possible.

What this argument rests on: the structural agreement above, read from
the code at fdd52a3; not a mechanized proof. A new `Node` or `Ty`
constructor, or a new type-holding field, must be added to both walks;
the generated check below enumerates every `Node` constructor
(`nodeCount`, 33) and fails if the generator stops reaching one.

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

The missing-meta row shows why H1 is the decisive property: on 620
bodies the raw meta 0 equals a hole number, H2 (which reads only the
renamed body) passes, and H1 fails. The test also checks that case on a
fixed body (meta 5 numbered 0, meta 0 left raw).

Corpus-wide check, test/r0-holes-corpus.serial.test.mjs: a load hook
(test/r0-holes-capture.mjs, the pattern of
scripts/differential-hook.mjs; compiler output on disk unchanged)
captures every body `holes` receives while `recheck` runs on every
corpus-loader declaration. 3,061 declarations; 2,823 bodies (the
accepted ones); 280 hold a meta; 17,696 meta occurrences. E, T, H1 and
H2 hold on all 2,823. Planted: dropping each body's first meta from its
numbering fails H1 on all 280 bodies that hold a meta. The test asserts
floors (more than 1,000 bodies, more than 200 with a meta), not these
counts, so it is not a pin.

Coverage limits: the corpus check reaches `holes` through
`checkFunction` (compile and the read-back's `recheck`). D1's
`build` (Generate/Body.purs:123) calls the same `holes`, which is a
function of its argument alone, so the argument and the generated check
cover it; the corpus check does not drive it.

## Outside the body: the checked declaration's row

Observed with a one-off scratch run, not committed: the checked
declaration's `row` (Function.purs:112, `Entry.resolvedRow
settledSubst env.current`) is resolved but not renumbered by `holes`.
Of 2,823 accepted corpus declarations, 881 hold a meta in that row
(raw checker metas, including negative ones, for example -2 in
docs/plans/2026-10-21-c001-explicit/baseline/a3-fixed-carriers.wxw
`main`); in 140 the same meta is also in the body's numbering, and in
130 a raw row meta equals one of the body's hole numbers (for example
a1-discard-dictionary.wxw `main`: row meta 0, while the body numbers
meta 3 as hole 0 and meta 0 as hole 1).

Readers found by search at fdd52a3: Features/Check/Strip.purs:30
(strips marks, keeps variables as they are) and
Features/Specialize/Seeds.purs:83 (`mentionsTypeVariable` over the
row's label arguments, which does not read a variable's number). The
read-back reads `checked.body`, `checked.parameters` and
`checked.result` (no metas on the corpus: 0 occurrences), and takes the
row from the trace (`traced.row`, ReadBack/EffectPlaces.purs:96), which
`finish` renumbers with extension numbers. So no reader puts the
declaration row's numbers beside the body's today. It is an unguarded
field of raw numbers in the same `Int` space, and a future reader of
`checked.row` on the read-back side would meet it; recommended for the
controller to file, not fixed here.

Also observed: 130 renamed bodies carry `MarkMeta` marks. Marks are a
separate number space, untouched by `holes`, and read through the final
mark store; not part of this question.

## Other live-checker fallbacks (for the controller to file)

Each turns an unexpected shape into a value instead of a fault. Most
are argued unreachable because `rename`, `resolve` and `substitute`
keep an arrow an arrow; none is fixed here.

- Features/Check/Scheme.purs:141-144 `flexibleRow`: a non-arrow result
  gives `openRow (Unify.Meta 0)`, an invented tail that is a real meta
  number.
- Features/Check/Entry.purs:22-26 `resolvedRow`: a non-arrow result
  returns the input row unresolved; it feeds the declaration's `row`
  and `finish`'s row.
- Features/Check/Entry.purs:43-46 (`check`, `main` only): a non-arrow
  result gives `Row [] Nothing`, so `main`'s Console-only check has no
  label to reject.
- Features/Check/Walked.purs:36-39 `walkedRow`: a non-arrow result
  returns the row unwalked.
- Features/Check/DeclarationUse.purs:129-131 `arrowRow`: a non-arrow
  instantiated scheme gives `closedRow`, dropping the declaration's row.
- Features/Check/Function.purs:151-154 `current`: a non-arrow gives
  `Row [] Nothing` for the declared ambient row.
- Features/Check/Generate/Body.purs:129-134 `rowOf` (D1 generation):
  the same `Row [] Nothing` fallback as `current`.
- Features/Check/Trace/Types.purs:172-175 `onRow` and
  Features/Check/Trace.purs:105-106 `finish`'s renumber: already R036
  (2), task T4.
- Domain/Type/Core.purs:128-130 (`stagesThrough`'s no-arrow arm) and
  :138-140 (`foldStages`' `_ → rest`): argued never taken by
  construction in their comments.

Generate/Declared.purs:52-54 (`Left MarkShape`) is fail-closed and not
listed.

## Commands

- `npm run build` (fdd52a3, exit 0).
- `node --test test/r0-holes-walks.test.mjs test/r0-t2-holes.test.mjs`:
  9 tests, 9 pass.
- `node --test test/r0-holes-corpus.serial.test.mjs`: 3 tests, 3 pass.
- `node scripts/width.mjs`: 0 lines over 80; structural gates: none.

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
