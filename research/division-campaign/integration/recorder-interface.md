# A constraint recorder for the signature checker: proposed interface

Stream 7b, follow-up 2 of dossier §18.17 (recon.md §5.1 steps 1-3).
This is a design document. Nothing in it is implemented, and no source
changed. Written 2026-10-21 against `77e0fa3`. The file:line references
were read at that commit.

Out of scope, and deferred by the author: implementing the recorder,
changing the checked IR, a fallback policy for bodies outside the
fragment, and any integration of P9s alone.

Labels: **read** means read in the source at the cited line. **Checked**
means observed by the measurement tool (measurements.md §2). **Proposal**
means a design choice that awaits approval.

## 0. In brief

- **What it records.** The recorder keeps `B`, the body's constraints,
  as data in the row store (RowStore.purs:54), next to the waiting
  `Merge` predicates. Data there reverts with the substitution, as
  `merges` already does, so a postponed effect pair that reverts takes
  its atoms with it. There is no mode and no flag: recording is always
  on, and a separate pure function reads the log out.
- **Hooks.** About ten generation sites carry the hooks (§3): `expectType`,
  field access, the facts a use brings in, `Merge` creation, fresh
  record metas and extension bases. Solver-internal propagation is not
  recorded (RecordTail.purs, RowMerge/Cases.purs, settleRows retries).
- **`D` is computed, not recorded.** It comes from the resolved
  declaration, the same inputs `own` reads (Function.purs:124). A test
  compares it with the rigid-keyed facts in the store after `own`.
- **Output.** A pure translation from `Ty Flex` to the Lean fragment,
  which renumbers variables and reports anything outside the fragment.
  Its result goes to sig-oracle's JSON problem format, which bounded.mjs,
  p9s.mjs and export-lean.mjs read without change.
- **Completeness tests.** Six, in §5: a differential against the §17.1
  hand translations; a differential against stream 5's specification
  once it lands (it is not in this worktree); refusal agreement through
  bounded.mjs; label agreement with the measurement tool over the
  corpus; mutation of the hooks; and coverage of every maker.
- **Trust boundary (§6).** A recorder plus a PureScript port of
  `checkAll` plus differential tests is evidence. It does not inherit
  the Lean theorems, which are about `SigProblem` values and the Lean
  `checkAll`.

## 1. Requirements

1. For each checked function, produce a problem in the dossier's sense:
   rigid rows, rigid type variables, `D` and `B`. Its meaning must be
   the source's (stream 5 specifies that meaning).
2. Revert exactly as the solver's state reverts. Atoms made inside a
   postponed effect pair that reverts must disappear (Subst.purs:51-65).
3. Stay pure (AGENTS.md: Features is pure) and select nothing by flag
   (memory: inject implementations, never flag-select).
4. Keep generation apart from propagation. `B` is what the body
   states. What the solver derives from `B` is not part of it.
5. Keep layers. The recorder and the translation live in
   `Features.Check.*`. The data the JSON bridge reads is plain records.
   Format does not see any of it, unless diagnostics later quote it.

## 2. Types (proposal)

The log, as the checker sees it. It is raw: checker variables and
`Ty Flex`, and no solution applied.

~~~purescript
-- Features.Check.Recorded
-- Which generation site made an atom (one constructor per hook, §3):
-- coverage tests enumerate it, and a diagnostic may cite it.
data Maker
  = Expected        -- Require.purs:83 expectType
  | Selected        -- Record.purs:149 field access
  | Consumed        -- Consume.purs:66, :170 (effect rows; boundary)
  | UseSeeded       -- UseFacts.purs:19 a callee's implied lacks
  | UseRequired     -- UseFacts.purs:32 a callee's `where` clauses
  | UseJoined       -- UseFacts.purs:44 a callee's joined pairs
  | Composed        -- RowMerge/Predicate.purs:36 a Merge made
  | FreshLacking    -- FreshRecord.purs:27, :41
  | ExtensionBase   -- Overlap.purs:84-96
  | LiteralParts    -- RowMerge/Chain.purs:46-63, :99-104 (Task 7)

type Site = { maker ∷ Maker, span ∷ Maybe Span }

data Recorded
  = Equal Site (Ty Flex) (Ty Flex)
  | Lacking Site Flex String
  | Apart Site Flex Flex
  -- `result = left ⊎ right`, the Merge's rows as written
  | Union Site Row Row Row
~~~

The store field, at RowStore.purs:54, beside `merges`:

~~~purescript
  , recorded ∷ List Recorded   -- newest first; Data.List, O(1) cons
~~~

