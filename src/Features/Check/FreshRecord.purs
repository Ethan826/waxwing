module Features.Check.FreshRecord (Fresh, freshRecord, freshRest) where

import Prelude
import Data.Array as Array
import Data.Set as Set
import Domain.Checked.Internal (Open(..))
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.Lacks (addLacks)
import Features.Check.Scheme (State)
import Features.Check.Unify (Flex(..))

-- A record of fresh holes, one per label in the given order (the i-th
-- label's is `state.next + i`), and the state that numbers them.
type Fresh = { record ∷ Ty Open, fields ∷ Array (Ty Open), state ∷ State }

-- The record a use of these labels asks for: open over a fresh tail that
-- lacks them (`.l`, Check/Record `select`; a record pattern with `...`,
-- or one extending a hole tail), or closed (a record pattern without
-- `...` against a hole).
freshRecord ∷ State → Array String → Boolean → Fresh
freshRecord state labels open =
  { record: TRecord (recordRow (Array.zip labels fields) (tailsOf open tail))
  , fields
  , state: state
      { next = tail + 1
      , subst = addLacks (Meta tail) (lacking open labels) state.subst
      }
  }
  where
  fields = Array.mapWithIndex hole labels
  hole index _ = TVar (Hole (state.next + index))
  tail = state.next + Array.length labels

-- `{ ...ρ }`, ρ fresh and lacking `lacked`: the record a spread's hole
-- base becomes, so a later binding cannot add the literal's own labels to
-- it (R005 design §1).
freshRest ∷ State → Array String → Fresh
freshRest state lacked = fresh
  { state = fresh.state
      { subst = addLacks (Meta state.next) (Set.fromFoldable lacked)
          fresh.state.subst
      }
  }
  where
  fresh = freshRecord state [] true

tailsOf ∷ Boolean → Int → Array Open
tailsOf open tail = if open then [ Hole tail ] else []

-- A closed record has no tail, so nothing to lack.
lacking ∷ Boolean → Array String → Set.Set String
lacking open labels = if open then Set.fromFoldable labels else Set.empty
