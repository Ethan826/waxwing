# The online read-back's cost: attribution and a reduction proposal

Status: proposal, 2026-11-04 (dossier §18.161, prerequisites Lane E).
Nothing is implemented; no pin, Online decision or compile output moves.
Base fdd52a3. It answers the paired measurement
(test/fixtures/r0/t2-performance.json, protocol
docs/plans/2026-11-04-performance-protocol.md): onlineReadBack ×14.1
median CPU ratio, +58 s over 2,832 candidates, +471 MiB peak RSS.

## 1. Finding

One declaration carries the cost. The read-back's body walk
(src/Features/Check/Strategy/ReadBack/Walk.purs `nodeAt`) builds every
child of each node it passes before indexing the one it wants, so one
lookup costs the summed width of the nodes on its path, not their
depth. The header's claim ("a walk costs its depth, not the width of
the nodes on it") is false. Each path is also looked up about four
times. The 10,000-part interpolation program
(test/text-scale-programs.mjs, `scalePrograms#2`, `main`: one
`Interpolate` node of 20,000 parts, 2n for n = 10,000) makes
110,003 lookups, each building 20,000 child wrappers: 2.2 × 10⁹
wrappers, 99.7% of the corpus total. That declaration is 93% of
`readEffects` time, and its allocation drives the GC share and the
peak RSS rise.

Without that declaration, read-back plus package costs about ×1.8 to
×2.2 the recheck alone in loaded single samples (§2.4), not ×14.

## 2. Evidence

Conditions: Apple M2 Pro, 10 cores, 16 GiB, node v26.6.0, AC power,
shared machine with other lanes building (load average 4.7 to 16.2
during the runs). Every figure below is one run, for attribution only;
none is a budget or a replacement for the protocol's run. Inputs: the
protocol's (`writeInputs`, 1,138 corpus and 1,142 effect pin sources;
3,071 declarations, 2,832 accepted, 2,832 candidates). Raw files are in
the on-task14 worktree's .build/evidence/2026-11-04-readback-profile/.

Scripts (all new, all measurement only):

- scripts/r0-t2-readback-profile.mjs: the worker's online path, timed
  per step and per candidate, with walk tallies when the build counts,
  and a digest of every type read-back and package;
- scripts/r0-t2-readback-variant.mjs: a cloned build with Walk's
  compiled output patched (`counting`, `wrapping`, `memo`, `lazy`,
  composable with `+`), never src/ or output/;
- scripts/r0-t2-readback-scaling.mjs: the online path on generated
  declarations of growing width or depth;
- scripts/r0-t2-readback-cpuprofile.mjs: reads a `--cpu-prof` file
  by step, module, function or caller.

### 2.1 CPU profile of the `with` arm

`node --cpu-prof --cpu-prof-interval 500 scripts/r0-t2-perf-worker.mjs
output 'recheck and read-back' <inputs>` (with.cpuprofile; 69.4 s of
samples, run bracket 58.5 s wall, 72.2 s CPU):

| Step (stack) | s | % |
|---|---|---|
| readEffects, EffectRows, Walk on stack | 24.49 | 35.3 |
| GC (no stack) | 13.01 | 18.8 |
| readEffects, Marks, Walk on stack | 11.21 | 16.2 |
| prepare (outside the bracket) | 6.86 | 9.9 |
| recheck | 3.95 | 5.7 |
| readBack (type read-back) | 2.44 | 3.5 |
| readEffects, other | 2.02 | 2.9 |

Self time: `Data.Functor` array `map` 19.80 s, of which 10.11 s is
Walk's `expressions` (`map AtExpr`) and 9.49 s its `each` (`map (Tuple
[])`); `expressionChildren` 5.65 s; `AtExpr.create` 4.86 s; `Tuple`
4.89 s. Nothing else in the read-back passes 1.5 s: union-find, the
reaching fixpoint, Least (Marks without Walk: 0.25 s), Images
(0.36 s), Bound (0.01 s) and `Data.Map` (1.75 s self over the whole
profile) are not where the time goes.

### 2.2 Per candidate (`r0-t2-readback-profile.mjs output`)

readEffects 68.2 s over the 2,832 candidates; `scalePrograms#2 main`
63.7 s (93.3%); the next is 0.12 s. The ten costliest carry 94.5%.
recheck 7.9 s and readBack 3.5 s in the same run.

