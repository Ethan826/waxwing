# Source checks and the papers not read before

Read-only research by an agent, 2026-10-24, under dossier §18.86 item 1
(source research independent of the unsettled choices). Findings only;
nothing proposed or adopted. "Read" means the cited text was read;
behaviour taken from source code was not run.

## 1. Citations checked

| Claim (where) | Verdict | Source |
|---|---|---|
| "Freer Monads, More Extensible Effects" (2015) is Kiselyov and Ishii (decision-memo.md) | confirmed (first page: Oleg Kiselyov, Hiromi Ishii); venue not checked | okmij.org/ftp/Haskell/extensible/more.pdf |
| Gleam: integer division by zero returns 0 (division memo) | confirmed from docs and source: "Gleam does not have partial functions and operators in core so instead division by zero returns zero, a behaviour taken from Pony, Coq, and Lean"; `int.divide`, `remainder`, `modulo` return `Error`; JS `%` by zero gives 0 | gleam-stdlib.hexdocs.pm/gleam/int.html; gleam-lang/gleam compiler-core prelude.mjs, erlang.rs |
| Haskell `/` throws; MIN / -1 not verified (division memo) | corrected: `Int` has no `/`; `quot`, `rem`, `div` raise `divZeroError` on zero; `minBound` `quot`/`div` -1 raise `overflowError`; `rem` by -1 gives 0; `mod` not read | GHC.Internal.Real, `instance Integral Int` |
| Rust `/` panics; `checked_div` None on zero or overflow | confirmed; `wrapping_div` returns MIN for MIN / -1 and panics on zero; `wrapping_rem` gives 0 for MIN % -1; `overflowing_div` gives (MIN, true); `strict_div` panics on MIN / -1 | doc.rust-lang.org/std/primitive.i32.html |
| Elm `//` gives 0; `modBy 0` crashes | confirmed; also `remainderBy 0 x` is JS `x % 0` (NaN), unguarded | elm/core Kernel/Basics.js, Debug.js |
| Roc division | completed: `I32.div_by` crashes on zero; `div_try` returns `Err(DivByZero)` or `Err(Overflow)` for lowest / -1; operator mapping not verified | roc-lang/roc src/build/roc/Builtin.roc |
| Unison division by zero | partly: the Haskell interpreter calls GHC `div`/`mod` unguarded, mapped to `io2.ArithmeticFailure` (runtime failure); JIT and catchability not checked; `divi` floors | unison-runtime Machine/Primops.hs, Machine.hs |
| Idris 2 `div` partial | confirmed from source: `Integral Int` matches only `y == 0 = False`; checked `divNatNZ` with a `NonZero` proof exists; runtime on zero not run | Idris2 Prelude/Num.idr, Data/Nat.idr |
| Koka: does a partial match add `exn`? (glossary "not verified") | confirmed yes: inference adds a wildcard branch calling `error-pattern : exn a` | koka src/Type/Infer.hs; lib/std/core/exn.kk |
| Effekt contextual-purity quote at TR §1.2 | corrected: §1.5 ("Purity: Traditional vs. Contextual Reading"), in the TR and the OOPSLA text alike; §1.1 holds "Contextual purity does not imply purity" | OOPSLA PDF (infoscience.epfl.ch/record/288487); TR |
| correspondence.md "Ef20 §7: contextual purity does not imply purity" | corrected: §8 Conclusion and §1.1; §7 is related work | same |
| Ef20 Theorems 4-6 (Idris) | confirmed for the TR; OOPSLA numbers them 4.3, 4.4, 5.1 | same |
| K16 TR used for the POPL 2017 paper | statements match word for word (author version of the POPL paper read; ACM version paywalled); the August TR has a typo in Theorem 1 | microsoft.com/.../2016/12/algeff.pdf and the 2016 TRs |

## 2. Papers not read before

