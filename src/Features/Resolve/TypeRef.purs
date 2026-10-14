module Features.Resolve.TypeRef (resolveType, resolveTypeWith) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
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
import Features.Resolve.RecordFields (repeatedField, repeatedLabel)
import Features.Resolve.TypeArguments (appliedTo)

-- `variables` are those in scope: `VarId i` is the i-th. A declared type
-- takes exactly as many arguments as it has parameters, else E_ARITY at the
-- whole reference, which is checked before its arguments.
resolveType
  ∷ Array Resolved.TypeInfo
  → Array String
  → Syntax.TypeRef
  → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)
resolveType types variables = resolveTypeWith types [] variables Nothing

resolveTypeWith
  ∷ Array Resolved.TypeInfo
  → Array { name ∷ String, arity ∷ Int }
  → Array String
  → Maybe Resolved.VarId
  → Syntax.TypeRef
  → Either Syntax.Diagnostic (Resolved.Ty Resolved.VarId)
resolveTypeWith types effects variables ambient = resolved
  where
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
      (Array.findIndex (named name) types)
    Syntax.THandlerRef _ reference row → Resolved.THandler
      <$> label effects resolved reference
      <*> (uniformRows <$> resolveRow effects variables ambient resolved row)
    Syntax.RecordRef _ fields tail → record fields tail
    arrow@(Syntax.FunRef _ _ _ _) → spine arrow
  spine arrow = do
    parameters ← traverse resolved (Syntax.typeRefSpine arrow).parameters
    rows ← traverse (resolveRow effects variables ambient resolved)
      (arrowRows arrow)
    result ← resolved (Syntax.typeRefSpine arrow).result
    pure (Array.foldr stage result (Array.zip parameters rows))
  stage pair result = Resolved.TFun (first pair) (second pair) result
  first (Tuple value _) = value
  second (Tuple _ value) = value
  -- Fields are checked for a repeated label before any is resolved.
  record fields tail = do
    traverse_ repeatedField (repeatedLabel fields)
    written ← traverse recordField fields
    rest ← traverse recordTail tail
    pure (Resolved.TRecord (recordRow written rest))
  recordField field = Tuple field.name <$> resolved field.ty
  recordTail tail = maybe' (unboundTail tail)
    (pure <<< Resolved.VarId)
    (Array.elemIndex tail.name variables)
  unboundTail tail _ = Left
    (Syntax.problemAt (Unbound UnboundTypeVariable tail.name) tail.span)
  variable index = pure (Resolved.TVar (Resolved.VarId index))
  named name info = info.name == name
  missingType span name arguments _
    | name == "Handler" = HandlerType.resolve effects variables ambient
        resolved
        span
        arguments
    | otherwise = unbound UnboundType span name unit
  applied span _ arguments index = maybe' invalid
    (appliedTo effects variables ambient resolved span arguments index)
    (Array.index types index)
  invalid _ = Left (Syntax.problemAt (Internal "Invalid type id") nowhere)
  nowhere = { start: Syntax.origin, end: Syntax.origin }
  unbound kind span name _ = Left
    (Syntax.problemAt (Unbound kind name) span)