### 2.3 Counters (`counting` variant; result digest unchanged)

| | lookups | distinct paths | levels | children built |
|---|---|---|---|---|
| scalePrograms#2 main | 110,003 | 30,001 | 140,000 | 2,200,030,000 |
| other 2,830 candidates † | 438,899 | 108,130 | 2,291,336 | 7,459,260 |

† The 2,832 less `main` and the same program's `id` (3 lookups, 1
path, 0 levels): 548,905 − 110,003 − 3 = 438,899 lookups.

Built per lookup on `main` is 20,000, the `Interpolate` width. Lookups
per distinct path are 3.67 there and 3.97 over all candidates. The
package's readers: `nodeFacts`, `literalFacts` and `nodeMarks` (each
over `effects.nodes`, 30,001 on `main`), `tracedRow`, `directMarks`
(Marks.purs:129, through `exprAt`), `instanceFacts` and the
annotation readers. The type read-back reads the body too (Position.purs
:94): 46,548 lookups over all candidates, none on `main`.

### 2.4 Separating experiments

All three keep the digest of every type read-back and package over
the 2,832 candidates:
2c3479f1f61dabf0a7e643592e32c86a7b3eb78223f561009d5c5282fbbddc1d.

| Build | readEffects, all | scalePrograms#2 main |
|---|---|---|
| plain | 68.2 s (53.8 s counting) | 63.7 s (49.0 s) |
| `memo`: one walk per (body, path) | 22.2 s | 17.9 s |
| `lazy`: each item wrapped only when indexed | 5.1 s | 0.52 s |

So repetition is a factor of about 3.6, and width is the rest: with
no sibling built, `main` falls by two orders of magnitude.

Width (`scaling.mjs width`, n parts, one node of 2n parts):

| n | 625 | 1,250 | 2,500 | 5,000 | 10,000 |
|---|---|---|---|---|---|
| readEffects, plain (ms) | 166 | 554 | 2,336 | 11,003 | 49,000-64,000 * |
| children built (counting) | 8.6 M | 34.4 M | 137.5 M | 550.0 M | 2,200 M |
| readEffects, `lazy` (ms) | 30 | 55 | 97 | 197 | 402 |

\* n = 10,000 is scalePrograms#2 itself: §2.2 and §2.3's runs.

Built grows ×4 per doubling (lookups ×2, width ×2): quadratic in one
node's width. `lazy` is linear. recheck and readBack stay linear
(58-534 ms and 2-22 ms across n = 625 to 5,000).

Depth (`scaling.mjs depth`, an `Add` chain): 16, 32, 64, 120 terms give
levels 720, 2,976, 12,096, 42,840 and readEffects 3.5, 2.7, 7.5,
27.8 ms. Levels grow as n² and each level copies the path
(`after`'s `take`/`drop`, O(n)): the observed exponent is about 2.1
(64 to 120 terms); the cubic is the bound. The parser refuses nesting past
128 (`NestingTooDeep` from 130 terms; 129 parse): at 129 terms, about
34 ms by the cubic, per declaration.

GC (`node --trace-gc`, width 2,500): 487 scavenges freeing 14.5 GB,
about 106 bytes per child built, and 2 mark-compacts. The heap churn
comes from the same wrappers (`AtExpr`, `Tuple` and two arrays per
child).

Worker samples, one per arm, two batches (worker-attribution.txt at
load 9.5-12.7; worker-attribution-2.txt at load 14.6-16.2):

| Inputs, build | batch 1: alone, with CPU s; increment | batch 2: alone, with CPU s; increment |
|---|---|---|
| all, plain | 6.5, 78.6 (×12.1); +301 MiB | 9.9, 89.6 (×9.1); +97 MiB |
| all but scalePrograms#2, plain | 6.0, 13.0 (×2.2); 0 | 5.4, 9.8 (×1.8); +13 MiB |
| all, `lazy` | 6.4, 18.2 (×2.9); 0 | 8.8, 18.9 (×2.1); 0 |
| all but scalePrograms#2, `lazy` | | 4.7, 16.7 (×3.5); +76 MiB |

The RSS rise shrinks both when the declaration is left out and when
the walk stops building siblings: to zero in batch 1 and for `lazy` on
all inputs, to +13 and +76 MiB in batch 2 against plain's +97 MiB. So
it comes mostly from the walk's churn, not from retained packages.

Calibration, by increment. Load compresses the read-back's increment
over recheck alone, so the batch's factor applies to r − 1, not to r.
The protocol's plain increment is 13.12 (×14.12); the plain pairs read
11.09 (batch 1) and 8.09 (batch 2), factors 1.18 and 1.62. Calibrated
as 1 + (r − 1) × factor: `lazy` on all inputs ×3.19 and ×2.86; plain
without scalePrograms#2 ×2.38 and ×2.34. The batch-2 row "all but
scalePrograms#2, `lazy`" (4.7 s alone, 16.7 s with, ×3.5 raw) reads
×5.1 calibrated. It looks like a load outlier: its wall time (20.2 s)
exceeds its CPU (16.7 s), and the same build on all inputs, which
includes it, is ×2.86. It is reported, not used.

Loaded single samples cannot bound A's ratio; only the protocol run
can. The range in §3 (about ×2.3-×3.2) is indicative.

The gap is not explained. `lazy` with every input costs 4.8 s more CPU
than plain without scalePrograms#2 in batch 1 (11.8 s against 7.0 s
over recheck alone), though `main`'s `lazy` readEffects is 0.52 s.
Profiles put it in GC +1.6 s, walk +1.4 s, other +1.2 s and readBack
+0.7 s. Proxy overhead, which A would not have, is a candidate, but
the in-process split does not show it: readEffects over the other
2,831 candidates is 4.60 s under `lazy` and 4.56 s plain
(split-lazy.json, split-output.json).

