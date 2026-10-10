module Features.Check.TypeName
  ( Names
  , typeName
  , labelParts
  , labelText
  , markPrefix
  , rendered
  , listed
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.String (joinWith)
import Data.Traversable (traverse)
import Data.Tuple (fst, snd)
import Domain.Checked.Internal (Open(..))
import Domain.Ids (EffectId(..))
import Domain.Problem (LabelName, Problem(..), TypeName(..))
import Domain.Resolved (EffectInfo, TypeInfo)
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..), TyRow, TypeId(..), VarId(..))
import Domain.Type.Parts (rowsOf, spine)

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
typeName env span = case _ of
  TInt → Right IntName
  TBool → Right BoolName
  TUnit → Right UnitName
  TData (TypeId index) arguments _ → maybe' missing (named arguments)
    (Array.index env.types index)
  TVar (Rigid (VarId index)) → maybe' unnamed (Right <<< VariableName)
    (Array.index env.variables index)
  TVar (Hole _) → Right HoleName
  arrow@(TFun _ _ _) → arrowName env span arrow
  THandler label _ → handlerName label
  where
  missing _ = Left (problemAt (Internal "Invalid resolved type") span)
  unnamed _ = Left (problemAt (Internal "Unnamed type variable") span)
  named arguments info
    | Array.null arguments = Right (DataName info.name)
    | otherwise = AppliedName info.name <$> traverse (typeName env span)
        arguments
  handlerName label = do
    view ← labelParts env span label
    Right (AppliedName "Handler" [ applied view.effect view.arguments ])
  applied name [] = DataName name
  applied name arguments = AppliedName name arguments

-- Parameter by parameter, each arrow with the row text it shows, if any.
arrowName
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → Ty Open
  → Either Diagnostic TypeName
arrowName env span arrow = curried
  <$> traverse (typeName env span)
    found.parameters
  <*> traverse (arrowRowText env span) (rowsOf arrow)
  <*> typeName env span found.result
  where
  found = spine arrow
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

-- An arrow's row is part of its name only when it holds a mark (so today's
-- texts are unchanged): `Unit -> Unit with nofail Log`. Its named tail
-- follows, as written; an ambient or unsolved tail has no name.
arrowRowText
  ∷ ∀ r
  . Names (effects ∷ Array EffectInfo | r)
  → Span
  → TyRow Open
  → Either Diagnostic (Maybe String)
arrowRowText env span (Row labels tail) =
  if Array.any marked labels then Just <<< joined
    <$> traverse (labelText env span) labels
  else Right Nothing
  where
  marked (Label effect _ mark) = markPrefix effect mark /= ""
  joined parts = joinWith " + " (parts <> maybe [] tailPart tail)
  tailPart = case _ of
    Rigid (VarId index) → maybe [] ending (Array.index env.variables index)
    Hole _ → []
  ending name = if name == "" then [] else [ "..." <> name ]

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
