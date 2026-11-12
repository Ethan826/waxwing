# Replacement's losses on the gap lists, measured (2026-11-12)

Evidence only, authorized by dossier §18.184. No src change. Source at
59e70fdb (verified at 863a0992, §18.183).

## Question and rule

For each declaration on criterion 2's gap lists (the read faults, the
ForcedTail refusals and the three `RequirementUnjudged` refusals), the
question is what live replacement would do to its program end to end,
and whether that program is a valid program lost or an existing defect
correctly refused.

Replacement's rule is the one docs/plans/r0-census.md states: if R0's
verdict were live, one declaration that `decide` does not solve stops
its program. This measures `decide`, not certification, because
replacement acts on `decide`. Every listed declaration is `Unresolved`
under `decide`, so every listed program is rejected under replacement.
The certification losses criterion 2 reads (§18.159) are a subset of
this.

## Method

research/r0-replacement-losses/measure.mjs runs every program that
holds a listed declaration (the honest pin's sources; one program per
declaration, 19 programs) and three variants (below). For each program
it records:
- today's compile and run, built and run in one Go batch (exit status,
  stdout, stderr);
- every declaration's `decide` verdict and reason;
- replacement's outcome: accepted, or rejected through the named
  declarations.

research/r0-replacement-losses/today.mjs prints today's diagnostic
where a program is refused today. Output:
.build/evidence/2026-11-12-replacement-losses/measure.json.

"Valid" means the program compiles today and its behavior is pinned by
a test as intended (exact stdout and exit status, or a probe table's
`ok` outcome), or, for a research or fixture program with no pin, it
runs to completion with the result its source computes. Whether today's
acceptance is right is judged against those pins and against the
language rules the pins encode. It is not proved.

## Per declaration

All 19 listed declarations compile today as declarations, and `decide`
leaves every one `Unresolved`. "Also blocking" names the program's other
unsolved declarations: they are on no gap list, and replacement rejects
the program through them as well.

| Declaration | List | `decide` reason | Program today | Also blocking | Verdict |
|---|---|---|---|---|---|
| c7-pure-stages-construction `statsEvidence` | read fault | EffectsUnread UnreadImage | runs, `Results(5, 20, 6, 2)` | none | valid, lost |
| q7-pure-construction `statsEvidence` | read fault | EffectsUnread UnreadImage | runs, `Results(5, 20, 6, 2)` | none | valid, lost |
| expected-handler fixture `k` | read fault | HandlerType; UnframedInstall | runs, `0` | none | valid, lost |
| fx008-defer r2 `run` | read fault | HandlerType; UnframedInstall | pinned `3` | `mk`, `main` (HandlerType) | valid, lost |
| fx008-defer r9 `main` | read fault | HandlerType; UnframedInstall | pinned `3`, `1` | `mk` (HandlerType) | valid, lost |
| fx008-probes f3 `main` | read fault | FailFamily, HandlerType; UnframedInstall | pinned ok `9` | none | valid, lost |
| fx008-probes rev7/late1 `main` | read fault | HandlerType, EffectArgument; UnframedInstall | pinned ok `0` | none | valid, lost |
| fx008-probes rev7/late2 `main` | read fault | HandlerType, EffectArgument; UnframedInstall | pinned ok `0` | none | valid, lost |
| fx008-probes rev8/one3 `main` | read fault | HandlerType, EffectArgument; UnframedInstall | pinned ok `0` | none | valid, lost |
| fx008-probes rev8/two3 `main` | read fault | HandlerType, EffectArgument; UnframedInstall | pinned ok `0` | none | valid, lost |
| fx008-probes rigid `main` | read fault | FailFamily, HandlerType; UnframedInstall | refused, pinned E_TYPE | `mk` | existing refusal; no program lost |
| inline:fx032 `g` | read fault (effect pin only) | EffectsUnchecked OperationWithRow | runs, `0` | none | existing defect, correctly refused |
| examples/records.wxw `details` | RequirementUnjudged | RequirementAtoms | pinned output | none | valid, lost |
| f05-print-key `shown` | RequirementUnjudged | RequirementAtoms | refused, E_TYPE (a function is not printable) | none | existing refusal; the shape loses valid programs (variant) |
| split-selection `divide` | RequirementUnjudged | RequirementAtoms | refused, E_TYPE (ambiguous division) | `main` (NoCandidate) | existing refusal; no program lost |
| effect-namespaces `main` | ForcedTail | HandlerType; ForcedTail | runs, nine lines | `database`, `logger` (HandlerType) | valid, lost |
| examples/services.wxw `main` | ForcedTail | HandlerType; ForcedTail | pinned output | `audited` (Deferred), three handler constructors (HandlerType) | valid, lost |
| fx-services fake `main` | ForcedTail | HandlerType; ForcedTail | pinned output | as services | valid, lost |
| fx008-defer aroundBoth `around` | ForcedTail | HandlerType; ForcedTail | pinned `101`, `9` | `prefix` (HandlerType), `main` (FailFamily, HandlerType, Deferred) | valid, lost |

The reason column abbreviates `decide`'s text: "HandlerType" is
`Outside HandlerType`, "UnframedInstall" is `EffectsUnchecked
[UnframedInstall], EffectsUnread Declined`, and so on. The full text is
in measure.json.

Variants, each keeping a listed declaration's shape with a caller today
accepts:
- f05 with `main` calling `shown({ a: 1 })`: compiles and prints
  `{ a: 1 }`; replacement rejects it through `shown` (RequirementAtoms).
  A valid program lost.