### 2.5 What the brief's other mechanisms showed

- Packages for candidates the search drops: none here. Online offers
  one candidate per accepted declaration, and the 2,832 packages are
  those candidates'. Online does build each package eagerly while
  nothing reads it before activation (Online.purs header); that stops
  being true at activation, when the validator reads it.
- The remaining cost, after `lazy` (with-lazy.cpuprofile, 37.6 s of
  samples): recheck 6.27 s, readBack 4.03 s + 0.44 s walk, readEffects
  walk 2.79 s, readEffects other 2.57 s, GC 6.72 s. Most of that GC
  is not the read-back's: without scalePrograms#2, plain, GC is 5.13 s,
  so the read-back's share is about 1.6 s by difference. In readBack,
  2.7 s
  is `completed` substituting every equation under the positioned
  values (`Map Var` lookups, Path comparisons in
  `Domain.Recorded.Origin` `compare`).

## 3. Options

None may change an Online acceptance decision or compile output.
Program.Compile reaches 408 modules, none of them ReadBack.* or
Strategy.Online (a transitive import scan of output/), so compile
output cannot move. Results can: Walk is read by the type read-back
(Position, hence σ and RT8) and by the package (EffectPlaces,
EffectSites, Instances, Marks). Every option is judged by an
unchanged digest of every candidate's type read-back and package
(§2.4's) before any pin is run.

**A. Index first, wrap one (recommended first).** `Many` keeps the
raw array and the wrapper; `item` indexes, then wraps the one item
(`Array.index` before `map`). It is what the header already claims.
Published source: none needed, constant-time array indexing; no new
algorithm. Predicted effect, from the `lazy` experiment: readEffects
68 s to about 5 s; onlineReadBack median CPU ratio from ×14.1 to
about ×2.3 to ×3.2, indicative only (§2.4: calibrated by increment
from loaded single samples, which cannot bound it; the protocol run
does); run RSS increment to about 0, so the
peakMemory ratio near 1.0. A alone still builds each node's `Child`
list (fixed per constructor) and the over-applied `supplied <> more`
copy (Walk.purs:135-139, O(arguments) per `Apply` passed). Risk:
`findMap`'s first-match order must stay the same (`Apply` lists
`Apply/function`, `Apply/args`, then the over-applied `Call/args`); A
keeps the child list and changes only when items are wrapped. Touches
Walk.purs alone (untrusted read-back plumbing).

**B. One path index per body.** One traversal builds a map from a
path to its node (a trie on steps; Fredkin 1960, "Trie memory", CACM
3(9)), shared by every reader of one candidate, in both phases (the
type read-back's Position and the package's readers), so a lookup costs
the path's length. It removes the repetition (§2.3, about ×4) and the
depth term. Predicted: after A, the remaining walk (2.79 s +
0.44 s under the profiler) to well under 1 s. Risk: the index must list the
over-applied alias (`Call/args/i` under an `Apply`) and keep
first-match; that needs fixtures beside the digest. It also changes
the readers' signatures (the index is passed in place of the body).
After A, not instead of it.

