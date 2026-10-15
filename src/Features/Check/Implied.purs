module Features.Check.Implied (Implied, implied, declared) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Resolved (CtorId(..), TypeId(..))
import Domain.Resolved as Resolved
import Domain.Syntax as Syntax
import Domain.Type (Ty(..), VarId(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)

-- What a type says each record tail in it lacks (R001 design §2): a
-- record's own labels, and, where a tail is a declared type's record
-- argument, the labels that type's declaration writes beside its
-- parameter, through other declarations too.
type Implied v = { tail ∷ v, labels ∷ Set String }

-- A tail beside labels, or passed as a declaration's record parameter
-- (its position among the declaration's parameters).
data Fact v = Beside v (Set String) | Passed TypeId Int v

-- Every tail's implied labels, one entry per occurrence.
implied ∷ ∀ v. Resolved.Tables → Ty v → Array (Implied v)
implied tables ty = Array.mapMaybe settled (facts tables ty)
  where
  settled = case _ of
    Beside tail labels → Just { tail, labels }
    Passed owner position tail → Just
      { tail, labels: declared tables owner position }

-- The facts of a type and of every type within it. Recursion is over
-- written structure, which the nesting limits bound.
facts ∷ ∀ v. Resolved.Tables → Ty v → Array (Fact v)
facts tables ty = own <> Array.concatMap inner (children ty)
  <> Array.concatMap (Array.concatMap inner <<< rowArguments) (rowsOf ty)
  where
  inner part = facts tables part
  own = case ty of
    TRecord { fields, tail: Just tail } →
      [ Beside tail (Set.fromFoldable (map fst fields)) ]
    TData owner arguments _ → passed tables owner arguments
    _ → []

-- A type argument that is a record's tail, at its parameter's position.
passed ∷ ∀ v. Resolved.Tables → TypeId → Array (Ty v) → Array (Fact v)
passed tables owner arguments = Array.catMaybes
  (Array.zipWith argument (slots tables owner) arguments)
  where
  argument position = case _ of
    TRecord { tail: Just tail } → Just (Passed owner position tail)
    _ → Nothing

-- The positions of a declaration's type arguments: its parameters that
-- are not effect rows, in order.
slots ∷ Resolved.Tables → TypeId → Array Int
slots tables (TypeId owner) = maybe [] positions
  (Array.index tables.types owner)
  where
  positions info = Array.catMaybes (Array.mapWithIndex slot info.sorts)
  slot position sort =
    if sort == Syntax.RowSort then Nothing else Just position

-- The labels a declaration's record parameter lacks, gathered over every
-- declaration it is passed to, by a loop over a worklist; each parameter
-- is entered once, so recursive declarations end.
declared ∷ Resolved.Tables → TypeId → Int → Set String
declared tables owner position = tailRec step
  { pending: [ Tuple owner position ], seen: Set.empty, labels: Set.empty }
  where
  step found = maybe (Done found.labels) (Loop <<< visit found)
    (Array.uncons found.pending)
  visit found { head, tail }
    | Set.member head found.seen = found { pending = tail }
    | otherwise = foldl (gathered head) (entered found head tail)
        (fieldFacts tables (fst head))
  entered found head tail =
    found { pending = tail, seen = Set.insert head found.seen }
  gathered (Tuple _ at) found = case _ of
    Beside (VarId tail) labels | tail == at →
      found { labels = Set.union labels found.labels }
    Passed next nextAt (VarId tail) | tail == at →
      found { pending = Array.snoc found.pending (Tuple next nextAt) }
    _ → found

-- The facts of every field of every constructor of a declaration.
fieldFacts ∷ Resolved.Tables → TypeId → Array (Fact VarId)
fieldFacts tables (TypeId owner) = maybe [] ofType
  (Array.index tables.types owner)
  where
  ofType info = Array.concatMap ofCtor info.ctors
  ofCtor (CtorId index) = maybe [] ofFields (Array.index tables.ctors index)
  ofFields ctor = Array.concatMap (facts tables) ctor.fields
