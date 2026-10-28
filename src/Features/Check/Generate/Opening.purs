-- trusted surface: every diff needs token review; see docs/engineering.md
-- What a declaration use opens (amin tranche 1, Task 18, BACKLOG R033),
-- as the live checker does, read from its rules and never called (T10).
-- `openedRow` is Check/Stages.purs `openedRow`, applied by
-- Check/DeclarationUse.purs to every function, constructor and
-- operation use: a closed own row gets a fresh tail, here `⟨p, opened⟩`;
-- a row with a tail is kept. `openedHandlers` is Check/MarkUse.purs
-- `openHandlers`, at function uses only: a top-level parameter that is a
-- handler type whose user-effect label is written M, and the result when
-- it is one whose label is written N, each get a position of their own,
-- `Opened p i` (i the parameter's index, the parameter count for the
-- result). Console and Fail labels (always N, never user effects),
-- labels nested deeper and marks instantiated from a variable stay.
-- Opening the instance is enough to open the reference's and a partial
-- application's stages: they read the instance's rows and types.
module Features.Check.Generate.Opening
  ( openedHandlers
  , openedRow
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , Fixed(..)
  , InstanceSig
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  )
import Domain.Recorded.Origin (Path)
import Domain.Row (EffectRef(..))

openedRow ∷ Path → InstanceSig → InstanceSig
openedRow path sig = sig { row = opened sig.row }
  where
  opened row = row { tail = Just (maybe fresh identity row.tail) }
  fresh = EffFresh path OpenedRow

openedHandlers ∷ Path → InstanceSig → InstanceSig
openedHandlers path sig = sig
  { parameters = Array.mapWithIndex (openAs FixedM) sig.parameters
  , result = openAs FixedN count sig.result
  }
  where
  count = Array.length sig.parameters
  openAs written index = case _ of
    MHandler label rows
      | isUser label.effect && label.mark == Written written →
          MHandler (label { mark = At (Opened path index) }) rows
    other → other

isUser ∷ EffectRef → Boolean
isUser = case _ of
  UserEffect _ → true
  _ → false
