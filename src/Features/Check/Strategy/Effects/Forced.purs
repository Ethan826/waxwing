-- trusted surface: every diff needs token review; see docs/engineering.md
-- The forced tails F (A2 spec §2.3): at a function use p whose result is
-- a handler type with an owned ResultC, C's tail `⟨p, result clauses⟩`
-- (minted by Generate/Owned.purs `resultClauses`), each paired with R's
-- tail variable in the same result, the source whose image completion
-- copies into it (spec §2.4 (ii)). A package never binds F (spec §3).
module Features.Check.Strategy.Effects.Forced
  ( Forced
  , forcedTails
  ) where

import Prelude
import Data.Array (mapMaybe)
import Data.Map (toUnfoldable)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect (ERole(..), EVar(..), InstanceSig, MTy(..))
import Domain.Recorded.Origin (Path)

type Forced = { forced ∷ EVar, source ∷ EVar }

-- In instance-path order. A closed R gives a closed C (Owned.purs
-- `copied`), so it forces nothing.
forcedTails ∷ RecordedProblem → Array Forced
forcedTails problem =
  mapMaybe forcedAt (toUnfoldable (fields problem).effects.instances)

forcedAt ∷ Tuple Path InstanceSig → Maybe Forced
forcedAt (Tuple path sig) = case sig.result of
  MHandler _
    { inference: { tail: Just source }
    , clauses: Just { tail: Just forced }
    }
    | forced == EffFresh path ResultClauses → Just { forced, source }
  _ → Nothing
