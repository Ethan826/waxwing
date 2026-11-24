# Self-hosting readiness: source inventory and proposed requirements

Date: 2026-10-27. Status: source survey and proposals, not an approved
implementation plan. No compiler change or backend reprioritization is
selected here.

## Snapshot and evidence limits

Source branch: r0-t2-d1. Charter consulted from origin/main at
6b4be7745fba6416e2fc719f427e7b5dac508d9a; the source branch predates it.
Commit: 2643df34cd12215b91cec1b76ef88698efe53ae8

The scan covers 437 committed src/**/*.purs files, including legacy
and shadow code. It reads git archive of the exact commit above, not the
working tree. The first draft misattributed a working-tree scan to HEAD;
that scan included an uncommitted Declared.purs. This scan supersedes it.
It excludes dependencies, tests, build scripts and Lean research. The
[source inventory](2026-10-27-self-hosting-inventory.json) contains all
matching locations, import counts
and source-file hashes. Counts are lexical reconnaissance, with comments
removed, not a parsed/typechecked proof that all features were found.
Representative source and roadmap entries were read manually. No builds,
port experiments or conformance tests were run.

Current source includes 240 data declarations, 47 newtype declarations,
545 type synonyms, 36 handwritten instances, 112 derived instances and
3 role declarations. Nine foreign imports are in Runtime.Node.
These counts describe source forms, not implementation work estimates.

No compiler-source declarations of classes, custom operators, explicit
coercion, Number or type-level symbol/proxy machinery were found by the
scan. This does not establish their absence from dependency implementations
or the inferred types of imported functions.

## What parity means

Track syntax, expressive power, semantic behavior, static guarantees and
performance separately. A port need not reproduce PureScript spelling or
implicit instance selection. It must preserve the chosen compiler behavior
and the protections on which its trusted architecture depends.

Statuses below describe this source snapshot and repository records.
"Gap" is a candidate self-hosting prerequisite, not authorization to build.
The canonical R0 closure checklist remains the tracker for current R0 work.
The entry point for self-hosting is [docs/bootstrap.md](../bootstrap.md).

## Feature and dependency ledger

