# Cell checker: first soundness tranche, parallel proof plan

Authorized by the author in dossier §18.54, after a targeted re-review
of the fixes in statements.md §10. Launch waits for that re-review; any
statement it changes is fixed here before streams start. Statements
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
| C, queries | CV2 `ImplSound`, CD2 `ApartSound`, CB3 `EqSound` | none (CD2, CB3 take `QSound` as their own premise) |
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
