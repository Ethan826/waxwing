module Features.Check.FlatRecord (Flat, flatten, failHead) where

import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe)
import Data.Tuple (Tuple)
import Domain.Row (TypeHead)
import Domain.Type (Ty(..))
import Domain.Type.Parts (typeHead)
import Domain.Type.Record (RecordRow, recordRow)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.Subst (Flex, Subst, walk)

-- A record row with its tails' bindings spliced in: its fields, sorted,
-- and its tails, sorted, each closed off as rigid or an unbound meta (a
-- closed row has none).
type Flat = { fields ∷ Array (Tuple String (Ty Flex)), tails ∷ Array Flex }

-- By a loop with two stacks, so a chain of bound tails of any length costs
-- no stack: the tails still to follow, and those that ended. Each bound
-- tail is a record whose fields join and whose tails are followed in turn.
flatten ∷ Subst → RecordRow (Ty Flex) Flex → Flat
flatten subst row = tailRec step
  { chunks: Push row.fields Bottom
  , waiting: pushed row.tails Bottom
  , ended: Bottom
  }
  where
  step pending = case pending.waiting of
    Bottom → Done (joined pending.chunks pending.ended)
    Push tail below → followed pending below tail
  followed pending below tail = case walk subst (TVar tail) of
    TRecord more → Loop
      { chunks: Push more.fields pending.chunks
      , waiting: pushed more.tails below
      , ended: pending.ended
      }
    TVar found → Loop
      (pending { waiting = below, ended = Push found pending.ended })
    _ → Loop (pending { waiting = below, ended = Push tail pending.ended })
  pushed tails below = Array.foldr Push below tails
  joined chunks ended = recordRow (Array.concat (stackItems chunks))
    (stackItems ended)

-- The family a Fail payload is keyed by under `subst` (R001 design §3a):
-- the declared head of the type its outer metas lead to, and for a record
-- its labels once its tail, followed through its bindings, is closed. A
-- record still ending in a variable has none yet: its key is deferred.
failHead ∷ Subst → Ty Flex → Maybe TypeHead
failHead subst ty = case walk subst ty of
  TRecord row → typeHead (TRecord (flatten subst row))
  walked → typeHead walked
