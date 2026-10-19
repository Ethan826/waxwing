module Features.Check.Use
  ( module Features.Check.DeclarationUse
  , withOrigin
  , functionUse
  , ctorUse
  , checkFunctionRef
  , checkCtorRef
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Data.Tuple (fst, snd)
import Domain.Row (closedRow)
import Features.Check.Stages (arrowType)
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved (CtorId(..), FunctionId(..), TypeId(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Features.Check.Context (CheckEnv)
import Features.Check.DeclarationUse (Callee, Use, declarationUse)
import Features.Check.MarkUse (openHandlers)
import Features.Check.Provenance (Consumed(..))
import Features.Check.ResultClauses (ownClauses)
import Features.Check.RowMerge.Use (desugaredUse)
import Features.Check.Scheme (State, Threaded)
import Features.Check.UseFacts (joinedUse, requiredUse, seededUse)
import Features.Check.Tables (ownerType)

type Used = Either Diagnostic (Threaded Use)

functionUse ∷ ∀ r. CheckEnv r → State → Span → FunctionId → Used
functionUse env state span (FunctionId index) =
  maybe' missing found (Array.index env.functions index)
  where
  missing _ = Left (problemAt (Internal "Invalid resolved function") span)
  found function = Right (desugaredUse span (used function))
  used function =
    ( withOrigin (CallOf function.name) (Just (calleeOf function))
        ( requiredUse function.constraints
            ( joinedUse function.joined function.variables
                ( seededUse env function.sorts
                    ( openedUse
                        ( declarationUse state function.variables
                            function.markVariables
                            function.sorts
                            (map parameterType function.parameters)
                            function.result
                            function.row
                        )
                    )
                )
            )
        )
    )
  parameterType parameter = parameter.ty
  calleeOf function =
    { name: function.name
    , span: function.span
    , parameters: map parameterSpans function.parameters
    , variables: function.variables
    , sorts: function.sorts
    }
  parameterSpans parameter =
    { name: parameter.name, span: parameter.span, rowSpan: parameter.rowSpan }

-- The handler types in the signature opened (design §3.4, P5): only a
-- function's use, not a constructor's, whose fields stay as written.
openedUse ∷ Threaded Use → Threaded Use
openedUse use =
  { value: use.value
      { fields = found.value.fields
      , result = snd owned
      }
  , state: found.state { next = fst owned }
  }
  where
  found = openHandlers use.state use.value.fields use.value.result
  owned = ownClauses found.state.next found.value.fields use.value.row
    found.value.result

-- A use that consumes `consumed`, of this callee, if it is a named one.
withOrigin ∷ Consumed → Maybe Callee → Threaded Use → Threaded Use
withOrigin consumed callee use = use
  { value = use.value { consumed = consumed, callee = callee } }

-- A constructor's scheme is its owner's parameters.
ctorUse ∷ ∀ r. CheckEnv r → State → Span → CtorId → Used
ctorUse env state span (CtorId index) =
  maybe' missing found (Array.index env.ctors index)
  where
  missing _ = Left
    (problemAt (Internal "Invalid resolved constructor") span)
  found ctor = maybe' missingType (owned ctor) (ownerOf ctor.owner)
  missingType _ = Left (problemAt (Internal "Invalid resolved type") span)
  ownerOf (TypeId owner) = Array.index env.types owner
  owned ctor info = Right $ desugaredUse span
    ( withOrigin (CallOf ctor.name) Nothing
        ( joinedUse ctor.joined info.variables
            ( seededUse env info.sorts
                ( declarationUse state info.variables [] info.sorts
                    ctor.fields
                    (ownerType ctor.owner info)
                    closedRow
                )
            )
        )
    )

-- A bare reference is a value of the scheme's curried type (design §3).
checkFunctionRef
  ∷ ∀ r
  . CheckEnv r
  → State
  → Span
  → FunctionId
  → Either Diagnostic (Threaded Checked.Expr)
checkFunctionRef env state span id = reference span (Checked.FunctionRef id)
  <$> functionUse env state span id

checkCtorRef
  ∷ ∀ r
  . CheckEnv r
  → State
  → Span
  → CtorId
  → Either Diagnostic (Threaded Checked.Expr)
checkCtorRef env state span id = reference span (Checked.CtorRef id)
  <$> ctorUse env state span id

reference
  ∷ Span
  → (Checked.Instantiation → Checked.Node)
  → Threaded Use
  → Threaded Checked.Expr
reference span node use =
  { value: Checked.Expr
      { ty: arrowType use.value.fields use.value.rows use.value.result
      , span
      , node: node use.value.scheme.arguments
      }
  , state: use.state
  }
