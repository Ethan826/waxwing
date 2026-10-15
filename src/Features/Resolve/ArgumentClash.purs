module Features.Resolve.ArgumentClash
  ( clashIn
  , programClashes
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Resolved (CtorId(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Features.Resolve.RecordArguments
  ( RecordArgument
  , hasRecordParameters
  , recordArguments
  , slotOf
  , subtypes
  )

-- A label a declaration writes beside a record parameter, where written.
type Written = { name ∷ String, span ∷ Syntax.Span }

type Search =
  { pending ∷ Array (Tuple Int Int)
  , seen ∷ Set (Tuple Int Int)
  , labels ∷ Array Written
  }

-- A record argument's labels must be disjoint from those its declaration
-- writes beside that parameter, directly or through the declarations it
-- passes the parameter to (R012, user-approved 2026-10-15): a shared label
-- is `Duplicate field x` at the argument's label, noted `first written
-- here` at the declaration's, even when the field types agree. The first
-- clash in source order is reported.
clashIn
  ∷ Resolved.Tables → Syntax.TypeRef → Either Syntax.Diagnostic Unit
clashIn tables reference =
  if hasRecordParameters tables.types then
    traverse_ (clashOf tables) (recordArguments tables.types reference)
  else Right unit

-- The types a program writes outside bodies: constructor fields, function
-- signatures and effect operations. Body types are checked where they are
-- resolved (Resolve.Lacking `lackingIn`).
programClashes
  ∷ Resolved.Tables → Syntax.Program → Either Syntax.Diagnostic Unit
programClashes tables program =
  if hasRecordParameters tables.types then
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
  ∷ Resolved.Tables → RecordArgument → Either Syntax.Diagnostic Unit
clashOf tables argument = maybe (Right unit) duplicate
  (Array.findMap clashing (Array.sortWith start argument.fields))
  where
  declared = Array.sortWith start
    (declaredLabels tables argument.callee argument.position)
  clashing field = map (Tuple field) (Array.find (same field) declared)
  -- A declaration passing its own row back to itself meets its own
  -- label: a row growing through recursion, which the instantiation rule
  -- reports (Features.Check.NestedArguments), not a second occurrence.
  same field label = label.name == field.name && label.span /= field.span
  duplicate (Tuple field first) = Left
    { problem: Duplicate DuplicateField field.name
    , span: field.span
    , related: [ { span: first.span, reason: Syntax.FirstWrittenHere } ]
    }

start ∷ ∀ r. { span ∷ Syntax.Span | r } → Int
start found = found.span.start.offset

-- The labels a declaration writes beside its record parameter at
-- `position`, gathered over every declaration it is passed to by a loop
-- over a worklist, as Features.Check.Implied `declared` gathers them from
-- resolved types; each parameter is entered once, so recursive
-- declarations end.
declaredLabels ∷ Resolved.Tables → Int → Int → Array Written
declaredLabels tables callee position = tailRec step
  { pending: [ Tuple callee position ], seen: Set.empty, labels: [] }
  where
  step found = maybe (Done found.labels) (Loop <<< visit found)
    (Array.uncons found.pending)
  visit found { head, tail }
    | Set.member head found.seen = found { pending = tail }
    | otherwise = gathered tables head
        found { pending = tail, seen = Set.insert head found.seen }

-- One parameter's labels, and the parameters it is passed on to.
gathered ∷ Resolved.Tables → Tuple Int Int → Search → Search
gathered tables (Tuple owner position) found = maybe found entered
  (Array.index tables.types owner)
  where
  entered info = maybe found (fromFields (references info))
    (Array.index info.variables (slotOf info position))
  references info = Array.concatMap fieldSyntax info.ctors
  fieldSyntax (CtorId index) = maybe [] syntaxOf
    (Array.index tables.ctors index)
  syntaxOf ctor = ctor.fieldSyntax
  fromFields fields name = found
    { labels = found.labels
        <> Array.concatMap (beside name) (Array.concatMap subtypes fields)
    , pending = found.pending
        <> map place
          ( Array.filter (passes name)
              (Array.concatMap (recordArguments tables.types) fields)
          )
    }
  beside name = case _ of
    Syntax.RecordRef _ fields (Just tail) | tail.name == name →
      map label fields
    _ → []
  label field = { name: field.name, span: field.span }
  passes name argument = map tailName argument.tail == Just name
  tailName tail = tail.name
  place argument = Tuple argument.callee argument.position
