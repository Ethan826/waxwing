-- Least mark terms over today's live mark graph (statements §5, "FX008
-- ⇒ package"; tranche 2 read-back design §F): the store's `bindings`
-- read as equalities (each `meta ↦ mark` joins two nodes), its `edges`
-- as lower ⊑ upper. Classes by union-find (Galler and Fischer 1964;
-- Tarjan 1975), constants reaching each class by a fixpoint over the
-- edges (Kleene iteration of reachability). A class holding a constant
-- takes it; any other takes M if M reaches it, else the join `J S` of
-- the rigid constants reaching it, N if none. Untrusted search; the
-- research reading it agrees with is research/t2-read-back-inventory/
-- least.mjs.
--
-- Standing (§18.153): bounded agreement with the definition (the
-- oracle's families: research/t2-read-back-design/marks-oracle.mjs, a
-- seeded subset in test/r0-t2-marks-oracle.test.mjs); not independent
-- evidence of recorded/live correspondence (P1 untested).
--
-- A class never holds two constants: each meta has one binding and a
-- constant none, so a class is a tree with one end, or a cycle of metas
-- (reasoned; the corpus check counts `clashes`, research/t2-read-back-
-- design/marks-corpus.mjs). The union keeps a constant as the root, so
-- a class's root is its constant when it has one. `Unmarked` ends are
-- dropped, as UnifyMark `recorded` drops them: such a meta reads alone.
module Features.Check.Strategy.ReadBack.Least
  ( clashes
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

-- Every live meta's least term, keyed by meta.
leastTerms ∷ ∀ t. MarkStore t → Map Int Term
leastTerms store = Map.fromFoldable (Array.mapMaybe termed nodes)
  where
  graph = graphOf store
  classes = classesOf graph.equalities
  reach = reaching classes graph.edges graph.constants
  nodes = Array.nub (sides <> ends)
  sides = map fst' graph.equalities <> map snd' graph.equalities
  ends = map _.lower graph.edges <> map _.upper graph.edges
  termed node = case node of
    NodeMeta meta → Just (Tuple meta (rootTerm reach (find classes node)))
    _ → Nothing
  fst' (Tuple one _) = one
  snd' (Tuple _ other) = other

-- A live mark's term: a constant's own, a meta's from the map, N for a
-- meta the map lacks (a singleton class, statements §5's "N if none";
-- design §C.8). `Unmarked` is `Fail`'s placeholder (statements §2: N);
-- Convert reads `Fail` and Console as N before asking, and refuses an
-- unmarked user label, and readMarks refuses an unmarked position.
termOf ∷ Map Int Term → Mark → Term
termOf terms = case _ of
  NoFail → TermN
  Plain → TermM
  MarkVariable name → TermJ (Set.singleton name)
  MarkMeta meta → fromMaybe TermN (Map.lookup meta terms)
  Unmarked → TermN

-- How many equalities met two different constants (expected 0).
clashes ∷ ∀ t. MarkStore t → Int
clashes store = (classesOf (graphOf store).equalities).clashed

type Graph =
  { equalities ∷ Array (Tuple Node Node)
  , edges ∷ Array Edge
  , constants ∷ Array Node
  }

graphOf ∷ ∀ t. MarkStore t → Graph
graphOf store = { equalities, edges, constants }
  where
  equalities = Array.mapMaybe equality (Map.toUnfoldable store.bindings)
  equality (Tuple meta mark) = Tuple (NodeMeta meta) <$> nodeOf mark
  edges = Array.mapMaybe edge (edgesOf store)
  edge found = { lower: _, upper: _ } <$> nodeOf found.lower
    <*> nodeOf found.upper
  constants = Array.filter isConstant (Array.nub ends)
  ends = map pairEnd equalities <> map _.lower edges <> map _.upper edges
  pairEnd (Tuple _ other) = other

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
