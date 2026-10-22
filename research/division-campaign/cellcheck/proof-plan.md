# Cell checker: first soundness tranche, parallel proof plan

Authorized by the author in dossier §18.54, after a targeted re-review
of the fixes in statements.md §10. The re-review (§10.3) found nothing
blocking and changed no statement; its N1 adds QX3's soundness
direction to stream C as a lemma. Statements
only change through the coordinator.

## Interface

The statement files are fixed: Format, Query, Check, Statements,
Exact, Scenarios, ScenariosMore under
research/composition-proofs/Composition/Typed/Cell/. No stream edits
them. A stream that finds a statement false or missing an assumption
stops and reports it with a counterexample; it never weakens a
statement or works around it.

Dependent results are proved from the other streams' statements as
hypotheses (`foo_of : Bar → Baz → Foo`), so every stream starts at
once. Integration instantiates the hypotheses. The hypothesis sets
below are fixed in advance so the dependency graph has no cycle.

## Streams

Each stream: its own worktree from `main`, its own file
`Cell/Proofs/<Stream>.lean`, helpers in namespace
`Composition.Typed.Cells.Proofs<Stream>`. No `sorry`, `admit` or new
`axiom`; `#print axioms` on every headline result.

| Stream | Proves | May assume (statements as hypotheses) |
|---|---|---|
| A, instantiation | CI2 `CInstFin`, CI1 `PieceIsSubRow` | none |
| B, syntax | CD1 `DupRefused`, CD4 `EqBothSides`, CB1 `BodyAll`, CB4 `EvalWf`, `cellCheck → certOkC` | none |
| C, queries | CV2 `ImplSound` (with QX3's → and QX2's ← as lemmas), CD2 `ApartSound`, CB3 `EqSound` | none (CD2, CB3 take `QSound` as their own premise) |
| D, coverage | CV1 `CoverFree`, CG `FragmentIff` | none |
| E, evaluator | CI3 `EvalCommutes`, CD3 `EvalDefined` | CI1, CD1, CD2, CB3, CB4 |
| F, assembly | CB2 `AtomSound`, CM `CellSound`, `CellOpen`, `CellOpenImpl` | CI2, CI3, CD3, CD4, CB1, CB3, CB4, CV1, CV2, CG, `cellCheck → certOkC`; B5 and the bridge as proved |
| G, premise checks | `ScRoute` (concrete `route` acceptance), `CellShapeNeeded` | none |

Seven streams in parallel. Expected critical path: E (structural
induction over the evaluator), then integration. F is short once the
hypotheses are pinned; if it finishes early it also checks that its
hypothesis set is exactly what CM needs and reports any surplus.

## Integration and review

The coordinator merges the stream files (renaming helper clashes in
one file), instantiates every `_of`, runs one clean build, regenerates
axioms.out, and checks the intended cases inhabit the premises (the
`route` instance satisfies CM's premises; `CellShapeNeeded` is not
vacuous). Then two independent reviews in parallel: one of the
integrated proofs and premises (soundness: is anything vacuous or
weaker than stated), one of the claims against §18.54's scope.

## Later, not in this tranche

QX3, QR1-QR5 (query exactness), QX4 and `CheckTautology`, the other
scenario families, CI4/CI4′/CI4″/CI5. They can run as a second parallel
wave against the same interface. No polynomial coverage claim, source
translation or compiler work.

## Status (2026-10-21)

All seven streams proved their targets with no statement changed and
no false statement found; integrated and instantiated (Main.lean,
axioms.out; dossier §18.56). Hypotheses actually used: E needs only
CI1 and CD2; F's CM needs CB2, CI2, CB1 and `cellCheck_certOk` (CD3,
CD4 surplus). Worktree-isolation guard refusals of compound shell
commands (streams B, C, D, E, F, G, and the split agents) were followed
by the remedy each refusal prescribed (separate plain commands, or the
same command from the worktree without the redirect); none was a
permission denial. Both reviews done, corrections applied (dossier
§18.56); the author's acceptance pending.

## Wave 2 (authorized 2026-10-21, dossier §18.57)

Same interface rules as wave 1: statement files fixed (now including
Refutations.lean), one file per stream under
`Cell/Proofs/W<n>/` or `Cell/Proofs/W<n>.lean`, helpers in
`Composition.Typed.Cells.ProofsW<n>`, no `sorry`/`admit`/`axiom`/
`native_decide`, at most 250 lines per file, and a false statement
stops that target with a counterexample. Wave-1 theorems may be used
freely (notably `cellOpenImpl`: a problem that is not `ValidOpen` is
refused by every certificate).

| Stream | Proves | May assume |
|---|---|---|
| W1, computational exactness | QX1 `FreeSIff`, QX2 `CellPossExact`, QX3 `CoverExact` | none |
| W2, region exactness, labels | QR1 `PossWExact`, QR2 `PossBothExact`, QR5 `RegionTrivialities` | none |
| W3, region exactness, cells | QR3 `CellBothExact`, QR4 `CoverRegionExact` | QX2, QX3 |
| W4, `star` | `ScStar` (every n), `ScStarRead` (every n) | none |
| W5, `star` controls | `ScStarUnlacked`, `ScStarUndeclared`, `ScStarCross` | none |
| W6, families | `ScDep`, `ScDivide3`, `ScIntArm`, `ScSplitSig`, `ScSelfDisjoint`, `ScBroken`, `ScCertRefusals` | none |
| W7, controls and guards | `ScShapeSplit`, `ScSplitFree`, `ScOutsideFragment`, `ScDivide5`; `¬ CellSoundNoShape`, `¬ EvalDefinedNoShape` | none |
| W8, representation | CI4 `ProjPieceDen`, CI4′ `ProjGuardRefused`, CI4″ `SchPieceDen`, CI5 `DeclaredIsNoCommonCell` | none |
| W9, tautology (independent) | QX4 `CoverTautology`, `CheckTautology` | QX3 |

`ScDivide5`'s `ValidOpen` conjunct was argued, never checked (§18.47);
if it fails, W7 reports it. Integration as in wave 1: one build,
instantiation, axioms.out extended, then two independent reviews.

### Wave 2 status (2026-10-21)

All nine streams proved their targets; no stream found a false
statement. W3 and W9, written against QX2 and QX3 as hypotheses, are
instantiated with W1's results in Proofs/Wave2.lean; axioms.out lists
55 theorems, wave 1's 23 lines unchanged (dossier §18.58).
`ScDivide5`'s `ValidOpen` conjunct, previously only argued (§18.47),
holds for every list (`d5_open`); with `d5_refused` it shows the
checker incomplete on the fragment. Every stream met worktree-isolation
guard refusals of compound shell commands; each was followed by the
remedy the refusal prescribed (separate plain commands, or the same
command from the worktree without the redirect); none was a permission
denial. Both reviews done, corrections applied; the author's acceptance
pending.
