-- Mark terms of the effect read-back (tranche 2 read-back design §E,
-- §F, §C.1, §C.8; statements §2, §5): least terms over the final
-- checker state's live mark graph (ReadBack/Least.purs), and every
-- recorded mark position read at its live places, each through those
-- terms. Untrusted search: it builds plain terms only.
--
-- Standing (§18.153): bounded agreement with the definition; not
-- independent evidence of recorded/live correspondence (P1 untested).
--
-- Sources (the inventory's research/t2-read-back-inventory/sources.mjs):
--   `Literal p`: the handler literal's node type at p, and each of its
--   clause entries' `own`;
--   `Frame p`: the installation entry of the `with` at p, its `frame`;
--   `Opened p i`: the use entry at p, field i's handled label, or the
--   result's for i the field count;
--   `Instantiated p k`: the use entry at p, its meta for mark name k;
--   `Annotation p j n`: lambda parameter j's type;
-- and every other recorded node type a position's mark is copied into.
-- `Fail` and Console labels carry no position (statements §2: they are N,
-- written; Convert forces N on them).
--
-- Fail-closed, never choosing: a position no source reads, or read as
-- `Unmarked`, is `UnreadPosition p`; two readings with different terms
-- are `PositionApart p`; two trace entries under one key are `Clash`.
module Features.Check.Strategy.ReadBack.Marks
  ( module Features.Check.Strategy.ReadBack.Least
  , readMarks
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect (MTy, Position(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..), Step(..))
import Domain.Row (Label(..), Mark(..))
import Domain.Type (Ty(..))
import Domain.Verdict.EffectPackage (Term)
import Features.Check.Strategy.ReadBack.EffectSites (entryAt, exprAt, keyOf)
import Features.Check.Strategy.ReadBack.Fault (ReadFault(..))
import Features.Check.Strategy.ReadBack.Least (clashes, leastTerms, termOf)
import Features.Check.Strategy.ReadBack.MarkMatch (Reading, marksOfTy)
import Features.Check.Strategy.ReadBack.Walk (Node(..), nodeAt)
import Features.Check.Trace (TraceKey(..), Traced, UseTrace)

type Read = Either ReadFault (Array Mark)

readMarks
  ∷ Map Int Term
  → RecordedProblem
  → Checked.FunctionDecl
  → Traced
  → Either ReadFault (Map Position Term)
readMarks terms problem checked traced = do
  direct ← traverse (directMarks checked.body traced) wanted
  let found = collected (Array.concat (Array.zipWith tagged wanted direct))
  Map.fromFoldable <$> traverse (readOne terms found) wanted
  where
  effects = (fields problem).effects
  wanted = Array.nub effects.positions
  typed =
    Array.concatMap (nodeMarks checked.body)
      (Map.toUnfoldable effects.nodes)
      <> Array.concatMap (annotationMarks checked.body)
        (Map.toUnfoldable effects.annotations)
  tagged position marks = map (Tuple position) marks
  collected readings = Map.fromFoldableWith (flip (<>))
    (map single (readings <> typed))
  single (Tuple position mark) = Tuple position [ mark ]

-- One position's term: read at least once, never `Unmarked`, every
-- reading the same term.
readOne
  ∷ Map Int Term
  → Map Position (Array Mark)
  → Position
  → Either ReadFault (Tuple Position Term)
readOne terms found position =
  maybe (Left (UnreadPosition position)) agreed (Array.head marks)
  where
  marks = fromMaybe [] (Map.lookup position found)
  term = termOf terms
  agreed first
    | Array.elem Unmarked marks = Left (UnreadPosition position)
    | Array.all (eq (term first)) (map term marks) =
        Right (Tuple position (term first))
    | otherwise = Left (PositionApart position)

-- The trace's readings of a position.
directMarks ∷ Checked.Expr → Traced → Position → Read
directMarks body traced = case _ of
  Literal path → atExpr path literal
  Frame path → atExpr path frame
  Opened path index → atExpr path (useMark (opened index))
  Instantiated path name → atExpr path (useMark (instantiated name))
  Annotation _ _ _ → Right []
  where
  atExpr path read = maybe (Right []) read (exprAt body path)
  literal found = case nodeOf found of
    Checked.Handler _ _ clauses → Array.concat <$> traverse own clauses
    _ → Right []
  own clause = maybe [] (Array.singleton <<< _.own)
    <$> entryAt ClauseKey (keyOf clause.span) traced.clauses
  frame found = case nodeOf found of
    Checked.With _ _ → maybe [] (Array.singleton <<< _.frame)
      <$> entryAt InstallKey (keyOf (Checked.spanOf found))
        traced.installations
    _ → Right []
  useMark read found = maybe [] read
    <$> entryAt UseKey (keyOf (Checked.spanOf found)) traced.uses

-- Field i's handled label mark, or the result's for i the field count
-- (Check/MarkUse.purs `openHandlers`).
opened ∷ Int → UseTrace → Array Mark
opened index use = maybe [] handledMark at
  where
  at
    | index == Array.length use.fields = Just use.result
    | otherwise = Array.index use.fields index

handledMark ∷ Ty Checked.Open → Array Mark
handledMark = case _ of
  THandler (Label _ _ mark) _ → [ mark ]
  _ → []

instantiated ∷ String → UseTrace → Array Mark
instantiated name use = Array.mapMaybe named use.marks
  where
  named (Tuple each mark)
    | each == name = Just mark
    | otherwise = Nothing

nodeMarks ∷ Checked.Expr → Tuple Path MTy → Array Reading
nodeMarks body (Tuple (Path path) ty) = case path.root of
  InBody → maybe [] (marksOfTy ty <<< nodeType)
    (nodeAt (AtExpr body) path.steps)
  _ → []

nodeType ∷ Node → Ty Checked.Open
nodeType = case _ of
  AtExpr found → Checked.typeOf found
  AtPattern (Checked.Pattern found) → found.ty

-- An annotation is recorded at the lambda's path then `Lambda/params/j`.
annotationMarks ∷ Checked.Expr → Tuple Path MTy → Array Reading
annotationMarks body (Tuple (Path path) ty) = maybe [] (marksOfTy ty)
  (parameterAt =<< exprAt body (Path path { steps = lambda }))
  where
  lambda = Array.dropEnd 3 path.steps
  index = stepIndex =<< Array.last path.steps
  parameterAt found = case nodeOf found of
    Checked.Lambda parameters _ → map _.ty (Array.index parameters =<< index)
    _ → Nothing

stepIndex ∷ Step → Maybe Int
stepIndex = case _ of
  Index index → Just index
  Named _ → Nothing

nodeOf ∷ Checked.Expr → Checked.Node
nodeOf (Checked.Expr found) = found.node
