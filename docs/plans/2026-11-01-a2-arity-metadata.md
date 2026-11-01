# A2 arity metadata: schema, checks and estimate (2026-11-01)

Authority: dossier §18.148 item (1) (the author: "Arity belongs in
I3"); statements §2 ("declared data row counts") and §7 step 4(a)
("arities"); spec §2.2, §4.1, §5 item 3. Written before any code, as
the ruling requires. Implementation choices below are recorded here
and in the lane report; none is a soundness claim.

## 1. Schema

New module `Domain.Recorded.Arity` (types only):

```purescript
type DataArity = { types ∷ Int, rows ∷ Int }

type Declarations =
  { effects ∷ Map EffectRef Int     -- type arguments per effect
  , types ∷ Map TypeId DataArity    -- per declared data type
  }
```

`EffectProblem` (Domain.Recorded.Effect) gains `declarations ∷
Declarations`. `emptyEffects` holds empty maps.

- **Effects**, keyed by `EffectRef`: every declared effect
  (`UserEffect (EffectId i)`, the length of `tables.effects[i]
  .parameters`) and both built-ins from Resolve's table
  (`Features.Resolve.Builtin.builtinEffects`: `FailEffect` 1,
  `ConsoleEffect` 0). The count is the label's argument count; effect
  parameters are types only (BACKLOG R009, `Generate.Lookup
  .effectSorts`).
- **Data types**, keyed by `TypeId`: `types` is the length of
  `TypeInfo.parameters` (type and record-row parameters, which are
  passed among the type arguments, Resolve/Types.purs `isType`), `rows`
  the length of `rowParameters` (effect rows). This is how Resolve
  builds `TData id typeArguments rowArguments`
  (Resolve/TypeArguments.purs `appliedTo`). There are no built-in data
  types: `Int`, `Bool`, `Text`, `Unit` are `Base`.

**The program's declared set, not the declaration's mentioned set.**
Recorded per declaration (each `EffectProblem` carries it), with the
content of the whole program's tables. Why: "undeclared" means not
declared by the program; with only the mentioned set an honest package
naming a declared effect the record happens not to mention would read
as undeclared, and the record check could not tell an undeclared head
from an unmentioned one. Precedent: the recorded problem already
carries the program's declared type set (`holders.declared`, ruling
K-a), which gives the metadata an independent cross-check (§2.2). Cost:
each declaration's effect encoding grows by the program's tables (small
in the corpus).

**Where it is computed.** `Generate.Lookup.declarationsOf ∷ Tables →
Declarations` (beside `effectSorts`, which reads the same tables).
`Generate.Assemble.Header` gains `declarations`, set by
`Features.Check.Generate.generate` beside `holders`, and `assemble`
writes it into `effects`, as it writes `holders` into the problem. No
new `EffectItem`.

## 2. Checks

### 2.1 Applications and the bare rows

An application is an effect label (head its `EffectRef`, `types` its
argument count, `rows` 0) or a data type (`PData`/`MData t args
rows`; `PBase`/`MBase (DataBase t)` counts as `t` with 0 and 0). It
conforms when its head is declared and its counts are the declared
ones, with one relaxation, the bare spelling of a clause row C:

- a non-`Fail` label of a C row may have no arguments (statements §2:
  C's labels are R's, bare; Generate/Owned.purs `bareLabel`; Check/
  Walked.purs `bareLabel`), or its declared count (R-b: `bare: true`
  ignores arguments without erasing them);
- a `Fail` label of a C row keeps its one payload, and a top-level data
  payload may be its head only, `t [] []` (Owned.purs:91), or full.

