-- Least mark terms over today's live mark graph (statements §5, "FX008
-- ⇒ package"; tranche 2 read-back design §F): the store's `bindings`
-- read as equalities (each `meta ↦ mark` joins two nodes), its `edges`
-- as lower ⊑ upper. Classes by plain union-find (Galler and Fischer
-- 1964), with no path compression or union by rank, so Tarjan's (1975)
-- near-linear bound is not claimed; constants reaching each class by a
-- fixpoint over the edges (Kleene iteration of reachability). A class
-- holding a constant takes it; any other takes M if M reaches it, else
-- the join `J S` of the rigid constants reaching it, N if none.
-- Untrusted search; the research reading it agrees with is
-- research/t2-read-back-inventory/least.mjs.
--
-- Standing (§18.153): bounded agreement with the stated definition (the
-- oracle's families: research/t2-read-back-design/marks-oracle.mjs, a
-- seeded subset in test/r0-t2-marks-oracle.test.mjs); with the disclosed
-- shared label pairing (ReadBack/Marks.purs), not independent evidence
-- of recorded/live correspondence (P1 untested).
--
-- A class never holds two constants: each meta has one binding and a
-- constant none, so a class is a tree with one end, or a cycle of metas
-- (reasoned; the corpus check counts `clashes`, research/t2-read-back-
-- design/marks-corpus.mjs). The count is returned, and a reader faults
-- on any (fail-closed; only a planted graph reaches it). The union
-- keeps a constant as the root, so a class's root is its constant when
-- it has one. `Unmarked` ends are dropped, as UnifyMark `recorded` drops
-- them: such a meta reads alone.
module Features.Check.Strategy.ReadBack.Least
  ( MarkTerms
  , leastOfGraph
  , leastTerms
  , termOf
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Row (Mark(..))
import Domain.Verdict.EffectPackage (Term(..))
import Features.Check.MarkStore (MarkStore, edgesOf)

-- A node of the live graph: a constant or a mark meta.
data Node = NodeN | NodeM | NodeRigid String | NodeMeta Int

derive instance eqNode ∷ Eq Node
derive instance ordNode ∷ Ord Node

type Edge = { lower ∷ Node, upper ∷ Node }

type Classes = { parent ∷ Map Node Node, clashed ∷ Int }

-- Every live meta's least term, keyed by meta, and how many equalities
-- met two different constants (unreachable from a store, see above; a
-- reader faults on any, never uses the terms).
type MarkTerms = { terms ∷ Map Int Term, clashes ∷ Int }

leastTerms ∷ ∀ t. MarkStore t → MarkTerms
leastTerms store = leastOfGraph (map binding (Map.toUnfoldable store.bindings))
  (map ends (edgesOf store))
  where
  binding (Tuple meta mark) = Tuple (MarkMeta meta) mark
  ends edge = Tuple edge.lower edge.upper

-- The same over a graph given as mark pairs: equalities, and edges as
-- (lower, upper). A planted graph may hold a clash, which a store cannot.
leastOfGraph ∷ Array (Tuple Mark Mark) → Array (Tuple Mark Mark) → MarkTerms
leastOfGraph equalities edges =
  { terms: Map.fromFoldable (Array.mapMaybe termed graph.nodes)
  , clashes: classes.clashed
  }
  where
  graph = graphOf equalities edges
  classes = classesOf graph.equalities
  reach = reaching classes graph.edges graph.constants
  termed node = case node of
    NodeMeta meta → Just (Tuple meta (rootTerm reach (find classes node)))
    _ → Nothing

-- A live mark's term: a constant's own, a meta's from the map, N for a
-- meta the map lacks (a singleton class, statements §5's "N if none";
-- design §C.8). Nothing for `Unmarked`, which has no term to read, and
-- for every mark when the terms hold a clash.
termOf ∷ MarkTerms → Mark → Maybe Term
termOf found mark
  | found.clashes > 0 = Nothing
  | otherwise = case mark of
      NoFail → Just TermN
      Plain → Just TermM
      MarkVariable name → Just (TermJ (Set.singleton name))
      MarkMeta meta → Just (fromMaybe TermN (Map.lookup meta found.terms))
      Unmarked → Nothing

type Graph =
  { equalities ∷ Array (Tuple Node Node)
  , edges ∷ Array Edge
  , constants ∷ Array Node
  , nodes ∷ Array Node
  }

graphOf ∷ Array (Tuple Mark Mark) → Array (Tuple Mark Mark) → Graph
graphOf markPairs markEdges = { equalities, edges, constants, nodes }
  where
  equalities = Array.mapMaybe pairOf markPairs
  edges = Array.mapMaybe edge markEdges
  pairOf (Tuple one other) = Tuple <$> nodeOf one <*> nodeOf other
  edge pair = map lowerUpper (pairOf pair)
  lowerUpper (Tuple lower upper) = { lower, upper }
  nodes = Array.nub
    ( Array.concatMap sides equalities
        <> Array.concatMap ends edges
    )
  sides (Tuple one other) = [ one, other ]
  ends found = [ found.lower, found.upper ]
  constants = Array.filter isConstant nodes

nodeOf ∷ Mark → Maybe Node
nodeOf = case _ of
  NoFail → Just NodeN
  Plain → Just NodeM
  MarkVariable name → Just (NodeRigid name)
  MarkMeta meta → Just (NodeMeta meta)
  Unmarked → Nothing

isConstant ∷ Node → Boolean
isConstant = case _ of
  NodeMeta _ → false
  _ → true

classesOf ∷ Array (Tuple Node Node) → Classes
classesOf = foldl union { parent: Map.empty, clashed: 0 }

-- Join two classes, a constant root staying the root; two different
-- constant roots are a clash and stay apart.
union ∷ Classes → Tuple Node Node → Classes
union classes (Tuple one other) = joined (find classes one)
  (find classes other)
  where
  joined left right
    | left == right = classes
    | isConstant left && isConstant right = classes
        { clashed = classes.clashed + 1 }
    | isConstant left = linked right left
    | otherwise = linked left right
  linked from to = classes { parent = Map.insert from to classes.parent }

find ∷ Classes → Node → Node
find classes = tailRec step
  where
  step node = maybe (Done node) Loop (Map.lookup node classes.parent)

-- The constants reaching each class root, to a fixpoint.
reaching ∷ Classes → Array Edge → Array Node → Map Node (Set Node)
reaching classes edges constants = tailRec pass start
  where
  start = Map.fromFoldableWith Set.union (map seeded constants)
  seeded constant = Tuple (find classes constant) (Set.singleton constant)
  pass reach = if next == reach then Done reach else Loop next
    where
    next = foldl carry reach edges
  carry reach edge = Map.insertWith Set.union (find classes edge.upper)
    (atRoot reach (find classes edge.lower))
    reach

atRoot ∷ Map Node (Set Node) → Node → Set Node
atRoot reach root = fromMaybe Set.empty (Map.lookup root reach)

rootTerm ∷ Map Node (Set Node) → Node → Term
rootTerm reach root = case root of
  NodeN → TermN
  NodeM → TermM
  NodeRigid name → TermJ (Set.singleton name)
  NodeMeta _
    | Set.member NodeM from → TermM
    | Set.isEmpty rigid → TermN
    | otherwise → TermJ rigid
  where
  from = atRoot reach root
  rigid = Set.mapMaybe rigidName from

rigidName ∷ Node → Maybe String
rigidName = case _ of
  NodeRigid name → Just name
  _ → Nothing
