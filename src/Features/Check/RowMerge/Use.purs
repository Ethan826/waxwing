module Features.Check.RowMerge.Use
  ( Made
  , desugaredUse
  , desugaredTypes
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (mapAccumL)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Syntax (Span, TypeRef)
import Domain.Type (Ty)
import Features.Check.DeclarationUse (Use)
import Features.Check.OriginStore (onOrigins, originsOf)
import Features.Check.PartOrigin (OwnerKind, occurrencesFrom, owned)
import Features.Check.RowMerge.Desugar (desugaredType, severalUnknownBy)
import Features.Check.RowMerge.Occurrence (nextPredicate)
import Features.Check.Scheme (State, Threaded, flexible, opened)
import Features.Check.Subst (Subst)
import Features.Check.WrittenRef (refAt)

-- How a declaration's use was made: its span, each supplied argument's
-- span, and its owner (diagnostics R1): the declaration's name, how it
-- is used, its variables, and its written parameter types then result's,
-- as far as the source writes them.
type Made =
  { site ∷ Span
  , arguments ∷ Array Span
  , name ∷ String
  , kind ∷ OwnerKind
  , variables ∷ Array String
  , syntax ∷ Array TypeRef
  }

-- A use's instantiated parameters and result with every row of two
-- unknown tails desugared (R005 Tranche B plan §2.1). A predicate made
-- from a supplied parameter's row is located at that argument, one from
-- the result or an unsupplied parameter at the use (T6, plan §10
-- decision 21); a nested predicate has its row's location (T3). Each
-- occurrence is given its owner (diagnostic metadata, which no rule
-- reads).
desugaredUse ∷ Made → Threaded Use → Threaded Use
desugaredUse made use =
  { value: use.value
      { fields = fields.value, result = result.value, written = made.syntax }
  , state: use.state { subst = result.accum }
  }
  where
  count = Array.length use.value.fields
  fields = mapAccumL (parameterAt made use.value.scheme.base)
    use.state.subst
    (Array.mapWithIndex Tuple use.value.fields)
  result = ownedType made use.value.scheme.base count made.site
    fields.accum
    use.value.result

-- Types made at one use, desugared in order, threading the state.
desugaredTypes
  ∷ Span → State → Array (Ty Open) → Threaded (Array (Ty Open))
desugaredTypes span state types =
  { value: found.value, state: state { subst = found.accum } }
  where
  found = mapAccumL (typeAt span) state.subst types

parameterAt
  ∷ Made
  → Int
  → Subst
  → Tuple Int (Ty Open)
  → { accum ∷ Subst, value ∷ Ty Open }
parameterAt made base subst (Tuple index ty) =
  ownedType made base index site subst ty
  where
  site = maybe made.site identity (Array.index made.arguments index)

-- One type of the use desugared at `site`, each occurrence it made given
-- its owner; `index` is the type's place among the written ones.
ownedType
  ∷ Made
  → Int
  → Int
  → Span
  → Subst
  → Ty Open
  → { accum ∷ Subst, value ∷ Ty Open }
ownedType made base index site subst ty =
  { accum:
      if nextPredicate found.accum == first then found.accum
      else foldl withOwner found.accum
        (occurrencesFrom first (originsOf found.accum))
  , value: found.value
  }
  where
  first = nextPredicate subst
  found = typeAt site subst ty
  withOwner reached (Tuple key occurrence) =
    onOrigins (owned key (ownerOf occurrence)) reached
  ownerOf occurrence =
    { name: made.name
    , kind: made.kind
    , names: Map.fromFoldable (Array.mapWithIndex (nameAt base) made.variables)
    , written: writtenAt occurrence
    }
  writtenAt occurrence = Array.index made.syntax index
    >>= flip refAt occurrence.steps

nameAt ∷ Int → Int → String → Tuple Int String
nameAt base index name = Tuple (base + index) name

typeAt ∷ Span → Subst → Ty Open → { accum ∷ Subst, value ∷ Ty Open }
typeAt span subst ty =
  if severalUnknownBy isHole ty then
    { accum: made.subst, value: opened made.ty }
  else { accum: subst, value: ty }
  where
  made = desugaredType (Just span) (flexible ty) subst

isHole ∷ Open → Boolean
isHole = case _ of
  Hole _ → true
  _ → false
