module Features.Check.MarkStore
  ( MarkEdge
  , EdgeReason(..)
  , AbortSite
  , MarkStore
  , RowMode(..)
  , Direction
  , emptyMarks
  , resolveMark
  , bindMark
  , addEdge
  , edgesOf
  ) where

import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Domain.Row (Label, Mark(..))
import Domain.Syntax (Span)
import Features.Check.Search (Stack(..), stackItems)

-- `lower ⊑ upper`: lower is at least as strong as upper (N ⊑ M); the
-- label is the one the edge is about, for the messages of later tasks
-- (FX008 design §3.4). Edges are recorded here and read by §3.5.
type MarkEdge t =
  { lower ∷ Mark, upper ∷ Mark, label ∷ Label t, reason ∷ EdgeReason }

-- Why an edge exists. The first three arise in consumption (this module's
-- users); the rest are named now so that the later tasks add no constructor.
data EdgeReason
  = Assumed Span
  | Copied Span
  | Extended Span
  | OwnAbort AbortSite
  | FrameOwn Span
  | FrameOuter Span
  | FrameRigid Span String
  | DeferDemand Span

-- Where a handler's clause may abort: the handler, the clause, the operation
-- and, for a clause tail that is a rigid variable, its name.
type AbortSite =
  { handler ∷ Span, clause ∷ Span, operation ∷ String, rigid ∷ Maybe String }

-- Mark metas are bound by equality; edges are pushed in order and read
-- oldest first.
type MarkStore t = { bindings ∷ Map Int Mark, edges ∷ Stack (MarkEdge t) }

-- How a row unification treats the marks of its labels. Types unify with
-- `EqualMarks`; the inference row R of a handler with `IgnoreMarks`;
-- consumption is `Directional`: the span it was made at, and the meta
-- (if any) of a tail nobody reads, which gets no copies (rev6 M9).
data RowMode = EqualMarks | IgnoreMarks | Directional Direction

type Direction = { span ∷ Span, throwaway ∷ Maybe Int }

emptyMarks ∷ ∀ t. MarkStore t
emptyMarks = { bindings: Map.empty, edges: Bottom }

-- The mark itself unless it is a bound meta, then the end of its chain, by
-- a loop (only a meta enters it, as Subst `walk`).
resolveMark ∷ ∀ t. MarkStore t → Mark → Mark
resolveMark store start = case start of
  MarkMeta _ → tailRec step start
  _ → start
  where
  step mark = case mark of
    MarkMeta meta → maybe (Done mark) Loop (Map.lookup meta store.bindings)
    _ → Done mark

bindMark ∷ ∀ t. Int → Mark → MarkStore t → MarkStore t
bindMark meta mark store =
  store { bindings = Map.insert meta mark store.bindings }

addEdge ∷ ∀ t. MarkEdge t → MarkStore t → MarkStore t
addEdge edge store = store { edges = Push edge store.edges }

-- Insertion order.
edgesOf ∷ ∀ t. MarkStore t → Array (MarkEdge t)
edgesOf store = stackItems store.edges
