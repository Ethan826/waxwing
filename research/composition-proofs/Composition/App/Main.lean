/-
Scope A's integration (dossier §18.192): the dependent results
instantiated by the interface owner. `s5'` is S5′ from `s3` (S3). It
still assumes P-G0's clauses (`PG0Clauses`), which nothing here proves:
these proofs do not establish the checker's soundness.
-/
import Composition.App.Proofs.Subst
import Composition.App.Proofs.Agree
import Composition.App.Proofs.Req
import Composition.App.Proofs.Check

namespace Composition.App

theorem s5' {Label B : Type} [DecidableEq Label] :
    S5' (Label := Label) (B := B) :=
  s5'_of_s3 s3

end Composition.App