with `withRecorded ∷ Recorded → RowStore → RowStore` and
`recordedOf ∷ Subst → Array Recorded` (oldest first). RowStore.purs is
154 lines, so it has room. Subst.purs is 224 and does not change.

The problem, after translation, mirrors Composition/Syntax.lean and
Sig/Validity.lean:20:

~~~purescript
-- Features.Check.Sig.Problem (Domain.Sig if Format ever renders it)
data STy
  = SBase String                         -- Int, Bool, Text, Unit
  | SArrow STy STy                       -- effect row dropped (§4)
  | SVar Int                             -- a type variable's index
  | SRecord (Array (Tuple String STy)) (Array Int)  -- fields, tails

data SAtom = SEq STy STy | SLacks Int String | SDisjoint Int Int | SFalse

type SigProblem =
  { rigidTy ∷ Array Int, rigidRow ∷ Array Int
  , flexTy ∷ Array Int, flexRow ∷ Array Int
  , d ∷ Array SAtom, b ∷ Array SAtom
  , outside ∷ Array Outside       -- empty iff the body is in the fragment
  }

data Outside = EffectArgument Site | DataOverRecords Site | HandlerType Site
~~~

`flexTy` and `flexRow` are not in Lean's `SigProblem`, but sig-oracle
reads them (`sig(rigidRows, rigidTys, flexRows, flexTys, D, B)`,
source-boundary.mjs:16-17), and a renaming check needs them.

## 3. Hook points (read)

### 3.1 `B`: equations

| Site | file:line | Records | Note |
|---|---|---|---|
| `expectType` | Check/Require.purs:83-88 | `Equal Expected expected actual` | one hook for every `require` caller: Call, Apply, Arms, Match, Extension, RecordPattern, PatternRow, Defer, Handle, ClauseBody, Failure |
| field access `select` | Check/Record.purs:138-149 | `Equal Selected ty { l: α, ...ρ }` | ρ's lack of `l` is `FreshLacking` |
| effect consumption | Check/Consume.purs:66, :170 | `Equal Consumed …` only when a label argument holds a record, else nothing | outside the fragment (§4) |

Not recorded:

- Argument.purs:65 unifies again only to word a refusal.
- Unify.purs:93 (`settleRows`) retries a postponed pair whose first
  attempt was already recorded at its generation site.
- RowMerge/Cases.purs:72-137 and Improve.purs:41 are the solver's own
  cases.
- RowEntry.purs:99 is the test entry.

Hooking `unify` itself (Unify.purs:68), as the measurement did, would
also catch the retries and the diagnostic re-unification.

### 3.2 `B`: facts and compositions at uses

| Site | file:line | Records |
|---|---|---|
| instantiation | Check/Scheme.purs:120-127 | nothing; the metas `base + i` become flexible variables, sorted by the callee's `sorts` |
| `seededUse` | Check/UseFacts.purs:19-28 | `Lacking UseSeeded m l` per implied lack |
| `requiredUse` | Check/UseFacts.purs:32-40 | `Lacking UseRequired`, `Apart UseRequired` per clause |
| `joinedUse` | Check/UseFacts.purs:44-53 | `Apart UseJoined` per joined pair |
| `made` | Check/RowMerge/Predicate.purs:36-37 | `Union Composed left right result` |
| constructor uses | Check/Use.purs:102 `ctorUse` | as for a function use |

`made` needs care, and the measurement found why (**checked**):
Chain.purs:60-61 and Desugar.purs:49-50 evaluate `predicateFor` twice
per predicate and keep the substitution of the second. A side-channel
log sees two `Merge`s. A record written into the store sees only the
one in the substitution that is kept. That is one more reason the log
should be data in the store.

### 3.3 `B`: facts the body makes

| Site | file:line | Records |
|---|---|---|
| fresh record or rest meta | Check/FreshRecord.purs:27, :41 | `Lacking FreshLacking m l` |
| extension base, meta | Check/Overlap.purs:85-87 | `Lacking ExtensionBase m l` |
| extension base, rigid | Check/Overlap.purs:89-96 | `Lacking ExtensionBase r l`; today this branch checks without writing, so the hook adds the write (**read**; the measurement missed it, measurements.md §2.2) |
| literal parts (Task 7) | Check/RowMerge/Chain.purs:46-63, :99-104 | `Apart LiteralParts`, `Lacking LiteralParts`, `Union` |

Not recorded, because these propagate facts already recorded:
RecordTail.purs:90-118, which hands a bound meta's lacks and pairs to
its image; Disjoint.purs:39-130 below the generation sites; and
RowMerge/Cases.purs:143.

### 3.4 `D`

