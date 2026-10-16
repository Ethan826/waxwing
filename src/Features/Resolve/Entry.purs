module Features.Resolve.Entry (entryPoint) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), isNothing, maybe, maybe')
import Domain.Problem (EntryKind(..), Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type.Parts (groundErased)

-- A function as the entry check sees it: its place among the program's
-- functions, its syntax and its resolved signature's result.
type Definition r s =
  { index ∷ Int
  , function ∷ Syntax.FunctionDecl
  , signature ∷ { result ∷ Resolved.Ty Resolved.VarId | s }
  | r
  }

entryPoint
  ∷ ∀ r s
  . Array (Definition r s)
  → Either Syntax.Diagnostic Resolved.FunctionId
entryPoint definitions = maybe' absent checkEntry
  (Array.find isEntry definitions)
  where
  isEntry definition = definition.function.name == "main"
  absent _ = Left
    ( Syntax.problemAt (EntryProblem MissingEntry)
        { start: Syntax.origin, end: Syntax.origin }
    )

checkEntry
  ∷ ∀ r s
  . Definition r s
  → Either Syntax.Diagnostic Resolved.FunctionId
checkEntry definition = maybe (pure (Resolved.FunctionId definition.index))
  invalid
  (entryProblem definition)
  where
  invalid kind = Left
    (Syntax.problemAt (EntryProblem kind) definition.function.span)

-- `main` takes no parameters and returns a ground type: there is no caller
-- to choose its type arguments. Rows are erased first: a row variable is
-- not a type argument (FX001).
entryProblem ∷ ∀ r s. Definition r s → Maybe EntryKind
entryProblem definition
  | not (Array.null definition.function.parameters) = Just EntryParameters
  | isNothing (groundErased definition.signature.result) =
      Just EntryPolymorphic
  | otherwise = Nothing
