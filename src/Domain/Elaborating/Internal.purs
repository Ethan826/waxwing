-- trusted surface: every diff needs token review; see docs/engineering.md
-- D1's `Elaborating` (docs/plans/r0-generation-continuation.md §3.4;
-- R0 Task 7.1), with its constructor. A record alias could be built
-- anywhere with any `build`, a read that escapes tracking (§11.2 S2), so
-- the constructor stays here: only Domain.Elaborating,
-- Domain.Elaborating.Build and Features.Check.Generate.Elab (`seal`)
-- import this module (rule E2, scripts/structure-modules.mjs).
module Domain.Elaborating.Internal (Elaborating(..)) where

import Data.Either (Either)
import Data.Map (Map)
import Data.Set (Set)
import Domain.Elaborating.Types (ElabFault, Use)
import Domain.Recorded (RecordedProblem)
import Domain.Recorded.Atom (CheckedName, RTExpr, Var)
import Domain.Verdict.Witness (Witness)

-- `fresh`: writes per variable, counted from the `vars` log; `sites`:
-- each site's recorded type, the last write (it matters only when
-- `siteCounts` already shows a duplicate). No Functor instance and no
-- map-like function (§3.1): mapping solver state into `build` would read
-- outside tracking.
newtype Elaborating a = Elaborating
  { problem ∷ RecordedProblem
  , uses ∷ Set Use
  , fresh ∷ Map Var Int
  , sites ∷ Map CheckedName RTExpr
  , siteCounts ∷ Map CheckedName Int
  , build ∷ Witness → Either ElabFault a
  }
