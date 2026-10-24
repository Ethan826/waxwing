-- A witness image as a checked type (D1 spec §3.2; R0 Task 7.1a). Task
-- 4.4's witness holds recorded types (`Inline RTExpr`, a labelled
-- amendment of W §1.6), so `build` turns an image back into the form
-- the checked IR stores: a rigid variable is `Rigid i`, a hole variable
-- `Hole n` (Domain.Recorded.Hole), a base its type, `app` a data or
-- handler type. Recorded types erase effect rows (T-R0b §2.2), so every
-- row comes back closed and empty, and a data type's row arguments are
-- left out: §12.1's fallback (Task 7.1 ruling, 2026-10-23), compared
-- only on effect-erased projections until E-a's witness representation
-- is decided (docs/plans/r0-ea-representation.md). Any other variable
-- is `Left`: the image mentions a problem variable, which no checked
-- type can hold.
module Features.Check.Generate.Elab.Image (imageType) where

import Prelude
import Data.Array (foldr)
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(..))
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , RTExpr(App, Arrow, Base, Record)
  , Var(..)
  )
import Domain.Recorded.Atom as Atom
import Domain.Recorded.Hole (holeIndex)
import Domain.Row (Label(..), Mark(..), closedRow)
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.Spine (spine)

imageType ∷ RTExpr → Either Var (Ty Open)
imageType ty = case ty of
  Arrow _ _ → arrowed <$> traverse imageType found.parameters
    <*> imageType found.result
  Base base → Right (baseType base)
  Atom.TVar variable → TVar <$> openOf variable
  Record entries tails → TRecord <$>
    (recordRow <$> traverse field entries <*> traverse openOf tails)
  App head arguments → applied head <$> traverse imageType arguments
  where
  found = spine ty
  field (Tuple label value) = Tuple label <$> imageType value

baseType ∷ Base → Ty Open
baseType = case _ of
  IntBase → TInt
  BoolBase → TBool
  TextBase → TText
  UnitBase → TUnit
  DataBase owner → TData owner [] []

applied ∷ Head → Array (Ty Open) → Ty Open
applied head arguments = case head of
  DataHead owner → TData owner arguments []
  HandlerHead effect → THandler (Label effect arguments Unmarked)
    { inference: closedRow, clauses: Nothing }

arrowed ∷ Array (Ty Open) → Ty Open → Ty Open
arrowed parameters result = foldr stage result parameters
  where
  stage parameter rest = TFun parameter closedRow rest

openOf ∷ Var → Either Var Open
openOf variable = case variable of
  RigidVar index → Right (Rigid index)
  FreshVar _ _ → maybe (Left variable) (Right <<< Hole) (holeIndex variable)
