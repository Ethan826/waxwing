module Features.Check.TailWatch
  ( TailWatch
  , emptyWatch
  , watching
  , bound
  , drained
  ) where

import Prelude
import Data.Array as Array
import Data.Set (Set)
import Data.Set as Set

-- The row-tail metas the restricted registry cares about (design §3.7).
-- `watched`: tails some clause entry's row ends in; `dirty`: watched
-- tails that were bound or extended since the last `drained`. Plain
-- data, so it lives in the substitution and a postponed pair, which
-- reverts the substitution, reverts it too. This module holds the set
-- operations; Features.Check.Watch lifts them to a substitution.
type TailWatch = { watched ∷ Set Int, dirty ∷ Set Int }

emptyWatch ∷ TailWatch
emptyWatch = { watched: Set.empty, dirty: Set.empty }

watching ∷ Int → TailWatch → TailWatch
watching meta watch = watch { watched = Set.insert meta watch.watched }

-- Meta `meta` was bound or extended, and `next` is the tail that now ends
-- its row, if a meta. A watched meta turns dirty and hands its watch to
-- `next`; an unwatched one changes nothing.
bound ∷ Int → Array Int → TailWatch → TailWatch
bound meta next watch
  | Set.member meta watch.watched =
      { watched: Set.union (Set.fromFoldable next)
          (Set.delete meta watch.watched)
      , dirty: Set.insert meta watch.dirty
      }
  | otherwise = watch

-- The dirty metas, ascending, and the watch with none dirty.
drained ∷ TailWatch → { dirty ∷ Array Int, watch ∷ TailWatch }
drained watch =
  { dirty: Array.fromFoldable watch.dirty
  , watch: watch { dirty = Set.empty }
  }