- split-selection with a caller whose division looks decided
  (`divide({ a: 1, b: 2 }, { a: 2 }, { b: 3 })`): still refused today
  (E_TYPE), so no valid program of this shape was found. Not exhaustive.
- test/fx008-probes/rigid-ok.wxw, rigid's pinned sibling: refused today
  by design (pinned E_EFFECT). No valid program of rigid's shape found.

## Findings

1. Of the 19 programs, 16 compile today. Replacement rejects all 16.
   15 are valid programs lost. One, inline:fx032, is an existing
   defect correctly refused: the author's G-erased ruling, item 5
   (2026-10-23; docs/findings.md, "Final review of the first R0 shadow
   tranche"), classifies FX032 as a defect, to be rejected for now.
   BACKLOG's FX032 row still reads "Open, observation"; that correction
   is pending there.
2. The other three (rigid, f05-print-key, split-selection) are refused
   today. Replacement loses none of them. f05's declaration shape loses
   a valid program once its caller is valid.
3. The named fault is the only cause for 3 of the 15 lost programs:
   c7 and q7 (UnreadImage) and examples/records.wxw (RequirementAtoms),
   plus the f05 variant. The other 12 all carry `Outside HandlerType`
   as well, on the listed declaration itself, and 6 of them have other
   blocking declarations. Repairing UnframedInstall or ForcedTail alone
   rescues none of those 12 programs: each also needs handler types,
   and some need Deferred, FailFamily or EffectArgument.
4. Two user-facing examples are lost: examples/records.wxw (through
   `details`) and examples/services.wxw.
5. These 15 are a small slice of replacement's loss. The pinned census
   (test/fixtures/r0/census.json, checked by r0-census.serial in the
   verify at 863a0992) counts 256 of the 751 programs that compile today
   rejected under replacement, by the union of its categories:
   DataApplication 143 programs, HandlerType 102, ErasedRow 72,
   FailFamily 41, Deferred 41, EffectArgument 31, and BQAtTypeVariable 1.
   Criterion 2's lists name certification losses only; they do not
   measure this.

## What is recorded about each cause

A read-only search of the dossier, the A2 specification, the R0
implementation plan and statements, the census, the packets, BACKLOG
and docs/findings.md found no design, statement set, plan or cost
estimate for lifting any of these causes. Rulings that hold them:
- `Outside HandlerType`, `Outside Deferred`, `FailFamily`,
  `EffectArgument`: G0's markers, kept by §18.96 and §18.99. §18.70
  chose shadow first, with earned exemptions as the destination.
  Recording handler rows and marks is specified (r0-amin-statements.md,
  F3) but unbuilt.
- UnframedInstall: a hard blocker, approved (A2 specification §12 D11;
  §18.124 ruling 4). Lifting it is not authorized (§18.139). §18.142
  names supplying terms for unread frames as a precondition, untested.
- ForcedTail: E4′'s forced ResultC tail (A2 specification §5).
  Reconsidering E4′ is separate work (§18.157).
- UnreadImage: stays a named compatibility gap with no invented effects
  (§18.155 item 6).
- RequirementAtoms: stays Unsupported until some strategy covers it
  (R0 implementation plan, "outside this plan"). The generic `show`
  policy is open (closure checklist A7).
- FX032: a defect, as above.

The only recorded costs are for adjacent work: Stage A read-back design
about 1.1M tokens (§18.154), Stage B 4.9-6.8M (§18.155), the activation
prerequisites 1.8-3.0M (activation packet). None of them lifts a cause
here.

## Repair recommendation and cost

1. Do not repair UnframedInstall or ForcedTail on their own. Together
   they cover 12 of the 15 lost programs, but every one of those 12
   also needs handler types (finding 3). On its own, either repair
   rescues no program. UnframedInstall is also a ruled hard blocker
   (D11).
2. Measure criterion 2 at the level replacement acts on. Certification
   losses understate replacement: these 16 programs are rejected by
   `decide`, and the census counts 256 accepted programs rejected the
   same way. The recommendation is that the loss ruling for live
   replacement read `decide`-level losses (the census union plus these
   lists), not certification losses alone. That is a ruling, with no
   implementation cost. Turning it into a gate check is small: the
   census and this script already compute it. About one task with
   review, roughly 0.2-0.4M tokens, plus one verify.
3. If live replacement is wanted in the foreseeable term, the first lift
   should be handler types. They block 12 of these 15 programs and 102
   census programs (35 of them blocked by nothing else). No design
   exists. The next step would be a statements-first design under the
   proof-dossier policy: generation for handler types, the validator
   obligations and the read-back, then whether UnframedInstall and
   ForcedTail can be lifted with them. No estimate is recorded. By
   analogy with the read-back's design stage (about 1.1M tokens) and its
   build (4.9-6.8M), the design alone is likely about 1-2M tokens and
   the full lift several million. That is an analogy, not an estimate.
4. Two small, independent repairs, if the author wants them before
   handler types:
   - UnreadImage. A live position for a lambda's image inside a record
     field rescues c7 and q7 (two research baseline programs). It needs
     a short read-back design and review; roughly 0.3-0.6M tokens and a
     verify round.
   - RequirementAtoms. `show` at a rigid row variable rescues the
     shipped example examples/records.wxw and the f05 shape. It first
     needs the open generic-`show` policy ruling (A7). After that, a
     strategy covering it is new machinery: compose-published-
     primitives review and an adversarial procedure review apply. Cost
     unknown until A7 is ruled.
5. Record FX032 as a defect in BACKLOG, as findings.md already says. It
   needs no repair for replacement: refusing `g` is correct.

None of these is authorized by this document. Live replacement,
milestone changes, F14's retirement and pushing stay held.
