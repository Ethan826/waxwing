# Self-hosting API gaps: library and host services the compiler uses

**Planning target (author, 2026-10-31, dossier §18.138):** the stable
R0 replacement once accepted, with the shipped compiler kept as the
compatibility reference and bootstrap seed. No full port of the legacy
checker followed by a second checker port. This answers open question
1 below; the delta section's generator-scope material is therefore in
scope. No port is authorized.

Date: 2026-10-31 (written during the 2026-10-30 overnight run, stream 4 of
docs/plans/2026-10-30-overnight-authorization.md). Status: source survey and
gap ledger. It selects no design, authorizes no implementation and changes
no roadmap priority. No language feature, runtime change, dependency or
compiler port is proposed here; the code blocks in the slices are
illustrative sketches, marked as not implemented.

This extends the syntax-level inventory (docs/plans/
2026-10-27-self-hosting-readiness.md and its JSON, both on main, not on
this branch) to the library APIs and host services the compiler calls. The
readiness doc's SV rows are cited by ID. The doc asked for the next step to
be an inventory of "the actually used APIs and their contracts" (SV27); this
is that inventory.

## 1. Method and limits

### 1.1 What "the compiler" means here

The request left this open. This document reads it as follows.

- Primary: the shipped compiler, `src/` of main at 7093c79: 324 `.purs`
  modules (48,053 lines) in the five layers Domain, Features, Format,
  Program, Runtime, plus one FFI file, `src/Runtime/Node.js`. Section 2
  counts this tree unless a row says otherwise.
- Delta: the R0 shadow checker in this branch (overnight/self-hosting,
  base f6aeda4): 441 modules. 118 modules (13,157 lines) exist only here
  (under Domain/Elaborating, Domain/Recorded, Domain/Verdict,
  Features/Check/Generate, Decide, Entailed, Refute, Strategy and a few
  siblings). Of the 323 paths both trees share, 78 differ in content. One
  module exists only on main: `src/Domain/Arithmetic.purs`. Section 5 and
  the scope-protection rows (2.6) use the delta.
- Out of scope as "compiler": `scripts/*.mjs`, `test/`, `research/`. The
  gates and harness matter only where they constrain a port (SV23, SV24);
  those places are cited, not inventoried.
- The existing inventory describes neither tree exactly. Its 437 modules
  are r0-t2-d1 at 2643df3; main has 324. Section 6 lists what follows.

Package versions come from spago.lock; library contracts were read from the
package sources in the r0-t2-d1 worktree's `.spago/p` (arrays 7.3.0,
foldable-traversable 6.0.0, ordered-collections 3.2.0, strings 6.0.1,
integers 6.0.0, enums 6.0.1, prelude 6.0.2, tailrec 6.1.0, effect 4.0.0).
Toolchain: purs 0.15.16, spago 1.0.4, Node >= 22.5, Go 1.26.4
(package.json). Package set: registry 81.0.0 (spago.yaml).

### 1.2 How uses were found

1. Import scan. Every `import` statement (multi-line forms joined, comments
   removed) was parsed per module, for the library prefixes Prelude, Data.,
   Control., Effect, Node., Partial, Unsafe, Debug, Foreign and Type.
2. Qualified-name scan. For `import M as Q`, each `Q.name` in the module
   body was counted. For an explicit list `import M (a, b)`, each
   whole-word occurrence of `a` and `b` in the body was counted. Counts are
   written "uses/modules".
3. A second pass counted Prelude tokens (operators and a fixed list of
   names) with comments and string literals removed.
4. FFI reading: `src/Runtime/Node.js` and `src/Runtime/Node.purs` were read
   in full, with `Domain.Host`, `Program.*` and `Format.Wire`.
5. Representative modules were read by hand for each area: Format.Lex*,
   Format.Parse.Cursor, Format.Stack, Features.Check.Search, the Resolve and
   Check Fresh/Thread/Copy monads, and in the delta Generate.Elab*,
   Generate.Gen and the structure gates.
6. Library semantics were checked against the package sources named above,
   not recalled.

The scan was a throwaway Node script that only read files; it is not
committed. These commands reproduce its headline numbers on a checkout of
main:

```text
find src -name '*.purs' | wc -l                       # 324
grep -rhE '^import Data.Array( |$)' src --include='*.purs' | wc -l   # 238
grep -rlE '^import Data.Map( |$)' src --include='*.purs' | wc -l     # 83
grep -rhE '\btraverse\b' src --include='*.purs' | grep -vE '^\s*--' \
  | grep -v '^import' | grep -oE '\btraverse\b' | wc -l              # 127
grep -rhoE '(^|[^A-Za-z0-9_.])Array\.index\b' src --include='*.purs' \
  | wc -l                                                            # 165
```

Raw grep includes comment text, so a few counts differ by one or two from
the script's (for example `Array.snoc` is 57 by grep and 56 by script).

### 1.3 What this cannot see

- Prelude is imported open in 300 of 324 modules (`import Prelude`), so
  which Prelude names a module uses is visible only through the token
  counts in 2.7, not per function. Re-exports hide the origin of names.
- Instance methods used implicitly. `==`, `<`, `compare`, `show`, `<>`,
  `map`, `pure` and `bind` dispatch through dictionaries the scan cannot
  attribute to a type. Which container a Foldable-polymorphic call
  (`foldl`, `traverse_`, `any`) is applied to is not recorded; the rows say
  "inferred" where a type was read by hand and not checked by a compiler.
- Derived instances are counted from `derive instance` lines; their
  generated code is not read. Type annotations of unqualified helpers are
  not resolved, so a local variable named like an imported function (for
  example `lookup`) can inflate an unqualified count. Qualified counts do
  not have this problem.
- No `purs` compile, `--dump-corefn` run or conformance test was made (the
  task forbids builds). A corefn dump would settle the dictionary question
  and is the natural next check.
- Library partiality inside packages (for example ST inside `Data.Array`
  internals) is invisible to the compiler's own import list and is not
  counted as a compiler use.
- Behavior that comes from the PureScript runtime (JavaScript strings,
  JavaScript arrays, the JavaScript stack, `JSON.stringify` object key
  order) is read from the FFI files and package sources; it is a contract
  the compiler relies on without ever naming it.

### 1.4 Evidence labels

- observed: a use found in source. The row cites file:line or a count with
  the command above.
- inferred: follows from an observed use plus a package source or comment
  (for example a contract implied by an algorithm).
- unverified: plausible, not checked.

A label applies to the row's use and contract claims. Where a row mixes
them, the cell says which part.

## 2. API ledger by area

Columns: API family, observed use (uses/modules in main; file:line),
contract the compiler depends on, Waxwing's equivalent today, the gap, the
roadmap item, and the label. Roadmap IDs are from BACKLOG.md on main (the
SH rows are "Proposed"). "No item" means no row covers it; the ledger in
section 3 names the proposed new scoped item.

What Waxwing has today, for reference: Int (signed 32-bit, `+` only on
main, wrapping modulo 2^32: docs/language.md:150-152), Bool, Text (UTF-8,
code-point comparison, literals, `++`, `show`, printing:
docs/language.md:549-600, ADR 011), closed recursive generic ADTs
(rank-1), records (R001, done), first-class functions, effects with
handlers and `defer` (docs/language.md:317-372; built-ins are only `Fail`
and `Console`). There is no module system (M001), no class mechanism
(C001 design approved, unbuilt), no Char, no collection or text operation
library (D001, STD001), no host access beyond printing `main`'s value.
examples/lists.wxw shows `List`, `Maybe`, `Pair` and `Either` written as
user ADTs.

### 2.1 Collections

