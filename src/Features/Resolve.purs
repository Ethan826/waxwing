module Features.Resolve (resolve) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Syntax as Syntax
import Features.Resolve.Entry (entryPoint)
import Features.Resolve.Expression (expression)
import Features.Resolve.Fresh (runFresh)
import Features.Resolve.Types (typeTable)
import Features.Resolve.Signature (Signature, resolveSignature, writtenSpan)
import Features.Resolve.Effect as Effect
import Features.Resolve.Imports as Imports
import Features.Resolve.ArgumentClash (Tables, programClashes)
import Features.Resolve.ArgumentGraph (argumentGraph)
import Features.Resolve.BodySorts (signatureSorts)
import Features.Resolve.Apart (joinedPairs, signatureTypes, withJoined)
import Features.Resolve.Lacking (signatureLacking)
import Features.Resolve.Occurrences (Declared, resolvedDeclared)
import Features.Resolve.TypeIndices (typeIndices)
import Features.Resolve.Scope (Bindings)
import Domain.Resolved (Global)
import Domain.Resolved as Resolved

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
  let
    known =
      { types: tables.types
      , ctors: tables.ctors
      , typeIndices: indices
      , argumentGraph: argumentGraph
          { types: tables.types, ctors: tables.ctors, typeIndices: indices }
      }
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
    , ctors: map (withJoined known) tables.ctors
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
    , argumentGraph: tables.argumentGraph
    , variables: definition.signature.variables
    , markVariables: definition.signature.markVariables
    , lacking: signatureLacking declared plain tables definition.function
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
    , constraints: definition.signature.constraints
    , introduced: maybe Map.empty introducedOf scope.lacking
    , joined: joinedPairs tables definition.signature.variables
        (signatureTypes definition.function)
    , syntax: Array.snoc (map parameterType definition.function.parameters)
        definition.function.result
    }
  introducedOf lacking = lacking.introduced
  parameterType parameter = parameter.ty
