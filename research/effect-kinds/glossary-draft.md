# P1 draft: what the promises could mean

A draft for the author, 2026-10-24, written by a read-only agent. Nothing
here is decided. All code is **illustrative pseudo-syntax, not accepted
Waxwing syntax**. Section numbers are ones the agent read. Each
definition of purity is attributed to its source; a definition marked
**invented** or **derived** has no published source the agent found.

## 0. Observation models

- **O1, outcome.** How a closed run ends: a value, an escaping failure
  `fail(E, v)`, a defect, or no outcome (divergence). After Koka's
  answers (Leijen 2014, arXiv 1406.2061, §6, Theorems 2-4) and Sabry's
  programs and observables (JFP 1998, Defs 2.2, 2.7).
- **O2, trace.** O1 plus the ordered calls that escape every handler
  and reach the host, with arguments and replies. After Pretnar 2015
  §6.5 (a call that "escapes all handlers" answered by a comodel) and
  Ahman and Bauer 2020 §2.2 (Defs 1-2).
- **O3, resources.** O2 plus the host's resource state at the end.
- **Excluded from all three:** out of memory, stack exhaustion,
  external kill, hardware faults, timing and other side channels.
  Assumption: an idealised machine. Waxwing already departs from it:
  Go fatal errors skip cleanup (language.md, "Limits"). The exclusion
  does not license deliberate aborts (note §5).
- **Observation boundary for Waxwing (author's qualification).**
  Printing `main`'s result and the fatal defect report are I/O no row
  records; a contract must place them inside or outside O2. That they
  exist does not by itself make function-level effect checking unsound.

## The four promises (note §5)

**P1, no outstanding request.** Under O1, run with no caller-installed
handlers, no performed operation goes unhandled. This is Brachthäuser,
Schuster and Ostermann's contextual purity (Effekt TR 2020 and OOPSLA
2020, §1.5; section corrected in source-checks.md): "A contextually pure function can still have effects, it merely
places no requirements on its caller." It separates from P2 through an
FFI root such as a host `now()`: no request, but O2 sees an
observation (E03, E06). Waxwing's `Console` is both a request in the
row and an external root.

**P2, no external interaction, hidden input or escaping failure.** Two
candidates:
- **P2a, "total"-like.** Under O2, equal explicit inputs give the same
  outcome; the outcome is a value (or divergence, unless P3 is also
  required); the escaping trace is empty. The Koka book §3.2.1 reads
  `int -> total int` as a mathematical function ℤ → ℤ.
- **P2b.** As P2a, but the outcome may also be an escaping failure or
  a defect. This is Koka's `pure`, the alias for `<exn,div>` (Leijen
  2014 §2.2; std/core's documentation of `pure`: "always returns the
  same result when called with the same arguments but may not
  terminate or raise an exception"). Sabry 1998 §1 likewise frames
  purity "modulo divergence and errors".
- E01 (`crash` under the promise) separates them. P2b is the published
  meaning of the word `pure` in Koka and in Sabry's paper, and it is the
  meaning the author objects to.

**P3, termination.** Koka's Theorem 4 (Leijen 2014 §6): "If Γ ⊢ e : τ |
ε where div ∉ ε then e ⟼→ a", where an answer may be `throw c`, so
termination there still allows ending by an exception. E14 separates
it.

