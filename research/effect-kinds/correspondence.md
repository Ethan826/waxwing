# P2: the promises against published rules

Read-only survey by an agent, 2026-10-24. Waxwing facts come from
docs/language.md ("Effects", FX001, FX008, FX020),
docs/plans/2026-10-09-effects-design.md, ADR 010 and ADR 015; none was
checked against code by this survey (see baseline-audit.md for the code
check). "Read" means the theorem statement and its surrounding text,
not the whole proof. Where nothing was found the text says **no
directly applicable theorem found in this survey**; that is a statement
about this survey, not about the literature.

Abbreviations: K14 Leijen, Koka 2014 (arXiv 1406.2061); K16 Leijen,
MSR TR 2016, "Type Directed Compilation of Row-typed Algebraic Effects"
(the POPL 2017 companion; the camera-ready was not read); K18 Leijen,
MSR-TR-2018-10, "Algebraic Effect Handlers with Resources and Deep
Finalization"; KP Kammar and Pretnar 2016 (arXiv 1605.06938); FKLP
Forster, Kammar, Lindley, Pretnar (arXiv 1610.09161); Ef20 Effekt TR
2020; SysC "Effects, Capabilities, and Boxes" 2022; CC Boruch-Gruszecki
et al., "Capturing Types", TOPLAS 2023; Run Ahman and Bauer (arXiv
1910.11629); Reg Schuster et al. 2022; BPPS Biernacki et al. POPL 2019;
ZM Zhang and Myers POPL 2019.

## Table

