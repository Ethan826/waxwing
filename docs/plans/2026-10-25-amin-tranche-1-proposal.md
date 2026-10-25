# a-min implementation, tranche 1: generation records the effect problem (proposal, 2026-10-25)

Status: **scope accepted by the author (dossier §18.96) with
conditions carried into docs/plans/2026-10-25-amin-tranche-1-plan.md;
implementation not authorized.**
Written after the author approved the a-min statements as a
representation (revision 3.6 with §R7 corrections and §R7b, 535b780;
dossier §18.95). Closure checklist rows: A1 (implementation half),
path 2 steps 2b and 2d.

## In plain terms

**Milestone this works toward:** milestone 2, the new checker builds
complete typed programs. Milestone 1 (an approved way to preserve and
check effects) has its representation approved; its checking half
needs the trusted validator (A2), which is not in this tranche.

**What becomes possible:** the shadow generator writes down, for every
declaration, the full effect problem the statements describe: marked
types, the owned clause rows (Cs) at uses and annotations, and the
obligations E1-E12 at their sites. Today it records none of this, so
nothing downstream can check effects. After this tranche the problem
exists and is tested against the statements' generation-side
predictions; checking it is tranche 2.

**What still blocks milestone 2 afterwards:** A2's algorithm choice
and the validator itself (`certify`'s step (c)), the read-back that
proposes marks and sites, I3's package checks, and the solved-form
check extended to effect rows (U8's extension). Then A3's full
equality at post-Strip with rows.

**What a user sees:** nothing. Generation is unreachable from live
compilation: test/r0-verdict.test.mjs walks the module graph from
Program.Main and finds no generation, checking or strategy module
(corrected 2026-10-25 after the author's review: the generator is
imported by Decide/Shadow.purs and Strategy/Online.purs, both shadow;
an earlier wording said "only through Decide/Shadow"). The recorded
problem's data types are reachable as types. The plan names which
checks compare live acceptance, first diagnostics and generated Go,
and what each leaves out.

## In the tranche, exactly these tasks

| Task | What it delivers | Statements |
|---|---|---|
| T1 | Types: `Obligation` (E1-E12 constructors and `Unsupported Kind`), marked types on recorded sides, `Fields += obligations, instances, annotations, rigidMarks, arities, effectRigids, ambient rows`, `SiteFact += Instantiated, Annotation`, `Unsupport += EffectsUnchecked`; `CheckRefusal += Malformed, ObligationFailed` as types only | §10 |
| T2 | Generation records `instances` (each use's instantiated marked signature; a top-level handler result carries its ResultC, tail by H′) and `annotations` (each local annotation's MTy; every handler type not inside another's rows owns a C with a fresh tail); Console labels recorded as N | §2 "What generation records", E4′ |
| T3 | Generation records obligations E1-E12 at every site §4 and §13 list, O1 and O2 included, and E11's ambient rows; FX032's operation `with` rows recorded as `Unsupported` | §4, §9, §13 |
| T4 | Decide's rule 1 blocks a declaration carrying `Unsupported` with `EffectsUnchecked kinds`; an acceptance is suppressed to Unresolved, never Solved | §7 routing |
| T5 | R031's two option-c defects fixed in `build`; the pins in test/r0-r031.test.mjs rewritten to today's form | BACKLOG R031; §12.2 R031 row |
| T6 | A bounded coverage test: for each §13 rule, one fixture whose recorded problem holds the named obligation at the expected site | §13 (U6) |
| T7 | Census and window table rerun; every moved row listed (predicted: FX032-shaped declarations move to `EffectsUnchecked`) | A6, A8 inputs |

Order: T1; T2 and T5 (independent); T3; T4; T6; T7.

**Handler constructs stay blocked.** Every handler type, literal and
`with` still emits `Outside HandlerType`, so G0 keeps refusing those
declarations. Removing the markers before a validator exists would let
G0 accept effect facts nobody checks. They go in the tranche that adds
the validator.

## Not in the tranche

The validator (`validateEffects`) and A2's algorithm, which is the
author's choice; the read-back producing marked packages; I3; the
"always R's tail" forcing (validator side, E4′); U8's extension to
effect rows; removing `Outside` markers; G-D1's closure record; Task
4.6; A5-A11; the five effect-contract decisions; FX010; any proof.

## Acceptance

- `npm run verify` exit 0 at the tranche's head. Live acceptance and
  first diagnostics unchanged, and so is generated Go.
- §12.2's generation-side rows pass as fixtures: the five `ownClauses`
  tail cases (a parameter, the callee's row, the result outside R's
  tail as in FX033's x1, R's tail only, R closed: recorded tail R's,
  R's, R's, `⟨p, result clauses⟩`, closed); an annotation C below the
  top (F6); Console as N (T3-e); FX032 routed to `EffectsUnchecked`;
  R031's pins flipped.
- T6 passes, and each §13 rule with no fixture is listed with a reason.
- Every new test is shown failing with its defect restored, in an
  isolated copy (regression proofs).
- Effect-erased T2 pins unchanged (unrun prediction: R031 changes rows
  T2 erases). Any pin, census or window move is listed and explained.

## Review focus and distinguishing examples

- H′'s occurs rule: x1 (the variable occurs in the result outside R's
  tail: R's tail) against r1 (it occurs only as R's tail: fresh).
  Mixing them up is FX033.
- The annotation C's tail is fresh even when R is closed or rigid (F6).
- O1 and O2 are recorded as E1s; without them §12.1's forged packages
  pass (equations.mjs shows this for the hand-translated graphs).
- Generation reads no checker state (§2, "No unrecorded checker
  state"): a structure test that the generator imports none.

## Risks

- `Fields` grows, and problem identity (`elaborate`'s seal) covers it,
  so sealed identities and pins may move. Each move gets listed.
- Generation modules are near the 250-line limit; T2 and T3 split
  responsibilities rather than enlarge files.
- A defect in today's search found here is recorded (findings.md,
  BACKLOG.md, with evidence), not fixed: fixing it changes acceptance.
  The R0 plan's rule for defects found inside a tranche applies.

## How it would run, and cost

After authorization: an implementation plan with exact files, tests
and commits (implementation-planning), one review of that plan, then
execution. Subagent or inline is chosen at the plan's handoff. Rough
cost (a guess): 1-2M tokens and two or three verify runs, one at a
time under the verify lock.

## Decisions for the author

1. Authorize tranche 1 as scoped above, or amend it.
2. Draft A2's decision note (algorithm, published source, fidelity;
   path 2c) alongside, for your choice. Docs only, and not a choice.
   Yes or no.
