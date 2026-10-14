module Features.Check.RowFinish
  ( Traced
  , Pending
  , Operands
  , postponed
  , finish
  , shared
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..))
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Maybe (Maybe(..), maybe')
import Domain.Row (Row(..), labelKey, openRow)
import Domain.Type (TyRow)
import Domain.Type.Parts (typeHead)
import Features.Check.Binding (bindTail, extendRow)
import Features.Check.MarkStore (RowMode)
import Features.Check.Occurrence (Sides)
import Features.Check.Origin (RowEvent(..))
import Features.Check.RowSide (Side, Tail(..), tailOf)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.UnifyMark (advanceTail, stageLabel)
import Features.Check.Subst
  ( Flex(..)
  , Subst
  , postpone
  , walk
  , resolveLabel
  , resolveRow
  )
import Features.Check.UnifyFailure (Failure(..))

-- The result of unifying two rows. `postponed`: the pair met a deferred
-- Fail key and was set aside in `subst` (which is otherwise the
-- substitution it started from), with no events.
type Traced = { subst ∷ Subst, events ∷ Array RowEvent, postponed ∷ Boolean }

-- `mode` is the mode as it now stands: a throwaway tail that was extended
-- continues as its fresh tail.
type Pending =
  { subst ∷ Subst
  , left ∷ Side
  , right ∷ Side
  , events ∷ Stack RowEvent
  , mode ∷ RowMode
  }

-- The operands as given, which failures name, resolved, and the
-- substitution before them, to which a postponed pair reverts, and the
-- mode it started in, in which it is retried.
type Operands =
  { left ∷ TyRow Flex
  , right ∷ TyRow Flex
  , start ∷ Subst
  , sides ∷ Sides
  , mode ∷ RowMode
  }

postponed ∷ Operands → Unit → Step Pending (Either Failure Traced)
postponed operands _ = Done
  ( Right
      { subst: postpone operands.start operands
      , events: []
      , postponed: true
      }
  )

-- Left-over entries must have known keys before extension or rejection.
finish
  ∷ Operands → Pending → Unit → Step Pending (Either Failure Traced)
finish operands pending _ =
  maybe' closing extra (Array.head pending.right.entries)
  where
  closing _ = Done (traced <$> unifyTails operands pending)
  traced subst =
    { subst, events: stackItems pending.events, postponed: false }
  extra first = maybe' (postponed operands) (knownExtra first)
    (labelKey (typeHead <<< walk pending.subst) first.label)
  knownExtra first _ = case tailOf pending.left.tail of
    MetaTail meta
      | tailOf pending.right.tail == MetaTail meta → Done
          (Left (shared operands pending.subst))
      | otherwise → grow meta first
          (stageLabel pending.mode meta pending.subst first.label)
    _ → Done
      ( Left
          ( RowExtra (resolveLabel pending.subst first.label)
              (resolveRow pending.subst operands.left)
              first.occurrence
          )
      )
  grow meta first staged = either (Done <<< Left)
    (Loop <<< swapped meta first)
    (extendRow staged.subst meta staged.label)
  swapped meta first made = pending
    { mode = advanceTail pending.mode meta made.fresh
    , subst = made.subst
    , left = { entries: [], next: 0, tail: Just (Meta made.fresh) }
    , right = pending.right { entries = Array.drop 1 pending.right.entries }
    , events = Push (Extended meta first.occurrence) pending.events
    }

-- Two unbound tails with no entries left. Of two metas the larger is
-- bound to the smaller, as Features.Check.Unify binds type metas.
unifyTails ∷ Operands → Pending → Either Failure Subst
unifyTails operands pending =
  case tailOf pending.left.tail, tailOf pending.right.tail of
    one, other | one == other → Right subst
    MetaTail one, MetaTail other | one < other → Right
      (bindTail subst other (openRow (Meta one)))
    MetaTail meta, _ → Right (bindTail subst meta (Row [] pending.right.tail))
    _, MetaTail meta → Right (bindTail subst meta (Row [] pending.left.tail))
    _, _ → Left
      ( RowMismatch (resolveRow subst operands.left)
          (resolveRow subst operands.right)
      )
  where
  subst = pending.subst

shared ∷ Operands → Subst → Failure
shared operands subst = RowSharedTail (resolveRow subst operands.left)
  (resolveRow subst operands.right)
