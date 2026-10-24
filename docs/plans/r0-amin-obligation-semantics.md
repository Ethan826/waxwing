# a-min: what each obligation means, and why (2026-10-24)

Status: **proposed, for the author** (dossier §18.81). A companion to
docs/plans/r0-amin-statements.md, revision 3.2, to be folded into it
after the targeted re-review of 3.2 returns. No code.

The author's rule (§18.81): **today's compiler is the compatibility
baseline, not the correctness specification.** Every validator
obligation names its intended semantic property and the independent
argument for it. A rule supported only by existing behaviour is a
**compatibility obligation**. Where compatibility and soundness appear
to conflict, the separating example is kept and the conflict comes to
the author; old behaviour is not reproduced automatically.

## Classes

- **S, soundness**: needed for a stated guarantee about running
  programs; the argument is named with its standing.
- **P, precision**: accepts more programs that are safe; such a rule
  widens acceptance, so its own soundness needs an argument too.
- **I, implementation**: required by lowering or the runtime's
  representation, not by the language's meaning.
- **C, compatibility**: supported only by what today's compiler does;
  no independent argument is claimed.

The guarantees in play: **effect safety** (every operation a running
program performs is handled by an enclosing handler of its effect; no
operation escapes `main` except Console) and **abort safety** (FX008
§3.1: under a row whose k-th κ occurrence is marked N for every value
of the mark variables, the k-th κ frame cannot end an operation in a
typed abort; hence no deferred expression ends in a typed abort).

Arguments and their standing:
- **[L05]** Leijen, "Extensible records with scoped labels", TFP 2005:
  row equality up to scoped-label order, row unification. Published.
- **[L17]** Leijen, "Type directed compilation of row-typed algebraic
  effects", POPL 2017: effect safety for row-typed algebraic effects
  with scoped labels (an operation goes to the innermost handler of its
  label). Published; Waxwing's consumption is a project variant of it
  (FX001), not the paper's rule.
- **[FX008-5]** FX008 design §5, "Soundness argument (a proof
  obligation)": abort safety from the least solution, honest frames,
  met assumptions, mark variables and `defer`. A project argument,
  reviewed against probes (revisions 6-7 found no unsound acceptance);
  **not proved**, not published.
- **[FX008-3.4]** FX008 design §3.4's per-rule justifications. Project
  arguments.
- **[§5]** r0-amin-statements.md §5: `holds` exact for every rigid
  valuation (universal), the correspondence with FX008's criterion
  (universal given P1-P3) and its bounded oracle.
- **[REP]** spec §6 and Specialize.purs `specializeWith`: program output
  does not depend on the representative a hole lowers to (tested with
  another representative; bounded).

## The obligations

