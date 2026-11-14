-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §2.2: a written type `⟦T⟧ν` as a generator type (D1 spec §3.2,
-- `GenTy`; R0 Task 7.1b), with the markers its `app` nodes need, in
-- pre-order. Its recorded form (Generate.Elab.Recorded) is Task 3.2's
-- translation, which erases effect rows; the checked form keeps them as
-- the naming allows: under `ν_f` (`Rigidly`) a declared row is the
-- declaration's own, rigid and static, and is kept; under `θ`
-- (`Instantiated`) every effect position is a meta today, so it is the
-- closed empty row (§12.1's fallback, Task 7.1 ruling, provisional) and
-- no handle ever stands in an effect row. A row's count is kept, so a
-- declared type of row arguments only stays an `app`. Arrow spines are
-- walked by a loop (Generate.Elab.Stages), so a signature of thousands
-- of parameters costs no stack; recursion enters only parameters,
-- fields and arguments, which nesting bounds.
module Features.Check.Generate.Translate
  ( Naming(..)
  , Translated
  , Translations
  , named
  , translate
  , translateAll
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Ids (TypeId(..))
import Domain.Resolved (TypeInfo, VarId(..))
import Domain.Row (Label(..), closedRow, mapHandlerRows, openRow)
import Domain.Syntax (Sort(..))
import Domain.Type (Ty(..), TyRow, substituteRow)
import Domain.Type.Record (recordRow)
import Features.Check.Generate.Elab (GenTy, Handle, Ref(..))
import Features.Check.Generate.Elab.Stages (arrowed, stagesOf)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Out (TypeMarker(..))

-- How a written type's variables read at one place (§2.2): inside the
-- declaration, its rigid variables (`ν_f`); at an occurrence, the
-- handles of its `⟨p, inst i⟩`, by `VarId`, none for an effect row.
data Naming s = Rigidly | Instantiated (Array (Maybe (Handle s)))

type Translated s = { ty ∷ GenTy s, marks ∷ Array TypeMarker }

type Translations s = { tys ∷ Array (GenTy s), marks ∷ Array TypeMarker }

-- A variable in a type or record-tail position. A variable no handle
-- stands for is an effect row's, which Resolve keeps out of both
-- positions: a fault, not a guess.
named ∷ ∀ s. Naming s → VarId → Either GenerationFault (Ref s)
named naming variable@(VarId index) = case naming of
  Rigidly → Right (RigidRef variable)
  Instantiated handles → maybe (Left (VariableSort variable))
    (Right <<< FlexRef)
    (join (Array.index handles index))

-- A declared type the tables lack is a fault (`UnknownType`).
translate
  ∷ ∀ s. Tables → Naming s → Ty VarId → Either GenerationFault (Translated s)
translate tables naming = case _ of
  TInt → plain TInt
  TBool → plain TBool
  TText → plain TText
  TUnit → plain TUnit
  TVar variable → plain <<< TVar =<< named naming variable
  TRecord row → recordOf (map fieldName row.fields)
    <$> translateAll tables naming (map fieldType row.fields)
    <*> traverse (named naming) row.tails
  TData owner arguments rows → dataOf tables.admitted
    (map (rowOf naming) rows)
    <$> typeInfo tables owner
    <*> translateAll tables naming arguments
  THandler (Label effect arguments mark) rows →
    handlerOf (Label effect <@> mark) (mapHandlerRows (rowOf naming) rows)
      <$> translateAll tables naming arguments
  arrow@(TFun _ _ _) → spineOf (stagesOf arrow)
  where
  plain ty = pure { ty, marks: [] }
  fieldName (Tuple label _) = label
  fieldType (Tuple _ ty) = ty
  stage (Tuple _ row) ty = Tuple ty (rowOf naming row)
  spineOf found = arrowedOf (map stage found.stages)
    <$> translateAll tables naming (map fieldOf found.stages)
    <*> translate tables naming found.result
  fieldOf (Tuple parameter _) = parameter

-- Several types in order: their types and their markers, each type's in
-- pre-order after the one before.
translateAll
  ∷ ∀ s
  . Tables
  → Naming s
  → Array (Ty VarId)
  → Either GenerationFault (Translations s)
translateAll tables naming types = gathered
  <$> traverse (translate tables naming) types
  where
  gathered found = { tys: map _.ty found, marks: Array.concatMap _.marks found }

-- An effect row under the naming: the declaration's own, renamed, or
-- the closed empty row at an occurrence (§12.1's fallback).
rowOf ∷ ∀ s. Naming s → TyRow VarId → TyRow (Ref s)
rowOf naming row = case naming of
  Rigidly → substituteRow
    { types: TVar <<< RigidRef, rows: openRow <<< RigidRef }
    row
  Instantiated _ → closedRow

arrowedOf
  ∷ ∀ s
  . Array (GenTy s → Tuple (GenTy s) (TyRow (Ref s)))
  → Translations s
  → Translated s
  → Translated s
arrowedOf stages parameters result =
  { ty: arrowed (Array.zipWith identity stages parameters.tys) result.ty
  , marks: parameters.marks <> result.marks
  }

recordOf ∷ ∀ s. Array String → Translations s → Array (Ref s) → Translated s
recordOf labels fields tails =
  { ty: TRecord (recordRow (Array.zip labels fields.tys) tails)
  , marks: fields.marks
  }

-- `TData t [] []` is `base t`; any other is `app t [args]`, marked
-- DataOverRecords when the declared type has a record-row parameter,
-- DataApplication otherwise (docs/findings.md "RT1's translator",
-- reading 5), except Scope A's in-scope nodes (design §4 D6 as amended;
-- dossier §18.198): an admitted head (Features.Check.Admitted) whose
-- arguments are plain carries no marker. The substitution check repeats
-- the test after the candidate, where a variable may become an arrow.
dataOf
  ∷ ∀ s
  . Set TypeId
  → Array (TyRow (Ref s))
  → { id ∷ TypeId, info ∷ TypeInfo }
  → Translations s
  → Translated s
dataOf admitted rows owner arguments =
  { ty: TData owner.id arguments.tys rows, marks }
  where
  marks
    | Array.null rows && Array.null arguments.tys = []
    | inScope = arguments.marks
    | otherwise = Array.cons marker arguments.marks
  inScope = Set.member owner.id admitted
    && Array.all (plainArgument admitted) arguments.tys
  marker =
    if Array.elem RecordSort owner.info.sorts then OverRecords
    else Application

-- An argument of an in-scope node (D6 4′ and 8): builtins, variables,
-- and admitted declared types applied to plain arguments; no arrow,
-- handler or record at any depth.
plainArgument ∷ ∀ s. Set TypeId → GenTy s → Boolean
plainArgument admitted = case _ of
  TData id arguments rows → Set.member id admitted && Array.null rows
    && Array.all (plainArgument admitted) arguments
  TFun _ _ _ → false
  THandler _ _ → false
  TRecord _ → false
  TVar _ → true
  TInt → true
  TBool → true
  TText → true
  TUnit → true

handlerOf
  ∷ ∀ s
  . (Array (GenTy s) → Label (GenTy s))
  → { inference ∷ TyRow (Ref s), clauses ∷ Maybe (TyRow (Ref s)) }
  → Translations s
  → Translated s
handlerOf label rows arguments =
  { ty: THandler (label arguments.tys) rows
  , marks: Array.cons HandlerMark arguments.marks
  }

typeInfo
  ∷ Tables → TypeId → Either GenerationFault { id ∷ TypeId, info ∷ TypeInfo }
typeInfo tables id@(TypeId index) = maybe (Left (UnknownType id)) found
  (Array.index tables.types index)
  where
  found info = Right { id, info }
