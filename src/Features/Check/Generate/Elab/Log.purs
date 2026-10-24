-- An append-only log with constant-time append: a join list, the reified
-- form of Hughes's difference lists (A Novel Representation of Lists,
-- IPL 1986). D1's `Gen` (R0 Task 7.1) appends its parts at every bind,
-- and an array append per bind would cost quadratic time over a
-- declaration of thousands of nodes; `entries` reads the log once, in
-- order, by a loop over an explicit stack, so a deep log does not
-- recurse.
module Features.Check.Generate.Elab.Log
  ( Log
  , entries
  , none
  , one
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (class Foldable, foldMapDefaultL)

data Log a = None | One a | Join (Log a) (Log a)

-- A stack, the loop's own data: the logs still to read, and the entries
-- read so far, newest on top.
data Stack a = Empty | Push a (Stack a)

-- The entries newest first; `foldr` over them from the top is the
-- entries' right fold, so the loop below gives `Array.fromFoldable` the
-- order they were written in.
newtype Newest a = Newest (Stack a)

instance semigroupLog ∷ Semigroup (Log a) where
  append = Join

instance foldableNewest ∷ Foldable Newest where
  foldr step start (Newest stack) = tailRec folded { stack, done: start }
    where
    folded state = case state.stack of
      Empty → Done state.done
      Push entry rest → Loop { stack: rest, done: step entry state.done }
  foldl step start newest = Array.foldl step start (Array.fromFoldable newest)
  foldMap = foldMapDefaultL

none ∷ ∀ a. Log a
none = None

one ∷ ∀ a. a → Log a
one = One

entries ∷ ∀ a. Log a → Array a
entries log = Array.fromFoldable (Newest (tailRec read start))
  where
  start = { pending: Push log Empty, seen: Empty }
  read state = case state.pending of
    Empty → Done state.seen
    Push None rest → Loop state { pending = rest }
    Push (One entry) rest → Loop
      { pending: rest, seen: Push entry state.seen }
    Push (Join left right) rest → Loop
      state { pending = Push left (Push right rest) }
