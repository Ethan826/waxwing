module Features.Check.Mark (Violation, violation) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl, minimumBy)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Tuple (Tuple(..))
import Domain.Row (Mark(..))
import Domain.Type (Ty)
import Features.Check.MarkStore
  ( MarkEdge
  , MarkStore
  , edgesOf
  , reasonSpan
  , resolveMark
  )
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.Subst (Flex, Subst(..))

-- A path of edges from a source atom (M, or a rigid `nofail(k)`) to an atom
-- it may not reach (N, or a different `nofail(k')`), design §3.4.
type Violation =
  { path ∷ Array (MarkEdge (Ty Flex)), start ∷ Mark, end ∷ Mark }

type Edge = MarkEdge (Ty Flex)

-- Edges with marks resolved, by position, and the positions leaving each
-- mark, ascending.
type Graph = { edges ∷ Array Edge, leaving ∷ Map Mark (Stack Int) }

-- A search from one atom: the edge that first reached each mark (`Nothing`
-- for the atom), the marks to visit, and the violating edges found.
type Search =
  { atom ∷ Mark
  , order ∷ Int
  , reached ∷ Map Mark (Maybe Int)
  , frontier ∷ Array Mark
  , next ∷ Stack Mark
  , found ∷ Stack Int
  }

-- A violating edge, ordered by span start, then insertion, then atom (P7).
type Pick = { key ∷ Tuple (Tuple Int Int) Int, edge ∷ Int, search ∷ Search }

-- BFS from each source atom (M first, then the declaration's mark
-- variables in signature order), edges in insertion order. Atoms are never
-- passed through: N is the top, M a constant, and `k` only a source.
-- Cost: O(edges × atoms).
violation ∷ Array String → Subst → Maybe Violation
violation variables (Subst bindings) = rebuilt graph <$> minimumBy
  (comparing _.key)
  (Array.concatMap (picks graph) searches)
  where
  graph = graphOf bindings.marks
  atoms = Array.cons Plain (map MarkVariable variables)
  searches = Array.mapWithIndex (searched graph) atoms

graphOf ∷ MarkStore (Ty Flex) → Graph
graphOf store = { edges, leaving: Array.foldr leave Map.empty numbered }
  where
  edges = Array.mapMaybe (resolved store) (edgesOf store)
  numbered = Array.mapWithIndex Tuple edges
  leave (Tuple index edge) = Map.alter
    (Just <<< Push index <<< fromMaybe Bottom)
    edge.lower

-- An edge that can matter: no `Unmarked` end, nothing above M (everything
-- is at least as strong) and nothing below N.
resolved ∷ MarkStore (Ty Flex) → Edge → Maybe Edge
resolved store edge =
  if dropped then Nothing else Just edge { lower = lower, upper = upper }
  where
  lower = resolveMark store edge.lower
  upper = resolveMark store edge.upper
  dropped = lower == Unmarked || upper == Unmarked || upper == Plain
    || lower == NoFail

searched ∷ Graph → Int → Mark → Search
searched graph order atom = tailRec (level graph) start
  where
  start =
    { atom
    , order
    , reached: Map.singleton atom Nothing
    , frontier: [ atom ]
    , next: Bottom
    , found: Bottom
    }

-- One breadth-first level per step: the marks reached last step, in order.
level ∷ Graph → Search → Step Search Search
level graph search =
  if Array.null search.frontier then Done search
  else Loop widened { frontier = stackItems widened.next, next = Bottom }
  where
  widened = foldl (visit graph) search { frontier = [] } search.frontier

visit ∷ Graph → Search → Mark → Search
visit graph search node = tailRec (crossAll graph)
  { search, rest: fromMaybe Bottom (Map.lookup node graph.leaving) }

crossAll
  ∷ Graph
  → { search ∷ Search, rest ∷ Stack Int }
  → Step { search ∷ Search, rest ∷ Stack Int } Search
crossAll graph { search, rest } = case rest of
  Bottom → Done search
  Push index below → Loop { search: cross graph search index, rest: below }

-- An edge into an atom other than the search's own is a violation; one into
-- a mark not yet reached extends the search.
cross ∷ Graph → Search → Int → Search
cross graph search index = maybe search crossed (Array.index graph.edges index)
  where
  crossed edge
    | isAtom edge.upper =
        if edge.upper == search.atom then search
        else search { found = Push index search.found }
    | Map.member edge.upper search.reached = search
    | otherwise = search
        { reached = Map.insert edge.upper (Just index) search.reached
        , next = Push edge.upper search.next
        }

isAtom ∷ Mark → Boolean
isAtom = case _ of
  NoFail → true
  MarkVariable _ → true
  _ → false

picks ∷ Graph → Search → Array Pick
picks graph search = map picked (stackItems search.found)
  where
  picked edge =
    { key: Tuple (Tuple (spanStart edge) edge) search.order, edge, search }
  spanStart edge = maybe 0 (_.start.offset <<< reasonSpan <<< _.reason)
    (Array.index graph.edges edge)

rebuilt ∷ Graph → Pick → Violation
rebuilt graph pick =
  { path: Array.mapMaybe (Array.index graph.edges)
      (Array.snoc leading pick.edge)
  , start: pick.search.atom
  , end: maybe NoFail _.upper violating
  }
  where
  violating = Array.index graph.edges pick.edge
  leading = tailRec (trace graph pick.search)
    { node: maybe Unmarked _.lower violating, path: Bottom }

trace
  ∷ Graph
  → Search
  → { node ∷ Mark, path ∷ Stack Int }
  → Step { node ∷ Mark, path ∷ Stack Int } (Array Int)
trace graph search { node, path } = maybe finished back
  (join (Map.lookup node search.reached))
  where
  finished = Done (Array.reverse (stackItems path))
  back index = Loop
    { node: maybe Unmarked _.lower (Array.index graph.edges index)
    , path: Push index path
    }
