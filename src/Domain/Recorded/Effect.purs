-- The effect problem recorded beside the type problem (a-min statements,
-- docs/plans/r0-amin-statements.md §2, §4, §10): marked types, effect
-- variables, positions and the obligations a checker will discharge.
-- Plain data; generation fills it and nothing here reaches checking.
module Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , EffectProblem
  , Fixed(..)
  , InstanceSig
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Obligation(..)
  , Placed
  , Position(..)
  , Provenance(..)
  , SiteRole(..)
  , SiteKind(..)
  , UnsupportedKind(..)
  , emptyEffects
  ) where

import Prelude
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple)
import Domain.Ids (EffectId)
import Domain.Recorded.Atom (Base(..), Var)
import Domain.Recorded.Origin (AtomId, Path, RuleId)
import Domain.Resolved (FunctionId)
import Domain.Row (EffectRef)
import Domain.Syntax (Span)
import Domain.Type (TypeId, VarId)

-- An effect variable: a rigid one by its `VarId`, a fresh one by the path
-- of the node that minted it and its role there.
data EVar = EffRigid VarId | EffFresh Path ERole

-- `AnnotationClauses j k`: parameter j's annotation, k-th eligible
-- handler occurrence in it (pre-order).
data ERole
  = EffInst VarId
  | EffectOf
  | ResultClauses
  | HandlerInference
  | HandlerClauses
  | Clauses Int
  | AnnotationClauses Int Int
  | Stage Int
  | OpenedRow

data Fixed = FixedN | FixedM | FixedRigid String

-- `Annotation p j n`: parameter j's annotation, n-th unwritten mark in it
-- (pre-order, R's and every C's marks counted once each). `Opened p i`:
-- the handled label a function use opens at p (Check/MarkUse.purs
-- `openHandlers`); i is the parameter's index, and the callee's parameter
-- count for the result, so each opened label is its own position. The
-- opened row tail is the variable `⟨p, opened⟩`, `EffFresh p OpenedRow`.
data Position
  = Frame Path
  | Literal Path
  | Opened Path Int
  | Annotation Path Int Int
  | Instantiated Path String

data MarkRef = Written Fixed | At Position

type MLabel = { effect ∷ EffectRef, args ∷ Array MTy, mark ∷ MarkRef }

type MRow = { labels ∷ Array MLabel, tail ∷ Maybe EVar }

data MTy
  = MBase Base
  | MVar Var
  | MArrow MTy MRow MTy
  | MRecord (Array (Tuple String MTy)) (Array Var)
  | MData TypeId (Array MTy) (Array MRow)
  | MHandler MLabel { inference ∷ MRow, clauses ∷ Maybe MRow }

-- A use's instantiated marked signature (statements §10): its parameters,
-- its own row and its result, the result carrying a ResultC at a function
-- use (E4′). A record, since a zero-parameter signature's row has no
-- arrow stage to sit on. The rows of the stages before the last are the
-- use's fresh `EffFresh p (Stage k)`, not recorded here.
type InstanceSig = { parameters ∷ Array MTy, row ∷ MRow, result ∷ MTy }

data SiteKind
  = AtCall
  | AtPerform
  | AtApply
  | AtPipe
  | AtStage Int
  | AtCallback
  | AtDefer
  | AtInstalledC
  | AtDeferredRow
  | ClauseIntoR Int
  | ClauseIntoC Int
  | InstallR

data UnsupportedKind = OperationWithRow EffectId Int

data Obligation
  = Equal MTy MTy
  | Consume
      { site ∷ SiteKind
      , source ∷ MRow
      , target ∷ MRow
      , marks ∷ Boolean
      , bare ∷ Boolean
      }
  | HandlerLit
      { m ∷ Position
      , inference ∷ EVar
      , clauses ∷ EVar
      , clauseRows ∷ Array EVar
      }
  | Install { frame ∷ Position, handler ∷ MTy, ambient ∷ MRow }
  | Defer { row ∷ EVar, enclosing ∷ MRow }
  | Entry MRow
  | FailConcrete MTy
  | Unsupported UnsupportedKind

-- Where an obligation comes from (plan Task 7, "Provenance rules"):
-- `BesideAtom` an E1 recorded with the `GenEqual` atom of that AtomId
-- (rule-local, so the `rule` of the `Placed` completes the identity);
-- `AtSite` an effect-only E1, one per (declaration, path, rule, role).
data Provenance
  = BesideAtom AtomId
  | AtSite { decl ∷ FunctionId, path ∷ Path, rule ∷ RuleId, role ∷ SiteRole }

-- `ClauseBody` is O1 (a handler clause), `WithNode` O2 (a `with` node).
data SiteRole = ClauseBody | WithNode

type Placed a =
  { provenance ∷ Provenance, rule ∷ RuleId, span ∷ Span, value ∷ a }

type EffectProblem =
  { obligations ∷ Array (Placed Obligation)
  , nodes ∷ Map Path MTy -- each node's marked type (beside `types`)
  , instances ∷ Map Path InstanceSig
  , annotations ∷ Map Path MTy
  , rigidMarks ∷ Array String
  , effectRigids ∷ Array VarId
  , arities ∷ Map Path Int
  , ambient ∷ Map Path MRow
  , flexEff ∷ Array EVar
  , positions ∷ Array Position
  , signature ∷ InstanceSig -- the declaration's own, marked as declared
  }

-- `signature` is the fold's start: every generated declaration records its
-- own (Generate.Declared), so this unit signature never survives assembly.
emptyEffects ∷ EffectProblem
emptyEffects =
  { obligations: []
  , nodes: Map.empty
  , instances: Map.empty
  , annotations: Map.empty
  , rigidMarks: []
  , effectRigids: []
  , arities: Map.empty
  , ambient: Map.empty
  , flexEff: []
  , positions: []
  , signature:
      { parameters: []
      , row: { labels: [], tail: Nothing }
      , result: MBase UnitBase
      }
  }

derive instance eqEVar ∷ Eq EVar
derive instance ordEVar ∷ Ord EVar
derive instance eqERole ∷ Eq ERole
derive instance ordERole ∷ Ord ERole
derive instance eqFixed ∷ Eq Fixed
derive instance eqPosition ∷ Eq Position
derive instance ordPosition ∷ Ord Position
derive instance eqMarkRef ∷ Eq MarkRef
derive instance eqMTy ∷ Eq MTy
derive instance eqSiteKind ∷ Eq SiteKind
derive instance eqUnsupportedKind ∷ Eq UnsupportedKind
derive instance eqSiteRole ∷ Eq SiteRole
derive instance eqProvenance ∷ Eq Provenance
derive instance eqObligation ∷ Eq Obligation
