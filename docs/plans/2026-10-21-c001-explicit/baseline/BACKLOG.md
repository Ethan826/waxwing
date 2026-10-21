# Local baseline findings and next actions

Only this tranche owns these entries. No compiler fix or shared backlog edit
is authorized by recording them.

| ID | Status and evidence | Next action / owner |
|---|---|---|
| CB001 | Explained source-contract mismatch: p2/p3 and c1/c2/c3/c6 reject; c7/c8 accept after making both operation stages pure. FX001 specifies the suffix rule. | C001 design owner: map all-pure core arrows to explicit stage rows in future accepted syntax; no record-solver investigation |
| CB002 | Open diagnostic issue: those rejections print identical expected/found types, omitting the distinguishing rows. Exact spans/messages retained in results.json. | Compiler diagnostic owner, separately authorized: expose row differences for this small closed-record/arrow mismatch; preserve existing diagnostics until reviewed |
| CB003 | Open oracle grammar gap: c7/c8/c9 parse/check/emit/run in the compiler, but the independent interpreter parser rejects their explicit per-stage rows. | Test-oracle owner, separately authorized: add grammar coverage and assertions against these sources; do not infer an interpreter agreement today |
| CB004 | Resolved probe harness defect: an erased Checked.Program was read as a wrapper. initial-harness.json retains failures; corrected read reaches Go. | No compiler action; keep the evidence distinction |
| CB005 | Open design question: a1/a2/a4 contain type holes yet print 7 with both Int and Bool representatives; all-meta rejection is unnecessarily restrictive for these observations. | Author review of decision 2; a general rule or proof needs a separately scoped argument |
| CB006 | Accounted syntax gap: n4 rejects `*`; fixture product is bounded repeated addition. | D001/STD001 arithmetic design later; no numeric language feature in this tranche |
