module Features.Resolve (resolve) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Syntax as Syntax
import Features.Resolve.Entry (entryPoint)
import Features.Resolve.Expression (expression)
import Features.Resolve.Fresh (runFresh)
import Features.Resolve.Types (resolveTypeWith, typeTable)
import Features.Resolve.Marks (signatureMarkVariables)
import Features.Resolve.Row (resolveRow)
import Features.Resolve.Effect as Effect
import Features.Resolve.Imports as Imports
import Features.Resolve.ArgumentClash (Tables, programClashes)
import Features.Resolve.BodySorts (signatureSorts)
import Features.Resolve.Lacking (signatureLacking)
import Features.Resolve.Occurrences (Declared, resolvedDeclared)
import Features.Resolve.TypeIndices (typeIndices)
import Features.Resolve.Scope (Bindings)
import Features.Resolve.Variables (sortedVariables)
import Domain.Resolved (Global)
import Domain.Type (TyRow)
import Domain.Resolved as Resolved

type Signature =
  { variables ∷ Array String
  , markVariables ∷ Array String
  , sorts ∷ Array Syntax.Sort
  , row ∷ TyRow Resolved.VarId
  , parameters ∷ Array Resolved.Parameter
  , result ∷ Resolved.Ty Resolved.VarId
  }

type Definition =
  { index ∷ Int
  , function ∷ Syntax.FunctionDecl
  , signature ∷ Signature
  , bindings ∷ Bindings
  }

resolve ∷ Syntax.Program → Either Syntax.Diagnostic Resolved.Program
resolve program = do
  tables ← typeTable indices program
  -- Built once: one per signature cost O(types) each (T007).
  let declared = resolvedDeclared indices tables.types
  let known = { types: tables.types, ctors: tables.ctors, typeIndices: indices }
  effects ← Effect.effects declared known program.effects
  signatures ← traverse
    ( resolveSignature declared known
        (Effect.summaries program.effects)
    )
    functions
  programClashes known program
  bound ← traverse (bindingsFor effects) (Array.zip functions signatures)
  let
    definitions = Array.mapWithIndex indexed
      (Array.zipWith pair functions (Array.zip signatures bound))
  entry ← entryPoint definitions
  -- Applied once, so the globals are built once rather than per function.
  bodies ← traverse
    ( resolveFunction
        ( globals tables.ctors
            <>
              [ { name: "show", ref: Resolved.BuiltinShow }
              , { name: "crash", ref: Resolved.BuiltinCrash }
              ]
        )
        declared
        known
        (Effect.summaries program.effects)
        effects
    )
    definitions
  pure
    { types: tables.types
    , ctors: tables.ctors
    , effects
    , functions: bodies
    , entry
    }
  where
  indices = typeIndices program.types
  functions = program.functions
  bindingsFor effects (Tuple function signature) = Imports.bindings
    program.effects
    effects
    function
    signature.row
  pair function (Tuple signature bindings) =
    { function, signature, bindings }
  indexed index entry =
    { index
    , function: entry.function
    , signature: entry.signature
    , bindings: entry.bindings
    }
  globals ctors = Array.mapWithIndex functionGlobal functions
    <> Array.mapWithIndex ctorGlobal ctors

functionGlobal ∷ Int → Syntax.FunctionDecl → Global
functionGlobal index function =
  { name: function.name
  , ref: Resolved.GlobalFunction (Resolved.FunctionId index)
      (Array.length function.parameters)
  }

ctorGlobal ∷ Int → Resolved.CtorInfo → Global
ctorGlobal index info =
  { name: info.name, ref: Resolved.GlobalCtor (Resolved.CtorId index) }

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
  pure { variables, markVariables, sorts, parameters, result, row }
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

resolveFunction
  ∷ Array Global
  → Declared
  → Tables
  → Array { name ∷ String, arity ∷ Int }
  → Array Resolved.EffectInfo
  → Definition
  → Either Syntax.Diagnostic Resolved.FunctionDecl
resolveFunction globals declared tables effects effectInfos definition =
  withBody <$> runFresh
    (Array.length parameters)
    (expression scope definition.function.body)
  where
  scope =
    { globals
    , effects
    , effectInfos
    , ctors: tables.ctors
    , locals
    , bindings: definition.bindings
    , types: tables.types
    , typeIndices: tables.typeIndices
    , variables: definition.signature.variables
    , markVariables: definition.signature.markVariables
    , lacking: signatureLacking declared plain definition.function
        definition.signature
    , signatureSorts: signatureSorts declared definition.function
        definition.signature.variables
        definition.signature.sorts
    }
  plain = { types: tables.types, ctors: tables.ctors }
  parameters = definition.signature.parameters
  locals = Map.fromFoldable (Array.mapWithIndex parameterLocal parameters)
  parameterLocal index parameter =
    Tuple parameter.name (Resolved.LocalId index)
  withBody body =
    { id: Resolved.FunctionId definition.index
    , name: definition.function.name
    , variables: definition.signature.variables
    , markVariables: definition.signature.markVariables
    , sorts: definition.signature.sorts
    , row: definition.signature.row
    , parameters: definition.signature.parameters
    , result: definition.signature.result
    , body
    , span: definition.function.span
    , rowSpan: writtenSpan definition.function.row
    }
