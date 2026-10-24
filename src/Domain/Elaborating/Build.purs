-- The one accessor that reads a witness (D1 spec §3.4; R0 Task 7.1).
-- Only Features.Check.Elaborate imports it (rule E1), so no caller
-- skips `elaborate`'s checks: seal, problem identity, Cov.
module Domain.Elaborating.Build (build) where

import Data.Either (Either)
import Domain.Elaborating.Internal (Elaborating(..))
import Domain.Elaborating.Types (ElabFault)
import Domain.Verdict.Witness (Witness)

build ∷ ∀ a. Elaborating a → Witness → Either ElabFault a
build (Elaborating elaborating) = elaborating.build
