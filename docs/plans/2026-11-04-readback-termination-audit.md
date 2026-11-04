# The read-back's termination and partiality audit (2026-11-04)

Status: T5 of the activation prerequisites
(docs/plans/2026-11-04-activation-prerequisites-proposal.md, "R036
(1)"), as dossier §18.161 (3) approved it: an audit with narrower
claims. The scan and the reviewed loop arguments below are evidence.
They are not a proof that the read-back is total or free of
exceptions.

## What R036 (1) is about

Strategy/Online.purs builds each accepted candidate's certificate with
`effects: packaged problem found made`. PureScript records are strict,
so the whole effect read-back runs inside the search, before G0's
check, although no verdict reads `effects` today. If the read-back
threw a JS exception or never ended, it would stop the run instead of
losing one package. After activation, `certify` reads the package, so
a lazy field would only move the point where it is forced. §18.161 (3)
rules out a lazy field for that reason. This audit records what is
known about the read-back's termination and partiality, and which
checks back it.

## Scope

The audited code is the src module closure of
`Features.Check.Strategy.ReadBack.Package`, taken from `purs graph`.
On this tree that closure has 171 modules, 72 of them in src. It
includes `Domain.Type.Traverse` and the trace modules (R036 (2)), and
modules the read-back reaches only through imports, such as
Entailed.Mgu and Entailed.Triangular.

Outside the scope, and trusted as the package set and runtime are:

- library code: its loops, its FFI and its partiality (Data.Map's and
  Data.Array's foreign code, for example);
- the runtime: stack depth beyond what the depth test below runs, and
  memory exhaustion;
- functions injected from outside the closure. Their own definitions
  are audited where they live, if they are in the closure.

## The checks

test/structure-readback-total.test.mjs runs over the closure's src
modules and fails on any of the following.

1. Forbidden imports. These are `Partial`, `Partial.Unsafe`,
   `Effect.Unsafe`, `Effect.Exception.Unsafe`, `Data.Array.Partial`,
   `Control.Lazy` and `Data.Lazy`, plus scripts/forgery.mjs's forging
   modules, as a cross-check of that scan. The test also fails on a
   `Partial ⇒` constraint and on a src module with FFI (a
   `foreign import` or a `.js` file beside the source). It finds none
   today.
2. Loops and cycles. The test parses each module's compiled JS with
   acorn and lists:
   - every use of a Control.Monad.Rec.Class loop driver: every value
     the module exports except the `Step` constructors and the
     instances, so `tailRec`, `tailRecM`, `forever`, `whileJust`,
     `untilJust`, `loop2`, `loop3` and their numbered forms. The test
     pins that list. A point-free alias of a driver
     (`x = tailRec step`, or a specialization purs generates) is
     listed as its own entry, and its callers in the module are listed
     as uses;
   - every JS loop statement, including the loops purs generates for
     self tail calls (`$tco`);
   - every reference cycle among a module's top-level declarations, and
     among one declaration's local bindings. These are strongly
     connected components, found with Tarjan's algorithm ("Depth-first
     search and linear graph algorithms", SIAM J. Comput. 1(2), 1972).

   The list must equal the reviewed table in
   test/fixtures/r0/readback-termination.json, in both directions, and
   every row must state an argument. A new loop or cycle fails the test
   until a reviewed row is added. A row the scan no longer finds fails
   as stale.

Data constructors, which purs compiles as self-referencing closures,
are not cycles and are skipped. A recursive point-free definition
compiles to two declarations, `var $lazy_f = $runtime_lazy(…,
function () { BODY })` and `var f = $lazy_f(n)`. The scan merges them
under `f`, so BODY's references, loops, drivers and local cycles count
as `f`'s. (The first version kept only the later declaration and lost
BODY: MarkLabels' cycle `{inLabel,inRow,inTy}` was listed as `{inTy}`.)

PureScript's module graph is acyclic, and dictionaries are passed by
name, so named recursion through src code shows up as a reference
cycle inside one module. The scan can miss recursion that needs no
name:

- self-application through a recursive type that holds a function of
  itself (an untyped fixpoint);
- a library loop driven by a src callback, such as `unfoldr` or
  `iterate`.

Neither occurs in the closure today. A grep over the closure's 72
source files on 2026-11-04 found no `newtype` or `data` declaration
holding a function type, and no use of `unfoldr`, `unfoldrM`,
`iterate`, `fix`, `replicateM` or `until`. A later change could add
one without failing the scan; review has to catch it.

Local bindings are matched by name within their top-level
declaration. Two locals with the same name therefore merge, a
parameter that shares a binding's name adds an edge, and a local
function declaration that refers to its own name is a self-edge. The
callers of a driver alias are listed as uses. All of these
over-approximate: they can add a spurious row, but they cannot hide a
cycle the scan would otherwise see.

The scan reads output/, so it audits the last build. A stale build
(src changed and not rebuilt) is audited as it was built; verify builds
before it tests.

The must-fail cases in the same test plant each forbidden import, a
`Partial` constraint, FFI by `foreign import` and by a JS file beside
the source, a JS loop, a mutual cycle, a self-cycle, a local cycle, a
`tailRec` use, each of `forever`, `whileJust`, `untilJust` and
`loop2`, a `$lazy_` body holding a while loop, a `tailRec`, a local
self-cycle and a helper in a mutual cycle, a point-free `tailRec`
alias that only another module calls, a data constructor (which must
not be listed), an unlisted entry, a stale row and a row with no
argument. Restored-defect rows check the scan itself:

- `r0-t2-r036-1-scan-blind` drops `Partial.Unsafe` from the forbidden
  list;
- `r0-t2-r036-1-loop-unlisted` compares only ReadBack's modules with
  the table;
- `r0-t2-r036-1-lazy-overwrite` keeps only the later of a `$lazy_`
  pair;
- `r0-t2-r036-1-drivers-narrow` matches the `tailRec` family only;
- `r0-t2-r036-1-alias-skipped` skips a driver alias.

## The table: 65 rows

The table has 21 driver uses (one of them the specialization
`Search.tailRecM` that purs generates), 1 compiled loop
(`sameSpine`'s `$tco`) and 43 cycles. Each row states its own argument. The
arguments fall into these kinds:

- Spine loops (`stagesOf`, `spine`, `markedStages`, `arrowCount`,
  `typeRefSpine`, `matchArrow`, `sameSpines`, `compareSpines`,
  `rowAfter`, `afterArrows`). Each step moves from an arrow node to its
  result, which is a strict subterm of a finite term.
  `Domain.Type.Core.arrowCount` walks through a `look` function. Inside
  the closure, every caller passes `identity` (checked by reading the
  callers: `substitute`, `Parts.spineThrough identity` and
  `Traverse`). Outside the closure, Subst.resolve passes a
  substitution walk, which ends if the substitution is acyclic.
- Structural recursion. Each call is on strict subterms of finite
  values.
- Eq and Ord instances, each with its own mechanism. `eqTy` and
  `ordTy` are hand-written and take arrow spines by Compare's loops.
  `eqRTExpr` is Atom's `sameSpine`, whose self tail call purs compiles
  to a loop. The derived `eqPTy`, `eqMTy` and `eqCXGround` recurse on
  arrows too, one frame per arrow, so they are as deep as the spine.
  The derived `eqTypeName` has no arrow constructor.
- One-pass substitutions (`substitute`, `Merge.substitute`,
  `Candidate.under`, `Effects.Package.under`, `Bound`, `Traverse`). An
  image is never substituted again.
- Finite counters and searches: `Mgu.freshIndex` runs at most
  |taken| + 1 steps, `Search.firstJust` walks an index over a finite
  array, `Search.stackItems` walks down a finite stack, and
  `Triangular.reachable` runs at most |dom θ| + 1 layers.
- Arguments that rest on an invariant of the producer. These are
  reasoned and not checked here:
  - `MarkStore.resolveMark` assumes the store's bindings are acyclic.
    UnifyMark only binds a chain's unbound end to the other chain's
    end. The read-back reads the store through Least, not through this
    loop.
  - `Mgu.mgu`: termination follows Martelli and Montanari (JACM 1982),
    extended by Rémy's row rule, over a triangular θ (an equation is
    read through θ when it is taken). The measure is the pair (unbound
    flexible variables, total equation size), taken on equations read
    under θ. R5's two-tail case binds two variables and makes one
    fresh.
- `Least.find` and `Least.reaching`, which the next section covers.

## The two invariant-based loops and their copies

`Least.find` relies on the parent links forming a forest: `union` only
links one root to a different root (union-find; Galler and Fischer,
1964). `Least.reaching` is Kleene iteration of a monotone map on a
finite lattice.

test/r0-readback-least-fuel.test.mjs runs JS copies of both loops
with a step budget. `find` gets one step per node. `reaching` gets
roots × (constants + 1) + 1 passes. Running out of fuel fails the test
instead of hanging it. Because a copy only tests the copy, the test
also compares each copy's terms and clash count with production's
`leastOfGraph` on every graph, wherever both end. The graphs are
20,000 seeded graphs of the mark oracle's random family, meta chains
of up to 40, and planted clashes. All agree, and none runs out of
fuel. Two cases show the budgets are reached, not just respected: an
edge chain of 30 listed against the propagation order takes at least
31 passes of `reaching` (within its budget), and an equality chain of
30 makes `find` take at least 29 steps. The planted clash graphs are
checked to clash in the copy and in production. Must-fail cases: a
copy that ignores edges disagrees, and a cyclic parent link runs out
of fuel.

Correction to the proposal. Its budget for `reaching`,
roots × constants + 1, was too small. A pass can add a root's entry
empty (`insertWith`), so an absent root sits below the empty set and
the lattice's height is roots × (constants + 1). A graph with one edge
and no constant needed two passes against a budget of one. The table
row and the test state the corrected bound.

## Stack depth

The read-back's non-tail recursion (Convert, EffectMatch, Images,
Bound, Traverse, MarkLabels and the derived Eq instances) goes as deep
as a type nests, spines included where the table says so.
test/r0-t2-readback-depth.serial.test.mjs runs two programs through
`recheck`, the type read-back and `readEffects`:

- a 1,000-deep data nesting, in the shape of
  test/poly-depth-timing.serial.test.mjs. The package's types reach
  999 levels and the trace 999;
- a 1,000-stage spine, held in `id`'s slot, so the trace and the
  images carry 1,000 arrows.

Both read a package without a RangeError, and both assert the depth
they reach so the test is not vacuous. Bound's depth is not exercised:
`boundTy` returns at once when θ binds no hole, and neither program
binds one. test/r0-type-traverse.test.mjs
also runs `traverseTy` on a 100,000-arrow spine.

## Finding during T4

While T4 was being written, a strict `where` binding
`recur = traverseTy change`, in a function whose body is
`case _ of`, recursed at partial application and overflowed the
stack. The fix eta-expands it (`recur part = traverseTy change part`),
as `substitute` does. The scan cannot tell that defect apart from
legitimate recursion; both appear as the same reference cycle. The
read-back's own tests caught it.

## What this audit does not claim

- Totality. Termination arguments for listed recursion are reviewed
  prose, not machine-checked proofs. Two of them rest on producer
  invariants (MarkStore acyclicity, Mgu's measure) that no test here
  checks.
- Exception freedom beyond the scanned surface. Library partiality and
  FFI, runtime limits beyond the depths tested, and memory exhaustion
  are outside it.
- Anything about Online's decision. The audit changes comments and
  tests only. Online.purs is unchanged; its statement of what is
  outside the argument is here and in the scan's header comment, not
  in Online.purs, so the trusted surface is untouched.