Any other count is wrong; nested applications (inside arguments) are
checked as anywhere else. C rows: the `clauses: Just C` of a handler
type; in a package, the image of an effect key whose role is
`HandlerClauses` or `AnnotationClauses _` (forced `ResultClauses` keys
never reach I3's arity check, (a) refuses them); in the record, a
consumption's C side by its site kind: the source of `AtInstalledC`
and the target of `ClauseIntoC k` (spec §9's bare sites; the other
side of each is a full row).

### 2.2 I3, check (k) (Malformed)

Two new `MalformedReason` constructors, with `data Applied =
AppliedEffect EffectRef | AppliedData TypeId` in Domain.Verdict.Search:
`Undeclared PackageKey Applied` (head not in `declarations`) and
`WrongArity PackageKey Applied`. Scanned like every I3 check: maps
`effects`, `marks`, `types`, `rows`, keys in `Ord` order, every key
(unused bindings included), each image recursively (labels in rows,
arguments, data arguments and rows, handler labels, R and C, record
fields). The first offending application of the first offending key
gives the reason.

**Order: (k), after (a)-(j).** The spec's (a)-(j) stay as they are
(their regression rows and tests pin that order). Statements §7
lists "variable restrictions, arities, one sort per hole", which would
put arities after the solved form (i) and before one sort per hole
(h), the reverse of the spec's (h), (i); the two orders disagree, so
neither argues for moving the existing checks. Consequence: a `Fail`
label with no argument is refused by (j) (keyless) before (k); a
`Fail` with two arguments has a key and is refused by (k).

### 2.3 Record check 5 (RecordDefect)

Spec §4.1 gains a fifth bullet, index 5 (index 4 is the companion
check, landing in parallel):

1. **The metadata is valid**: the built-ins are present with
   `builtinEffects`' counts (`Fail` 1, `Console` 0); every count is
   non-negative; the data map's key set equals `holders.declared`
   (independently recorded by K-a). User effect ids have no second
   record to compare with; only their counts' sign is checked.
2. **Every recorded application conforms** (§2.1), in every entry:
   obligations, `instances`, `annotations`, `nodes`, `ambient`,
   `signature`.

Reporting: an entry's check 5 is judged only against valid metadata.
Invalid metadata is reported once, as `InRecord { table:
InDeclarations, path: Nothing }` with check 5, after every entry and
before the coverage entry (new `RecordTable` constructor between
`InSignature` and `InCoverage`). So a defect in the metadata is never
blamed on an entry that reads it, and spec §5 item 1's order
(obligations, then tables, then coverage) gains the declarations table
in the place of a table.

### 2.4 Obligation-level defence (ruling 3)

Unchanged: `Equal`'s `sameShape`, `Handler`'s `sameHead` and
`argumentsEqual`, `Consume`'s length test refuse same-key labels and
data of unequal argument counts. New tests show none zips a common
prefix (each case agrees on the prefix).

## 3. Modules

| Module | Change |
|---|---|
| Domain.Recorded.Arity (new) | `DataArity`, `Declarations`, `noDeclarations` |
| Domain.Recorded.Effect | field `declarations`; `RecordTable` += `InDeclarations` |
| Domain.Verdict.Search | `Applied`; `Undeclared`, `WrongArity` |
| Generate.Lookup, .Assemble, Generate | metadata, `Header.declarations` |
| Strategy.Effects.Arity (new, trusted) | `Application`, conformance, metadata validity |
| Effects.MalformedTerms, Malformed | collection (images), check (k) |
| Effects.RecordRefs | collection (record) |
| Effects.RecordArity (new, trusted) | record check 5 and the declarations entry |
| Effects.Record | one list line (check 5), the declarations entry |

Implementation note: on this branch Effects.Record's check list holds a
`false` placeholder at index 4, so check 5 has its fixed index before the
companion check (index 4) lands; integration replaces the placeholder
with that check. Test fixtures that assemble a problem by hand pass the
new `Header.declarations` (the built-ins only where a validator reads
them).

## 4. Pins

The effect pin moves for every declaration (new field). Evidence owed in
the commit: the old pin reproduced by the encoder with `declarations`
left out. G0's problem pin, first diagnostics, generated Go, census,
window and RT8 fixtures must not move. Trusted surface re-pinned
(Lookup, Assemble, Generate, Malformed(Terms), Record(Refs), the new
modules).

## 5. Estimate (before coding)

About 0.4-0.6M tokens and 2-3 hours of wall clock for one implementer:
schema and generation (0.1M), I3 and record checks with tests (0.2M),
regression rows with restored defects (0.1M), pins, inventories and
the focused checks (0.1M). Within the controller's 0.5-0.8M for this
item including review.
