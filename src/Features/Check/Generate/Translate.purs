-- T-R0b §2.2: a written type `⟦T⟧ν` as a type expression, with the
-- markers its `app` nodes need, in pre-order. Effect rows are erased.
-- Arrow spines are walked by a loop (Domain.Type.Parts `spine`), so a
-- signature of thousands of parameters costs no stack; recursion enters
-- only parameters, fields and arguments, which nesting bounds.
module Features.Check.Generate.Translate
  ( Translated
  , Translations
  , arrowOf
  , record
  , translate
  , translateAll
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple, fst, snd)
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
import Domain.Resolved (TypeInfo, VarId)
import Features.Check.Generate.Fault (Gen, GenerationFault(..))
import Features.Check.Generate.Fresh (Naming)
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Out (TypeMarker(..))

type Translated = { ty ∷ RTExpr, marks ∷ Array TypeMarker }

type Translations = { tys ∷ Array RTExpr, marks ∷ Array TypeMarker }

-- A declared type the tables lack is a fault (`UnknownType`).
translate ∷ Tables → Naming → Ty VarId → Gen Translated
translate tables naming = case _ of
  TInt → plain (Base IntBase)
  TBool → plain (Base BoolBase)
  TText → plain (Base TextBase)
  TUnit → plain (Base UnitBase)
  TVar variable → plain (Atom.TVar (naming variable))
  TRecord row → recordOf (map fst row.fields) (map naming row.tails)
    <$> translateAll tables naming (map snd row.fields)
  TData owner arguments rows → dataOf (Array.null rows)
    <$> typeInfo tables owner
    <*> translateAll tables naming arguments
  THandler (Label effect arguments _) _ →
    headed (HandlerHead effect)
      HandlerMark <$> translateAll tables naming arguments
  arrow@(TFun _ _ _) → spineOf (spine arrow)
  where
  plain ty = pure { ty, marks: [] }
  spineOf found = arrowed <$> translateAll tables naming found.parameters
    <*> translate tables naming found.result

-- Several types in order: their expressions and their markers, each
-- type's in pre-order after the one before.
translateAll ∷ Tables → Naming → Array (Ty VarId) → Gen Translations
translateAll tables naming types = gathered
  <$> traverse (translate tables naming) types
  where
  gathered found = { tys: map _.ty found, marks: Array.concatMap _.marks found }

-- `σ₁ → … → σₙ → τ`, by Array.foldr (a loop).
arrowOf ∷ Array RTExpr → RTExpr → RTExpr
arrowOf parameters result = Array.foldr Arrow result parameters

-- A record in canonical order: fields by label, tails by `Ord Var`
-- (test/r0-canonical.mjs; Task 3.1 carry: `Eq` is order-sensitive).
record ∷ Array (Tuple String RTExpr) → Array Var → RTExpr
record fields tails = Record (Array.sortWith fst fields) (Array.sort tails)

arrowed ∷ Translations → Translated → Translated
arrowed parameters result =
  { ty: arrowOf parameters.tys result.ty
  , marks: parameters.marks <> result.marks
  }

recordOf ∷ Array String → Array Var → Translations → Translated
recordOf labels tails fields =
  { ty: record (Array.zip labels fields.tys) tails, marks: fields.marks }

-- `TData t [] []` is `base t`; any other is `app t [args]`, marked
-- DataOverRecords when the declared type has a record-row parameter,
-- DataApplication otherwise (docs/findings.md "RT1's translator",
-- reading 5).
dataOf ∷ Boolean → { id ∷ TypeId, info ∷ TypeInfo } → Translations → Translated
dataOf noRows owner arguments
  | noRows && Array.null arguments.tys =
      { ty: Base (DataBase owner.id), marks: [] }
  | otherwise = headed (DataHead owner.id) marker arguments
      where
      marker =
        if Array.elem RecordSort owner.info.sorts then OverRecords
        else Application

headed ∷ Head → TypeMarker → Translations → Translated
headed head marker arguments =
  { ty: App head arguments.tys, marks: Array.cons marker arguments.marks }

typeInfo ∷ Tables → TypeId → Gen { id ∷ TypeId, info ∷ TypeInfo }
typeInfo tables id@(TypeId index) = maybe (Left (UnknownType id)) found
  (Array.index tables.types index)
  where
  found info = Right { id, info }
