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
  , isHole
  , readType
  ) where

import Prelude
import Data.Array (foldr, sort, sortWith)
import Data.Array as Array
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal (Open(..))
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , RTExpr(App, Arrow, Base, Record)
  , Role(..)
  , Var(..)
  )
import Domain.Recorded.Atom as Atom
import Domain.Recorded.Origin (Path(..), PathRoot(..), Step(..))
import Domain.Row (Label(..))
import Domain.Type (Ty(..))
import Domain.Type.Parts (spine)

-- At a path generation never writes (`hole` is no constructor field),
-- as Features.Check.Entailed.Mgu's made rows are at `entailed`.
holeVar ∷ Int → Var
holeVar index = FreshVar
  (Path { root: InBody, steps: [ Named "hole", Index index ] })
  Res

isHole ∷ Var → Boolean
isHole = case _ of
  FreshVar (Path { root: InBody, steps: [ Named "hole", Index _ ] }) Res →
    true
  FreshVar _ _ → false
  RigidVar _ → false

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

named ∷ Open → Var
named = case _ of
  Rigid variable → RigidVar variable
  Hole index → holeVar index