| Family | Observed use | Contract the compiler depends on | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| Data.Array: indexed read and size | `index` 165/80 (e.g. Format/Parse/Cursor.purs:102,106,117: the parser's token cursor), `length` 131/72, `null` 93/63, `head` 44/30, `last` 11/10 | Constant-time total read: out of range is `Nothing`, never a fault (arrays-7.3.0 Data/Array.js:86, `indexImpl`). Constant-time length. The parser and lexer rely on this so a scan step costs O(1) (Lex.purs:61-65 comment "indexing replaces Array.uncons, which copied the remaining input per character"; BACKLOG E002) | None. A user `List(a)` has O(n) access (examples/lists.wxw) | A sequence type with O(1) index and length and total bounds behavior | D001 (practical collections), STD001, SH004 | observed (use), inferred (cost contract from library source and the cited comment) |
| Data.Array: rebuild and combine | `concatMap` 156/58, `mapWithIndex` 110/56, `filter` 89/54, `mapMaybe` 81/49, `cons` 57/29, `snoc` 56/42, `fromFoldable` 36/27, `zip` 33/24, `zipWith` 33/23, `concat` 28/19, `catMaybes` 20/18, `drop` 18/15, `replicate` 15/13, `take` 14/14, `singleton` 10/9, `range` 7/7, `uncons` 12/10, `reverse` 4/4, `scanl` 4/4, `slice` 3/3 (50 distinct functions in all, 55 with the delta) | Persistent: the input is never changed. Results keep left-to-right order. `cons`, `snoc` and `uncons` copy: O(n) each (arrays-7.3.0 Data/Array.purs:255-257 states it for `cons`; Format/Stack.purs:6-11 states that n `snoc` calls cost O(n^2)). `concatMap` is bind with flattening in order. The compiler's own accumulators are built to avoid snoc in long loops (Format.Stack, 12 importing modules) | None | The whole family, with the stated cost model. A faithful port needs the same asymptotics or an explicit rewrite per hot loop | D001, STD001, SH004 | observed (use), inferred (costs) |
| Data.Array: search and test | `any` 103/43, `find` 51/36, `elem` 23/19, `findMap` 17/12, `elemIndex` 10/9, `findIndex` 9/8, `all` 9/7 | Left to right; short-circuit at the first hit (a port must not run later predicates; callbacks are pure here, so only cost is observable). `elem` needs Eq | None | Same family | STD001 | observed (use), inferred (short-circuit from library source; unchecked for each function) |
| Data.Array: ordering and dedup | `sortWith` 35/24, `sort` 4/4, `sortBy` 2/1, `nub` 12/10, `nubBy` 2/2, `groupAllBy` 2/2, `groupBy` 1/1, `delete` 3/3 (delta: `nubEq` 3, `notElem` 2, `deleteAt` 2, `partition` 1) | Sorting is stable: equal keys keep input order (arrays-7.3.0 Data/Array.purs:888). Sites use that for source-order diagnostics (Features/Resolve/SortConflict.purs:25, Features/Resolve/ArgumentGraph.purs:92). `nub` (Ord) keeps first occurrences in input order, O(n log n); `nubEq` is O(n^2). Changing either changes diagnostics or generated bytes | None. ADR 005 gives a structural order on every type, not a sort | Stable sort by an Ord key; first-occurrence-order dedup | D001, STD001, C001 (the Ord dictionary) | observed (use), inferred (stability and order from library source) |
| Data.Map | `Map` type 348/41, `lookup` 92/50, `empty` 66/31, `insert` 60/37, `fromFoldable` 22/18, `toUnfoldable` 18/11, `member` 17/14, `insertWith` 15/10, `keys` 13/8, `values` 10/6, `update` 8/5, `isEmpty` 8/6, `union` 7/3, `size` 7/5, `delete` 6/5, `alter` 6/6, `singleton` 3/3, `unionWith` 2/1, `difference` 1/1, `fromFoldableWith` 1/1, `findMax` 1/1 (20 functions; 21 with the delta's `intersectionWith`) | Ordered by `Ord k`, persistent, balanced (AVL; ordered-collections-3.2.0 Data/Map/Internal.purs:1) so each operation is O(log n). `toUnfoldable` yields ascending keys (:553), and several sites turn it into an Array whose order reaches output (Features/Check/Expand.purs:139, Features/Check/RowEntry.purs:142-186). `union` prefers the left map (:580). `insertWith f k new` calls `f old new` (:476-480). `fromFoldableWith` argument order is passed deliberately (`flip append`, Features/Resolve/RowSettle.purs:43). `keys` returns a Set (Data/Map.purs:24); `values` returns a List (Internal.purs:571), consumed through `Array.fromFoldable` (Features/Specialize/Printable.purs:59,84), so Data.List's Foldable leaks into compiler code without an import | The structural order of ADR 005 exists in the checker (docs/language.md:157-165) but there is no Map, no Ord dictionary and no way to pick the key order | An ordered persistent map keyed by Int (52 signature sites), Text (21), and structured keys: LabelKey 6, Ty 4, Key 4, Flex 4, Place 3, OccurrenceId 3, Tuple of Ty 1, Array of String 2 (counts of `Map <Key>` in signatures) | D001/STD001 for the library; C001 for Ord evidence; M001 for key type identity (docs/plans/2026-10-10-modules-and-instance-selection-direction.md, "Coherence, ownership and instance identity") | observed (use and key types), inferred (contract from library source) |
| Data.Set | `Set` type 127/25, `member` 30/24, `empty` 28/21, `fromFoldable` 22/17, `insert` 20/18, `union` 8/6, `delete` 4/4, `toUnfoldable` 2/2, `size` 2/2, `findMin` 1/1, `isEmpty`, `intersection`, `difference`, `singleton` (13 functions; 14 with the delta's `Set.map`) | Same ordering and persistence as Map. `findMin` is a deterministic priority pop (Features/Check/FeedOrder.purs:80: the ready set decides feed order, so output order depends on it). `toUnfoldable` ascending (Features/Check/Instantiation.purs:40) | None | Same as Map | D001/STD001, C001 | observed (use), inferred (determinism) |
| Data.Array.NonEmpty | 8 functions: `toArray` 6/6, `head` 2/2, `fromArray`, `sortWith`, `last`, `init`, `singleton`, `cons'` (1 each); the type in 4 modules (21 modules with the delta; delta adds `nubEq`, `appendArray`) | Non-emptiness by construction (the type, not a check); the library's `*.Internal` modules are forbidden by the forgery gate because `foldl1` on a forged empty array returns `undefined` (docs/engineering.md, forgingModules) | None | A non-empty sequence type, or a rewrite to `Array` plus total head | D001/STD001 | observed |
| Mutable arrays and builders | None. No `Data.Array.ST`, `Control.Monad.ST`, `Data.Ref` or `Effect.Ref` in either tree (`grep -rE 'Array.ST|Monad.ST|Ref' src`); the pure-layer allowlist forbids them (scripts/structure.mjs:20-24). Substitutes: Format.Stack, `foldl` into `Map.empty`, `Set.empty` or `Right` (13 sites by grep, e.g. Features/Resolve/ArgumentGraph.purs:69), `Array.replicate n unit` fed to `mapAccumL` to take n items (6 sites, e.g. Features/Check/Search.purs:36) | Linear accumulation without in-place mutation | None | None needed to port the current code. Builders are an optimization (BACKLOG E002 remaining items 1 and 4 would use a counter array; item 1 also says "the pure allowlist has no map", which is out of date, see Section 6) | SH004 (builder lifecycle, "no mutation model selected") | observed (absence), inferred (substitutes) |
| Data.List | Not imported anywhere (grep). Reached implicitly through `Map.values` and `Map.keys` | See Map row | None | Foldable over a list-like value, or a rewrite of the two sites | D001 | observed |

Notes:

- No collection API in this table exists in Waxwing. A faithful port cannot
  begin with a hand-written `List` and keep the compiler's scale numbers:
  the lexer and parser index into arrays, and BACKLOG E002 records what
  quadratic copying cost at 20,000 to 40,000 items.
- Complexity is part of the compiler's observable behavior: BACKLOG E002
  lists measured cliffs (name lookup, coverage, inhabitation) that were
  fixed by data-structure choices. A port that satisfies the type signatures
  but not the costs will reopen them.

### 2.2 Traversal

| Family | Observed use | Contract the compiler depends on | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| `foldl` (Data.Foldable) | 126/50 (132 occurrences by grep, which includes `Array.foldl` and a method definition). Accumulators are Maps, Sets, records, `Either` (Features/Specialize.purs:79 folds into `Right Map.empty`) | Left fold in element order, strict accumulator. Applied to Array in every site read; Foldable Stack is the one hand-written instance on main (Format/Stack.purs:15-20) and `Newest` in the delta (Generate/Elab/Log.purs:35-42) | None | A fold, and a Foldable abstraction for the two custom containers | STD001, K001/C001 | observed (use), inferred (container) |
| `traverse` / `sequence` | `traverse` 127/46, `sequence` 4/3, `for_` 5/2 | Applicative effect order is left to right and the result array keeps input order. Library `traverse` over an Array nests applies in a balanced tree (foldable-traversable-6.0.0 Data/Traversable.js, `traverseArrayImpl`: pivot split, `apply(map(concat)(go left))(go right)`). The compiler counts on it twice: stack depth stays logarithmic for applicatives with no Bind (Features/Specialize/Copy.purs:15-18, Features/Resolve/Fresh.purs:66-70, Features/Check/Scheme.purs:73-77, Features/Specialize/Lower.purs:74, Format/Go/Lowered.purs:183-185), and state-threading applicatives number things in source order (LocalIds "in the order `fresh` runs", Fresh.purs:93). The balanced tree preserves order because the left half's effects run first | None. Effects are direct-style; no Applicative abstraction | A generic `traverse` over any Applicative with those three guarantees (order, balanced depth, no per-item copying). A direct-style loop can give the order and depth for the compiler's own monads but not for user-defined Applicatives that have no Bind | K001/C001 (HKT and Applicative), SH003, SH004, STD001 | observed (use, comments), inferred (library behavior) |
| `traverse_` / `sequence_` | `traverse_` 87/28 (e.g. Features/Check/Defer.purs:109, Features/Resolve/EffectSorts.purs:25, Program/Main.purs:21 in `Effect`), `sequence_` 1/1 | Effects in element order; stops at the first failure in `Either`; result discarded. Applied to Array and, in Program.Main, to `Maybe` | Direct-style loops over user data | Same as `traverse` | STD001, K001/C001 | observed |
| `foldM` | `foldM` (Data.Foldable) 28/16, `Array.foldM` 1/1 in the delta (Features/Check/Generate/Pattern.purs:238, in `Gen s`) | Monadic fold in element order. Not stack safe over `Either`: `Array.foldM f b = unconsImpl ... (f b a >>= \b' -> foldM f b' as)` copies the tail per step and nests binds (arrays-7.3.0 Data/Array.purs:1344), measured to overflow near 1,930 arms (Features/Check/Search.purs:17-18; BACKLOG E002). Sites that need long inputs were rewritten as `tailRecM` (Search.firstJust) | None | A monadic fold with a stated stack and copy bound; or the ban on long-input uses has to be ported with the code | SH003, STD001 | observed (use, overflow), inferred (copy cost) |
| `mapAccumL` / `mapAccumR` | `mapAccumL` 19/14, `mapAccumR` 1/1; the `Accum` record type appears in the delta (Data.Traversable.Accum 19 uses in 2 modules) | Left-to-right threading with the same balanced traversal (Format/Go/Lowered.purs:183-196 relies on it for long argument lists); returns `{ accum, value }` | None | Combined map and fold, or a rewrite to explicit state threading | STD001 | observed (use), inferred (balanced via traverse; not confirmed in Data.Traversable's mapAccumL source) |
| Folds into scalars and search | `minimumBy` 3/2, `sum` 2/2, `minimum` 1/1, `lookup` 1/1 (Data.Foldable), `find` 1/1, `and` 1/1 (delta adds `maximum`, `elem`, `any`) | Strict, left to right | None | Small, convenience | STD001 | observed |
| `unfoldr` / Unfoldable | No `unfoldr`. `Map.toUnfoldable` and `Set.toUnfoldable` are used at an explicit `Array` annotation (e.g. Features/Specialize.purs:119 `∷ Array (Tuple Int v)`) | The Unfoldable class is used implicitly, with the result type chosen by annotation | None | Convert a map or set to a sequence in key order | D001/STD001 | observed |
| Custom Applicative and Monad instances | 25 hand-written on main: Functor, Apply and Applicative 6 each, Bind and Monad 2 each, Foldable 1, Eq 1, Ord 1; derived: Eq 33, Ord 21, plus Functor, Foldable and Traversable derived for `Arithmetic` in main only (Domain/Arithmetic.purs:25-27). The monads are `Copy`, `Fresh`, `Threading`, `Thread`, `Supply`, the parser `Parser` (Functor, Apply, Applicative only, Format/Parse/Grammar) | Law-abiding instances that the library's `traverse` and `foldM` accept; the parser has no Bind by design (BACKLOG G001, CST gates forbid `do` in productions) | None. C001's first core is explicit dictionaries, rank 1, closed signatures | User-defined Functor/Applicative/Monad evidence that a generic `traverse` accepts, and a way to withhold Bind | K001, C001, SV07-SV09 | observed |

### 2.3 Stack safety

| Family | Observed use | Contract the compiler depends on | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| `tailRec` | 40/32 (the Identity case; e.g. Features/Check/Search.purs:32 counting a stack) | Constant JavaScript stack for any iteration count | Self calls in Go are Go recursion; no tail-call guarantee (SV28 discussion; no mention of tail calls in docs/language.md, ADRs 001-015 or src/Format/Go* beyond ADR 006's option 3) | A loop construct or proper tail calls with a stated space bound | SH003 | observed (use), inferred (Waxwing absence) |
| `tailRecM` and `Step(Loop, Done)` | `tailRecM` 21/18; `Step` 62/51. The monad is `Either` at all 21 sites (Settle.purs:49, Sync.purs:34,40, TailPass.purs:35, Search.purs:20, Specialize.purs:94, Lex.purs:47, Parse.purs:49, Interpolated.purs:37, Cursor.purs:158,228, Inhabited.purs:51, Missing.purs:53, Usefulness.purs:57, Expand.purs:61, Lex/Text.purs:132, Lex/Dedent.purs:32,96, Unify.purs:86, UnifyRecord.purs:49, RowMerge/Improve.purs:43), by the enclosing signature or the aliases `Lookup` (Tables.purs:22), `Scanned` (Lex/Scan.purs:41), `Run` and `Continue` (Cursor.purs:60,63). No `MonadRec` instance is declared in src | Constant stack for `Either`-failing loops of 10^4 to 10^6 steps (lexing runs one step per token or whitespace run: Format/Lex.purs:60-65). Failure exits the loop at once with the diagnostic | None | A monadic loop with early exit, or tail calls with `Either`-returning functions | SH003, SH001 | observed |
| Self tail calls "which purs compiles to a loop" | 11 comments saying so (e.g. Format/Lex.purs:115,152; Format/Stack.purs:9-11); more unmarked sites exist | The compiler relies on a self-recursive tail call in a pure function not growing the JavaScript stack (`wordEnd`, `spaceEnd`, `foldNewestFirst`). This is a PureScript optimization, not a library | Go emits a call; no loop (inferred: no mechanism documented) | Either proper self tail calls or a rewrite of each such loop | SH003 (SV28) | observed (comments), inferred |
| Balanced traversal as a stack-safety device | See 2.2 `traverse` | Depth O(log n) in the array length for Bind-free applicatives | None | See 2.2 | SH003, SH004 | observed |
| Explicit stacks and worklists | `Stack` types in Format.Stack, Features.Check.Search (`Stack`, `stackItems`), Usefulness, Missing; worklist inhabitation (Features/Check/Inhabited.purs:44-51) | The algorithms are written with a heap-allocated continuation stack so the checker is not recursion-bound on 5,000-field patterns (BACKLOG E002) | Algebraic data types and `match` can express an explicit stack | None for expression; stack safety of the surrounding calls (above) remains | SH003 | observed |
| Depth limits | E_NESTING at 128 (Format/Lex/Chars.purs:25-26, Format/Parse/Grammar.purs:94-95, Format/Parse/Cursor.purs:126-196; ADR 006); inferred type depth (`inferredTypeLimit`, Features/Check/Require.purs:140); specialization count limit 10000 (Features/Specialize/State.purs:101). Open items: E006 (unify recursion near 2,250 deep), E007, E008, G002, G004, G006 (cold versus warm V8 stack), H001, O001 | The limits are calibrated to the JavaScript stack (ADR 006 Context: "deep nesting exhausted the JavaScript stack"). Phases still recurse over trees; the limit makes overflow a diagnostic | The Go runtime's goroutine stack grows to a runtime maximum and exhaustion is a fatal error, not a panic (docs/language.md:498). The maximum itself was not checked here | Choose whether the ported compiler keeps 128 and the same recursion shape (and then needs its measured safe depths re-established on Go), or lifts it with H001/O001. Either way the E_NESTING boundary is observable behavior that tests pin (test/depth.test.mjs per docs/language.md:973) | H001, O001, SH003 | observed (limits), unverified (Go stack behavior) |

### 2.4 Strings and characters

PureScript `String` is a JavaScript string: UTF-16 code units, compared by
code unit. Waxwing `Text` is UTF-8 with code-point order (docs/language.md:
549-605). The compiler's offsets, columns, slices and ordering are defined
in the first; this is the main semantic gap in this area.

| Family | Observed use | Contract the compiler depends on | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| `Char` and Char tests | 74 Char-literal lines in 11 modules (command: `grep -rhE "(^\|[^A-Za-z0-9_'])'(\\\\.\|[^'\\\\])'" src --include='*.purs'`, comments removed); `Char` comparison `>=`/`<=` (Format/Lex/Chars.purs:113-122: `'a'..'z'`, `'0'..'9'`), `==` against literals (Format/Lex.purs:77-86) | Ordinary, total order on code units in these tests (ASCII ranges only) | No Char type | A character type, literals, comparison; or an ASCII byte plus predicate library | D001, STD001 (SV18) | observed |
| Code-unit indexing and slicing | `String.charAt` 22/7 (`Maybe Char`; out of range is `Nothing`, strings-6.0.1 Data/String/CodeUnits.js:17), `String.slice` 12/5 (JavaScript `slice`: clamps, accepts negatives, always returns a string), `String.length` 8/7, `countPrefix` 1/1, `stripPrefix` 1/1, `toCharArray` 1/1, `fromCharArray` 1/1, `singleton` 1/1 (Data.String.CodeUnits); `Data.String` `joinWith` 19/9, `length` 5/3, `null` 1/1, `indexOf` 1/1, `take` 1/1; `Data.String.Common.joinWith` 83/23 (one function, 102 uses in all) | Index and length are in UTF-16 code units. A token's text is a slice of the source (Format/Lex.purs:146-151). Positions are `{ offset, line, column }` where offset and column count UTF-16 units and a line starts after LF (Format/Lex.purs:159-166; Runtime/Node.js comment "Positions follow the location convention: UTF-16 units, LF starts a line") | `Text` has literals, `++`, comparison, printing and `show` only (docs/language.md:549-640; BACKLOG D001 and STD001: "no operations beyond those") | Length, indexing and slicing with a stated unit (the unit choice changes every diagnostic column for non-ASCII text); join with separator | D001, STD001 (Text note), plus a position-convention decision: no item, proposed new scoped item | observed (use), inferred (units from library source) |
| Code points | `CodePoints.take 1` (Format/Lex.purs:139, Format/Lex/Escape.purs:65), `singleton`, `toCodePointArray` (Format/Go/Data.purs:110: Go string-literal escaping iterates code points), `fromEnum`/`toEnum` between `CodePoint` and `Int` (Format/Go/Data.purs:122, Format/Lex/Escape.purs:90) | A token's span covers a whole code point though the offset is in UTF-16 units, so a non-BMP character has width 2 (Format/Lex.purs:135-144; docs/language.md Text v1 note on `Unexpected character`). Escape decoding yields a valid scalar value or an error | Text is a sequence of scalar values, so the code-point view is natural; conversion to UTF-16 widths is not defined | Code-point iteration, scalar-value construction and a code-point-to-UTF-16-width function | D001, STD001 | observed |
| String ordering | `Ord String` on Map keys (21 `Map String` signatures) and Set keys (12 `Set String`) and in derived `Ord` over records with Text fields | PureScript compares by UTF-16 code unit (prelude-6.0.2 Data/Ord.js:16 `ordStringImpl = unsafeCompareImpl`). Waxwing's comparison is by code point (docs/language.md:597-600). The two disagree only when a supplementary-plane character is compared with U+E000 to U+FFFF | Code-point order | Probably none for names (the lexer restricts identifiers to ASCII, docs/language.md Text v1: "Identifiers and keywords stay ASCII"), but a key holding a Text literal would differ. Whether any Map or Set key can hold literal text was not checked | D001, ADR 011 | inferred (disagreement), unverified (reachability in keys) |
| Number formatting and parsing | `Int.fromString` 1/1 (Format/Parse/Literal.purs:47: a token already checked to be all digits), `Int.fromStringAs hexadecimal` 1/1 (Format/Lex/Escape.purs:88), `Int.toStringAs hexadecimal` 1/1 (Format/Go/Data.purs), `show` on Int (62 occurrences in 21 modules, e.g. Format/Diagnostic.purs:38-39,63) | `fromString` accepts an optional sign and returns `Nothing` outside signed 32-bit range (integers-6.0.0 Data/Int.js:14-32: regex then `(i \| 0) === i`); `fromStringAs` is case-insensitive. The out-of-range case becomes E_INTEGER `Integer literal is outside signed 32-bit range` (Format/Diagnostic.purs:37). `show` of Int is decimal with a leading `-` | `show` is a compiler built-in (docs/language.md:636); Int literal range check is in the compiler. No parse or format library | Decimal and hexadecimal parse and format with the same range rule | D001, STD001 | observed (use), inferred (range rule from library source) |
| Text building | `<>` 1,222 occurrences in 123 modules (String and Array append are indistinguishable by the scan), `joinWith` 102, interpolation by `<>` in diagnostics and Go emission (Format/Go/*) | Left-associated concatenation with no length limit; Go emission builds large strings (size not measured here) | `++` on Text (docs/language.md:593), O(n) per join in Go | Efficient repeated concatenation or a builder (the compiler's Go output is built by `<>` and `joinWith`); append for sequences | STD001, D001 | observed (counts), unverified (type split) |
| Regex, formatting libraries | None. No `Data.String.Regex`, `Data.Char` or `Text.Parsing` imports (grep) | | | None | | observed (absence) |

### 2.5 File, process and host services

All host effects are behind `Domain.Host.Host m` (Domain/Host.purs:33-38)
and implemented once, by `nodeHost` in Runtime/Node.purs:45-56 with
Runtime/Node.js. `Program.Command` takes the host as a record, so tests
substitute fakes. No `Node.*` PureScript package is used; the FFI is nine
`foreign import` declarations (Runtime/Node.purs:35-43), all in one module
pinned by scripts/foreign-surface.json.

| Service | Observed use | Contract the compiler depends on | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| Arguments | `commandArguments = process.argv.slice(2)` (Node.js:37); Program/Main.purs:19 | An array of strings, program name and script path removed. Parsed by Format.Arguments into `Emit`, `Build`, `Run` with usage text | None. `main` takes no arguments | Read argv | I001 | observed |
| Output and exit status | `writeOutput` (`process.stdout.write`, no newline added, Node.js:38), `writeError` (`console.error`, adds LF, :39), `setExitCode` (`process.exitCode`, :40); statuses 0, 1 (failure), 2 (usage) (Program/Command.purs:22-26) | Success prints stdout text only; failures print one JSON line on stderr and set the status. The process is not exited early, so buffered output flushes | `Console.print` writes `show(x)` plus LF to stdout (docs/language.md:639-640); no stderr, no exit status | Write exact bytes to stdout and stderr, set status | I001, FX001 (Console) | observed |
| Read source file | `readSourceWith` (Node.js:88-97): `readFileSync` bytes, strict UTF-8 decode with BOM kept (`ignoreBOM: true`, :76), invalid bytes give the UTF-16 offset, line and column of the first invalid byte using the WHATWG ranges (`firstInvalid`, :45-74; `invalidAt`, :79-86); result `InvalidUtf8 Position` becomes a one-unit diagnostic (Program/Command.purs:45-61) | Exact byte-to-position mapping for malformed input; BOM stays in the text. Any other failure is `IoFailure` carrying the Node error message (:8-10) | Source files are UTF-8; invalid UTF-8 is E_SYNTAX at the first invalid byte (docs/language.md:549-556), implemented in this FFI | Read a file as bytes, validate UTF-8, report the first invalid position in UTF-16 units; the message text of an I/O error is OS and runtime specific (observable in output) | I001, D001 | observed |
| Write file | `writeTextWith` (Node.js:99-103): `writeFileSync(path, text)`, UTF-8, truncating | Overwrites; no atomic rename, no mkdir; error message passed through | None | Write a file | I001 | observed |
| Temporary directory and build | `withBuilt` (Node.js:21-35): `mkdtempSync(tmpdir()/waxwing-)`, write `main.go`, `spawnSync('go', ['build','-o',binary,source])`, always remove the directory in `finally` (`rmSync` recursive, force); `buildWith` resolves the output path against the cwd (:105-106) | The temp directory is removed on every path, including failure (Domain/Host.purs comment on `buildExecutable`/`runProgram`) | `defer` gives cleanup inside Waxwing's effects (docs/language.md:317-372, FX001) | Create/remove a temp directory, path join and resolve | I001, FX001 | observed |
| Subprocess | `external` (Node.js:12-19): `spawnSync(command, args, { encoding: 'utf8' })`; a non-zero status or an `error` becomes `ToolFailure { message, command }` where message is the spawn error or the child's stderr; stdout returned only on success; `runWith` runs the built binary with no arguments and returns its stdout (:108-110) | Synchronous; inherits the environment and PATH lookup for `go`; no timeout; stdin not provided; stderr dropped on success. `spawnSync`'s default output buffer is 1 MiB (Node documentation; unverified for 26.6), so a larger child output would surface as a spawn error | None | Run a program with arguments, capture stdout/stderr and exit code, typed failure | I001, FN005, A004 | observed (use), unverified (buffer limit) |
| Environment | `process.env.GOCACHE ??= resolve('.build/go-cache')` before the compiler loads (scripts/waxwing.mjs:2) | The spawned `go` sees GOCACHE; also uses PATH and HOME implicitly. This is in the launcher script, outside src/ | None | Read, set and pass environment variables to a child | I001 | observed |
| JSON output | `json = record => JSON.stringify(record)` (Node.js:41) applied to three record shapes (Runtime/Node.purs:57-63; Format/Wire.purs) | Compact JSON; key order is the order the PureScript record literal built its JavaScript object; string escaping follows `JSON.stringify` (control characters, quotes, lone surrogates). Both are observable in the stderr line | A record is a typed structure, not a JSON value; no encoder | A deterministic JSON writer with a documented field order and escaping, written in Waxwing or provided | no item: proposed new scoped item (host/wire JSON); SCH001 covers parsing input, not this | observed (use), inferred (key order from JS object semantics) |
| Failure typing | `HostFailure = IoFailure Text \| ToolFailure {message, command}` and `ReadFailure` (Domain/Host.purs:21-31); `Host m` is abstract over a Monad `m` so the CLI runs under fake hosts | Typed failures cross the host boundary; `Program.Command` is pure | `Fail(E)` typed aborts and handlers exist; services are effects | Represent `Host` as an effect with a handler, or as a record of functions; the first needs I001's design, the second needs higher-kinded `m` (SV07/SV22) | I001, K001 | observed |

### 2.6 Scope protections around the generator

This area is mostly in the delta. Main has no generator, no `seal`, no
roles and no rank-2 type (`grep -rn '(∀\|(forall' src` is empty on main).
The readiness doc's SV10 to SV12 and SV30 rows are checked against the
code below.

| Protection | Observed use | What library or language support it relies on | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| Rank-2 `seal` (SV10) | The only `(∀` in either tree: `seal ∷ ∀ a. Header → (∀ s. Gen s (Elab s a)) → Either GenerationFault (Elaborating a)` (Features/Check/Generate/Elab.purs:63-68). One call site: Features/Check/Generate.purs:66 | Higher-rank argument with an annotation, rigid `s` inside the argument, `a` fixed outside it, so a `Handle s` cannot escape. The comment at Elab.purs:8-11 states the intent ("a skolem escape") | Rank-1 only; signatures are mandatory but not higher rank (BACKLOG R006 "Signatures stay rank 1 until a design says otherwise") | Annotated rank-2 argument checking, or a replacement that gives the same escape guarantee | SH002, R006, K001 | observed |
| Phantom scope `s` on `Handle`, `Gen`, `Elab`, `Ref`, `GenTy` (SV11) | `newtype Handle ∷ Type → Type`, `newtype Elab ∷ Type → Type → Type`, `newtype Gen ∷ Type → Type → Type`, `data Ref ∷ Type → Type`, `type GenTy ∷ Type → Type` (Features/Check/Generate/Elab/Internal.purs:61,67,76,87,90). `s` appears in 27 modules and 147 `∀ s` lines of the delta (command: `grep -rhoE '∀ s\b' src \| wc -l`) | Parameters that no value mentions (phantom), kind signatures for them, and instance deriving through them (`derive instance ordHandle ∷ Ord (Handle s)`, Internal.purs:93-96) | Generic ADTs have parameters; phantom use is not excluded but untested; no kind signatures; deriving is outside C001's first core (SV09) | Phantom parameters and deriving on them, kind annotations if the checker needs them | K001, C001 | observed |
| Nominal roles (SV11, SV30) | `type role Handle nominal`, `type role Elab nominal representational`, `type role Gen nominal representational` (Internal.purs:64,71,80): three role declarations. No `coerce` or `Coercible` is called anywhere in src (matches are comments only: Generate/Elab.purs:11, Refute/Rules/Internal.purs:13, Verdict/Theorem/Internal.purs:11). The forgery gate forbids `Unsafe.Coerce` and `Record.Unsafe` (docs/engineering.md, `coercionFindings`) | The role declarations only matter because PureScript has `coerce`. Waxwing has no coercion, so the requirement is vacuous until one is added, matching the readiness doc's SV30 | No coercion mechanism | None today; a future coercion feature must keep `s` nominal | K001, AS001 | observed |
| Opaque constructors and Internal-module import gates (SV06, SV23) | Constructors of `Handle`, `Elab`, `Gen` are importable only by Generate.Elab and Generate.Gen (rule E4); `Elaborating` by Domain.Elaborating and Generate.Elab (E2); 7 token modules (Verdict, Recorded, Theorem, Rules, Elaborating, Judged, Certified) listed in `tokenModules`; 14 entries in `internalModules` against 2 on main (scripts/structure-modules.mjs:8-60; scripts/structure.mjs:27-32 on main). `Generate.*` is importable by `Generate*` only (E3). 159 modules import some `.Internal` module on the delta, 118 on main (almost all `Domain.Checked.Internal`) | Module export lists that hide constructors; a gate that parses the import graph (`purs graph`), compiled output and FFI files, because purs inlines constructors, re-exports can forward them and FFI can name them (docs/engineering.md, "token Internal module", `reexportFindings`, `importFindings`, `foreignFindings`). The pins scripts/trusted-surface.json and scripts/foreign-surface.json fix the allowed export list and the one FFI module | No modules (M001 Planned); no gates over `.wxw` | Hiding constructors by module, plus an inspectable import/export graph for gates to read; an FFI restricted to one pinned module; a rule that no Runtime module imports generator modules (S10) | M001, SH005, AS001, I001 | observed |
| Applicative without Bind (SV12) | `Elab s` has Functor, Apply, Applicative and no Bind (Features/Check/Generate/Elab/Internal.purs:98-109); the comment at :111-113 says PureScript forbids orphan instances, so no other module can add one. `Gen s` is a full Monad (:115-133). The parser `Parser` has the same shape on main (Format/Parse/Grammar) | The guarantee comes from instance coherence: one instance per class and type, declared with the type (orphan rule). It also relies on the static part (`uses ∷ Set Use`) being computed by `<*>` as a union (:102-106), so a port needs `traverse` to produce that union without running reads | No classes, no instances | Hidden or absent Bind for one type, enforced at the type's defining module, with Applicative composition still available | K001, C001, M001 (coherence) | observed (instances), inferred (orphan rule as the mechanism) |
| Runtime seal check as a second layer | `Elaborating` records `uses`, per-variable `fresh` counts and site write counts; Decide/Shadow.purs:80-96 checks them after `seal`; `Features/Check/Elaborate.purs` reports `Broken` (BACKLOG R0 rows, docs/plans/r0-generation-continuation.md §3.5) | `Map.fromFoldableWith add` counting (Generate/Elab.purs:120-122), `Set.union`, `Set.map` | None | Library items already in 2.1 | D001 | observed |

What each protection needs, stated minimally: (1) the rank-2 argument and
rigid scope variable, (2) phantom parameters with no coercion between
scopes, (3) constructor hiding that survives re-export and FFI, (4) a gate
reading imports and exports, (5) no second Bind instance. SV30 is correct
that higher rank alone does not give (3) to (5).

### 2.7 The rest

| Family | Observed use | Contract | Waxwing today | Gap | Roadmap | Label |
|---|---|---|---|---|---|---|
| Data.Maybe | `maybe` 318/137, `maybe'` 198/97, `fromMaybe` 54/33, `isJust` 9/8, `isNothing` 9/7; 247 occurrences of the name `Maybe` or its constructors in 153 modules | `maybe'` takes a thunk `Unit -> b` evaluated only on `Nothing`: the compiler uses it to avoid computing fallbacks (e.g. Features/Check/Search.purs:21) | A user `Maybe` ADT (examples/lists.wxw:2); strict evaluation; lambdas exist | Library `Maybe` functions with exact lazy-fallback semantics | STD001 (direction doc: "Prove computed fallbacks and unselected callbacks are not executed"), FN001 | observed |
| Data.Either | `either` 41/28, `Either` 34/23, `isRight`, `hush` (1 each); 420 occurrences of the name `Either` or its constructors in 129 modules (delta adds `note` 7/4) | `Either Diagnostic` is the failure monad of every phase; bind short-circuits on the first Left | `Either` as a user ADT, or `Fail(E)` effects | Choose between the two representations for the port; `Either` monad needs the Monad abstraction | STD001, K001/C001, FX001 | observed |
| Data.Tuple | `Tuple` constructor and type 460 lexical occurrences in 105 modules, `fst` 43/27, `snd` 30/24 | Product with structural Eq and Ord (used as Map keys and in `sortWith`) | User `Pair(a, b)` ADT, records | Library pairs or records with the same order | D001, R001 | observed |
| Data.Enum | `fromEnum` 1/1, `toEnum` 1/1 (CodePoint to Int and back) | Scalar-value validity: `toEnum` is `Nothing` for surrogates and out-of-range values (enums-6.0.1) | None | Code point and Int conversion | D001 | observed |
| Int arithmetic | `+` about 218 sites, binary `-` 66, `*` 4, `<=` and `>=` 53 (the scan did not count `<` and `>`), `==` and `/=` 323; no `div`, `mod`, `negate`, `/`, bit operations or Number anywhere (token counts, 1.4 item 3) | PureScript `Int` is 32-bit with wrapping arithmetic (JavaScript `\|0`), the same width and wrap as Waxwing's | Int32, `+` only on main (Domain/Arithmetic.purs `data BinaryOp = Plus`), wrap modulo 2^32 (docs/language.md:150-152); `-` and `*` planned (docs/plans/2026-10-24-int-arithmetic-plan.md Tasks 3-4) | Binary `-` and `*`; the rest of the compiler's arithmetic is comparison and `+` | D001 | observed |
| Prelude (open import) | See the token counts below | Standard class methods | Partial: comparison, `++`, `+` | See 2.1 to 2.4 | C001, STD001 | observed |
| Effect | `Effect` in 2 modules (Program.Main, Runtime.Node); `Host Effect` is the only instance of `Host m` | The CLI runs once, synchronously; `Effect` is never used in Domain, Features or Format (scripts/structure.mjs:19-24) | Effects with handlers | See 2.5 | I001, FX001 | observed |
| Partial, Unsafe, Debug, Foreign, Type.*, Safe.Coerce | None imported in src (`grep -rE 'import (Partial\|Unsafe\|Debug\|Foreign\|Type\.\|Safe)' src` is empty). Pure layers are forbidden these modules by the import allowlist (scripts/structure.mjs:20-24, `partialModules`) | | | None | | observed |
| Prim | `import Prim hiding (Row)` in 43 modules: the Prim `Row` kind clashes with the compiler's own `Row` | PureScript-specific | n/a | None | | observed |

Prelude token counts (comments and strings removed, 324 modules; "uses/
modules"): `<>` 1,222/123, `<$>` 351/105, `<*>` 161/39, `<<<` 170/90,
`>>=` 112/59, `=<<` 19/15, `>=>` 5/2, `<=<` 1/1, `<$` 11/10, `$` 19/16,
`pure` 223/83, `map` 514/176, `identity` 76/47, `const` 37/24, `flip`
37/25, `unit` 102/56, `not` 92/67, `==` 275/123, `/=` 48/38, `&&` 109/61,
`||` 88/43, `compare` 16/7, `comparing` 7/3, `min` 11/7, `max` 9/5, `show`
62/21, `when` 10/7, `unless` 3/2, `void` 7/5, `join` 7/4, `ap` 1/1, `do`
183/85. `ado`, `mod`, `div`, `negate`, `liftA2` and `<|>` do not occur. The
language features of the syntax inventory (240 data, 47 newtype, 545 type
synonyms) are in the readiness doc and are not repeated here.

## 3. Gap ledger

Priority: B = blocks a port, N = needed for scale or for behavioral
equivalence, C = convenience. Each row's check is the smallest acceptance
check that would close the gap; "differential" means byte-identical output
or diagnostics against the PureScript compiler on the harvested corpus
(BACKLOG T006: 2,486 sources) or on a named fixture set. None of these
checks was run.

### 3.1 The ten gaps that matter first

1. AG01 ordered persistent Map and Set (observed; D001/STD001, C001).
2. AG02 indexable sequence with the stated cost model and stable sort
   (observed; D001/STD001, SH004).
3. AG03 generic `traverse` with left-to-right effects and balanced depth
   over user-defined Applicatives (observed; K001/C001, SH003).
4. AG04 stack-safe monadic loops and fold over `Either` (observed; SH003).
5. AG05 text and character operations with a stated unit and the UTF-16
   position convention (observed; D001/STD001).
6. AG06 annotated rank-2 scope isolation, delta only (observed; SH002,
   R006).
7. AG07 constructor hiding plus a gateable import/export graph (observed;
   M001, SH005).
8. AG08 file, process and exit-status host services with typed failures
   (observed; I001).
9. AG09 user-defined Functor/Applicative/Monad evidence, deriving Eq/Ord,
   and withholding Bind (observed; K001, C001).
10. AG10 deterministic JSON writer (observed; no item).

### 3.2 Full ledger

| ID | Pri | Gap | Label | Maps to | Smallest acceptance check |
|---|---|---|---|---|---|
| AG01 | B | Ordered persistent Map and Set keyed by Int, Text and structurally ordered ADT, tuple and array keys, with `insertWith`, `alter`, `update`, `unionWith`, `difference`, `findMin/findMax`, ascending iteration, `keys` as a Set. 83 modules (Map) and 41 (Set) | observed | D001, STD001, C001 (Ord evidence), M001 (key identity) | Port Features.Resolve.ArgumentGraph (Section 4, slice 2) and the RowStore insert/union path; differential on the corpus; 10^5-key insert/lookup run under a time bound that fails first on an O(n) map |
| AG02 | B | Sequence type with O(1) `index` and `length`, total bounds, persistent `cons/snoc/append/slice/concatMap/zip/mapMaybe`, stable `sortWith`, first-occurrence `nub`. 50 functions in 238 modules | observed | D001, STD001, SH004 | A manifest test: one example per used function (the Array rows of 2.1), a stability law for sort (equal keys keep input order), and the Format.Lex scan of a 10^6-character source in linear time |
| AG03 | B | Generic `traverse`, `sequence`, `traverse_`, `for_`, `mapAccumL` over any Applicative, with input-order results, left-to-right effects, and O(log n) nesting for Bind-free applicatives; no per-item array copy | observed | K001, C001 (Applicative evidence), SH003, SH004 | Port `Fresh.thread` (Features/Resolve/Fresh.purs:70-82): a 20,000-element traversal in a user-defined state-threading Applicative with no Bind returns correct numbering and does not exhaust the stack; effect-order test with a logging Applicative |
| AG04 | B | Stack-safe loop with early exit in `Either`: `tailRecM`/`Step`, `tailRec`, `foldM`; self tail calls or an equivalent guarantee. 21 sites in 18 modules plus 11 commented self tail calls | observed | SH003 (SV28), SH001, STD001 | Port `Search.firstJust` and `Lex.lex` loop (slice 3): 10^6 steps and a 10^5-item `foldM` over `Either` in constant stack, early exit on the first Left; plus Go-side measurement of stack growth |
| AG05 | B | `Char` (or an equivalent), code-unit-indexed read and slice with out-of-range behavior, length, prefix tests, `stripPrefix`, `indexOf`, `joinWith`, and a decision on offset units. Positions must equal the PureScript lexer's on non-ASCII input | observed | D001, STD001; position convention: no item, proposed new scoped item | Slice 1: the ported lexer produces identical tokens and spans on the corpus and on a fixture set with BMP, surrogate-pair and BOM inputs |
| AG06 | B | Annotated rank-2 argument (`seal`) with rigid scope and an escape rejection (delta only: one site) | observed | SH002, R006, K001 | Slice 5: a negative fixture where a `Handle s` escapes `seal` is rejected; the positive fixture type-checks; no other rank-2 use required |
| AG07 | B | Constructor hiding by module export list; imports and exports readable by gates; one pinned FFI module; rule E1-E6 equivalents | observed | M001, SH005, AS001, I001 | One negative fixture per rule E1-E6 and S10 (an importer outside the allowlist, a re-export of a constructor, a foreign file naming a token module) rejected by a gate over the Waxwing module graph |
| AG08 | B | Host services: argv, stdout/stderr writes, exit status; read file with strict UTF-8 and first-invalid position; write file; temp directory with guaranteed removal; spawn `go build` and the built binary with stdout/stderr/status capture; environment | observed | I001, FN005, FX001 (defer for cleanup) | Slice 4: the port's `Program.Command` passes the existing fake-host command tests unchanged; a real run builds a hello program and the temp directory is gone after success and after a failing build |
| AG09 | B | User-defined Functor/Apply/Applicative/Bind/Monad/Foldable instances (25 hand-written on main), derived Eq/Ord (54), `Monad m` abstraction for `Host m`, and a way to leave Bind out. SV07-SV09 | observed | K001, C001, SV07-SV09 | The C001 first core extended to constructor classes in a fragment: `Copy s` and `Elab s` declared with the same instance sets, `command` generic in the monad runs under two instantiations |
| AG10 | N | Deterministic JSON writer: field order, string escaping and number rendering equal to `JSON.stringify` on the three wire shapes | observed (use), inferred (key order) | no item: proposed new scoped item | Byte-identical stderr for every failure fixture in test/ that asserts the wire line |
| AG11 | N | Int `-` and `*`; comparison on Int is present | observed | D001 (docs/plans/2026-10-24-int-arithmetic-plan.md) | The 66 `-` and 4 `*` sites port with the same results at the int32 boundaries |
| AG12 | N | Text building at scale: repeated `<>` (1,222 sites) and `joinWith` (102) producing multi-megabyte Go source without quadratic cost | observed (counts), unverified (cost in Go) | STD001, D001, SH004 | Emit the Go for a 20,000-parameter program (BACKLOG G003 workload) and compare time and memory with the PureScript run |
| AG13 | N | Stable ordering contracts that reach output: Map/Set iteration, `findMin` pop order (FeedOrder.purs:80), stable sort | observed | D001, C001 | Differential on diagnostics order for programs with multiple simultaneous errors |
| AG14 | N | `Array.foldM` and `traverse` in a user monad (`Gen s`, delta): Pattern.purs:238 | observed (use), unverified (overflow bound) | SH003, K001 | A 5,000-field constructor pattern through the ported generator, in the shadow tree first |
| AG15 | N | Depth-limit calibration: E_NESTING 128, inferred-depth, specialization limits tied to the JavaScript stack | observed | H001, O001, G002, SH003 | The depth fixtures of test/depth.test.mjs pass at the same boundaries on the ported compiler, or the boundary change is recorded and approved |
| AG16 | N | `maybe'` lazy fallback (198 sites) and Maybe/Either/Tuple library with exact evaluation rules | observed | STD001, FN001 | A test that the fallback thunk and unselected callbacks are not executed (counter effect) |
| AG17 | N | Code-point API and conversion: `toCodePointArray`, `singleton`, `toEnum`, `fromEnum`, hex parse and format, Int parse range rule (E_INTEGER boundary) | observed | D001, STD001 | Escape-decoding and Go string-literal escaping fixtures byte-identical; `2147483648` still gives E_INTEGER |
| AG18 | N | Gate and harness migration (SV23, SV24): structure, forgery, trusted-surface pins and white-box JS adapters | observed (gates), inferred (adapters) | SH005, AS001 | The port ships with gate equivalents green and the executable/diagnostic/oracle suites running against it |
| AG19 | C | Non-empty array type and `Data.Array.NonEmpty` functions (8) | observed | D001, STD001 | Port Features.Check.Decide.Reason (delta) uses |
| AG20 | C | `mapAccumL` with `Accum`, `replicate n unit` counting idiom (6 sites) as explicit loops | observed | STD001 | The sites rewritten to loops give identical results |
| AG21 | C | Folds to scalars: `minimumBy`, `sum`, `minimum`, `maximum`, `lookup`, `find` | observed | STD001 | One test per function |
| AG22 | C | Delta-only conveniences: `Set.map`, `Map.intersectionWith`, `nubEq`, `notElem`, `deleteAt`, `partition`, `Data.String.contains`, `Data.Either.note`, `Void`, `foldMapDefaultL`, a Semigroup instance (Log) | observed | STD001, C001 | Each appears in a ported delta module test |
| AG23 | C | String key order versus code-point order for Map/Set Text keys | inferred, unverified | D001, ADR 011 | Enumerate the Map String and Set String key sources and show they are ASCII identifiers, or choose one order and test it |
| AG24 | C | Mutable builders for the quadratic spots recorded in BACKLOG E002 (name lookup, inhabitation counters) | observed (substitutes), unverified (need) | SH004 | Not required for the port; measure after AG01-AG02 |
| AG25 | C | Kind signatures and `type role` declarations as syntax (4 and 3 sites) | observed | K001, SV11 | Only needed if the phantom-scope design keeps them; see AG06 |
| AG26 | C | Corefn-level confirmation of which dictionaries and containers each polymorphic call uses | unverified | SH001 | A `purs --dump-corefn` pass over main attributing each `foldl`, `traverse` and `<>` to a type |

## 4. Representative porting slices

Five slices, each a small real piece of the shipped compiler (the sixth
point, generator scope, comes from the delta). Sketches are illustrative:
none is implemented, none is proposed Waxwing syntax or API, and every name
in them that is not in docs/language.md is invented for the sketch.

### Slice 1: one lexer function

Source: Format/Lex.purs:46-47 (`lex`), :66-70 (`scan`), :72-88 (`scanAt`),
:116-123 (`spaceEnd`), :153-157 (`wordEnd`); Format/Lex/Chars.purs:113-122.

```purescript
wordEnd ∷ String → (Char → Boolean) → Int → Int
wordEnd source predicate index =
  if maybe false predicate (String.charAt index source) then
    wordEnd source predicate (index + 1)
  else index
```

APIs: `String.charAt` (code-unit read, `Maybe Char`), `maybe`, `Char`
comparison, a self tail call, and in the caller `tailRecM` over `Either`,
`String.slice`, `Stack.push`, a `Position` record updated by `advance`
(Lex.purs:159-166).

What Waxwing lacks today: Char; a Text read by index; Text slice; a loop
that does not grow the stack for 10^6 iterations; `Maybe` library
functions (the ADT itself is writable). A Text length in bytes would
silently change every column on non-ASCII input.

What a faithful port requires: AG05 (unit decision and positions equal to
UTF-16 offsets), AG04, AG16. Sketch, not implemented:

```text
-- NOT IMPLEMENTED. Text.unitAt and CodeUnit do not exist.
fn wordEnd(source: Text, ok: CodeUnit -> Bool, index: Int): Int =
  match Text.unitAt(source, index) {
    Just(c) => if ok(c) then wordEnd(source, ok, index + 1) else index,
    Nothing => index,
  };
```

Closing check: token streams and spans equal to the PureScript lexer on
the corpus, including inputs with U+1F600 and a BOM (AG05).

### Slice 2: a Map-heavy resolver pass

Source: Features/Resolve/ArgumentGraph.purs:62-82 (`argumentGraph`), :89-100
(`firstLabel`).

```purescript
  , labelled: foldl noted Map.empty (Array.concatMap candidates entries)
  ...
  noted found (Tuple name one) = Map.alter (add one) name found
  add one = Just <<< maybe [ one ] (Array.cons one)
```

APIs: `foldl`, `Map.empty`, `Map.alter`, `Map.fromFoldable`, `Map.lookup`,
`Set.member`, `Set.empty`, `Array.concatMap`, `Array.mapWithIndex`,
`Array.cons`, `Array.filter`, `Array.sortWith` (stable, span order),
`Array.head`, `Array.null`, `maybe`, `Tuple`, record types.

Lacks: all of the above; a Text-keyed ordered map; a stable sort by an Ord
key; `Tuple`. Records and ADTs are available.

Port requires: AG01, AG02, AG09 (an Ord key abstraction), AG13. The pass is
a good Map slice because its result order depends on `sortWith` stability
(the first label by source order) and on `Map.alter` building arrays in
reverse insertion order.

Closing check: for a program with duplicate record labels across
declarations, the clash diagnostic names the same first label as the
PureScript pass, on the existing fixtures (differential).

### Slice 3: a tailRecM loop and a counting idiom

Source: Features/Check/Search.purs:19-26 (`firstJust`), :29-39
(`stackItems`).

```purescript
firstJust judge items = tailRecM step 0
  where
  step index = maybe' exhausted (visit index) (Array.index items index)
  exhausted _ = pure (Done Nothing)
  visit index item = advance index <$> judge item
  advance index = maybe (Loop (index + 1)) (Done <<< Just)
```

APIs: `tailRecM` at `Either e`, `Step`, `Array.index`, `maybe'`, `<$>`,
`Array.replicate`, `mapAccumL`, `Array.reverse`, `Array.catMaybes`.

Lacks: an array; `Either` with a Functor; a stack-safe loop. A direct
recursive Waxwing function over `Either` would compile to Go recursion.

Port requires: AG04 and AG02. The documented reason this function exists
is that `Array.foldM` over `Either` overflowed near 1,930 arms (the
comment at Search.purs:17-18); a port that reintroduces fold-by-recursion
reintroduces that bug.

Sketch, not implemented, assuming an indexable `Seq(a)`:

```text
-- NOT IMPLEMENTED. Seq, Seq.at and Result are illustrative names.
fn firstJust(judge: a -> Result(e, Option(b)), items: Seq(a), i: Int)
    : Result(e, Option(b)) =
  match Seq.at(items, i) {
    None => Ok(None),
    Some(item) => match judge(item) {
      Err(e) => Err(e),
      Ok(None) => firstJust(judge, items, i + 1),
      Ok(found) => Ok(found),
    },
  };
```

This is a self tail call in two branches; whether it runs in constant
stack is exactly the SH003 question.

Closing check: 10^6 items, early exit at the first hit and at the first
Left, constant stack, same result as the PureScript function.

### Slice 4: the file and process boundary

Source: Domain/Host.purs:33-38 (`Host m`), Program/Command.purs:28-61,
Runtime/Node.purs:45-56, Runtime/Node.js:12-35,88-110.

```purescript
type Host m =
  { readSource ∷ String → m (Either ReadFailure String)
  , writeText ∷ String → String → m (Either HostFailure Unit)
  , buildExecutable ∷ String → String → m (Either HostFailure Unit)
  , runProgram ∷ String → m (Either HostFailure String)
  }
```

APIs: a record of effectful functions generic over `Monad m`, `Either`,
`either`, `traverse_` in `Effect`, plus the FFI list in 2.5.

Lacks: host primitives; higher-kinded `m`; JSON writing; a cleanup rule
for the temp directory (Waxwing has `defer`).

Port requires: AG08, AG10, AG09 or an effect-based `Host` (a design choice
for I001: the effect form would use Waxwing's own `effect` and handler
syntax, with the real host as one handler and fakes as others).

Sketch, not implemented, in the shape docs/language.md already allows:

```text
-- NOT IMPLEMENTED. The operations and their host bindings do not exist.
effect Host {
  fn readSource(path: Text): Text;
  fn writeText(path: Text, body: Text): Unit;
  fn buildExecutable(go: Text, binary: Text): Unit;
  fn runProgram(go: Text): Text;
};
-- Failures would be Fail(HostFailure); Program.Command's logic would be
-- ordinary functions with Host + Fail(HostFailure) in their rows.
```

Closing check: Program.Command's tests run unchanged against fake
handlers; one real run builds and runs a program through `go`, and the
temp directory is absent afterward in both the success and the failing
case.

### Slice 5: the generator-scope seal (delta)

Source: Features/Check/Generate/Elab.purs:63-87 (`seal`, `sealed`),
Elab/Internal.purs:57-81 (types and roles), :98-133 (instances),
Generate.purs:51-66 (the call), scripts/structure-modules.mjs:35-48 (E1
to E4).

```purescript
seal
  ∷ ∀ a
  . Header
  → (∀ s. Gen s (Elab s a))
  → Either GenerationFault (Elaborating a)
```

APIs: a rank-2 argument; `newtype Gen s a` with Functor/Apply/Applicative/
Bind/Monad; `newtype Elab s a` with no Bind; `type role ... nominal`; hidden
constructors; `derive instance Ord (Handle s)`; `Map.fromFoldableWith`,
`Set.union`, `traverse` over `Elab`.

Lacks: rank-2 types, phantom-parameter ADTs tested with generics, classes,
modules, nominal protection (not needed without coercion), the structure
gates.

Port requires: AG06, AG07, AG09, K001/C001, SH002. This slice carries the
architectural claim of the shadow checker: a handle can neither leave the
generator that minted it nor be read without being recorded. A port that
replaces `seal` by convention would drop the guarantee (SV12).

Sketch, not implemented and not a syntax proposal:

```text
-- NOT IMPLEMENTED. Illustrates the shape only.
fn seal(header: Header, run: forall s. Gen(s, Elab(s, a)))
    : Result(GenerationFault, Elaborating(a)) = ...
```

Closing check (negative first): a program that returns a `Handle` out of
`run` is rejected with a diagnostic naming the escape; a program that
declares a second Bind for `Elab` outside its module is rejected; the
positive generator passes.

## 5. Delta for the R0 shadow modules

Only in this branch: 118 modules, 13,157 lines, plus changes to 78 shared
modules. Extra library APIs they use beyond main (the full list of APIs
present in this branch's scan and absent from main's):

| API | Uses/modules | First site | Note |
|---|---|---|---|
| `Data.Traversable.Accum`, `Accum` constructor | 19/2 and 23/2 | Features/Check/Generate/Marked.purs:151; Refute/Counter/Instance.purs:83 | Record result type of `mapAccumL` |
| `Data.Either.note` | 7/4 | Generate/Signature.purs:99 | Maybe to Either |
| `Data.Array.nubEq` | 3/1 | Decide/Reason.purs:49 | Eq-only O(n^2) dedup |
| `Data.Array.notElem` | 2/1 | Refute/Counter/Instance.purs:70 | |
| `Data.Array.deleteAt` | 2/2 | Refute/Counter/Search.purs:132 | |
| `Data.Array.partition` | 1/1 | Refute/Counter/Search.purs:88 | |
| `Data.Array.foldM` | 1/1 | Generate/Pattern.purs:238 | In `Gen s`; see AG14 |
| `Data.Array.NonEmpty.nubEq`, `appendArray` | 1/1 each | Decide/Reason.purs:83 | |
| `Data.Foldable.elem`, `maximum` | 3/2, 1/1 | Refute/Counter/Check.purs:89; Strategy/Witness.purs:148 | |
| `Data.Foldable.foldMapDefaultL` | 1/1 | Generate/Elab/Log.purs:42 | Foldable instance for `Newest` |
| `Data.Traversable.traverse_` (imported from the Traversable re-export) | 3/2 | Strategy/Substitution.purs:66 | Main imports `traverse_` from Data.Foldable; same function |
| `Data.Map.intersectionWith` | 1/1 | Entailed/Triangular.purs:111 | |
| `Data.Set.map` | 1/1 | Domain/Elaborating.purs:42 | Needs Ord on the result |
| `Data.String.contains`, `Pattern(..)` | 1/1 | Refute/Counter/Search.purs:169 | Substring test |
| `Void` (from Prelude) | 1/1 | Domain/Verdict.purs:176 | Uninhabited type (`Ty Void`) |

Heavier use of the same APIs in the delta (uses/modules, delta only):
`concatMap` 84/26, `traverse` 65/25, `mapAccumL` 22/4, `sequence` 20/13,
`all` 20/6, `fromFoldableWith` 4/4, `Set.toUnfoldable` 5/3, `nub` 18/10,
`NonEmptyArray` 17/8. In Features/Check/Generate alone: `traverse` 74,
`sequence` 33, `<$>` 125, `<*>` 55, `do` 71.

Language-level machinery that appears only in the delta: one rank-2
argument; three `type role` declarations; five kind signatures
(`Handle`, `Elab`, `Gen`, `Ref`, `GenTy`); a hand-written `Semigroup` for
`Log` and a `Foldable` for `Newest` built with `tailRec`
(Generate/Elab/Log.purs:32-42); a third Monad (`Gen s`); derived Eq 78 and
Ord 36 across the tree (33 and 21 on main); 7 token modules and 14
import-gate entries (2 on main); the structure-elab and
trusted-surface pins. Behavioral contracts the delta adds: `Elab`'s static
read set is a `Set` union computed by `<*>` and must be unaffected by
`traverse`'s grouping; `counted` needs `Map.fromFoldableWith add`
(Generate/Elab.purs:120-122).

Not in the delta: any new host service, tailRecM monad or file operation;
its only string addition is `contains`. The FFI is the same nine imports
(the delta's Runtime/Node.js and Runtime/Node.purs are byte-identical to
main's by `diff`).

## 6. Corrections to the existing inventory

Each item cites what contradicts or sharpens the readiness doc
(docs/plans/2026-10-27-self-hosting-readiness.md) or its JSON, both read at
main 7093c79.

1. Module counts are import-statement counts. The doc says "Data.Array in
   317 modules, including indexed parser access" (SV14) and "Data.Map in 156
   modules and Data.Set in 84" (SV15). At commit 2643df3, which the JSON
   names as its source, `git grep -hE '^import Data.Array( |$)' 2643df3 --
   'src/*.purs' | wc -l` gives 317 statements but `git grep -lE ... | wc -l`
   gives 309 modules; Data.Map 156 statements in 109 modules; Data.Set 84
   in 55; Data.Array.NonEmpty 26 in 21. The JSON's `external_imports`
   numbers (317, 156, 84, 26, 14 for Data.String) are statement counts.
   The tailRec figure (67) is a module count and is right (`grep -rlE
   '^import Control.Monad.Rec.Class' src | wc -l` is 67 on this branch).
2. The scanned tree is not main. The doc and JSON live on main but count
   r0-t2-d1 at 2643df3 (437 modules, "including legacy and shadow code").
   Main's own `src/` has 324 modules; 114 of the 437 do not exist on main,
   and `Domain/Arithmetic.purs` exists on main but not in the scanned
   tree. Every ratio in Section 2 here is relative to main's 324.
3. SV10's cited location is shadow-only. `Generate/Elab.purs:66` is in
   `src/Features/Check/Generate/Elab.purs` on the R0 line; main has no
   rank-2 type, no `seal`, no `type role` and no kind signature. The doc's
   "observed seal type" is correct for r0-t2-d1 and does not apply to the
   shipped compiler.
4. SV12 omits the mechanism. The doc says the Applicative-without-Bind
   guarantee needs a library/abstraction boundary; the source states that
   it rests on PureScript's orphan-instance rule (Elab/Internal.purs:111-113),
   a coherence property, and on constructor hiding. Add instance coherence
   to the requirement.
5. SV19's operation list is looser than the use. Observed Int use is `+`
   (about 218 sites), binary `-` (66), `*` (4), comparisons and
   `fromString`/`fromStringAs`/`toStringAs`; there is no `div`, `mod`,
   `negate`, bit operation or Number. "Character/code conversions" are
   exactly `toEnum`/`fromEnum` once each.
6. SV18 is right that the lexer mixes code units and code points but not
   specific enough: ordering of PureScript `String` is by UTF-16 code unit
   (prelude-6.0.2 Data/Ord.js:16) while Waxwing Text is code-point ordered
   (docs/language.md:597-600). The doc's offset/column concern should add
   map and set key order (AG23).
7. SV21 omits parts of the host surface: temporary-directory creation and
   guaranteed removal, path resolution against the cwd, the GOCACHE
   environment variable set by scripts/waxwing.mjs:2 before the compiler
   loads, the BOM-preserving decode, and that JSON key order and escaping
   are inherited from `JSON.stringify`. See 2.5.
8. SV14/SV15 do not mention hidden library types. `Map.values` returns a
   List and `Map.keys` a Set (Printable.purs:59,84; RowSettle.purs:55), and
   `toUnfoldable` is used at an Array annotation, so Data.List and
   Unfoldable are used without being imported. SV27's package list is
   correct; the module-level dependency set is larger than the imports.
9. SV17's claim that "tailRec/tailRecM" is the stack-safety mechanism
   leaves out three other mechanisms the compiler relies on: self tail
   calls compiled to loops (11 commented sites), balanced `traverse`
   (five commented sites), and explicit-stack search types. See 2.3.
10. The JSON's "Char use: 20" does not match a literal count of 74 lines in
    11 modules on main (command in 2.4); the JSON does not define its
    measure, so this may be a different quantity. Unverified.
11. SV27 says the spago list "identifies imports"; the list is the right
    one, but note `Prim` (43 modules on main, `import Prim hiding (Row)`) is
    counted in the JSON's `external_imports` as if it were a package.
12. BACKLOG E002 remaining items (1) and (4) say "the pure allowlist has no
    map" and "(no ST, no map)". `Data.Map` and `Data.Set` are in the
    allowlist now (scripts/structure.mjs:20-23) and are imported by 83 and
    41 modules. The cliffs they describe may still exist; the stated
    constraint is stale. This is a BACKLOG note, not a readiness-doc claim.

Nothing here changes a readiness doc priority; items 1 to 3 change numbers
and scope, 4 to 8 add requirements, 9 to 12 are accuracy notes.

## 7. Open questions for the author

1. Port target. The shipped compiler (324 modules, main) or the R0 line
   (441 modules)? The readiness doc says "select a stable compiler path to
   port". Section 2.6 and Slice 5 only exist if the R0 line is the target.
2. Offset unit. Should a ported compiler keep UTF-16 offsets and columns
   in its diagnostics (matching the PureScript compiler and the wire
   protocol) or move to bytes or code points? That is a user-visible change
   to every non-ASCII diagnostic, and it decides AG05.
3. Host failure typing. Is `Host` an effect with handlers (using FX001 as
   is) or a record of functions over a monad parameter? The second needs
   higher-kinded `m` before any other feature; the first may not.
4. Is a persistent array/map acceptable as the only collection model, or
   should builders be on the list now? AG24 treats builders as optional.
5. Stack depth. Do you want E_NESTING at 128 preserved in the ported
   compiler? Preserving it fixes the parser's recursion shape; lifting it is
   H001/O001 work.
6. Should the corefn pass (AG26) run before any of these rows is promoted
   from "inferred" to "observed"? It is a build, so it was not done here.

Sources for this document are repository files and package sources named
inline; no external references were consulted beyond those already cited
in the readiness doc.