| ID | Used feature / evidence | Waxwing position | Gap or port obligation |
|---|---|---|---|
| SV01 | Recursive parameterized ADTs; Domain/Type/Core.purs, Domain/Checked/Internal.purs | Implemented: P001, A001 | Translate constructors and pattern matches; test large recursive trees and existing recursion/specialization restrictions. |
| SV02 | Rank-1 generic functions and first-class functions; throughout src | Implemented: P001, FN001 | Preserve captures, partial/over-application and evaluation order; existing support is not a full compiler-scale port test. |
| SV03 | Records, updates and open record-row arguments; Generate/Signature.purs, Check/Collision.purs | Implemented records; R0 composition integration in progress | Preserve field constraints and record behavior; determine which ported modules actually need general composition. |
| SV04 | 545 type synonyms; Domain/Host.purs, Format/Parse/Cursor.purs | R008 not implemented; alias ruling on unmerged c001-rulings-2026-10-23 | Aliases are significant for a readable translation. Nominal wrappers are possible but change type identity and require explicit adaptation. |
| SV05 | 47 newtypes, constructor hiding; Domain/Ids.purs, Domain/Verdict/Internal.purs | Nominal ADT wrappers exist; module abstraction planned M001 | Newtype syntax is not essential, but distinct identities and hidden construction are. Zero-cost representation must be assessed separately. |
| SV06 | Modules, qualified imports, facades and explicit exports; every source module | Gap: M001 Planned | Need module/name resolution, abstract types and enforceable import/export boundaries. PS Internal naming is protected by project gates, not language privacy. |
| SV07 | Higher-kinded abstraction; Host m, Functor/Applicative (Elab s), Monad (Gen s) | K001 planned; C001 explicit-core design approved, higher-kinded scope unbuilt | Faithful generic port needs kind checking and constructor polymorphism; concrete rewrites would be a separately scoped tradeoff. |
| SV08 | Class-constrained APIs and custom instances; Eq/Ord Ty, Functor/Apply/Applicative, Foldable Log | C001 explicit-core design approved, unimplemented; generic scope remains beyond it | Explicit dictionaries may preserve behavior; generic method quantification and partial constructor application must actually work. Do not infer adequacy from ordinary monomorphic records of functions. |
| SV09 | 112 derived instances, including Eq/Ord and newtype deriving | Deriving remains outside the approved C001 first core; broader C001 work remains | Handwritten instances can replace deriving, but preserve constructor/field order and equality policies. Derivation is convenience; its behavior is required. |
| SV10 | Rank-2 argument to seal; Generate/Elab.purs:66, forall s inside an argument | Gap: current rank-1 language; higher-rank work deferred, R006 is adjacent but specifically fields | Explicit self-hosting decision needed: support the necessary higher-rank fragment or approve a replacement preserving scope isolation. This need is not solved by HKTs alone. |
| SV11 | Phantom scope and nominal roles; Generate/Elab/Internal.purs | No Coercible-style mechanism today; future coercion support must preserve scope identity | Preserve opaque construction and rigid scope parameters for Handle s, Gen s and Elab s. Explicit roles become a requirement to evaluate if representational coercion is added; current absence of coercion does not require a roles feature. |
| SV12 | Applicative without Bind for Elab; Generate/Elab/Internal.purs | Language effects implemented, corresponding library/abstraction boundary unbuilt | Preserve the statically known read set. Replacing all sequencing with unrestricted direct-style effects could change the architectural guarantee. |
| SV13 | Inferred locals, recursive helpers, do/applicative notation and where | Lambdas supported, local generalization absent; richer inference is separate work | Syntax can translate; audit actual polymorphic local uses rather than assume every local helper needs generalization. Generic library calls also need an elaboration strategy. |
| SV14 | Data.Array in 317 modules, including indexed parser access | Gap: D001 practical collections, STD001 | Need a performant sequence/indexed-access API, total bounds behavior and an allocation contract suitable for compiler input sizes. A linked list is not an automatic performance substitute. |
| SV15 | Data.Map in 156 modules and Data.Set in 84 | Gap: D001/STD001, ordering policies coordinated with C001/M001 | Need ordered collections and stable comparison/iteration behavior. Changing order can alter diagnostics, naming and generated bytes. |
| SV16 | Maybe, Either, Tuple, NonEmpty and fold/traverse helpers | Generic ADTs can express concrete values; library breadth and generic abstractions remain | Provide library definitions and semantics, including conditional/lazy fallback behavior. Distinguish an expressible type from an available API. |
| SV17 | tailRec/tailRecM in 67 importing modules; parser and type-spine loops | Recursion exists; library/runtime stack contract needs demonstration | Preserve stack safety and large-input behavior. Ordinary recursion in emitted Go does not by itself reproduce each loop's performance guarantee. |
| SV18 | String, Char, CodeUnits and CodePoints; Format/Lex*, Format/Parse* | Text literals/concat/comparison exist; Char, indexing/slicing/length APIs absent, STD001/D001 | Define text/byte/code-point operations and retain diagnostic offset/column conventions. Existing lexer mixes explicit code-unit and code-point operations; a UTF-8 port cannot blindly reuse indices. |
| SV19 | Int arithmetic, comparisons, character/code conversions; lexer/parser and IDs | Int32 and comparison implemented; arithmetic extension underway/parked, D001 | Audit every required operation and boundary behavior; source-level semantics, host indexing and overflow must agree. No Number use found in compiler source. |
| SV20 | Pattern guards, local helpers, qualified names and record conveniences | Some equivalent constructs exist; modules and syntax conveniences incomplete | Mostly translation effort; do not require every PS syntactic convenience if ordinary Waxwing code preserves evaluation and scope. |
| SV21 | Nine FFI imports; Runtime/Node.purs | Gap: I001; Console alone does not supply compiler host services | Args, stdout/stderr, exit status, UTF-8 source reading, file writing, subprocess build/run and JSON wire encoding need Go-host implementations or deliberate pure-library replacements. |
| SV22 | Host m and Monad-polymorphic CLI; Program/Command.purs | Effects/handlers exist; native host boundary and general abstractions incomplete | Use the chosen capability API and preserve typed host failures and cleanup. No need to port all of Node or require asynchronous execution for today's synchronous CLI. |
| SV23 | Structural module gates and trusted exports; scripts/structure*.mjs | Existing gates understand PS source and purs graph | Adapt gates to Waxwing AST/module/export evidence. Porting product code without its architecture checks loses part of the current assurance. |
| SV24 | JS tests import compiled PS constructors and inspect representations | Test harness currently works for PS output | Keep behavior fixtures/oracles, but replace white-box adapters for a native self-hosted compiler. Existing JS constructor-shape assertions do not transfer unchanged. |
| SV25 | Compiler-size specialization and collection workload | Go backend exists; P001 has specialization/recursion limits | Compile the compiler-sized program and measure generated code, compile time, memory and stack use; small examples do not establish scale. |
| SV26 | Source comments and explanatory annotations | Gap: CMT001; comments absent today | Not necessary for execution, but needed for a maintainable faithful source port without discarding reasoning and invariants. |
| SV27 | PureScript dependencies implement much of the substrate | Spago lists arrays, effect, either, enums, foldable-traversable, integers, maybe, ordered-collections, prelude, strings, tailrec, tuples | This survey identifies imports, not a transitive dependency port. Inventory the actually used APIs and their contracts next; do not require reimplementing the entire ecosystem. |

