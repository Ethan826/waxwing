-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §2.2's ⟦·⟧ on a generator type (D1 spec §3.3; R0 Task 7.1a):
-- the recorded form `positioned` logs and `emit` writes, each handle
-- forgotten to its variable by the caller's `forget`. Effect rows are
-- erased; a declared type of no arguments and no rows is a base, any
-- other an `app`, a handler type `app (Handler e)` over its label's
-- arguments; a record's fields go in label order, its tails in `Ord Var`
-- order. Spines are taken apart by a loop (Domain.Type.Parts `spine`).
module Features.Check.Generate.Elab.Recorded (recordedWith) where

import Prelude
import Data.Array (foldr, null, sort, sortWith)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , RTExpr(App, Arrow, Base, Record)
  , Var
  )
import Domain.Recorded.Atom as Atom
import Domain.Row (Label(..))
import Domain.Type (Ty(..))
import Domain.Type.Parts (spine)

recordedWith ∷ ∀ v. (v → Var) → Ty v → RTExpr
recordedWith forget = recorded
  where
  recorded = case _ of
    TInt → Base IntBase
    TBool → Base BoolBase
    TText → Base TextBase
    TUnit → Base UnitBase
    TVar variable → Atom.TVar (forget variable)
    TRecord row → Record (sortWith fst (map field row.fields))
      (sort (map forget row.tails))
    TData owner arguments rows
      | null arguments && null rows → Base (DataBase owner)
      | otherwise → App (DataHead owner) (map recorded arguments)
    THandler (Label effect arguments _) _ →
      App (HandlerHead effect) (map recorded arguments)
    arrow@(TFun _ _ _) → arrowed (spine arrow)
  field (Tuple label value) = Tuple label (recorded value)
  arrowed found = foldr Arrow (recorded found.result)
    (map recorded found.parameters)
