module Features.Resolve.Effect
  ( BuiltinEffect
  , Declared
  , Operation(..)
  , builtinEffects
  , effects
  , globals
  , summaries
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Domain.Ids (EffectId(..))
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.Marks
  ( markVariableRefs
  , refuseMarkVariables
  , rowMarkVariableRefs
  )
import Features.Resolve.Types (resolveTypeWith)
import Features.Resolve.Repeated (laterRepeat)

-- What `Effect.op` names (FX020 §2: by declaration, never by row). Console
-- and Fail are not declared effects, so each has a built-in table below,
-- searched like a declared effect's operations (amendment 2). Imports and
-- collision checks (FX020 Tasks 3 and 4) share it. `print` ranges over
-- every printable type, so it stays compiler-provided until C001.
data Operation
  = UserOperation EffectId Int
  | PrintOperation
  | FailOperation

type Declared = { operation ∷ Operation, arity ∷ Int }

type BuiltinEffect =
  { name ∷ String, operations ∷ Array { name ∷ String, declared ∷ Declared } }

builtinEffects ∷ Array BuiltinEffect
builtinEffects =
  [ { name: "Console"
    , operations:
        [ { name: "print"
          , declared: { operation: PrintOperation, arity: 1 }
          }
        ]
    }
  , { name: "Fail"
    , operations:
        [ { name: "fail"
          , declared: { operation: FailOperation, arity: 1 }
          }
        ]
    }
  ]

summaries ∷ Array Syntax.EffectDecl → Array { name ∷ String, arity ∷ Int }
summaries = map summary
  where
  summary effect = { name: effect.name, arity: Array.length effect.parameters }

effects
  ∷ Array Resolved.TypeInfo
  → Array Syntax.EffectDecl
  → Either Syntax.Diagnostic (Array Resolved.EffectInfo)
effects types declarations = do
  uniqueEffects declarations
  traverse resolved declarations
  where
  resolved effect = withOperations effect <$> traverse
    (operation (map parameterName effect.parameters))
    effect.operations
  parameterName entry = entry.name
  operation variables declaration = refusedIn declaration
    *>
      ( withSignature declaration
          <$> traverse (parameter variables) declaration.parameters
          <*> resolveTypeWith types (summaries declarations) variables
            Nothing
            declaration.result
      )
  parameter variables declaration = withType declaration
    <$> resolveTypeWith types (summaries declarations) variables Nothing
      declaration.ty
  withType declaration ty =
    { name: declaration.name, ty, span: declaration.span, rowSpan: Nothing }
  withSignature declaration parameters result =
    { name: declaration.name
    , parameters
    , result
    , syntax: Array.snoc (map parameterSyntax declaration.parameters)
        declaration.result
    , span: declaration.span
    }
  parameterSyntax declaration = declaration.ty
  withOperations effect operations =
    { name: effect.name
    , parameters: map parameterName effect.parameters
    , operations
    , span: effect.span
    }

globals ∷ Array Resolved.EffectInfo → Array Resolved.Global
globals found = Array.concat (Array.mapWithIndex owned found)
  where
  owned index effect = Array.mapWithIndex (operation (EffectId index))
    effect.operations
  operation effect index info =
    { name: info.name
    , ref: Resolved.Operation effect index
        (Array.length info.parameters)
    }

-- Mark variables belong to function signatures alone (FX008 L6).
refusedIn ∷ Syntax.OperationDecl → Either Syntax.Diagnostic Unit
refusedIn declaration = refuseMarkVariables
  ( Array.concatMap markVariableRefs
      (Array.snoc (map parameterType declaration.parameters) declaration.result)
      <> maybe [] rowMarkVariableRefs declaration.row
  )
  where
  parameterType parameter = parameter.ty

uniqueEffects ∷ Array Syntax.EffectDecl → Either Syntax.Diagnostic Unit
uniqueEffects declarations = do
  duplicateEffect
  traverse_ duplicateOperations declarations
  traverse_ duplicateParameters declarations
  where
  effectsToCheck = laterRepeat (map effectName declarations)
  effectName effect = effect.name
  duplicateEffect = maybe (Right unit) effectAt effectsToCheck
  effectAt index = maybe (Right unit) duplicate
    (Array.index declarations index)
  duplicate declaration = Left
    ( Syntax.problemAt
        (Duplicate DuplicateEffect declaration.name)
        declaration.span
    )
  duplicateOperations effect = maybe (Right unit) (operationAt effect)
    (laterRepeat (map operationName effect.operations))
  operationAt effect index = maybe (Right unit) duplicateOperation
    (Array.index effect.operations index)
  duplicateOperation declaration = Left
    ( Syntax.problemAt
        (Duplicate DuplicateOperation declaration.name)
        declaration.span
    )
  operationName operation = operation.name
  duplicateParameters effect = do
    traverse_ duplicateEffectParameter
      ( laterRepeat (map effectParameterName effect.parameters)
          >>= Array.index effect.parameters
      )
    traverse_ duplicateOperationParameters effect.operations
  duplicateEffectParameter parameter = Left
    ( Syntax.problemAt
        (Duplicate DuplicateTypeParameter parameter.name)
        parameter.span
    )
  duplicateOperationParameters operation = traverse_ duplicateParameter
    ( laterRepeat (map operationParameterName operation.parameters)
        >>= Array.index operation.parameters
    )
  duplicateParameter parameter = Left
    ( Syntax.problemAt
        (Duplicate DuplicateParameter parameter.name)
        parameter.span
    )
  effectParameterName parameter = parameter.name
  operationParameterName parameter = parameter.name
