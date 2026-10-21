# Local baseline findings and next actions

Only this tranche owns these entries. No compiler fix or shared backlog edit
is authorized by recording them.

| ID | Status and evidence | Next action / owner |
|---|---|---|
| CB001 | Explained source-contract mismatch: p2/p3 and c1/c2/c3/c6 reject; c7/c8 accept after making both operation stages pure. FX001 specifies the suffix rule. | C001 design owner: map all-pure core arrows to explicit stage rows in future accepted syntax; no record-solver investigation |
| CB002 | Open diagnostic issue: those rejections print identical expected/found types, omitting the distinguishing rows. Exact spans/messages retained in results.json. | Compiler diagnostic owner, separately authorized: expose row differences for this small closed-record/arrow mismatch; preserve existing diagnostics until reviewed |
| CB003 | Open oracle grammar gap: c7/c8/c9 parse/check/emit/run in the compiler, but the independent interpreter parser rejects their explicit per-stage rows. | Test-oracle owner, separately authorized: add grammar coverage and assertions against these sources; do not infer an interpreter agreement today |
| CB004 | Resolved probe harness defect: an erased Checked.Program was read as a wrapper. initial-harness.json retains failures; corrected read reaches Go. | No compiler action; keep the evidence distinction |
| CB005 | Open design question: a1/a2/a4 establish acceptance of discarded unknown values only. h1/h2 reject the function stand-in under printing. These do not establish arbitrary stand-in independence. | Author review of decision 2; a general rule or proof needs a separately scoped argument |
| CB006 | Accounted syntax gap: n4 rejects `*`; fixture product is bounded repeated addition. | D001/STD001 arithmetic design later; no numeric language feature in this tranche |
| CB007 | Resolved runner limitation: known contract and parser failures now have exact current-outcome expectations; compiler, Go and interpreter outcomes remain distinct. Eight result-record mutations fail the replay gate. | Preserve this distinction when updating baseline expectations; no source/compiler mutation coverage claimed |
| CB008 | Recorded property failure: h1/h2 print Nil with Int/Bool/Text/record stand-ins but fail specialization printability with Function. h3 rejects ambiguous comparison. | Future assurance/ambiguity design must define admissible stand-ins and type-sensitive operations; no proof or compiler fix authorized |

The separate [effects-syntax note](../effects-syntax-usability.md) brings
the broader usability issue to the author. It selects no syntax or compiler
change and does not edit another owner's tracking files.
