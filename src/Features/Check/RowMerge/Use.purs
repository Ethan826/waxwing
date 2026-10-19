module Features.Check.RowMerge.Use (desugaredUse, desugaredTypes) where

import Data.Maybe (Maybe(..))
import Data.Traversable (mapAccumL)
import Domain.Checked.Internal (Open(..))
import Domain.Syntax (Span)
import Domain.Type (Ty)
import Features.Check.DeclarationUse (Use)
import Features.Check.RowMerge.Desugar (desugaredType, severalUnknownBy)
import Features.Check.Scheme (State, Threaded, flexible, opened)
import Features.Check.Subst (Subst)

-- A use's instantiated parameters and result with every row of two
-- unknown tails desugared (R005 Tranche B plan §2.1), each predicate's
-- site the use's span (T3: a nested predicate's site is the use's).
desugaredUse ∷ Span → Threaded Use → Threaded Use
desugaredUse span use =
  { value: use.value
      { fields = types.value.fields, result = types.value.result }
  , state: types.state
  }
  where
  types = withResult (desugaredTypes span use.state use.value.fields)
  withResult found = finish found.value
    (desugaredTypes span found.state [ use.value.result ])
  finish fields found =
    { value: { fields, result: firstOf use.value.result found.value }
    , state: found.state
    }

-- Types made at one use, desugared in order, threading the state.
desugaredTypes
  ∷ Span → State → Array (Ty Open) → Threaded (Array (Ty Open))
desugaredTypes span state types =
  { value: found.value, state: state { subst = found.accum } }
  where
  found = mapAccumL (typeAt span) state.subst types

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

firstOf ∷ Ty Open → Array (Ty Open) → Ty Open
firstOf fallback = case _ of
  [ ty ] → ty
  _ → fallback
