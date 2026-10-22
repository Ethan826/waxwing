/-
Proof stream W4 (proof-plan.md, wave 2): `star` and `star-read` are
accepted at every n (`ScStar`, Cell/Scenarios.lean; `ScStarRead`,
Cell/ScenariosMore.lean). No induction on n: every atom and binding the
checker reads mentions spoke `i`, the hub and at most three flexible
variables `k n + i`, so each is discharged by a lemma about spoke `i`
alone. The queries it needs are refuted by one declaration each
(`lacks i f_i`, `lacks h f_i`, `h disjoint r_i`, W4/Query.lean); the
cover query is trivial on whole-cell pieces. W4/Atoms.lean evaluates the
six atom shapes; W4/Cert.lean has the certificates' lookups and
well-formedness; W4/Star.lean and W4/Read.lean conclude.
-/
import Composition.Typed.Cell.Proofs.W4.Star
import Composition.Typed.Cell.Proofs.W4.Read
