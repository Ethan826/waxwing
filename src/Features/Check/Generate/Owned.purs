-- trusted surface: every diff needs token review; see docs/engineering.md
-- Owned clause rows C (a-min statements §2 "What generation records for
-- handler types", E4′; amin tranche 1, Task 4). Both are generation's
-- reading of the live checker's rules, never a call to them (T10):
-- `resultClauses` is Check/ResultClauses.purs `ownClauses` (rule H′,
-- FX033) over the recorded instance, `annotationClauses` Check/
-- MarkUse.purs `freshType` and `handlerRows` over a lambda parameter's
-- annotation. C's labels are R's, bare (Check/Walked.purs `bareLabel`:
-- no arguments; a `Fail` label keeps its payload's head, `MData t [] []`
-- for a data payload, any other payload as it stands, which is what
-- `typeHead` keeps of a written type).
module Features.Check.Generate.Owned
  ( annotationClauses
  , resultClauses
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..), isNothing)
import Data.Traversable (Accum, mapAccumL)
import Data.Tuple (Tuple(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , InstanceSig
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  )
import Domain.Recorded.Origin (Path)
import Domain.Row (EffectRef(..))
import Features.Check.Generate.Marked (renumbered)
import Features.Check.Generate.Minted (Part(..), mentions)

-- At a function's use p whose instantiated result is a top-level handler
-- type: C is R's labels bare with R's marks; its tail R's tail variable
-- when that occurs in a parameter, in the callee's row or in the result
-- with R's tail dropped (H′), else `⟨p, result clauses⟩`; closed when R
-- is. A rigid tail cannot occur at a use (every effect-row variable is
-- an instance there) and is kept, as `ownClauses` keeps any non-meta.
resultClauses ∷ Path → InstanceSig → InstanceSig
resultClauses path sig = case sig.result of
  MHandler label rows
    | isNothing rows.clauses → sig
        { result = MHandler label rows
            { clauses = Just (copied rows.inference) }
        }
  _ → sig
  where
  copied row = { labels: map bareLabel row.labels, tail: map kept row.tail }
  kept variable = case variable of
    EffFresh _ _
      | not (mentions variable outside) → EffFresh path ResultClauses
    _ → variable
  outside = map PartTy sig.parameters
    <> [ PartRow sig.row, PartTy (untailed sig.result) ]

-- Parameter j's annotation at lambda p, its unwritten marks already
-- positions: every handler type not inside another handler type's rows
-- gets C, R's labels bare, each unwritten mark a position of its own,
-- tail `⟨p, annotation clauses j k⟩`, k its pre-order index among those
-- handler types (a handler type before its label's arguments; an arrow's
-- parameter, row, result; data's arguments, then rows), so two never
-- share a tail. Then the whole type is renumbered in one pre-order pass
-- (Generate.Marked `renumbered`), so C's positions follow R's. A handler
-- type inside another's rows keeps C = R (`clauses: Nothing`).
annotationClauses ∷ Path → Int → MTy → MTy
annotationClauses path parameter ty =
  renumbered path parameter (owning { path, parameter } 0 ty).value

type Place = { path ∷ Path, parameter ∷ Int }

-- The result handler type without R's tail: every place R's tail
-- variable may occur in the result other than as R's tail.
untailed ∷ MTy → MTy
untailed = case _ of
  MHandler label rows → MHandler label rows
    { inference = rows.inference { tail = Nothing } }
  other → other

bareLabel ∷ MLabel → MLabel
bareLabel label = label { args = kept }
  where
  kept = case label.effect of
    FailEffect → map headOnly label.args
    _ → []
  headOnly = case _ of
    MData owner _ _ → MData owner [] []
    other → other

-- The count is the next eligible handler type's index k.
owning ∷ Place → Int → MTy → Accum Int MTy
owning place k = case _ of
  MBase base → { accum: k, value: MBase base }
  MVar variable → { accum: k, value: MVar variable }
  MRecord fields tails →
    mapped (flip MRecord tails) (mapAccumL field k fields)
  MData owner arguments rows →
    andThen (mapAccumL (owning place) k arguments)
      (mapAccumL (owningRow place) <@> rows)
      (MData owner)
  MHandler label rows →
    mapped (flip MHandler (withClauses place k rows))
      (owningLabel place (k + 1) label)
  arrow@(MArrow _ _ _) → owningSpine place k (spineOf arrow)
  where
  field count (Tuple name inner) =
    mapped (Tuple name) (owning place count inner)

-- C beside R, its marks placeholders that `renumbered` counts.
withClauses
  ∷ Place
  → Int
  → { inference ∷ MRow, clauses ∷ Maybe MRow }
  → { inference ∷ MRow, clauses ∷ Maybe MRow }
withClauses place k rows = rows { clauses = Just owned }
  where
  owned =
    { labels: map (fresh <<< bareLabel) rows.inference.labels
    , tail: Just (EffFresh place.path (AnnotationClauses place.parameter k))
    }
  fresh label = label { mark = freshMark label.mark }
  freshMark = case _ of
    At (Annotation _ _ _) → At (Annotation place.path place.parameter 0)
    mark → mark

owningRow ∷ Place → Int → MRow → Accum Int MRow
owningRow place k row =
  mapped (row { labels = _ }) (mapAccumL (owningLabel place) k row.labels)

owningLabel ∷ Place → Int → MLabel → Accum Int MLabel
owningLabel place k label =
  mapped (label { args = _ }) (mapAccumL (owning place) k label.args)

type MStages = { stages ∷ Array (Tuple MTy MRow), result ∷ MTy }

-- Parameters and rows stage by stage, then the result.
owningSpine ∷ Place → Int → MStages → Accum Int MTy
owningSpine place k found = andThen (mapAccumL stage k found.stages)
  (owning place <@> found.result)
  (flip (Array.foldr arrowOf))
  where
  stage count (Tuple parameter row) =
    andThen (owning place count parameter) (owningRow place <@> row) Tuple
  arrowOf (Tuple parameter row) = MArrow parameter row

spineOf ∷ MTy → MStages
spineOf ty = tailRec step { stages: [], result: ty }
  where
  step found = case found.result of
    MArrow parameter row rest → Loop
      { stages: Array.snoc found.stages (Tuple parameter row), result: rest }
    _ → Done found

andThen
  ∷ ∀ a b c
  . Accum Int a
  → (Int → Accum Int b)
  → (a → b → c)
  → Accum Int c
andThen first next join =
  { accum: second.accum, value: join first.value second.value }
  where
  second = next first.accum

mapped ∷ ∀ a b. (a → b) → Accum Int a → Accum Int b
mapped f found = { accum: found.accum, value: f found.value }
