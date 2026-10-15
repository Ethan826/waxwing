module Features.Check.FlatRecord (Flat, flatten, failHead) where

import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (Tuple)
import Domain.Row (TypeHead)
import Domain.Type (Ty(..))
import Domain.Type.Parts (typeHead)
import Domain.Type.Record (RecordRow, recordRow)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.Subst (Flex, Subst, walk)

-- A record row with its tail's bindings spliced in: its fields, sorted,
-- and a tail that is closed, rigid or an unbound meta.
type Flat = { fields ∷ Array (Tuple String (Ty Flex)), tail ∷ Maybe Flex }

-- By a loop: each bound tail is a record whose fields join and whose tail
-- is followed in turn.
flatten ∷ Subst → RecordRow (Ty Flex) Flex → Flat
flatten subst row = tailRec step
  { chunks: Push row.fields Bottom, tail: row.tail }
  where
  step pending = maybe' (ended pending) (followed pending) pending.tail
  ended pending _ = Done (joined pending.chunks Nothing)
  followed pending tail = case walk subst (TVar tail) of
    TRecord more → Loop
      { chunks: Push more.fields pending.chunks, tail: more.tail }
    TVar found → Done (joined pending.chunks (Just found))
    _ → Done (joined pending.chunks (Just tail))
  joined chunks tail = recordRow (Array.concat (stackItems chunks)) tail

-- The family a Fail payload is keyed by under `subst` (R001 design §3a):
-- the declared head of the type its outer metas lead to, and for a record
-- its labels once its tail, followed through its bindings, is closed. A
-- record still ending in a variable has none yet: its key is deferred.
failHead ∷ Subst → Ty Flex → Maybe TypeHead
failHead subst ty = case walk subst ty of
  TRecord row → typeHead (TRecord (flatten subst row))
  walked → typeHead walked