**P4, resource release.** Under O3, for each exit in a chosen set X ⊆
{normal, typed failure, defect, cancellation, continuation discard},
each finaliser runs exactly once before the scope's outcome is
delivered. After Runners in Action (Ahman and Bauer 2020, Theorem 7,
§5.3; §1: "in the absence of external kill signals the finalisation
code is executed exactly once"). Its assumptions do not transfer: no
recursion (§5), continuations used once in tail position (§2.2),
`finally` intercepting every exception and signal (§4.3). Waxwing today:
X = {normal, typed abort, defect}; a cleanup defect pre-empts a pending
abort; a diverging cleanup never delivers it. E09, E11.

## Other terms

- **Failure, escaping vs internal.** A (escaping): the boundary outcome
  is `fail(E, v)`; Koka's Theorem 2 guarantees only this, and §6 says a
  local catch can still handle such exceptions. B (any `Fail`
  operation, even caught): intensional, not observable under O1 or O2;
  **invented**. E02.
- **External observation.** A: an escaping call whose reply depends on
  world state (comodel reading; the split into observation and command
  is **derived** by the agent, not in the papers). B: equal inputs can
  give different outcomes (Koka `ndet`, Leijen 2014 §2.2; Flix
  `NonDet`). `let _ = Clock.now(); 3` separates them.
- **External command.** A: an escaping call that changes visible world
  state. B: any escaping call in the trace (Interaction Trees, Xia et
  al. POPL 2020; abstract only). A rewrite with identical contents
  separates them. A buffered log handled inside is a command under
  neither (Pretnar §6.5).
- **State.** Local: Koka's `st<h>` discharged by `run` when `h` does not
  escape (Leijen 2014 §2.5, Theorem 3, Lemma 5); Flix agrees. Shared: a
  hidden input or command. Escape: Koka §5.2's faulty expressions. E07,
  E08. Waxwing has no mutable cells.
- **Defect.** An O1 outcome that is none of value, typed failure or
  divergence. Options: A, share the exception channel (Koka `error`,
  `throw`); B, untracked and uncatchable (Unison `bug`; Waxwing today);
  C, tracked separately (**no published precedent found**). E01.
- **Divergence.** A: every run reaches an answer, host calls assumed to
  return (Koka Theorem 4). B: also counting host calls that never
  return (Koka keeps `blocking` separate). Koka's escape hatches:
  `pretend-no-div`, `pretend-decreasing`, `unsafe-total`.
- **Control and lifetime.** Resumed once, discarded, resumed more than
  once, resumed after its scope, cancelled. Runners use continuations
  affinely (§2.1-2.2). Waxwing: immediate resumption and aborting
  failure only. E12, E16.

## Decisions for the author

1. Does `pure` mean P2a, P2b (Koka's and Sabry's meaning), or should the
   word be avoided and the promises named separately?
2. Does the promise forbid escaping failure only (Koka Theorem 2), or
   any `Fail` operation (invented)?
3. Are defects excluded, allowed and untracked (today), or tracked
   separately? If excluded, how is an impossible case written?
4. Are host exceptions translated to typed failure at the binding,
   turned into defects, or trusted not to occur?
5. Does termination allow ending in typed failure? Does it cover
   cleanups and clauses?
6. Is a host call that never returns divergence or a separate property?
7. Observation vs command: state-based, event-based, or every host
   primitive conservatively both (Flix `IO`, Koka `io`)?
8. Is local, non-escaping state allowed under the purity promise?
9. Which exits are in P4's X? Must finalisers be `nofail` only, or P2a
   and P3? Exactly once or at most once?
10. Which observation model does the contract use, and are the physical
    exclusions written into it?

## Sources read by the agent

Leijen, Koka, MSFP 2014, arXiv 1406.2061: §§1, 2.1-2.5, 5.2, 6, part of
§7. Koka book §3.2-3.2.1 and std/core pages (`std_core`,
`std_core_types`, `std_core_exn`, `std_core_unsafe`, `std_core_undiv`).
Brachthäuser, Schuster, Ostermann, Effekt TR 2020 (pl.cs.uni-tuebingen
.de copy): §§1.2-1.7, 2.1-2.2. Effekt FFI tour, "Captures". Ahman and
Bauer, Runners in Action, arXiv 1910.11629: §§1, 2.1-2.2, 3.1-3.2,
4.3-4.4, 5. Pretnar 2015 handlers tutorial: §1, §§6.2-6.5. Sabry, JFP
8(1) 1998: §1, §§2.1-2.2. Flix primitive-effects and effect-system
pages. Unison `bug` page. Xia et al. 2020: abstract only.

Not verified: whether a partial match in Koka adds `exn`; the OOPSLA
text of the Effekt paper (the TR was read); the 2022 Effekt papers, the
2025 multishot paper and the Interaction Trees body. Brief breach,
disclosed by the agent: it wrote a temporary copy of the Koka book to
/tmp and deleted it a minute later.