| Promise or property | Published result (calculus; statement; assumptions) | Owner | Waxwing departures (from docs) |
|---|---|---|---|
| P1 no outstanding request | K16 §4.3 Theorem 1, "If · ⊢ e : τ \| ϵ then either e ⇑ or e ↦→ v", and Lemma 4.b (a stuck `op ∈ Σ(l)` implies `l ∈ ϵ`), in λ^k with deep dynamically scoped handlers and general multi-shot `resume`, proved on paper; K18 §4.4 restates them. KP §3 Safety (Twelf). Ef20 Theorems 4-6 (Idris; lexical capabilities, second-class blocks). SysC §4.5.3 Corollary 9 (Coq). BPPS Theorem 2.7; ZM Theorem 2 | core typing (operation, handler discharge, `main`'s row); runtime dispatch | `main` may leave `Console`; no `resume` (nearest: K18 §5.2 Theorem 2, skip frames simulate the general rule for tail-resumptive clauses; not shown to match Waxwing); `Fail` via lexical `handle`; keyed labels, `Fail` by payload head; FX001 consumption differs from K14/K16 opening; first-class handler values (K18 §7.3: first-class resources break Lemma 1.b); `defer`, `crash` in no cited calculus |
| P2 composite | **no directly applicable theorem found in this survey.** Pieces: K14 Theorems 2 (exn) and 3 (state); K16 Lemma 4.b; CC §4.1 Theorem 4.14 (used capabilities); deterministic reduction (CC Proposition 3.4). K14's formal calculus has only exn, div and st; `io`, `ndet` are outside it | FFI and trusted bindings declare roots; core typing; runtime root handlers; libraries | `with pure` excludes neither `crash` nor divergence; `Console` a compiler special case; foreign declarations would be trusted contracts (ADR 015) |
| P3 termination | K14 §6 Theorem 4, "If Γ ⊢ e : τ \| ε where div ∉ ε then e ↦→ a" (λ^k without handlers; FIX and READ carry div; exceptions carry base values only, §3.1 saying function-valued exceptions would break it; proof sketched). FKLP §3 Theorem 3.5, no infinite reductions for well-typed eff terms (deep handlers, no recursion). KP §3 and FKLP §3: a global signature with higher-order operation types allows Landin's knot. For general handlers with recursion: **no directly applicable theorem found in this survey** | core typing or analysis; libraries; FFI | unrestricted, untracked recursion; global effect declarations; whether an operation may return an arrow (the knot) not checked; a diverging `defer` withholds an abort; Go fatal errors skip cleanup |
| P4 release | Run §5 Theorem 7, finalisation (λ_coop, no recursion, affine runners; combining with general handlers left as future work). Reg Theorems 4-5, Corollary 6: liveness of resources, not release. K18 §8: semantics of `finally`/`finalize`, no finalisation theorem | runtime (unwinding, order, at most once); core typing (`defer` rule, marks); libraries; FFI | `defer` block-scoped, LIFO, never failing; runs on normal exit, typed abort and recoverable defect; cleanup defect pre-empts the abort; discard and cancellation future |
| external observation | **no directly applicable theorem found in this survey** that separates observation. K16 Lemma 4.b gives row membership if every host primitive is an operation. CC §4.1 Theorem 4.14: primitive capabilities used ⊆ cv(t), for capability-safe code with well-behaved primitives | FFI; core typing; runtime | no observation root beside `Console` (output only); authority ambient through dynamic scope, so cv(t) has no direct counterpart |
| external command | as observation; a read/write split needs a resource model | as above | printing a special case; users cannot handle `Console` (FX011) |
| escaping failure | K14 §6 Theorem 2 (exn ∉ ε ⇒ e ⇑, e ↦→ v, or a handled throw; unit exceptions). K16 Lemma 4.b. Pessaux and Leroy, TOPLAS 2000 (abstract only) | core typing; runtime unwinding | families keyed by payload head; payloads may hold functions or handlers (FX024), which K14 §3.1 says breaks its divergence theorem (relevant only if P3 is promised); cleanup defects suppress the abort |
| deliberate abort | covered only when modelled as an effect (K14 Theorem 2; Run's typed signals). For an untracked, uncatchable abort: **no directly applicable theorem found in this survey**; Unison `bug` is a precedent, not a theorem | core typing if tracked; runtime | `crash` untracked; defects uncatchable; missing-handler guard and Go panics are defects |
| local state | K14 §5 Lemma 5 (faulty expressions untypeable) and §6 Theorem 3 (no handlers). KP §4.2-4.3: argument, not theorem. BPPS: soundness only. Timany et al. POPL 2018: not read | future core feature | no mutable state; without `resume` no state-threading handler |
| closures capturing authority | CC §4 Lemma 4.12, Theorem 4.14 (mechanised by Fourment and Xu 2023, not read). SysC Theorems 3, 5, Corollary 9 ("at {}" purity in prose only). Ef20 §8 and §1.1: "contextual purity does not imply purity" (section corrected in source-checks.md). ZM §5.4 Theorems 1, 3: parametricity for tunneled dynamic handlers; ZM §2: plain dynamic semantics allows accidental handling | core typing | closures capture no handler; FX017/FX018 make a callback's row equal the row at its call, installed labels included, so an inner `with` can take a callback's operations: ZM's accidental handling. The E15 probe (probes/) shows this behaviour (prints `2`) |

## Departures any correspondence must address

1. **Dynamic handler scope.** Matches K16/K18; differs from Ef20, SysC
   and CC. No `inject`/`lift` and no tunneling, so ZM §2's failure
   applies unless shown otherwise.
2. **The FX001 consumption variant.** Order and multiplicity kept,
   first match per key, as K14's Fig. 2. Differences: the implicit
   rigid ambient row; a closed stage coerced for one consumption; no
   opening of locals; FX017/FX018's equal callback rows; Leijen's side
   condition; `Fail` keyed by head.
3. **FX008 marks.** Directional consumption (ρ-mark ⊑ s-mark) and a
   separate clause row C; no cited calculus has this ordering.
4. **`defer`.** Block-scoped, LIFO, never failing; unlike Run's
   `finally` or K18's handler `finally`.
5. **No resumption.** A restriction of the cited calculi; that the
   restriction preserves each theorem's statement is not shown.
6. **`crash` and defects.** Nothing corresponds in K14/K16/KP; Run's
   kill-signal exclusion is the nearest analogue (an analogy only).
7. **FFI.** Trusted contracts (ADR 015); CC's Ψ assumes closed,
   well-behaved primitives; no theorem covers foreign code.
8. **Lowering.** Evidence passing to Go; Xie et al. ICFP 2020 proves an
   evidence translation under scoped resumptions (not read).

## Gaps (no directly applicable theorem found in this survey)

- G1 termination with dynamic handlers, recursion and a div label.
- G2 release with general handlers, recursion and finalisation.
- G3 an untracked abort interacting with cleanup and a pending abort.
- G4 "no external interaction" as one theorem with host primitives.
- G5 a read/write split of external effects.
- G6 abstraction safety under plain dynamic scope (ZM covers tunneling).
- G7 marks, the ambient-row consumption variant and FX017/FX018: even
  P1 has no direct published proof for Waxwing's rules found here.
- G8 first-class handler values installed dynamically.

## Reading record

Read (sections as listed): K14 §1, §2.2, §2.7, §3-3.1, §5, §6. K16
Fig. 4, §4, §4.3-4.4. K18 §4.4, §5-5.2, §7.3 (one paragraph), §8-8.2.
KP §3. FKLP §3. Ef20 §1.1, §4, §5.1-5.2, conclusion. SysC
contributions, §3 prose, §4.5.1-4.5.4. CC Proposition 3.4, §4, §4.1. Run
introduction, §5, conclusion. Reg §4 soundness part, related work. BPPS
§2 (pre-publication copy). ZM §2, §5.4. Abstract or summary only:
Pessaux and Leroy 2000; Craig et al. ICFEM 2018; Pham et al.,
"Classifying Capabilities", arXiv 2607.24504; Leijen 2005. Not read:
the POPL 2017 camera-ready, Biernacki et al. POPL 2018 ("Handle with
care"), Timany et al. POPL 2018, Xie et al. ICFP 2020, Fourment and Xu
2023.

Agent's rulings, kept: the K16 TR in place of the POPL paper; "effect
safety" read as stuck-freedom; P2 split into rows; CC as the answer for
capture; Runners' kill exclusion as an analogy only; unverified Waxwing
facts (arrow-returning operations, the row of `with h`, accidental
handling) flagged, not resolved.