Computed by a pure `declared ∷ Resolved.Tables → Resolved.FunctionDecl
→ Array SAtom`, from the same inputs `own` reads (Function.purs:124-134):

- `function.constraints` (Resolved.purs:106; `Lacks`, `Disjoint`);
- `function.joined` (Resolved.purs:111);
- the implied lacks of the parameter, result and row types,
  `implied` (Check/Implied.purs:28), as `seedLacks` uses them
  (Lacks.purs:47).

A test checks that `declared` equals the rigid-keyed `lacks` and `apart`
of the store right after `own`, up to reasons.

### 3.5 Reading the problem out

At the end of a body, after `settleRestricted` (Function.purs:81),
where `waitingAtEnd` reads the settled substitution (Function.purs:89)
and `endOfBody` takes its `Judge` (RowMerge/End.purs:39, :47). In this
proposal only a test entry reads the log: `Features.Check.SigEntry`,
shaped like `Features.Check.RowEntry` and driven from a test script,
returns `SigProblem` per function. Injecting a checker at `endOfBody`
is recon.md step 6, which is deferred.

## 4. Translation and the fragment (proposal)

- **Numbering.** Rigid rows are `0 … |R|-1`, in `VarId` order of the
  `RecordSort` variables. Flexible rows continue from `|R|` in order of
  first appearance in the log. Type variables use a separate index
  space: rigid first, then flexible. That is source-boundary.mjs's
  convention (rigid rows 0-2, flexible rows from 3).
- **`Union l r t`** becomes `SEq (SRecord [] [t]) (SRecord fs ts)`,
  where `fs` and `ts` are the fields and tails of `l` and `r` together.
  Lean's record is a disjoint composition with definedness built in
  (Syntax.lean:27-32), so no separate atom is needed.
- **Arrows.** `TFun a row b` becomes `SArrow a b`, dropping the effect
  row. That is a fragment assumption: record validity is decided as if
  effect solving were independent of it (recon.md risk 6). An effect
  label argument that holds a record is recorded as `Outside`.
- **`TData`** with no record argument becomes `SBase` of its printed
  ground name. If a record row is among its arguments, the result is
  `Outside DataOverRecords`. `THandler` is `Outside HandlerType`.
- **Policy for `Outside`** is the deferred fallback question (recon.md
  §6 question 2). The recorder only reports it.

### 4.1 The JSON bridge

One object per function, in the format bounded.mjs, p9s.mjs and
export-lean.mjs read (semantics.mjs:7-10). Types are `{ k: 'b', b }`,
`{ k: 'v', n }`, `{ k: 'f', a, c }` and `{ k: 'r', fields: [[l, t]],
tails: [ids] }`. Atoms are `['eq', t, u]`, `['lacks', r, l]`,
`['disjoint', r, s]` and `['ff']`. Provenance travels beside the
problem and is never read by the oracles.

For `route` (dossier §17.3), predicted by hand from the hooks in §3. It
is not run, since nothing is implemented. `u`, `v`, `s'`, `t'` are
divide's metas 3-6, and 7 is the `Merge` result:

~~~json
{ "name": "route", "origin": "probe:route",
  "rigidRows": [0, 1, 2], "rigidTys": [],
  "flexRows": [3, 4, 5, 6, 7], "flexTys": [],
  "D": [["disjoint", 1, 2]],
  "B": [
    ["disjoint", 3, 4],
    ["eq", {"k": "r", "fields": [], "tails": [7]},
           {"k": "r", "fields": [], "tails": [3, 4]}],
    ["disjoint", 3, 5], ["disjoint", 4, 6],
    ["eq", {"k": "r", "fields": [], "tails": [7]},
           {"k": "r", "fields": [], "tails": [0]}],
    ["eq", {"k": "r", "fields": [], "tails": [5]},
           {"k": "r", "fields": [], "tails": [1]}],
    ["eq", {"k": "r", "fields": [], "tails": [6]},
           {"k": "r", "fields": [], "tails": [2]}],
    ["eq", {"k": "b", "b": "Int"}, {"k": "b", "b": "Int"}]],
  "provenance": ["UseJoined", "Composed", "UseRequired", "UseRequired",
    "Expected", "Expected", "Expected", "Expected"],
  "outside": [] }
~~~

The §17.1 hand translation (source-boundary.mjs:109-118) has no meta
7, writes `eq(tails(0), tails(3, 4))` and leaves out the trivial
`Int = Int`. §5 test 1 has to bridge exactly these differences.

## 5. Testing that the recording is complete (proposal)

Incompleteness is the dangerous direction. If an atom is missing, `B`
is weaker, and the checker can accept a signature the source does not
satisfy.

