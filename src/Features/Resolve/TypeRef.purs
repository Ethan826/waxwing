module Features.Resolve.TypeRef (resolveTypeWith) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), isJust, maybe')
import Data.Traversable (traverse)
import Data.Foldable (traverse_)
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..), UnboundKind(..))
import Domain.Syntax as Syntax
import Domain.Resolved as Resolved
import Domain.Row (uniformRows)
import Domain.Type.Record (recordRow)
import Features.Resolve.Marks (arrowRows)
import Features.Resolve.Row (label, resolveRow)
import Features.Resolve.HandlerType as HandlerType
import Features.Resolve.RecordFields
  ( repeatedField
  , repeatedLabel
  , repeatedTail
  )
import Features.Resolve.TypeArguments (appliedTo)
import Features.Check.ResolvedName (resolvedName)
import Features.Resolve.TypeIndices (Indexed, indexOf)

-- `variables` are those in scope: `VarId i` is the i-th. A declared type
-- takes exactly as many arguments as it has parameters, else E_ARITY at the
-- whole reference, which is checked before its arguments. A name is looked
-- up in `known.typeIndices`, not scanned for (R014).
resolveTypeWith
  ∷ ∀ r
  . Indexed r
  → Array { name ∷ String, arity ∷ Int }
  → Array String
  → Maybe Resolved.VarId
  → Syntax.TypeRef
  → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)
resolveTypeWith known effects variables ambient = resolved
  where
  -- A label's arguments have no ambient row, in a signature as in a field
  -- or an operation: an unannotated arrow or a bare `Handler(L)` there is
  -- `pure` (FX024). The ambient row is also the tail of the row the label
  -- stands in, which a caller's other labels extend, so a payload sharing
  -- it would have to name the caller's whole row.
  bare reference = resolveTypeWith known effects variables Nothing reference
  resolved = case _ of
    Syntax.IntRef _ → pure Resolved.TInt
    Syntax.BoolRef _ → pure Resolved.TBool
    Syntax.UnitRef _ → pure Resolved.TUnit
    Syntax.TextRef _ → pure Resolved.TText
    Syntax.VarRef span name → maybe' (unbound UnboundTypeVariable span name)
      variable
      (Array.elemIndex name variables)
    Syntax.NamedRef span name arguments → maybe'
      (missingType span name arguments)
      (applied span name arguments)
      (indexOf known.typeIndices name)
    Syntax.THandlerRef _ reference row → Resolved.THandler
      <$> label effects bare reference
      <*> (uniformRows <$> resolveRow effects variables ambient bare row)
    Syntax.RecordRef _ fields tails → record fields tails
    arrow@(Syntax.FunRef _ _ _ _) → spine arrow
  spine arrow = do
    parameters ← traverse resolved (Syntax.typeRefSpine arrow).parameters
    rows ← traverse (resolveRow effects variables ambient bare)
      (arrowRows arrow)
    result ← resolved (Syntax.typeRefSpine arrow).result
    pure (Array.foldr stage result (Array.zip parameters rows))
  stage pair result = Resolved.TFun (first pair) (second pair) result
  first (Tuple value _) = value
  second (Tuple _ value) = value
  -- Fields are checked for a repeated label before any is resolved.
  record fields tails = do
    traverse_ repeatedField (repeatedLabel fields)
    traverse_ repeatedTail (repeatedLabel tails)
    written ← traverse recordField fields
    rest ← traverse recordTail tails
    pure (Resolved.TRecord (recordRow written rest))
  recordField field = Tuple field.name <$> resolved field.ty
  recordTail tail = maybe' (unboundTail tail)
    (pure <<< Resolved.VarId)
    (Array.elemIndex tail.name variables)
  unboundTail tail _ = Left
    (Syntax.problemAt (Unbound UnboundTypeVariable tail.name) tail.span)
  variable index = pure (Resolved.TVar (Resolved.VarId index))
  missingType span name arguments _
    | name == "Handler" = HandlerType.resolve effects variables ambient
        bare
        span
        arguments
    | otherwise = unbound UnboundType span name unit
  applied span _ arguments index = maybe' invalid
    ( appliedTo effects variables ambient
        { resolved, bare, named: resolvedName names, declared }
        span
        arguments
        index
    )
    (Array.index known.types index)
  names = { types: known.types, effects, variables }
  declared name = isJust (indexOf known.typeIndices name)
  invalid _ = Left (Syntax.problemAt (Internal "Invalid type id") nowhere)
  nowhere = { start: Syntax.origin, end: Syntax.origin }
  unbound kind span name _ = Left
    (Syntax.problemAt (Unbound kind name) span)
