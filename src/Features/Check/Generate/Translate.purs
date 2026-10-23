-- T-R0b §2.2: a written type `⟦T⟧ν` as a type expression, with the
-- markers its `app` nodes need, in pre-order. Effect rows are erased.
-- Arrow spines are walked by a loop (Domain.Type.Parts `spine`), so a
-- signature of thousands of parameters costs no stack; recursion enters
-- only parameters, fields and arguments, which nesting bounds.
module Features.Check.Generate.Translate
  ( Translated
  , arrowOf
  , record
  , translate
  , translateAll
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Ids (TypeId(..))
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , RTExpr(App, Arrow, Base, Record)
  , Var
  )
import Domain.Recorded.Atom as Atom
import Domain.Row (Label(..))
import Domain.Syntax (Sort(..))
import Domain.Type (Ty(..))
import Domain.Type.Parts (spine)
import Domain.Resolved (VarId)
import Features.Check.Generate.Fresh (Naming)
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Out (TypeMarker(..))

type Translated = { ty ∷ RTExpr, marks ∷ Array TypeMarker }

translate ∷ Tables → Naming → Ty VarId → Translated
translate tables naming = case _ of
  TInt → plain (Base IntBase)
  TBool → plain (Base BoolBase)
  TText → plain (Base TextBase)
  TUnit → plain (Base UnitBase)
  TVar variable → plain (Atom.TVar (naming variable))
  TRecord row → recordOf (translateAll tables naming (map snd' row.fields))
    (map fst row.fields)
    (map naming row.tails)
  TData owner arguments rows → dataOf tables owner
    (Array.null rows)
    (translateAll tables naming arguments)
  THandler (Label effect arguments _) _ → headed (HandlerHead effect)
    HandlerMark
    (translateAll tables naming arguments)
  arrow@(TFun _ _ _) → spineOf (spine arrow)
  where
  plain ty = { ty, marks: [] }
  snd' (Tuple _ ty) = ty
  spineOf found = arrowed (translateAll tables naming found.parameters)
    (translate tables naming found.result)

-- Several types in order: their expressions and their markers, each
-- type's in pre-order after the one before.
translateAll
  ∷ Tables
  → Naming
  → Array (Ty VarId)
  → { tys ∷ Array RTExpr, marks ∷ Array TypeMarker }
translateAll tables naming types =
  { tys: map _.ty found, marks: Array.concatMap _.marks found }
  where
  found = map (translate tables naming) types

-- `σ₁ → … → σₙ → τ`, by Array.foldr (a loop).
arrowOf ∷ Array RTExpr → RTExpr → RTExpr
arrowOf parameters result = Array.foldr Arrow result parameters

-- A record in canonical order: fields by label, tails by `Ord Var`
-- (test/r0-canonical.mjs; Task 3.1 carry: `Eq` is order-sensitive).
record ∷ Array (Tuple String RTExpr) → Array Var → RTExpr
record fields tails = Record (Array.sortWith fst fields) (Array.sort tails)

arrowed
  ∷ { tys ∷ Array RTExpr, marks ∷ Array TypeMarker } → Translated → Translated
arrowed parameters result =
  { ty: arrowOf parameters.tys result.ty
  , marks: parameters.marks <> result.marks
  }

recordOf
  ∷ { tys ∷ Array RTExpr, marks ∷ Array TypeMarker }
  → Array String
  → Array Var
  → Translated
recordOf fields labels tails =
  { ty: record (Array.zip labels fields.tys) tails, marks: fields.marks }

-- `TData t [] []` is `base t`; any other is `app t [args]`, marked.
dataOf
  ∷ Tables
  → TypeId
  → Boolean
  → { tys ∷ Array RTExpr, marks ∷ Array TypeMarker }
  → Translated
dataOf tables owner noRows arguments
  | noRows && Array.null arguments.tys =
      { ty: Base (DataBase owner), marks: [] }
  | otherwise = headed (DataHead owner) (dataMarker tables owner) arguments

headed
  ∷ Head
  → TypeMarker
  → { tys ∷ Array RTExpr, marks ∷ Array TypeMarker }
  → Translated
headed head marker arguments =
  { ty: App head arguments.tys, marks: Array.cons marker arguments.marks }

-- DataOverRecords when the declared type has a record-row parameter,
-- DataApplication otherwise (docs/findings.md "RT1's translator",
-- reading 5).
dataMarker ∷ Tables → TypeId → TypeMarker
dataMarker tables (TypeId index) =
  maybe Application overRecords (Array.index tables.types index)
  where
  overRecords info =
    if Array.elem RecordSort info.sorts then OverRecords else Application