1. **Against the §17.1 hand translations.** source-boundary.mjs holds
   functions with problems translated by hand (§17.1 rules). Compare
   each recorded problem with the hand one after a fixed normalization:
   drop trivially true atoms (`t = t`, equal bases); eliminate a
   flexible row defined by exactly one `Union` equation by
   substituting it; deduplicate; and search for a renaming of flexible
   indices (small). Report each function as equal, missing atoms or
   extra atoms. The normalization is part of the comparison tool and is
   not proved to preserve validity. Each step is listed with its
   argument in the tool.
2. **Against stream 5.** research/division-campaign/source/translation.md
   is not in this worktree (stream 5 is still running). Once it lands,
   implement its rules as an independent translator over the resolved
   AST (`Domain.Resolved`) in JavaScript. Run it and the recorder over
   the measurement corpus (measurements.md §2.4: 488 functions with a
   rigid row) and compare as in test 1. A disagreement is a finding
   against one of the two, decided by reading the rule.
3. **Refusal agreement.** Some fixtures are refused, have a
   counter-instance, and are judged invalid under ∀∃ too: the
   contradictions of recon.md §4.2 (`diag-18-wrong`, `design-mixed`,
   `diag-16`, `precedence-p7`, …). For each, bounded.mjs must find the
   recorded problem invalid. A bounded "valid" means an atom is
   missing. This catches incompleteness, which tests 1 and 2 catch only
   where a reference exists.
4. **Label and variable agreement with the measurement tool.** The
   measurement logs a superset of the hook sites (it wraps `unify`,
   `requireLack`, `requireApart`, `seedApart`, `addLackTable` and
   `made`). Over the corpus, the recorded `L`, `R` and `Rm` must equal
   the measured ones, and the recorded flexible rows must be a subset
   of the measured ones. A label the measurement sees and the recorder
   does not is a missed site. The test is cheap and exists now:
   measure/ already writes the per-function JSON.
5. **Mutation.** In an isolated copy, as the regression rule asks
   (AGENTS.md), remove one hook at a time. Tests 1-4 together must fail
   for each removal. A hook whose removal no test notices is either
   redundant or untested, and either way it is reported.
6. **Coverage.** Each `Maker` constructor appears in at least one
   fixture's recorded problem. Because `Maker` is an ADT, the test is
   exhaustive by construction.

Soundness of the recording, the other direction, is cheaper. For a
function the online solver accepts, the substitution `σ` read as a
certificate (recon.md step 4) must pass `checkAll` on the recorded
problem. A failure means the recorder or the translation recorded
something the solver never had to satisfy. Recon.md §6 question 7
already proposes treating that as an internal error.

## 6. Trust boundary

What the Lean development proves, and what this design would rest on:

| Link | Status | Evidence the design adds |
|---|---|---|
| `checkAll P T = true` → `P` valid | proved in Lean for Lean's `checkAll` (Patterns.lean `checkAll_accepts`, K6) | none needed |
| PureScript `checkAll` = Lean `checkAll` | not proved | differential tests on exported tables (recon.md §3.4 option 1); mirroring (option 3) |
| recorded `B` = the source's constraints | not proved | §5 tests 1-6; stream 5's specification is the reference |
| translation `Ty Flex` → `STy` | not proved | round-trip and fixture tests; `Outside` reported, never dropped silently |
| effect rows independent of record validity | assumption (recon.md risk 6) | none yet |
| JSON bridge and export-lean.mjs | not proved | Lean re-checks each exported problem by `decide` (recon.md §3.4 option 2) |

A recorder, a PureScript port of `checkAll` and differential tests
make up evidence. They do not inherit Lean's theorems. The theorems
are about Lean values of type `SigProblem` and about the Lean
`checkAll`. The compiler would run a different program on a problem
built by unverified code. Translation validation (Lean re-checking
each exported `(P, T)`) recovers a kernel-checked verdict for each
corpus problem, but only for the corpus. It still trusts the recorder
to have built the right `P`. Every claim that "the compiler's
signature check is verified" must therefore be worded as "verified
checker, tested recorder and tested port".

## 7. Questions for the author

1. Should the log live in the row store, always on (this proposal), or
   be an injected recorder in `CheckEnv`? The second needs threading
   into Disjoint and Unify, which take no environment today.
2. Should the extension base's rigid branch (Overlap.purs:89-96) write
   a fact so that it can be recorded, or should the hook record it
   without changing the store?
3. Effect rows: should the fragment assumption (§4) be accepted for a
   first recorder, or should any arrow with a non-empty effect row in a
   record-polymorphic body be `Outside`?
4. Should test 4 (agreement with the measurement tool) be required
   before stream 5 lands, as the first completeness gate?
