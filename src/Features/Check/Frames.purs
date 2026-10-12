module Features.Check.Frames (markConstraints) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Data.Tuple (Tuple(..), snd)
import Domain.Checked.Internal (Open)
import Domain.Row (Label(..), Mark(..), Row(..), labelMark)
import Domain.Type (Ty, VarId(..))
import Features.Check.Defer (failing)
import Features.Check.Lend (partners)
import Features.Check.MarkStore (EdgeReason(..), MarkEdge)
import Features.Check.Restricted (ClauseEntry, Installation)
import Features.Check.Scheme (Deferral, State, flexible)
import Features.Check.Subst (Flex, Subst)
import Features.Check.UnifyMark (recorded)
import Features.Check.Walked (End(..), endOf, headedRow, walkedRow)

type Edge = MarkEdge (Ty Flex)

-- The constraints that make `defer` sound (design §3.4), generated from the
-- settled, resolved rows (rev6 M2) in this order: per installation (source
-- order) its frame's, per clause entry its own abort, per deferral its
-- demand. `variables` names the signature's row variables.
markConstraints ∷ Array String → State → State
markConstraints variables state = state
  { subst = foldl recorded state.subst edges }
  where
  edges = Array.concatMap (framed variables state.subst) installations
    <> Array.concatMap (aborting variables state.subst) clauses
    <> Array.concatMap (demanded state.subst) deferrals
  installations = Array.sortWith position
    (Array.fromFoldable (Map.values state.restricted.installations))
  position found = found.span.start.offset
  clauses = Array.fromFoldable (Map.values state.restricted.clauses)
  deferrals = map snd (Array.sortWith start numbered)
  numbered = Array.mapWithIndex Tuple state.deferrals
  start (Tuple index found) = Tuple found.span.start.offset index

-- `own ⊑ frame`; each label of C meets the label of the installing row it
-- is paired with, whose mark ⊑ the frame (the clauses reach those outer
-- frames); a rigid tail of C makes the frame M. Console's frame is N by
-- definition (§3.3), so nothing constrains it.
framed ∷ Array String → Subst → Installation → Array Edge
framed variables subst found
  | found.frame == NoFail = []
  | otherwise = Array.cons ownEdge (outerEdges <> rigidEdges)
      where
      ownEdge =
        { lower: found.own
        , upper: found.frame
        , label: flexLabel found.label
        , reason: FrameOwn found.span
        }
      Row labels _ = walkedRow subst found.clauses
      Row current _ = headedRow subst found.current
      outerEdges = map outer
        (partners subst current (Array.filter (not <<< failing) labels))
      outer (Tuple _ partner) =
        { lower: labelMark partner
        , upper: found.frame
        , label: partner
        , reason: FrameOuter found.span
        }
      rigidEdges = case endOf subst found.clauses of
        Fixed variable →
          [ { lower: Plain
            , upper: found.frame
            , label: flexLabel found.label
            , reason: FrameRigid found.span (nameOf variables variable)
            }
          ]
        _ → []

-- A clause whose resolved row holds a `Fail`, or ends in a rigid variable,
-- may abort: M ⊑ the handler's own mark. The edge is about the first `Fail`
-- label, else the handled label.
aborting ∷ Array String → Subst → ClauseEntry → Array Edge
aborting variables subst entry = maybe' rigidAbort failureAbort
  (Array.find failing labels)
  where
  Row labels _ = walkedRow subst entry.row
  failureAbort failure = [ abort (flexLabel failure) Nothing ]
  rigidAbort _ = case endOf subst entry.row of
    Fixed variable →
      [ abort (flexLabel entry.label) (Just (nameOf variables variable)) ]
    _ → []
  abort label rigid =
    { lower: Plain
    , upper: entry.own
    , label
    , reason: OwnAbort
        { handler: entry.handler
        , clause: entry.clause
        , operation: entry.operation
        , rigid
        }
    }

-- Every label a deferral performs must be N (`Fail` is judged apart).
demanded ∷ Subst → Deferral → Array Edge
demanded subst found = map demand
  (Array.filter (not <<< failing) labels)
  where
  Row labels _ = walkedRow subst found.row
  demand label =
    { lower: labelMark label
    , upper: NoFail
    , label: flexLabel label
    , reason: DeferDemand found.span
    }

nameOf ∷ Array String → VarId → String
nameOf variables (VarId index) = fromMaybe "" (Array.index variables index)

flexLabel ∷ Label (Ty Open) → Label (Ty Flex)
flexLabel (Label effect arguments mark) = Label effect
  (map flexible arguments)
  mark
