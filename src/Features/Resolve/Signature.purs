module Features.Resolve.Signature
  ( Signature
  , resolveSignature
  , writtenSpan
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Domain.Syntax as Syntax
import Domain.Type (TyRow)
import Domain.Resolved as Resolved
import Features.Resolve.ArgumentClash (Tables)
import Features.Resolve.Marks (signatureMarkVariables)
import Features.Resolve.Occurrences (Declared)
import Features.Resolve.Requirements (resolveRequirements)
import Features.Resolve.Row (resolveRow)
import Features.Resolve.Types (resolveTypeWith)
import Features.Resolve.Variables (sortedVariables)

-- A function's signature resolved: its variables in written order, the
-- ambient row variable last, then its types and constraints. Apart from
-- Features.Resolve so that the declaration it builds has room there.
type Signature =
  { variables ∷ Array String
  , markVariables ∷ Array String
  , sorts ∷ Array Syntax.Sort
  , row ∷ TyRow Resolved.VarId
  , parameters ∷ Array Resolved.Parameter
  , result ∷ Resolved.Ty Resolved.VarId
  , constraints ∷ Array Resolved.Requirement
  }

resolveSignature
  ∷ Declared
  → Tables
  → Array { name ∷ String, arity ∷ Int }
  → Syntax.FunctionDecl
  → Either Syntax.Diagnostic Signature
resolveSignature declared known effects function = do
  occurrences ← sortedVariables declared references function.row
  let written = Array.sortWith sort occurrences
  let
    variables = map name written <> [ "" ]
    sorts = map sort written <> [ Syntax.RowSort ]
    ambient = Just (Resolved.VarId (Array.length written))
    resolved = resolveTypeWith known effects variables ambient
    -- A label's arguments have no ambient row (FX024, Resolve.TypeRef).
    bare = resolveTypeWith known effects variables Nothing
  parameters ← traverse (parameter resolved) function.parameters
  result ← resolved function.result
  row ← resolveRow effects variables ambient bare function.row
  constraints ← resolveRequirements { variables, sorts } function.constraints
  pure
    { variables
    , markVariables
    , sorts
    , parameters
    , result
    , row
    , constraints
    }
  where
  markVariables = signatureMarkVariables
    (Array.snoc (map parameterType function.parameters) function.result)
    function.row
  references = Array.snoc (map parameterType function.parameters)
    function.result
  parameterType entry = entry.ty
  name variable = variable.name
  sort variable = variable.sort
  parameter resolved declaration = withType declaration <$> resolved
    declaration.ty
  withType declaration ty =
    { name: declaration.name
    , ty
    , span: declaration.span
    , rowSpan: annotationSpan declaration.ty
    }

writtenSpan ∷ Maybe Syntax.RowRef → Maybe Syntax.Span
writtenSpan = map rowSpan
  where
  rowSpan (Syntax.RowRef span _ _) = span

-- The span of a parameter's written `with` row, if it is an arrow's.
annotationSpan ∷ Syntax.TypeRef → Maybe Syntax.Span
annotationSpan = case _ of
  Syntax.FunRef _ _ (Just (Syntax.RowRef span _ _)) _ → Just span
  _ → Nothing

