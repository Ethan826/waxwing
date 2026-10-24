-- trusted surface: every diff needs token review; see docs/engineering.md
-- A checked-IR hole as a recorded variable (Task 4.3's read-back; moved
-- here unchanged in R0 Task 7.1 so that D1's elaboration, which may not
-- import a strategy module, reads the same encoding): hole `n` is a
-- fresh variable at a path generation never writes (`hole` is no
-- constructor field), as Features.Check.Entailed.Mgu's made rows are at
-- `entailed`.
module Domain.Recorded.Hole
  ( holeIndex
  , holeVar
  , isHole
  ) where

import Prelude
import Data.Maybe (Maybe(..), isJust)
import Domain.Recorded.Atom (Role(..), Var(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..), Step(..))

holeVar ∷ Int → Var
holeVar index = FreshVar
  (Path { root: InBody, steps: [ Named "hole", Index index ] })
  Res

isHole ∷ Var → Boolean
isHole = isJust <<< holeIndex

holeIndex ∷ Var → Maybe Int
holeIndex = case _ of
  FreshVar (Path { root: InBody, steps: [ Named "hole", Index index ] }) Res →
    Just index
  FreshVar _ _ → Nothing
  RigidVar _ → Nothing
