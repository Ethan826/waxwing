module Features.Check.TypeName
  ( Names
  , typeName
  , typeNames
  , labelParts
  , labelText
  , markPrefix
  , rendered
  , listed
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromMaybe, maybe, maybe')
import Data.String (joinWith)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Checked.Internal (Open(..))
import Domain.Ids (EffectId(..))
import Domain.Problem (LabelName, Problem(..), TypeName(..))
import Domain.Resolved (EffectInfo, TypeInfo)
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..), clauseRow)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..), TyRow, TypeId(..), VarId(..))
import Domain.Type.Parts (children, rowArguments, rowsOf, spine)

type Names r =
  { types ∷ Array TypeInfo
  , variables ∷ Array String
  | r
  }

-- Names appear only in diagnostics, never in generated Go. An arrow's
-- spine is named parameter by parameter, by a loop (Array.foldr).
typeName
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Ty Open
  → Either Diagnostic TypeName
typeName env span ty = typeNameIn (markedType ty) env span ty

-- The two types of one mismatch, named with one decision: when either shows
-- a handler clause row or an arrow row (it holds a mark), both show theirs,
-- so the difference is visible (user ruling 2026-10-10).
typeNames
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Ty Open
  → Ty Open
  → Either Diagnostic (Tuple TypeName TypeName)
typeNames env span one other = Tuple <$> typeNameIn shown env span one
  <*> typeNameIn shown env span other
  where
  shown = markedType one || markedType other

-- `shown`: rows are part of the name. A handler's clause row then prints
-- even when empty (`with pure`); an arrow's row only when it has something.
typeNameIn
  ∷ ∀ r
  . Boolean
  → Names (effects ∷ Array EffectInfo | r)
  → Span
  → Ty Open
  → Either Diagnostic TypeName
typeNameIn shown env span = case _ of
  TInt → Right IntName
  TBool → Right BoolName
  TUnit → Right UnitName
  TText → Right TextName
  TData (TypeId index) arguments _ → maybe' missing (named arguments)
    (Array.index env.types index)
  TVar (Rigid (VarId index)) → maybe' unnamed (Right <<< VariableName)
    (Array.index env.variables index)
  TVar (Hole _) → Right HoleName
  arrow@(TFun _ _ _) → arrowName shown env span arrow
  THandler label rows → handlerName label (clauseRow rows)
  where
  missing _ = Left (problemAt (Internal "Invalid resolved type") span)
  unnamed _ = Left (problemAt (Internal "Unnamed type variable") span)
  named arguments info
    | Array.null arguments = Right (DataName info.name)
    | otherwise = AppliedName info.name <$> traverse (typeNameIn shown env span)
        arguments
  handlerName label clauses = do
    view ← labelParts env span label
    text ← arrowRowText env span shown clauses
    Right
      ( AppliedName "Handler"
          [ withClauses text (applied view.effect view.arguments) ]
      )
  applied name [] = DataName name
  applied name arguments = AppliedName name arguments
  withClauses text inner
    | shown = DataName (rendered inner <> " with " <> fromMaybe "pure" text)
    | otherwise = inner

-- Whether a type holds a mark in an arrow's row or a handler's clause row,
-- anywhere in it. The handled label's own mark does not count.
markedType ∷ Ty Open → Boolean
markedType ty = Array.any rowMarked rows
  || Array.any markedType (children ty)
  || Array.any markedArguments rows
  where
  rows = case ty of
    THandler _ handled → [ clauseRow handled ]
    _ → rowsOf ty
  markedArguments row = Array.any markedType (rowArguments row)

-- Parameter by parameter, each arrow with the row text it shows, if any.
arrowName
  ∷ ∀ r
  . Boolean
  → Names (effects ∷ Array EffectInfo | r)
  → Span
  → Ty Open
  → Either Diagnostic TypeName