## Priority findings and prepared follow-ups

These are local candidate issue drafts under the self-hosting roadmap.
No remote issues have been filed and no existing roadmap priority changed.
Proposed BACKLOG candidates SH001-SH005 provide the umbrella and follow-ups.
Survey row IDs SV01-SV34 are separate evidence identifiers.

1. SV10-SV12: Scope-safe elaboration parity. Candidate, high priority for
   self-hosting. The current seal requires rank-2 scope isolation and
   nominal phantom types; Elab intentionally has no Bind. Acceptance:
   explicit design and negative examples that reject escaped/cross-scope
   handles and untracked reads. The existing rank-1 roadmap does not close
   this merely by shipping HKTs/classes.
2. SV14-SV19, SV21: Compiler substrate. Candidate. Produce an API-level
   manifest for collections, text/bytes/chars, arithmetic, loop safety
   and host capabilities. Acceptance: equivalent behavior and appropriate
   scale, with each API mapped to D001/STD001/I001 or a new scoped item.
3. SV04-SV09, SV13: Portability matrix. Candidate. Decide direct language
   support versus explicit library translation per feature. Acceptance:
   aliases, module abstraction and generic APIs have demonstrated compiler
   fragments; local generalization requirements are observed, not assumed.
4. SV23-SV25: Assurance harness and compiler-scale bootstrap. Candidate.
   Acceptance: ported architecture gates, executable/diagnostic/oracle
   adapters and repeated self-compilation with deterministic output.

## Backend reasoning

The repository's docs/bootstrap.md already describes a Go bootstrap.
Write the compiler in Waxwing, retaining its Go emitter and a small Go
host boundary. Then:

1. PureScript source --purs--> JavaScript bootstrap compiler, run by Node.
2. That compiler reads compiler.wxw and emits compiler-stage1.go.
3. go build compiles that Go into a native Stage 1 compiler executable.
4. Stage 1 reads the same compiler.wxw and emits compiler-stage2.go.
5. Build Stage 2 and repeat; compare canonical emitted Go and the same
   behavioral/rejection suites under fixed settings.

The compiler's implementation language, the host on which it runs and
its output target are separate axes. The running PureScript compiler is
JavaScript; it emits Go. The self-hosted compiler is written in Waxwing;
its generated implementation is Go and runs as a native executable.
It can continue emitting Go. A later JS or LLVM emitter can be written
in Waxwing without needing that emitter to bootstrap the compiler first.

Standard go build uses Go's gc compiler and linker to produce machine
code. It does not normally route through LLVM. The runtime supplies
execution services such as allocation/GC; it is not an intermediate
compiler target. LLVM is unnecessary for this bootstrap, and using LLVM
later does not remove the need for appropriate runtime services.

Existing ADR 015 prioritizes JS for production, LLVM next, while keeping
Go for bootstrap/development. A Go self-hosting route is compatible with
that policy; this report proposes no reprioritization. A JS-based
self-hosting route is another option once a Waxwing JS backend and host
bindings exist; it is not needed for the Go route.

Sources checked on 2026-10-27:
https://go.dev/doc/faq
https://go.dev/src/cmd/compile/README
https://www.purescript.org/
- Repository docs/bootstrap.md, ADR 015, docs/language.md, BACKLOG.md,
  spago.yaml and source locations above.

Equal generated Go across stages is convergence evidence, not a proof
against shared defects. Preserve the PS seed and its locked build, then
preserve the generated Go compiler seed plus Go build instructions.
Lean research remains Lean; no proof is automatically transferred to a
new Waxwing implementation.

## Suggested next step, not an implementation authorization

Keep current R0 work on its canonical checklist. Use this inventory to
extend self-hosting acceptance with a small representative compiler
slice for each high-risk feature, then an API-level dependency inventory.
Select a stable compiler path to port; the snapshot includes both old
and shadow implementations and does not require porting both forever.

## Follow-up: proper tail calls and higher-rank polymorphism

Status: discussion on 2026-10-27, not implementation authorization.

| ID | Finding or direction | Standing / next action |
|---|---|---|
| SV28 | The user favors proper tail calls for recursion-based iteration. | Direction under discussion. Specify tail contexts, mutual and indirect calls, effects/cleanup interaction and backend conformance before implementation. Tail-call support does not make non-tail map/foldr/tree recursion stack-safe. |
| SV29 | Rank-N includes the rank-2 quantification required by seal. | Published foundation: Launchbury/Peyton Jones 1994; observed seal type in Generate/Elab.purs. Annotated higher-rank checking is a candidate self-hosting requirement, not a decision to infer arbitrary higher-rank types. |
| SV30 | Higher rank alone does not establish scoped-handle isolation. | Preserve opaque constructors, rigid scope variables, escape checks, protection against scope-changing coercions if such conversions are introduced, and the independent tracked-read invariant. Current Waxwing has no Coercible-style mechanism; opaque constructors and rigid scope variables are the immediate requirements. |
| SV31 | Polymorphic method fields are another use for higher rank. | Candidate connection to C001/R006: polymorphic method fields lie outside the approved rank-1, closed-signature C001 core. Their proposed later design needs universally quantified methods and HKTs for constructor parameters. Impredicative instantiation is separate. Backend lowering must implement the selected fragment. |

