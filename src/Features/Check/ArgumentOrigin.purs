module Features.Check.ArgumentOrigin (notedArgument) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Domain.Checked.Internal (Open)
import Domain.Resolved (LocalId(..))
import Domain.Resolved as Resolved
import Domain.Syntax (TypeRef)
import Domain.Type (Ty)
import Features.Check.Context (CheckEnv)
import Features.Check.Required (anyWritten, fieldsWritten, requiredBy)
import Features.Check.Scheme (State, flexible)

-- After an argument met its parameter, where each side's record was
-- written, recorded for R8's `is required here` (diagnostic metadata,
-- Features.Check.Required): the callee's written parameter type against
-- the argument's type, and, when the argument is one of the enclosing
-- function's parameters, its written type against the parameter's.
notedArgument
  ∷ ∀ r
  . CheckEnv r
  → Maybe TypeRef
  → Maybe Resolved.Expr
  → { parameter ∷ Ty Open, argument ∷ Ty Open }
  → State
  → State
notedArgument env written argument types state = state
  { subst = ownSide (calleeSide state.subst) }
  where
  calleeSide subst = maybe subst
    (requiredBy fieldsWritten subst (flexible types.argument))
    written
  ownSide subst = maybe subst
    (requiredBy anyWritten subst (flexible types.parameter))
    (argument >>= ownParameter env)

-- The written type of the enclosing function's parameter an argument
-- names, if it names one.
ownParameter ∷ ∀ r. CheckEnv r → Resolved.Expr → Maybe TypeRef
ownParameter env = case _ of
  Resolved.Local _ (LocalId index) → Array.index env.parameterSyntax index
  _ → Nothing
