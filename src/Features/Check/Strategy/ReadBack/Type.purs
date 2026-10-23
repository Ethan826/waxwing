-- A settled checked type read as a recorded type (T-R0b §5.3, "Reading
-- back a candidate"; Task 4.3): `Rigid i` reads as the rigid variable
-- `i`, and a remaining `Hole n` as a variable the strategy must still
-- choose, here `holeVar n`, which no problem names. It follows §2.2's
-- translation of written types: effect rows are erased, a declared type
-- of no arguments and no rows is a base, any other is `app`, and a
-- record's fields go in label order and its tails in `Ord Var` order.
-- Written apart from generation's translator (Generate.Translate), so a
-- disagreement between the two shows in RT8 instead of cancelling out.
-- Arrow spines are walked by a loop (Domain.Type.Parts `spine`).
module Features.Check.Strategy.ReadBack.Type
  ( holeVar
  , holesIn
  , isHole
  , readType
  , readSorted
  , settled
  ) where

import Prelude
import Data.Array (concatMap, filter, foldr, mapMaybe, sort, sortWith)
import Data.Array as Array
import Data.Maybe (Maybe(..), isJust)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Checked.Internal (Open(..))
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , RTExpr(App, Arrow, Base, Record)
  , Role(..)
  , Var(..)
  , VarSort(..)
  )
import Domain.Recorded.Atom as Atom
import Domain.Recorded.Origin (Path(..), PathRoot(..), Step(..))
import Domain.Row (Label(..))
import Domain.Type (Ty(..))
import Domain.Type.Parts (spine)
import Features.Check.Spine as Recorded

-- At a path generation never writes (`hole` is no constructor field),
-- as Features.Check.Entailed.Mgu's made rows are at `entailed`.
holeVar ∷ Int → Var
holeVar index = FreshVar
  (Path { root: InBody, steps: [ Named "hole", Index index ] })
  Res

isHole ∷ Var → Boolean
isHole = isJust <<< holeIndex

-- The holes a recorded type mentions, by index, with repeats.
holesIn ∷ RTExpr → Array Int
holesIn ty = case ty of
  Arrow _ _ → concatMap holesIn found.parameters <> holesIn found.result
  Base _ → []
  Atom.TVar variable → mapMaybe holeIndex [ variable ]
  Record fields tails → concatMap (holesIn <<< snd) fields
    <> mapMaybe holeIndex tails
  App _ arguments → concatMap holesIn arguments
  where
  found = Recorded.spine ty

holeIndex ∷ Var → Maybe Int
holeIndex = case _ of
  FreshVar (Path { root: InBody, steps: [ Named "hole", Index index ] }) Res →
    Just index
  FreshVar _ _ → Nothing
  RigidVar _ → Nothing

readType ∷ Ty Open → RTExpr
readType = case _ of
  TInt → Base IntBase
  TBool → Base BoolBase
  TText → Base TextBase
  TUnit → Base UnitBase
  TVar variable → Atom.TVar (named variable)
  TRecord row → Record (sortWith fst (map field row.fields))
    (sort (map named row.tails))
  TData owner arguments rows
    | Array.null arguments && Array.null rows → Base (DataBase owner)
    | otherwise → App (DataHead owner) (map readType arguments)
  THandler (Label effect arguments _) _ →
    App (HandlerHead effect) (map readType arguments)
  arrow@(TFun _ _ _) → arrowed (spine arrow)
  where
  field (Tuple label value) = Tuple label (readType value)
  arrowed found = foldr Arrow (readType found.result)
    (map readType found.parameters)

-- A value read for a variable of the given sort (R022). A row-sorted
-- variable whose checked type is a bare hole takes the hole as a row
-- tail, `{ ...hole n }`, as specialization takes an unsolved
-- record-sorted argument (Specialize/Values.purs `slotType`: `RecordSort,
-- TVar hole@(Hole _) → TRecord (recordRow [] [ hole ])`); read as a type,
-- σ would not be generic. Any other value is as `readType` reads it.
readSorted ∷ VarSort → Ty Open → RTExpr
readSorted sort ty = case sort, ty of
  SortRow, TVar (Hole index) → Record [] [ holeVar index ]
  _, _ → readType ty

named ∷ Open → Var
named = case _ of
  Rigid variable → RigidVar variable
  Hole index → holeVar index

-- ReadBack's step 4, and the hole contract's defaults (W §1.5): a type
-- hole is `Int`, a row hole is no tail (today's lowering, Lower.purs).
settled ∷ RTExpr → RTExpr
settled ty = case ty of
  Arrow _ _ → Recorded.unspine
    { parameters: map settled found.parameters, result: settled found.result }
  Base base → Base base
  Atom.TVar variable
    | isHole variable → Base IntBase
    | otherwise → ty
  Record entries tails →
    Record (map field entries) (filter (not <<< isHole) tails)
  App head arguments → App head (map settled arguments)
  where
  found = Recorded.spine ty
  field (Tuple label value) = Tuple label (settled value)
