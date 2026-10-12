module Features.Check.Watch
  ( module Features.Check.TailWatch
  , watchTail
  , watchedTails
  , noteBound
  , takeDirty
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe)
import Features.Check.Subst (Flex, Subst(..), metaOf)
import Features.Check.TailWatch
  ( TailWatch
  , bound
  , drained
  , emptyWatch
  , watching
  )

-- Row meta `meta` is watched from now on. The registry watches the tail
-- of every clause entry's row (Features.Check.Restricted).
watchTail ∷ Int → Subst → Subst
watchTail meta (Subst bindings) =
  Subst bindings { watch = watching meta bindings.watch }

watchedTails ∷ Subst → Array Int
watchedTails (Subst bindings) = Array.fromFoldable bindings.watch.watched

-- Binding or extending the row meta `meta`, whose row now ends in `tail`
-- (Features.Check.Binding calls this): `meta` turns dirty if watched and
-- the watch moves to `tail`, when that is a meta.
noteBound ∷ Int → Maybe Flex → Subst → Subst
noteBound meta tail (Subst bindings) = Subst bindings
  { watch = bound meta (Array.fromFoldable (metaOf =<< tail)) bindings.watch }

-- The tails that turned dirty since the last call, ascending, and the
-- substitution with none dirty.
takeDirty ∷ Subst → { dirty ∷ Array Int, subst ∷ Subst }
takeDirty (Subst bindings) = { dirty: taken.dirty, subst: cleared taken.watch }
  where
  taken = drained bindings.watch
  cleared watch = Subst bindings { watch = watch }
