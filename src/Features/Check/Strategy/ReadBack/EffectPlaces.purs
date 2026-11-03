-- The located roles of the effect read-back (tranche 2 read-back design
-- §C.1, §D; the inventory's research/t2-read-back-inventory/sources.mjs
-- is the research reading): every recorded table laid over its live
-- counterpart with EffectMatch, each giving the variables it meets.
--   nodes: the checked node's type (a lambda's stages, a `show` or
--   `crash` reference's synthesized lambda, a handler literal's R and C,
--   a pattern's instances);
--   ambient: the body root's at the traced declaration row (`main`'s
--   entry tail; `recheck`'s checked row is not on the trace's
--   numbering), a lambda body's at the lambda's last arrow row, a
--   `with` body's at its traced installation (the handler's label under
--   the frame mark, then the row it is installed in), a deferred
--   expression's at its traced row, a handler clause body's at its clause
--   entry's own row;
--   annotations: the lambda parameter's type; instances: a reference's
--   type, stage by stage, or a call's result; the declaration's own
--   signature; and each handler literal's clause entries, R and C.
-- Untrusted search; trace entries met twice are `Clash`.
module Features.Check.Strategy.ReadBack.EffectPlaces (locatedFacts) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class as Rec
import Data.Array as Array
import Data.Either (Either(..))
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , EffectProblem
  , InstanceSig
  , MRow
  , MTy
  )