**C. Memoize exact paths.** The cheapest form of B: measured ×3.6 on
the dominant term alone (§2.4), so insufficient without A. Only worth
it if B's index is rejected.

**D. Carry an offset instead of slicing the path.** Removes the
per-level `take`/`drop` copy; the depth term it touches is capped by
the parser's 128 (§2.4). Small; fold into A or B if touched.

**E. Filter equations before substituting** in `completed`
(ReadBack.purs), about 2.7 s. Needs an argument; not proposed for
adoption. It is equivalent only if both hold: (1) no positioned value
mentions a flexible problem variable, so `mentions unknown` reads the
same before and after substitution; (2) no equation that filtering
would drop makes `substitute` fail. `traverse placed equations` is
`Nothing` when any substitution fails (Merge `substitute` returns
`Maybe`), and `completed` then reads `ClaimsComplete` with no unifier
and empty `holeBindings`. Filtering first could drop that failing
non-auxiliary equation and reach `mgu`, changing the claim, the
`holeBindings` and the bound values: an Online decision.

Rejected: leaving out or shrinking scalePrograms#2 (it is in both
pinned denominators, 2,832 and 2,823: a pin movement, so a STOP);
making Online's package lazy. §18.161 (3) notes that a lazy field
avoids unused work before activation; here it would hide the cost
before activation without reducing it, since the validator forces
every package after, and it changes `Certificate`.

## 4. Pins and decisions each option could touch

| Pin or decision | A | B | C | D | E |
|---|---|---|---|---|---|
| compile output, census, window, problem pin | no (not reachable) | no | no | no | no |
| first diagnostics | no | no | no | no | no |
| Online acceptance, σ, RT8, shadow | only if digest moves | same | same | same | same |
| effect pin, t2-honest.json, t2-gap-verdicts.json | only if digest moves | same | same | same | same |
| trace inertness | no (no trace label) | no | no | no | no |

A digest movement is a STOP under the common rules, never a re-pin.

## 5. How a reduction would be measured

1. Equivalence, before anything else: `node
   scripts/r0-t2-readback-profile.mjs output <inputs> <rows>` on the
   reduced build gives the §2.4 digest. Any other digest stops.
2. The pins the table names: the effect pin, t2-honest, gap verdicts,
   RT8 and shadow rows, with no movement.
3. Growth, timing-free: the `wrapping` variant counts every `AtExpr`
   and `AtPattern` constructed. It patches only `Node`'s constructors,
   which A leaves alone, so it reads the same before and after A
   (`counting`'s `built` does not: it counts `Many` lengths, equal to
   wrappers only while `map` is eager, and its patch matches text A
   changes). Check: on the width family, wrappers grow ×2 per doubling
   of n, not ×4. Shown both ways (scaling-width-wrapping.jsonl, n =
   625, 1,250, 2,500): today 8,602,503, 34,392,503, 137,535,003 (×4,
   fails); `lazy+wrapping` 15,628, 31,253, 62,503 (×2, passes).
   Counts, no clock, so no test/growth.mjs.
4. The recorded protocol, unchanged, as a new authorized run: the
   onlineReadBack comparison's median CPU and maxRSS ratios, with the
   predictions above stated beforehand (A: CPU about ×2.3-×3.2,
   indicative; maxRSS near 1.0). No budget is proposed here; the
   author sets it from that run.

## 6. Open

- Whether the remaining ×2.3-×3.2 (§2.5: type read-back substitution,
  repeated lookups, GC) needs B and E before a budget is set is the
  author's call once A is measured.
- Walk.purs's comment on `Child` (lines 28-30) is contradicted by
  §2.3 and §2.4. Proposed text today: "One child under its label, or
  an array of them under one label, each item with the steps after its
  index. `children` wraps every item of a node before `item` indexes
  one, so a lookup costs the summed width of the nodes on its path,
  not only its depth (readback-cost proposal §2.3-§2.4)." After A:
  "... A path's index reaches its item directly and only that item is
  wrapped, so a walk costs its depth and each node's fixed child list,
  not the width of the arrays on it."