- **Leijen, POPL 2017.** Theorem 1 (semantic soundness) and Lemmas 1-4
  as in the TR, for λ^k with deep, dynamically innermost handlers and
  multi-shot `resume`; on paper. No correctness theorem for its CPS
  compilation (§5) or the tail-resumption optimisation (§4.1). Bearing:
  nothing new beyond the TR; the compilation analogue of Waxwing's
  lowering is unproved there.
- **Biernacki, Piróg, Polesiuk, Sieczkowski, "Handle with Care", POPL
  2018.** λH/L: call-by-value, deep handlers, multi-shot, rows with
  duplicate labels, first-match dispatch, and `lift` ([e]_l skips inner
  handlers for l). Coq-formalised logical relation: Theorem 8
  (fundamental property), Theorem 9 (type soundness), Theorem 10
  (soundness for contextual equivalence); applications use parametricity
  in the row (§4.1) and lift (§4.2-4.3). §5.4: without duplicate labels
  and lift, "no contexts are n-free for n > 0". Bearing: the closest
  published account of abstraction under dynamic first-match handling
  (gaps G6, G7); it relies on `lift`, which Waxwing lacks, and covers
  neither FX001's consumption nor a calculus without resumption, nor
  handler values.
- **Xie, Brachthäuser, Hillerström, Schuster, Leijen, "Effect Handlers,
  Evidently", ICFP 2020** (MSR-TR-2020-23 with proofs; ICFP numbering not
  cross-checked). System Fϵ with dynamically innermost handlers and
  handler values; scoped resumptions enforced by a dynamic guard.
  Theorems 2-3 (progress, preservation); evidence translation: Theorem 4
  (sound), **Theorem 5 (the evidence is exactly the innermost handler in
  the dynamic context)**, Theorems 6-8 (unique markers, preservation,
  coherence); Theorems 9-11 (translations to delimited continuations and
  a monadic form). On paper. Bearing: the published result nearest to a
  context-passing Go lowering. Its premise (scoped resumptions) holds
  trivially without resumption: an inference, not a theorem in the
  paper. It says nothing about `defer`, abort or FX001 consumption.
- **Timany, Stefanesco, Krogh-Jespersen, Birkedal, POPL 2018.** ST monad
  with `runST`; Iris logical relation in Coq; Theorem 1.1 (state
  independence), Theorems 4.1-4.7 (purity equivalences with encapsulated
  state). Bearing: only if local state is added; no handlers.

## 3. Searches behind "no published precedent found"

- **A tracked, uncatchable defect or abort.** None found with a
  soundness theorem (searched the web for tracked uncatchable panic
  effects, Koka, Effekt, Idris 2, Runners in Action, Effect-TS, Rust).
  Nearest: Runners in Action's signals (§3.1, §4): tracked in kernel
  types, absent from user types so user code cannot catch them, but
  intercepted by `finally` (Theorem 7); Idris 2's `idris_crash` is
  `partial`, tracked by totality and lifted by `assert_total` (no
  theorem found; mixes crash with non-termination); Koka's `div` is a
  handler-less built-in effect (divergence, not abort); Effekt's docs say
  built-in side effects "are tracked, but cannot be handled" (I/O, no
  theorem). Untracked and uncatchable: Rust panics, Effekt `panic`,
  Unison `bug`; Effect-TS defects are untyped but catchable.
- **A read/write split of host effects with a soundness result.** None
  found for host effects. Store-level precedents: Lucassen and Gifford,
  POPL 1988 (FX read/write/init on regions; secondary source only);
  Benton, Kennedy, Hofmann, Beringer, APLAS 2006 (abstract only); Kammar
  and Plotkin, POPL 2012 (abstract and slides). A 2026 preprint (Tan et
  al., "Etas", arXiv 2607.17780) separates request from commit events and
  orders read below write authority; its Theorem 4 (commits covered by
  the escaping row) has sketch proofs and is not about read versus write.

The agent wrote temporary PDF extractions under /tmp and deleted them;
WebFetch also saved PDFs in the harness's own directory.
