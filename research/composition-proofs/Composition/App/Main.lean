/-
Scope A's integration (dossier §18.192): the dependent results
instantiated by the interface owner. `s5'` is S5′ from `s3` (S3). It
assumes `PG0Clauses`, lemma-level clauses of G0's check that nothing
here proves and that P-G0 as currently stated does not imply (design
§16.2): these proofs do not establish the checker's soundness.
`s5'c` (Proofs/Canon.lean, from `s3` and `s9`) carries the same
assumption.
-/
import Composition.App.Proofs.Subst
import Composition.App.Proofs.Agree
import Composition.App.Proofs.Req
import Composition.App.Proofs.Check
import Composition.App.Proofs.Canon

namespace Composition.App

theorem s5' {Label B : Type} [DecidableEq Label] :
    S5' (Label := Label) (B := B) :=
  s5'_of_s3 s3

end Composition.App
