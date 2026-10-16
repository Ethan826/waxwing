module Features.Check.Matrix
  ( Pat(..)
  , Vector
  , Column
  , column
  , complete
  , specialize
  , defaults
  , headsOf
  , wildcards
  , simplifyRow
  , patternType
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (find)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Tuple (fst)
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved (Ty(..))
import Features.Check.Signature
  ( Head(..)
  , Signature
  , arity
  , candidates
  , recordHead
  )
import Features.Check.Tables (Lookup)

-- Binders and wildcards are indistinguishable to coverage.
data Pat = Any | Headed Head (Array Pat)

type Vector = Array Pat

type Column =
  { ty ∷ Ty Open, tys ∷ Array (Ty Open), pat ∷ Pat, rest ∷ Vector }

-- Types and patterns advance together; unequal lengths are a compiler bug.
column ∷ Array (Ty Open) → Vector → Lookup (Maybe Column)
column tys q = maybe' noTypes withTypes (Array.uncons tys)
  where
  noTypes _ = if Array.null q then Right Nothing else mismatch
  withTypes types = maybe mismatch (Right <<< Just <<< split types)
    (Array.uncons q)
  mismatch = Left (Internal "Coverage vector length mismatch")
  split types patterns =
    { ty: types.head, tys: types.tail, pat: patterns.head, rest: patterns.tail }

-- Int has unboundedly many heads, and a rigid variable, a hole or an arrow
-- is abstract (design §5), so none of them is ever complete. Unit has no
-- pattern but `_` and binders (FX001), so it is abstract too. A record
-- type's one head is always complete, `_` included, so a record column
-- always splits into its fields (R004 design §3): a witness then shows
-- every field, and an uninhabited field leaves no witness.
complete ∷ Signature → Ty Open → Array Head → Lookup Boolean
complete signature ty heads =
  if open ty then Right false
  else if isRecord ty then Right true
  else Array.all present <$> candidates signature ty
  where
  present head = Array.elem head heads
  open = case _ of
    TInt → true
    TUnit → true
    TText → true
    TVar _ → true
    TFun _ _ _ → true
    THandler _ _ → true
    _ → false
  isRecord = case _ of
    TRecord _ → true
    _ → false

-- Resolution enforces constructor arity, so a head whose field count
-- disagrees with the signature is a compiler bug, never a non-match. The
-- check precedes a plain mapMaybe: a per-row `traverse` over Either was most
-- of a wide match's time (G001 Task 4b).
specialize ∷ Signature → Head → Array Vector → Lookup (Array Vector)
specialize signature head rows = do
  count ← arity signature head
  when (Array.any (malformed count) rows)
    (Left (Internal "Coverage field count mismatch"))
  pure (Array.mapMaybe (specializeRow count) rows)
  where
  malformed count row = maybe false (mismatched count) (Array.head row)
  mismatched count = case _ of
    Any → false
    Headed found fields → clash found
      || found == head && Array.length fields /= count
  clash found = otherRecord head found
  specializeRow count row = Array.head row >>= specializeFirst count row
  specializeFirst count row = case _ of
    Any → Just (wildcards count <> afterFirst row)
    Headed found fields
      | found == head → Just (fields <> afterFirst row)
      | otherwise → Nothing

-- Rows are judged by their first pattern before the rest is copied: an
-- `uncons` per row copied every row a specialization or default drops,
-- and a match's redundancy check drops nearly all of them (T003).
defaults ∷ Array Vector → Array Vector
defaults = Array.mapMaybe defaultRow
  where
  defaultRow row = Array.head row >>= defaultFirst row
  defaultFirst row = case _ of
    Any → Just (afterFirst row)
    Headed _ _ → Nothing

afterFirst ∷ Vector → Vector
afterFirst = Array.drop 1

headsOf ∷ Array Vector → Array Head
headsOf = Array.mapMaybe firstHead
  where
  firstHead row = Array.head row >>= headOf
  headOf = case _ of
    Any → Nothing
    Headed head _ → Just head

wildcards ∷ Int → Vector
wildcards count = Array.replicate count Any

simplifyRow ∷ Array Checked.Pattern → Vector
simplifyRow = map simplify

simplify ∷ Checked.Pattern → Pat
simplify (Checked.Pattern pattern) = case pattern.shape of
  Checked.Wildcard → Any
  Checked.Bind _ → Any
  Checked.IntLit value → Headed (HInt value) []
  Checked.BoolLit value → Headed (HBool value) []
  Checked.Ctor id fields → Headed (HCtor id) (map simplify fields)
  Checked.Record fields _ → widened simplify pattern.ty fields

-- R004 design §3: a record pattern widens to every label of its own type,
-- in label order, a label it leaves to `...` being `_`. Settlement has
-- put the final substitution into that type, and whatever tail is left,
-- rigid or a hole nothing closed, makes the head open. A record pattern
-- of another type is a checker bug, which `fieldTypes` then reports.
widened
  ∷ (Checked.Pattern → Pat) → Ty Open → Array Checked.FieldPattern → Pat
widened simplified ty fields = case ty of
  TRecord row → Headed (recordHead row) (map (fieldAt <<< fst) row.fields)
  _ → Headed (HRecord { labels: map label fields, open: true })
    (map (simplified <<< pattern) fields)
  where
  fieldAt name = maybe Any (simplified <<< pattern) (find (named name) fields)
  named name field = field.label == name
  label field = field.label
  pattern field = field.pattern

-- Two record heads in one column disagree only if checking gave the
-- column's patterns different types, a compiler bug.
otherRecord ∷ Head → Head → Boolean
otherRecord head = case _ of
  found@(HRecord _) → found /= head
  _ → false

patternType ∷ Checked.Pattern → Ty Open
patternType (Checked.Pattern pattern) = pattern.ty
