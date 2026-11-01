-- trusted surface: every diff needs token review; see docs/engineering.md
-- A2's forced-tail dependency Dep (spec §5.1, §18.143 N3) and the
-- classification of an obligation's failure (spec §5). Nodes are the
-- flexible variables and recorded positions; `mentions` reads an
-- obligation's recorded fields, one helper per kind. Each kind's
-- documented edge adds the nodes its helper reads (the table's rows all
-- name every field the kind records), so Dep closes F under `mentions`
-- of every obligation that mentions a member, plus the forcing edge
-- v → t. `NotCertifiable ForcedTail` says the failure depends on the
-- provisional restriction, not that forcing caused it.
module Features.Check.Strategy.Effects.Dependency
  ( Node(..)
  , classify
  , dependencySet
  , mentions
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (any, foldMap)
import Data.Maybe (Maybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (snd)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (Var(..))
import Domain.Recorded.Effect
  ( EVar(..)
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Obligation(..)
  , Placed
  , Position
  , SiteKind
  )
import Domain.Verdict.Search (CheckAt, CheckRefusal(..), Limitation(..))
import Features.Check.Strategy.Effects.Forced (Forced, forcedTails)
import Features.Check.Strategy.Effects.Judged (Failure)

data Node = NodeVar Var | NodeEff EVar | NodePos Position

derive instance eqNode ∷ Eq Node
derive instance ordNode ∷ Ord Node

-- The flexible variables and positions in an obligation's recorded
-- fields; a rigid variable is no node.
mentions ∷ Obligation → Set Node
mentions = case _ of
  Equal lhs rhs → equalMentions lhs rhs
  Consume site → consumeMentions site
  Install site → installMentions site
  HandlerLit lit → handlerLitMentions lit
  Defer site → deferMentions site
  Entry row → rowNodes row
  FailConcrete payload → tyNodes payload
  Unsupported _ → Set.empty

-- Dep: F, closed under the edges of the recorded obligations and the
-- forcing edges v → t (spec §5.1).
dependencySet ∷ RecordedProblem → Set Node
dependencySet problem = fixpoint step start
  where
  forced = forcedTails problem
  start = Set.fromFoldable (map forcedNode forced)
  obligations = map _.value (fields problem).effects.obligations
  step dep = Set.unions
    [ dep
    , foldMap mentions (Array.filter (dependsOn dep) obligations)
    , Set.fromFoldable
        (map sourceNode (Array.filter (isForced dep) forced))
    ]
  isForced dep entry = Set.member (forcedNode entry) dep

-- The step only adds nodes, so equal sizes mean no change.
fixpoint ∷ (Set Node → Set Node) → Set Node → Set Node
fixpoint step dep = settled (step dep)
  where
  settled next
    | Set.size next == Set.size dep = dep
    | otherwise = fixpoint step next

forcedNode ∷ Forced → Node
forcedNode entry = NodeEff entry.forced

sourceNode ∷ Forced → Node
sourceNode entry = NodeEff entry.source

-- `limit` first; else the obligation mentions a Dep member; else an
-- ordinary failure (spec §5, classification of an obligation failure).
classify ∷ Set Node → Placed Obligation → Failure → CheckRefusal
classify dep placed failure = case failure.limit of
  true → NotCertifiable RigidExact (checkAt placed failure)
  false
    | dependsOn dep placed.value →
        NotCertifiable ForcedTail (checkAt placed failure)
    | otherwise → ObligationFailed (checkAt placed failure)

checkAt ∷ Placed Obligation → Failure → CheckAt
checkAt placed failure =
  { provenance: placed.provenance, check: failure.check }

dependsOn ∷ Set Node → Obligation → Boolean
dependsOn dep obligation = any inDep (mentions obligation)
  where
  inDep node = Set.member node dep

-- `Equal`: every mention of both sides.
equalMentions ∷ MTy → MTy → Set Node
equalMentions lhs rhs = tyNodes lhs <> tyNodes rhs

-- `Consume`, every site: every mention of source and target.
consumeMentions
  ∷ { site ∷ SiteKind
    , source ∷ MRow
    , target ∷ MRow
    , marks ∷ Boolean
    , bare ∷ Boolean
    }
  → Set Node
consumeMentions site = rowNodes site.source <> rowNodes site.target

-- `Install`: every mention of `handler` and `ambient`, and `frame`.
installMentions
  ∷ { frame ∷ Position, handler ∷ MTy, ambient ∷ MRow } → Set Node
installMentions site =
  Set.singleton (NodePos site.frame)
    <> tyNodes site.handler
    <> rowNodes site.ambient

-- `HandlerLit`: `m`, the three variables and every clause row.
handlerLitMentions
  ∷ { m ∷ Position
    , inference ∷ EVar
    , clauses ∷ EVar
    , clauseRows ∷ Array EVar
    }
  → Set Node
handlerLitMentions lit =
  Set.singleton (NodePos lit.m)
    <> effectNode lit.inference
    <> effectNode lit.clauses
    <> foldMap effectNode lit.clauseRows

-- `Defer`: `row` and every mention of `enclosing`.
deferMentions ∷ { row ∷ EVar, enclosing ∷ MRow } → Set Node
deferMentions site = effectNode site.row <> rowNodes site.enclosing

effectNode ∷ EVar → Set Node
effectNode = case _ of
  EffRigid _ → Set.empty
  fresh → Set.singleton (NodeEff fresh)

varNode ∷ Var → Set Node
varNode = case _ of
  RigidVar _ → Set.empty
  fresh → Set.singleton (NodeVar fresh)

markNodes ∷ MarkRef → Set Node
markNodes = case _ of
  Written _ → Set.empty
  At position → Set.singleton (NodePos position)

labelNodes ∷ MLabel → Set Node
labelNodes label = foldMap tyNodes label.args <> markNodes label.mark

tailNodes ∷ Maybe EVar → Set Node
tailNodes = maybe Set.empty effectNode

rowNodes ∷ MRow → Set Node
rowNodes row = foldMap labelNodes row.labels <> tailNodes row.tail

tyNodes ∷ MTy → Set Node
tyNodes = case _ of
  MBase _ → Set.empty
  MVar variable → varNode variable
  MArrow parameter row result →
    tyNodes parameter <> rowNodes row <> tyNodes result
  MRecord named tails →
    foldMap (tyNodes <<< snd) named <> foldMap varNode tails
  MData _ arguments rows → foldMap tyNodes arguments <> foldMap rowNodes rows
  MHandler label { inference, clauses } →
    labelNodes label <> rowNodes inference <> maybe Set.empty rowNodes clauses