arrowName shown env span arrow = curried
  <$> traverse (typeNameIn shown env span)
    found.parameters
  <*> traverse (arrowRowText env span shown) rows
  <*> typeNameIn shown env span found.result
  where
  found = spine arrow
  rows = rowsOf arrow
  curried parameters texts result = Array.foldr joined result
    (Array.zip parameters texts)
  joined pair rest = FunctionName (fst pair) (snd pair) rest

-- An effect and its arguments as names, the effect carrying its written
-- mark (`nofail Log`), for a diagnostic that elides the arguments off the
-- path to a difference.
labelParts
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Label (Ty Open)
  → Either Diagnostic LabelName
labelParts env span (Label effect arguments mark) = do
  name ← effectName env span effect
  parts ← traverse (typeName env span) arguments
  pure { effect: markPrefix effect mark <> name, arguments: parts }

labelText
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Label (Ty Open)
  → Either Diagnostic String
labelText env span label = printed <$> labelParts env span label
  where
  printed view = view.effect <> listed (map rendered view.arguments)

-- A label's written mark, as a row prints it: `nofail ` or `nofail(k) `.
-- Console is always `nofail` and Fail carries none (design §3.3), so neither
-- ever prints it; an unwritten or unsolved mark prints plain.
markPrefix ∷ EffectRef → Mark → String
markPrefix effect mark = case effect, mark of
  UserEffect _, NoFail → "nofail "
  UserEffect _, MarkVariable name → "nofail(" <> name <> ") "
  _, _ → ""

-- Rows are part of a type's name only when some arrow of its spine holds a
-- mark (so today's texts are unchanged): `Unit -> Unit with nofail Log`.
-- Then every arrow shows its row, so none is silently dropped. A named
-- tail follows, as written; an ambient or unsolved tail has no name, and a
-- row with nothing to show shows nothing.
arrowRowText
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Boolean
  → TyRow Open
  → Either Diagnostic (Maybe String)
arrowRowText env span shown (Row labels tail) =
  if shown then present <$> traverse (labelText env span) labels
  else Right Nothing
  where
  present parts = nonEmpty (joined parts)
  nonEmpty text = if text == "" then Nothing else Just text
  joined parts = joinWith " + " (parts <> maybe [] tailPart tail)
  tailPart = case _ of
    Rigid (VarId index) → maybe [] ending (Array.index env.variables index)
    Hole _ → []
  ending name = if name == "" then [] else [ "..." <> name ]

-- Whether a row holds a label that prints a mark.
rowMarked ∷ TyRow Open → Boolean
rowMarked (Row labels _) = Array.any marked labels
  where
  marked (Label effect _ mark) = markPrefix effect mark /= ""

effectName
  ∷ ∀ r
  . { effects ∷ Array EffectInfo | r }
  → Span
  → EffectRef
  → Either Diagnostic String
effectName env span = case _ of
  ConsoleEffect → Right "Console"
  FailEffect → Right "Fail"
  UserEffect (EffectId index) → maybe' invalid (Right <<< _.name)
    (Array.index env.effects index)
  where
  invalid _ = Left (problemAt (Internal "Invalid handler effect") span)

listed ∷ Array String → String
listed parts =
  if Array.null parts then "" else "(" <> joinWith ", " parts <> ")"

-- A name as plain text, for a label's elided argument; an arrow's row follows
-- the segment it is written after, as the diagnostic's own printer does.
rendered ∷ TypeName → String
rendered = case _ of
  IntName → "Int"
  BoolName → "Bool"
  UnitName → "Unit"
  TextName → "Text"
  DataName name → name
  AppliedName name arguments → name <> listed (map rendered arguments)
  VariableName name → name
  HoleName → "_"
  arrow@(FunctionName _ _ _) → arrowText Nothing arrow

arrowText ∷ Maybe String → TypeName → String
arrowText pending = case _ of
  FunctionName parameter row result → rendered parameter <> withRow pending
    <> " -> "
    <> arrowText row result
  other → rendered other <> withRow pending
  where
  withRow = maybe "" (append " with ")
