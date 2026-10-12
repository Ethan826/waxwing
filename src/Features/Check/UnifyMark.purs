module Features.Check.UnifyMark
  ( pairMarks
  , equateMarks
  , targetLabel
  , stageLabel
  , advanceTail
  , recorded
  ) where

import Prelude
import Prim hiding (Row)
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe, maybe')
import Domain.Row (EffectRef(..), Label(..), Mark(..))
import Domain.Type (Ty)
import Features.Check.MarkStore
  ( EdgeReason(..)
  , MarkEdge
  , MarkStore
  , RowMode(..)
  , addEdge
  , bindMark
  , resolveMark
  )
import Features.Check.Occurrence (OccurrenceId)
import Features.Check.Subst (Failure(..), Flex, Subst(..), resolveLabel)

type Made = { label ∷ Label (Ty Flex), subst ∷ Subst }

-- Two labels of one key that row unification has matched, the stage's
-- first, with the occurrence of the target's entry for a failure. Equal
-- (a type): marks unify, metas bind, `Unmarked` is skipped, and two
-- different marks clash (P3). Ignored: nothing. Directional (consumption):
-- the frame must be at least as strong as the computation assumes, the
-- target's mark ⊑ the stage's (design §3.4).
pairMarks
  ∷ RowMode
  → Subst
  → OccurrenceId
  → Label (Ty Flex)
  → Label (Ty Flex)
  → Either Failure Subst
pairMarks mode subst occurrence stage target = case mode of
  EqualMarks → maybe' clash Right (equateMarks subst stageMark targetMark)
  IgnoreMarks → Right subst
  Directional direction → Right
    ( recorded subst
        { lower: targetMark
        , upper: stageMark
        , label: stage
        , reason: Assumed direction.span
        }
    )
  where
  Label _ _ stageMark = stage
  Label _ _ targetMark = target
  clash _ = Left
    ( RowPayload (resolveLabel subst stage) (resolveLabel subst target)
        occurrence
    )

-- The label that extends the target's tail for a stage label the target
-- lacks. Directional: a fresh mark t with t ⊑ the stage's, never the
-- stage's own (review rev6 I2).
targetLabel ∷ RowMode → Subst → Label (Ty Flex) → Made
targetLabel mode subst label = case mode of
  EqualMarks → unchanged
  IgnoreMarks → maybe unchanged identity (freshened subst label)
  Directional direction → maybe unchanged (below direction)
    (freshened subst label)
  where
  unchanged = { label, subst }
  Label _ _ stageMark = label
  below direction made = made
    { subst = recorded made.subst
        { lower: markOf made.label
        , upper: stageMark
        , label
        , reason: Extended direction.span
        }
    }

-- The label that extends the stage's tail `meta` for a target label the
-- stage lacks. Directional: a fresh copy c with the target's mark ⊑ c,
-- unless the tail is the throwaway, which nobody reads.
stageLabel ∷ RowMode → Int → Subst → Label (Ty Flex) → Made
stageLabel mode meta subst label = case mode of
  EqualMarks → unchanged
  IgnoreMarks → maybe unchanged identity (freshened subst label)
  Directional direction
    | direction.throwaway == Just meta → unchanged
    | otherwise → maybe unchanged (above direction) (freshened subst label)
  where
  unchanged = { label, subst }
  above direction made = made
    { subst = recorded made.subst
        { lower: markOf label
        , upper: markOf made.label
        , label
        , reason: Copied direction.span
        }
    }

-- The throwaway tail, extended, continues as its fresh tail.
advanceTail ∷ RowMode → Int → Int → RowMode
advanceTail mode old new = case mode of
  Directional direction | direction.throwaway == Just old → Directional
    direction { throwaway = Just new }
  _ → mode

markOf ∷ ∀ t. Label t → Mark
markOf (Label _ _ mark) = mark

-- The same label with a fresh mark meta, from the mark store's own
-- counter. Console stays N and Fail unmarked (design §3.3), which need no
-- meta.
freshened ∷ Subst → Label (Ty Flex) → Maybe Made
freshened (Subst bindings) (Label effect arguments _) = case effect of
  UserEffect _ → Just
    { label: Label effect arguments (MarkMeta bindings.marks.fresh)
    , subst: Subst bindings
        { marks = bindings.marks { fresh = bindings.marks.fresh - 1 } }
    }
  _ → Nothing

-- A mark constraint between labels with a mark each; `Unmarked` has none,
-- and N ⊑ N (Console, mostly) holds always.
recorded ∷ Subst → MarkEdge (Ty Flex) → Subst
recorded subst@(Subst bindings) edge =
  if skipped then subst
  else Subst bindings { marks = addEdge edge bindings.marks }
  where
  skipped = edge.lower == Unmarked || edge.upper == Unmarked
    || (edge.lower == NoFail && edge.upper == NoFail)

-- Unifies two marks (types compare marks so): a meta binds to the other
-- mark (the larger meta to the smaller), `Unmarked` equals everything,
-- `Nothing` is a clash.
equateMarks ∷ Subst → Mark → Mark → Maybe Subst
equateMarks subst@(Subst bindings) one other =
  case resolveMark store one, resolveMark store other of
    Unmarked, _ → Just subst
    _, Unmarked → Just subst
    MarkMeta first, MarkMeta second
      | first == second → Just subst
      | first < second → Just (bound second (MarkMeta first))
      | otherwise → Just (bound first (MarkMeta second))
    MarkMeta meta, found → Just (bound meta found)
    found, MarkMeta meta → Just (bound meta found)
    first, second → if first == second then Just subst else Nothing
  where
  store ∷ MarkStore (Ty Flex)
  store = bindings.marks
  bound meta found = Subst bindings { marks = bindMark meta found store }