| Obligation | Intended semantic property | Independent argument (standing) | Class |
|---|---|---|---|
| E1 type equality, rows up to scoped order | the two sides denote the same type, so a value of one may stand for the other | standard unification over rows [L05] (published) | S |
| E1 marks equal inside types (function types invariant) | a handler or callback passed by type carries the mark facts its type promises | [FX008-5] point 1 (handler values reach installations only by type equality, marks included) (argued); invariance is the conservative choice | S |
| E1 exception: inference rows R ≡ ρ, R ≡ R ignore marks | R's marks are never read, so ignoring them loses nothing | [FX008-3.4] "R's marks are dead", [FX008-5] point 1 (argued) | P (sound by argument) |
| E2 labels matched by first occurrence per key; ρ holds at least as many | effect safety: each label the stage may perform has a handler occurrence in the target, the innermost first | scoped-label dispatch [L17] (published, adapted); per-key counts give finite rows (FX008 §3.5 (c)) | S |
| E2 payloads equal | the handler that receives the operation is the one for its effect instance | [L17], [L05] (published) | S |
| E2 remainder: rigid ϱ needs ρ to end in ϱ (tail pass) | a computation that may perform anything in ϱ runs where ϱ is present | FX008 §3.5's tail pass: "without the pass, the base effect system is unsound" (argued, with the rigid.wxw probe) | S |
| E2 edge mark(ρ) ⊑ mark(s) on matched pairs | assumptions are met: a computation assuming N runs under an N frame | [FX008-5] point 2 (argued) | S |
| E2 copies: fresh positions with mark(ρ) ⊑ mark(copy) | the copy inherits the assumption edge (soundness); fresh positions avoid merging unrelated handlers (precision) | [FX008-5] point 2 for the edge; [FX008-3.4] review I1 for freshness (argued) | S (edge), P (freshness) |
| E2 target extension t ⊑ mark(s) | a label added to a target's tail inherits the stage's assumption | [FX008-3.4] review rev6 I2 (argued) | S |
| E2 at `defer` (d into the enclosing row) | cleanup's assumptions are met by its registration context | [FX008-5] point 2, "cleanup runs in its registration context" (argued) | S |
| E2 installed-C site (per-key count; Lend `assume` edge) | the frame's clauses reach outer frames at least as strong as they assume | [FX008-5] point 1 (argued) | S |
| E3 opening at use (an M handled label in a parameter, an N one in the result, made fresh) | accepts handler values at weakening positions | [FX008-3.4] D3; callback rows never opened ("would be unsound") (argued) | P (sound by argument) |
| E4 c into C with marks (C ⊑ c); c into R ignoring marks | C over-approximates what the clauses perform, with their assumptions | [FX008-5] point 1 (argued) | S |
| E4 own abort: `Fail` or rigid tail in a clause gives M ⊑ m | a handler whose clause may abort by itself is not N | [FX008-5] point 1 (argued) | S |
| E4′ owned C not from a literal: R's labels, bare; tail by `ownClauses`' occurs rule | the C a caller installs covers what the callee's clauses may perform | ResultClauses.purs's comment: by parametricity, clauses reach nothing else through a tail the caller cannot fill (argued in a code comment only) | S, **argument needed** (decision 3) |
| C rows bare (no label arguments) | marks attach to effect keys; dispatch is by key | Task 7 ruling; [FX008-5] point 1 reads C only for keys and marks (argued) | S by argument; C for the ruling |
| E5 R into ρ ignoring marks (inclusion) | effect safety of the handler's inference row in its context | [L17] (published, adapted); marks dead (argued) | S |
| E5 frame edges m ⊑ f, paired ρ marks ⊑ f, rigid C tail gives M ⊑ f | frames are honest | [FX008-5] point 1 (argued) | S |
| E5 Console frame edges skipped (Frames `framed` guard) | none: a Console frame is N by definition | sound only while no `Handler(Console …)` value can be built (FX011); the code says it "drops real demands" | **C, conflict candidate** (decision 1) |
| E6 no `Fail` and no rigid tail in d | cleanup neither fails nor performs an unknown effect | [FX008-5] point 4; spec's `defer` rule (argued) | S |
| E6 d's labels ⊑ N | cleanup's operations reach frames that cannot abort | [FX008-5] point 4 (argued) | S |
| E7 a call's `nofail` assumption | as E2's edge | [FX008-5] point 2 (argued) | S |
| E8 `main` within Console | effect safety at the top: only the runtime's Console handler exists | the runtime (spec §1); [L17]'s top-level condition (published, adapted) | S |
| E9 Fail payload head concrete | lowering needs a concrete error family for the Go layout | audit C6; lowering's family read (cited) | I |
| E10 body row within the declared row | the signature's row is a sound upper bound for callers | [L17] (published, adapted) | S |
| E11 ambient rows | defines E2's targets | definitional | — |
| E12 every edge for every rigid valuation | abort safety holds for every value of the mark variables | [FX008-5] point 3; [§5] (universal for `holds`; correspondence bounded) | S |
| Console labels N; `nofail(k) Console` recorded as N | the runtime is Console's only handler, which cannot abort | spec §1, FX008 §3.3 (argued) | S, while FX011 holds |
| hole defaults: type Int, record tail none | the program's output does not depend on the representative | [REP] (bounded) | I |
| hole default: effect tail the closed row | obligations judged at ∅ hold for every row lowering might choose, since lowering reads no effect row | audit §3 C1 (argued from the code) | S by argument |
| FX008's F1′ hook, correction S, termination T (excluded) | reproduce today's type solutions and acceptance order | FX008 §3.4's compatibility argument (argued) | C (excluded from the validator) |
| side-condition texts, diagnostic headlines | which message a refusal prints | today's behaviour only | C |

## Compatibility-only obligations

The rules above supported only by existing behaviour: the Console frame
guard (E5), the bare-C ruling as a ruling (its soundness has an
argument), FX008's F1′, S and T (already excluded from the validator),
and diagnostic texts and headlines. None is a soundness obligation of
the validator; each is kept only to match today's acceptance or output
and is listed so it is not mistaken for one.

## Conflicts and decisions for the author

Each keeps its separating example; none is resolved by copying today's
behaviour.

1. **Console frame guard** (E5). Frames `framed` adds no edge for a
   frame marked N, which today means only a Console frame; the code
   says this "drops real demands" and that user Console handlers
   (D001) must revisit it. Separating example (unrun, not constructible
   today because of FX011): a user `Handler(Console …)` whose clause
   fails, installed around `defer print(1)`. Proposed: the validator
   generates the frame edges for Console frames too; that costs nothing
   today (unreachable) and stays sound if FX011 is lifted.
2. **FX032** (decided, §18.78): today's checker drops an operation's
   own `with` row, which accepts unsound programs; a-min records it as
   unsupported. Listed as the precedent for this rule.
3. **E4′'s tail rule rests on a parametricity claim in a code comment**
   (ResultClauses.purs). It is soundness-relevant (a ResultC's tail
   decides which outer frames its clauses can reach) and has no
   independent argument. Separating example to construct: a callee
   returning a handler whose clauses call a callback through a row
   variable that occurs only in the result. Proposed: write the
   argument before implementation, or treat such ResultCs as
   unsupported.
4. **Divergence, not a soundness conflict**: with F1′, S and T excluded,
   R0 may accept a program today's checker rejects (FX008's gain1.wxw is
   such a program for FX008 revision 10 itself). FX008 argues these
   gains are sound. The shadow differential reports each such program
   for review rather than counting it as agreement or refusing it to
   match today.

Not covered here: proofs of any [FX008-5] point, which remain a
proof obligation; the effect-safety theorem for Waxwing's consumption
variant, for which [L17] is the published model, not a proof of this
rule.