Tail recursion alone does not bound the size of an output collection or
pending cleanup data. In particular, a recursive traversal that constructs
its result after returning from its child is not a tail call. Stack-safe
library implementations remain obligations even with proper tail calls.
Source-level handlers and defer must retain their semantics; a backend
cannot obtain constant space by discarding required dynamic state.

Published sources checked:
https://www.microsoft.com/en-us/research/publication/lazy-functional-state-threads/
https://ghc.gitlab.haskell.org/ghc/doc/users_guide/exts/rank_polymorphism.html
https://ghc.gitlab.haskell.org/ghc/doc/users_guide/exts/roles.html
https://www.gnu.org/software/guile/manual/html_node/Tail-Calls.html

## Collection and traversal precedents

Discussion follow-up, 2026-10-27; candidates, not selected implementations.

| ID | Direction | Evidence and implementation obligation |
|---|---|---|
| SV32 | Rust as a precedent for efficient iterator adapters and practical collection APIs. | Lazy adapters avoid materializing each intermediate sequence; concrete adapter types, monomorphization and inlining can remove abstraction overhead. Rust also relies on backend optimization. This is a candidate Waxwing library/backend acceptance target, not an automatic result of HKTs or higher rank. Rust trait specialization is a separate unstable feature. |
| SV33 | Clojure as a precedent for persistent collections and efficient builders. | Structural sharing preserves earlier versions; scoped builders need explicit ownership/aliasing rules. Rank-2 non-escape alone does not establish safe freezing or prohibit subsequent use of a frozen builder. |
| SV34 | Treat persistence and traversal as independent contracts. | A persistent collection can support a single-pass adapter pipeline. Preserve callback order, short-circuiting, effects and cleanup; compare time, allocations and stack use against a direct loop on each supported backend. Eager collection map and lazy iterator map have different evaluation behavior. |

Sources:
https://doc.rust-lang.org/std/collections/index.html
https://doc.rust-lang.org/std/iter/
https://doc.rust-lang.org/book/ch13-04-performance.html
https://clojure.org/reference/data_structures
https://clojure.org/reference/transients


## Charter alignment and adoption scope

Charter C3 favors capable libraries with justified compiler support; C7
requires inspectable trust boundaries; C8 requires published foundations
and evidence scoped to each claim. The proposed scope-safe APIs,
published collection precedents and per-backend traversal measurements
follow those principles. C4 distinguishes compiler targets from host
capabilities. C5 assigns
execution context, task relationships and scope to the runtime under
language-defined semantics. Pure compiler layers are required by
AGENTS.md. ADR 015 already permits the Go bootstrap route.
No charter amendment is proposed.

Review acceptance would approve documentation and candidate planning
records only. Rank-N types, proper-tail-call semantics, persistent
collection layouts, mutation/ownership rules, iterator representation,
fusion, FFI and backend work each need their own design and authorization.
This proposal does not narrow or enlarge a current implementation tranche.


## Roadmap and backend qualifications after review

The C001 first-core design is approved for ordinary explicit dictionaries,
rank-1 named functions, closed operation signatures and pure methods.
Its README records rulings from 2026-10-21 and 2026-10-23; the unmerged
c001-rulings-2026-10-23 branch carries the later alias ruling.
BACKLOG's C001 row records design-direction approval; R008 remains Later. This
draft reports design direction separately from implementation and does not
silently merge those rulings.
Polymorphic method fields remain outside the approved first core.

Go does not promise tail-call elimination, and JavaScript engines differ.
Any Waxwing tail-call guarantee must be supplied by its own lowering on
Go and JavaScript, using established mechanisms such as loops or
trampolines as applicable, with measured costs. No mechanism is selected
here. ADR 015 item 5 keeps the source contract independent of the host.
A syntactically final call with pending defer work or an installed handler
frame cannot justify discarding that work or frame. The design must state
how it is preserved, transferred or discharged before claiming a tail-call
space bound. This is not a rule that all calls under handlers are non-tail.

Sources for these qualifications:
https://go.dev/ref/spec
https://ocsigen.org/js_of_ocaml/latest/js_of_ocaml/tailcall.html
https://doc.rust-lang.org/unstable-book/language-features/specialization.html
