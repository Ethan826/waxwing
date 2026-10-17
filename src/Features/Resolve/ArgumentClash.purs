module Features.Resolve.ArgumentClash
  ( Tables
  , clashIn
  , programClashes
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..))
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.ArgumentGraph (ArgumentGraph, firstLabel, hasArguments)
import Features.Resolve.RecordArguments (RecordArgument, recordArguments)
import Features.Resolve.TypeIndices (Indexed)

-- The declared types, indexed by name, and their constructors.
type Tables = Indexed
  ( ctors ∷ Array Resolved.CtorInfo
  , argumentGraph ∷ ArgumentGraph
  )

-- A record argument's labels must be disjoint from those its declaration
-- writes beside that parameter, directly or through the declarations it
-- passes the parameter to (R012, user-approved 2026-10-15): a shared label
-- is `Duplicate field x` at the argument's label, noted `first written
-- here` at the declaration's, even when the field types agree. The first
-- clash in source order is reported.
clashIn
  ∷ Tables → Syntax.TypeRef → Either Syntax.Diagnostic Unit
clashIn tables reference =
  if hasArguments tables.argumentGraph then
    traverse_ (clashOf tables) (recordArguments tables reference)
  else Right unit

-- The types a program writes outside bodies: constructor fields, function
-- signatures and effect operations. Body types are checked where they are
-- resolved (Resolve.Lacking `lackingIn`).
programClashes
  ∷ Tables → Syntax.Program → Either Syntax.Diagnostic Unit
programClashes tables program =
  if hasArguments tables.argumentGraph then
    traverse_ (clashIn tables) references
  else Right unit
  where
  references = Array.concatMap fields program.types
    <> Array.concatMap signature program.functions
    <> Array.concatMap operations program.effects
  fields declaration = Array.concatMap ctorFields declaration.ctors
  ctorFields ctor = ctor.fields
  signature function = written function.parameters function.result
    function.row
  operations effect = Array.concatMap operation effect.operations
  operation declaration = written declaration.parameters
    declaration.result
    declaration.row
  written parameters result row =
    Array.snoc (map parameterType parameters)
      result
      <> maybe [] rowTypes row
  parameterType parameter = parameter.ty
  rowTypes (Syntax.RowRef _ labels _) = Array.concatMap labelTypes labels
  labelTypes label = label.arguments

clashOf
  ∷ Tables → RecordArgument → Either Syntax.Diagnostic Unit
clashOf tables argument = maybe (Right unit) duplicate
  (Array.findMap clashing (Array.sortWith start argument.fields))
  where
  -- A declaration passing its own row back to itself meets its own
  -- label: a row growing through recursion, which the instantiation rule
  -- reports (Features.Check.NestedArguments), not a second occurrence;
  -- `firstLabel` leaves the argument's own label out.
  clashing field = map (Tuple field)
    ( firstLabel tables.argumentGraph (Tuple argument.callee argument.position)
        { name: field.name, span: field.span }
    )
  duplicate (Tuple field first) = Left
    { problem: Duplicate DuplicateField field.name
    , span: field.span
    , related: [ { span: first.span, reason: Syntax.FirstWrittenHere } ]
    }

start ∷ ∀ r. { span ∷ Syntax.Span | r } → Int
start found = found.span.start.offset
