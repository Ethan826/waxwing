module Features.Resolve.Imports (bindings) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Tuple (Tuple(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (Label(..), Row(..))
import Domain.Syntax as Syntax
import Domain.Type (TyRow)
import Features.Resolve.Builtin (Declared, Operation(..), builtinEffects)
import Features.Resolve.Qualified (declared)
import Features.Resolve.Scope (Bindings, Import)

-- An import and where its local name was written.
type Bound = { entry ∷ Import, span ∷ Syntax.Span }

-- A function's own row builds its aliases and imports (FX020 §1-§3): each
-- label carries its resolved twin, from which a `Fail(E)` import takes `E`.
-- Resolution never reads the row afterwards.
bindings
  ∷ Array Syntax.EffectDecl
  → Array Resolved.EffectInfo
  → Syntax.FunctionDecl
  → TyRow Resolved.VarId
  → Either Syntax.Diagnostic Bindings
bindings declarations infos function row = do
  aliased ← foldM (alias declarations) [] labels
  imported ← foldM (importing infos) [] pairs
  pure
    { aliases: map aliasOf aliased
    , imports: map entryOf imported
    }
  where
  labels = maybe [] rowLabels function.row
  rowLabels (Syntax.RowRef _ found _) = found
  pairs = Array.zip labels (resolvedLabels row)
  resolvedLabels (Row found _) = found
  aliasOf found = { name: found.name, effect: found.effect }
  entryOf found = found.entry

type Aliased = { name ∷ String, effect ∷ String, span ∷ Syntax.Span }

alias
  ∷ Array Syntax.EffectDecl
  → Array Aliased
  → Syntax.LabelRef
  → Either Syntax.Diagnostic (Array Aliased)
alias declarations before label = maybe' (const (Right before)) written
  label.alias
  where
  written found = maybe' (const (Right (Array.snoc before (entry found))))
    Left
    (collision declarations before found)
  entry found =
    { name: found.name, effect: label.name, span: found.span }

called ∷ ∀ r. String → { name ∷ String | r } → Boolean
called wanted entry = entry.name == wanted

-- An alias may not equal any declared effect name, built-in or not, or an
-- earlier alias in this row (FX020 §3).
collision
  ∷ Array Syntax.EffectDecl
  → Array Aliased
  → Syntax.Alias
  → Maybe Syntax.Diagnostic
collision declarations before found = maybe' otherwise (Just <<< declaredAt)
  (Array.find (called found.name) declarations)
  where
  message = Syntax (found.name <> " is already an effect name")
  declaredAt declaration =
    noted found.span message declaration.nameSpan Syntax.EffectDeclaredHere
  otherwise _ = maybe' builtin (Just <<< boundAt)
    (Array.find (called found.name) before)
  builtin _ =
    if Array.any (called found.name) builtinEffects then
      Just (Syntax.problemAt message found.span)
    else Nothing
  boundAt earlier =
    noted found.span message earlier.span Syntax.FirstBoundHere

importing
  ∷ Array Resolved.EffectInfo
  → Array Bound
  → Tuple Syntax.LabelRef (Label (Resolved.Ty Resolved.VarId))
  → Either Syntax.Diagnostic (Array Bound)
importing infos before (Tuple label resolved) = foldM
  (importOne infos label resolved)
  before
  (maybe [] namesOf label.imports)

namesOf ∷ Syntax.Imports → Array Syntax.Import
namesOf imports = imports.names

importOne
  ∷ Array Resolved.EffectInfo
  → Syntax.LabelRef
  → Label (Resolved.Ty Resolved.VarId)
  → Array Bound
  → Syntax.Import
  → Either Syntax.Diagnostic (Array Bound)
importOne infos label resolved before found = do
  operation ← either (Left <<< unknown) Right
    (declared infos label.name found.name)
  maybe' (const (Right (Array.snoc before (bound operation))))
    (Left <<< twice)
    (Array.find (sameLocal found.local) before)
  where
  unknown = const
    ( Syntax.problemAt (HandlerOperation found.name label.name)
        found.nameSpan
    )
  sameLocal wanted entry = entry.entry.local == wanted
  bound declaration =
    { entry:
        { local: found.local
        , declared: declaration
        , family: familyOf declaration resolved
        }
    , span: found.localSpan
    }
  twice earlier = noted found.localSpan
    (Syntax (found.local <> " is imported twice in this signature"))
    earlier.span
    Syntax.FirstImportedHere

-- Only Fail has a family to fix; its label's one argument is the payload.
familyOf ∷ ∀ t. Declared → Label t → Maybe t
familyOf found (Label _ arguments _) = case found.operation of
  FailOperation → Array.head arguments
  _ → Nothing

noted
  ∷ Syntax.Span
  → Problem
  → Syntax.Span
  → Syntax.NoteReason
  → Syntax.Diagnostic
noted span problem at reason =
  { problem, span, related: [ { span: at, reason } ] }
