module Features.Check.Required (requiredBy, fieldsWritten, anyWritten) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Tuple (Tuple(..))
import Domain.Syntax (FieldRef, TypeRef(..))
import Domain.Type (Ty(..))
import Features.Check.OriginStore (onOrigins)
import Features.Check.PartOrigin (requiredAt)
import Features.Check.RowMerge.Reach (metasThrough)
import Features.Check.Search (Stack(..))
import Features.Check.Subst (Flex, Subst, walk)

-- R8's third note as metadata (R005 Tranche B diagnostics; the
-- instantiated type origins of decision 5, 2026-10-17, kept apart from
-- every satisfiability decision): once an argument has met its
-- parameter, a written record type on one side that `holds` a constant
-- is recorded on each record meta the other side's type reaches at the
-- same position, the first kept. Only the renderers read it.
requiredBy ∷ (TypeRef → Boolean) → Subst → Ty Flex → TypeRef → Subst
requiredBy holds start ty ref = tailRec step
  { subst: start, pending: Push { ty, ref } Bottom }
  where
  step found = case found.pending of
    Bottom → Done found.subst
    Push pair below → Loop (visited found.subst below pair)
  -- An arrow's spine can be thousands long, so pairs wait on a stack and
  -- are taken by a loop, never by one recursion per arrow.
  visited subst below pair = case walk subst pair.ty, pair.ref of
    TRecord row, RecordRef span fields _ →
      { subst: if holds pair.ref then marked subst span row else subst
      , pending: Array.foldr Push below
          (Array.mapMaybe (field fields) row.fields)
      }
    TFun parameter _ result, FunRef _ parameterRef _ resultRef →
      { subst
      , pending: Push { ty: parameter, ref: parameterRef }
          (Push { ty: result, ref: resultRef } below)
      }
    _, _ → { subst, pending: below }
  marked subst span row = foldl (mark span) subst
    (Array.fromFoldable (metasThrough subst row.tails))
  mark span reached meta = onOrigins (requiredAt meta span) reached
  field fields (Tuple name part) = map (paired part)
    (Array.find (named name) fields)
  paired part written = { ty: part, ref: fieldType written }

-- A callee's written record holds a constant when it writes a field: its
-- tails are its variables, instantiated afresh at the use.
fieldsWritten ∷ TypeRef → Boolean
fieldsWritten = case _ of
  RecordRef _ fields _ → not (Array.null fields)
  _ → false

-- The enclosing function's own written record holds one when it writes a
-- field or a tail: its variables are rigid in its body.
anyWritten ∷ TypeRef → Boolean
anyWritten = case _ of
  RecordRef _ fields tails → not (Array.null fields && Array.null tails)
  _ → false

named ∷ String → FieldRef → Boolean
named name field = field.name == name

fieldType ∷ FieldRef → TypeRef
fieldType field = field.ty
