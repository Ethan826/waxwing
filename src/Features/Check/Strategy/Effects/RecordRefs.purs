-- trusted surface: every diff needs token review; see docs/engineering.md
-- What one recorded entry references, for record validation
-- (Effects.Record; spec §4.1): its type and record-row variables, its
-- effect variables, positions and rigid marks, and its `Fail` payloads.
-- A forced tail at a place spec §2.3's placement rule allows is kept
-- apart in `placed`: the clause-row tail of a handler type that is an
-- exact copy of a forcing instance's result, or of an `AtInstalledC`
-- source that is an exact copy of that result's clause row. Every other
-- effect variable is in `effects`. Arrow spines are taken apart by a
-- loop, as Effects.Package does.
module Features.Check.Strategy.Effects.RecordRefs
  ( Copies
  , Refs
  , obligationRefs
  , rowRefs
  , signatureRefs
  , tyRefs
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (elem, fromFoldable, snoc)
import Data.Foldable (foldMap)
import Data.Tuple (snd)
import Domain.Recorded.Atom (Var)
import Domain.Recorded.Effect
  ( EVar
  , Fixed(..)
  , InstanceSig
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Obligation(..)
  , Position
  , SiteKind(..)
  )
import Domain.Row (EffectRef(..))

type Refs =
  { types ∷ Array Var
  , rows ∷ Array Var
  , effects ∷ Array EVar
  , placed ∷ Array EVar
  , positions ∷ Array Position
  , marks ∷ Array String
  , payloads ∷ Array MTy
  }

-- The forcing instances' result types and their clause rows.
type Copies = { results ∷ Array MTy, clauses ∷ Array MRow }

type Stages = { stages ∷ Array { parameter ∷ MTy, row ∷ MRow }, result ∷ MTy }

obligationRefs ∷ Copies → Obligation → Refs
obligationRefs copies = case _ of
  Equal lhs rhs → tyRefs copies lhs <> tyRefs copies rhs
  Consume consume → sourceRefs copies consume.site consume.source
    <> rowRefs copies consume.target
  HandlerLit literal → none { positions = [ literal.m ] }
    <> effectRefs ([ literal.inference, literal.clauses ] <> literal.clauseRows)
  Install install → none { positions = [ install.frame ] }
    <> tyRefs copies install.handler
    <> rowRefs copies install.ambient
  Defer defer → effectRefs [ defer.row ] <> rowRefs copies defer.enclosing
  Entry row → rowRefs copies row
  FailConcrete ty → tyRefs copies ty
  Unsupported _ → mempty

signatureRefs ∷ Copies → InstanceSig → Refs
signatureRefs copies sig = foldMap (tyRefs copies) sig.parameters
  <> rowRefs copies sig.row
  <> tyRefs copies sig.result

tyRefs ∷ Copies → MTy → Refs
tyRefs copies ty = case ty of
  MBase _ → mempty
  MVar variable → none { types = [ variable ] }
  MRecord fields tails →
    foldMap (tyRefs copies <<< snd) fields <> none { rows = tails }
  MData _ arguments rows →
    foldMap (tyRefs copies) arguments <> foldMap (rowRefs copies) rows
  MHandler label rows → labelRefs copies label
    <> rowRefs copies rows.inference
    <> foldMap (clauseRefs (elem ty copies.results)) rows.clauses
  MArrow _ _ _ → spineRefs (stagesOf ty)
  where
  clauseRefs copied
    | copied = placedRefs copies
    | otherwise = rowRefs copies
  spineRefs found = foldMap stageRefs found.stages <> tyRefs copies found.result
  stageRefs stage = tyRefs copies stage.parameter <> rowRefs copies stage.row

rowRefs ∷ Copies → MRow → Refs
rowRefs copies row = foldMap (labelRefs copies) row.labels
  <> effectRefs (fromFoldable row.tail)

sourceRefs ∷ Copies → SiteKind → MRow → Refs
sourceRefs copies site row
  | site == AtInstalledC && elem row copies.clauses = placedRefs copies row
  | otherwise = rowRefs copies row

placedRefs ∷ Copies → MRow → Refs
placedRefs copies row = foldMap (labelRefs copies) row.labels
  <> none { placed = fromFoldable row.tail }

labelRefs ∷ Copies → MLabel → Refs
labelRefs copies label = markRefs label.mark
  <> foldMap (tyRefs copies) label.args
  <> payloadRefs label.effect
  where
  payloadRefs = case _ of
    FailEffect → none { payloads = label.args }
    _ → mempty

markRefs ∷ MarkRef → Refs
markRefs = case _ of
  Written (FixedRigid name) → none { marks = [ name ] }
  Written FixedN → mempty
  Written FixedM → mempty
  At position → none { positions = [ position ] }

effectRefs ∷ Array EVar → Refs
effectRefs variables = none { effects = variables }

stagesOf ∷ MTy → Stages
stagesOf ty = tailRec step { stages: [], result: ty }
  where
  step found = case found.result of
    MArrow parameter row rest → Loop
      { stages: snoc found.stages { parameter, row }, result: rest }
    _ → Done found

none ∷ Refs
none = mempty
