-- Record extension and removal (R005 design §1, §4). Both build the
-- result layout's struct field by field. An extension evaluates its items
-- in written order, the spread's base once, into temporaries (as a
-- literal's fields are: Format.Go.Record); a field the literal does not
-- write is copied from the base, a pointer to a declared type as it
-- stands. A removal evaluates its receiver once and copies each field the
-- result keeps. Go rejects an unused variable, so a base none of whose
-- fields is copied is discarded.
module Format.Go.Extension (lowerExtension, lowerRemoval, remainder) where

import Prelude
import Data.Array as Array
import Data.Maybe (maybe)
import Data.String.Common (joinWith)
import Data.Tuple (Tuple(..))
import Domain.IR.Internal as IR
import Domain.IR.Internal (LayoutId(..), Ty(..))
import Format.Go.Data (goType)
import Format.Go.Lowered (Lowered, Lowering, several)
import Format.Go.Record
  ( Written
  , closure
  , joined
  , stored
  , temporary
  , temporaries
  )
import Format.Go.RecordNames (recordField)

-- The items, in written order: a field's value is `stored` under its
-- label; the spread has the label "" and is the base.
lowerExtension
  ∷ Array IR.RecordInfo → Lowering → Int → Ty → Array IR.Part → Lowered
lowerExtension records lower next ty items = joined parts
  (closure ty (temporaries written <> discard) literal)
  where
  parts = several lower next (map partValue items)
  written = Array.mapWithIndex piece (Array.zip items parts.codes)
  givens = Array.filter labelled written
  bases = Array.filter unlabelled written
  base = joinWith "" (map valueOf bases)
  fields = layoutFields records ty
  literal = construct ty (map entry fields)
  entry (Tuple label _) = recordField label <> ": "
    <> maybe (read base label) stored (Array.find (named label) givens)
  discard = unusedBase bases (Array.any (fromBase givens) fields)

-- The receiver once; the result's fields all come from it.
lowerRemoval
  ∷ Array IR.RecordInfo → Lowering → Int → Ty → IR.Expr → Lowered
lowerRemoval records lower next ty receiver = joined parts
  (closure ty (temporaries [ held ] <> discard) literal)
  where
  parts = several lower next [ receiver ]
  held = temporary "waxwingBase" "" receiver
    (joinWith "" parts.codes)
  fields = layoutFields records ty
  literal = construct ty (map entry fields)
  entry (Tuple label _) = recordField label <> ": " <> read held.value label
  discard = unusedBase [ held ] (not (Array.null fields))

-- The fields of the remainder layout `ty` read from `path`, as the struct
-- a named rest binds (Format.Go.Match).
remainder ∷ Array IR.RecordInfo → Ty → String → String
remainder records ty path = construct ty (map entry (layoutFields records ty))
  where
  entry (Tuple label _) = recordField label <> ": " <> read path label

construct ∷ Ty → Array String → String
construct ty entries = goType ty <> "{" <> joinWith ", " entries <> "}"

read ∷ String → String → String
read path label = path <> "." <> recordField label

-- `_ = waxwingBase` when the base is a temporary nothing is copied from.
unusedBase ∷ Array Written → Boolean → Array String
unusedBase bases copied =
  if copied || not (Array.any bound bases) then []
  else [ "_ = waxwingBase" ]
  where
  bound found = found.binding /= ""

piece ∷ Int → Tuple IR.Part String → Written
piece index (Tuple part code) = case part of
  IR.Given found →
    temporary ("waxwingItem" <> show index) found.label found.value code
  IR.Spreading base → temporary "waxwingBase" "" base code

partValue ∷ IR.Part → IR.Expr
partValue = case _ of
  IR.Given found → found.value
  IR.Spreading base → base

fromBase ∷ Array Written → Tuple String Ty → Boolean
fromBase givens (Tuple label _) = not (Array.any (named label) givens)

named ∷ String → Written → Boolean
named label found = found.label == label

labelled ∷ Written → Boolean
labelled found = found.label /= ""

unlabelled ∷ Written → Boolean
unlabelled found = found.label == ""

valueOf ∷ Written → String
valueOf found = found.value

-- A layout's fields in sorted label order; any other type has none.
layoutFields ∷ Array IR.RecordInfo → Ty → Array (Tuple String Ty)
layoutFields records = case _ of
  TRecord (LayoutId index) → maybe [] fieldsOf (Array.index records index)
  _ → []
  where
  fieldsOf info = info.fields