import Domain.Recorded.Origin (Path(..), PathRoot(..), Step(..))
import Domain.Row (Label(..), Row(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Strategy.ReadBack.EffectMatch (Fact, matchRow, matchTy)
import Features.Check.Strategy.ReadBack.EffectSites
  ( annotatedAt
  , entryAt
  , exprAt
  , keyOf
  )
import Features.Check.Strategy.ReadBack.Fault (ReadFault)
import Features.Check.Strategy.ReadBack.Instances (instanceFacts)
import Features.Check.Strategy.ReadBack.Walk (Node(..), nodeAt)
import Features.Check.Trace (TraceKey(..), Traced)

type Facts = Either ReadFault (Array Fact)

locatedFacts ∷ EffectProblem → Checked.FunctionDecl → Traced → Facts
locatedFacts effects checked traced = do
  ambient ← traverse (ambientFacts checked traced) ambientRows
  literals ← traverse (literalFacts checked.body traced) nodes
  pure $ Array.concatMap (nodeFacts checked.body) nodes
    <> Array.concatMap (annotationFacts checked.body)
      (Map.toUnfoldable effects.annotations)
    <> Array.concatMap (instanceFacts checked.body)
      (Map.toUnfoldable effects.instances)
    <> signatureFacts effects.signature checked traced
    <> Array.concat ambient
    <> Array.concat literals
  where
  nodes = Map.toUnfoldable effects.nodes
  ambientRows = Map.toUnfoldable effects.ambient

nodeFacts ∷ Checked.Expr → Tuple Path MTy → Array Fact
nodeFacts body (Tuple (Path path) ty) = case path.root of
  InBody → maybe [] (matchTy ty <<< nodeType) found
  _ → []
  where
  found = nodeAt (AtExpr body) path.steps

nodeType ∷ Node → Ty Open
nodeType = case _ of
  AtExpr found → Checked.typeOf found
  AtPattern (Checked.Pattern found) → found.ty

-- An annotation's parameter, by the shape check the mark read-back
-- shares (EffectSites `annotatedAt`).
annotationFacts ∷ Checked.Expr → Tuple Path MTy → Array Fact
annotationFacts body (Tuple path ty) =
  maybe [] (matchTy ty) (annotatedAt body path)

signatureFacts
  ∷ InstanceSig → Checked.FunctionDecl → Traced → Array Fact
signatureFacts own checked traced =
  Array.concat (Array.zipWith matchTy own.parameters checked.parameters)
    <> matchTy own.result checked.result
    <> matchRow own.row traced.row

ambientFacts ∷ Checked.FunctionDecl → Traced → Tuple Path MRow → Facts
ambientFacts checked traced (Tuple (Path path) row) = case placeOf steps of
  AtRoot → Right (matchRow row traced.row)
  InLambda → Right (maybe [] (matchRow row) (lambdaRow =<< at 2))
  InWith → maybe (Right []) (installed traced row) (at 2)
  Deferred → maybe (Right []) deferred (at 0)
  InClause index → maybe (Right []) (clauseRow traced row index) (at 4)
  Elsewhere → Right []
  where
  steps = path.steps
  at count = exprAt checked.body (trimmed count)
  trimmed count = Path path { steps = Array.dropEnd count steps }
  deferred found = maybe [] (matchRow row) <$> entryAt DeferKey
    (keyOf (Checked.spanOf found))
    traced.deferrals

-- Which ambient row a path's last steps name.
data Place = AtRoot | InLambda | InWith | Deferred | InClause Int | Elsewhere

placeOf ∷ Array Step → Place
placeOf steps = case Array.takeEnd 4 steps of
  [ Named "Handler", Named "clauses", Index index, Named "body" ] →
    InClause index
  _ → case Array.takeEnd 2 steps of
    [] → AtRoot
    [ Named "Lambda", Named "body" ] → InLambda
    [ Named "With", Named "body" ] → InWith
    [ Named "Defer", Named "value" ] → Deferred
    _ → Elsewhere

-- A lambda's body row: its arrow's row after its parameters.
lambdaRow ∷ Checked.Expr → Maybe (TyRow Open)
lambdaRow found = case nodeOf found of
  Checked.Lambda parameters _ → rowAfter (Array.length parameters - 1)
    (Checked.typeOf found)
  _ → Nothing

rowAfter ∷ Int → Ty Open → Maybe (TyRow Open)
rowAfter count ty = Rec.tailRec step { count, at: ty }
  where
  step found = case found.at of
    TFun _ row result
      | found.count <= 0 → Rec.Done (Just row)
      | otherwise → Rec.Loop { count: found.count - 1, at: result }
    _ → Rec.Done Nothing

-- A `with` body's row: the handler's label under the frame mark, then
-- the row it is installed in.
installed ∷ Traced → MRow → Checked.Expr → Facts
installed traced row found = case nodeOf found of
  Checked.With handler _ → maybe [] (framed (Checked.typeOf handler))
    <$> entryAt InstallKey (keyOf (Checked.spanOf found))
      traced.installations
  _ → Right []
  where
  framed handlerType entry = case handlerType, entry.current of
    THandler (Label effect arguments _) _, Row labels tail → matchRow row
      (Row (Array.cons (Label effect arguments entry.frame) labels) tail)
    _, _ → []

clauseRow ∷ Traced → MRow → Int → Checked.Expr → Facts
clauseRow traced row index found = case nodeOf found of
  Checked.Handler _ _ clauses → maybe (Right []) entryRow
    (Array.index clauses index)
  _ → Right []
  where
  entryRow clause = maybe [] (matchRow row <<< _.row) <$> entryAt ClauseKey
    (keyOf clause.span)
    traced.clauses

-- A handler literal's R and C, from each of its clause entries.
literalFacts ∷ Checked.Expr → Traced → Tuple Path MTy → Facts
literalFacts body traced (Tuple path _) =
  maybe (Right []) handlerFacts (exprAt body path)
  where
  handlerFacts found = case nodeOf found of
    Checked.Handler _ _ clauses → Array.concat <$> traverse entryFacts clauses
    _ → Right []
  entryFacts clause = maybe [] facts <$> entryAt ClauseKey (keyOf clause.span)
    traced.clauses
  facts entry =
    [ Tuple (EffFresh path HandlerInference) entry.inference
    , Tuple (EffFresh path HandlerClauses) entry.clauses
    ]

nodeOf ∷ Checked.Expr → Checked.Node
nodeOf (Checked.Expr found) = found.node
