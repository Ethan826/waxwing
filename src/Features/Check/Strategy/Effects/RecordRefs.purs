-- trusted surface: every diff needs token review; see docs/engineering.md
-- What one recorded entry references, for record validation
-- (Effects.Record; spec §4.1): its type and record-row variables, its
-- effect variables, positions and rigid marks, and its `Fail` payloads.
-- A forced tail at a place spec §2.3's placement rule allows is kept
-- apart in `placed`: the clause-row tail of a handler type that is an
-- exact copy of a forcing instance's result, or of an `AtInstalledC`
-- source that is an exact copy of that result's clause row. Every other
-- effect variable is in `effects`. Arrow spines are taken apart by a
-- loop, as Effects.Package does. `applications` lists every effect label
-- and data type with its counts, for record check 5 (Effects.Arity): a
-- clause row C's labels are read bare, a handler type's `clauses`, the
-- source of `AtInstalledC` and the target of `ClauseIntoC k`.
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
import Data.Array (elem, fromFoldable, length, snoc)
import Data.Foldable (foldMap)
import Data.Tuple (snd)
import Domain.Recorded.Atom (Base(..), Var)
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
import Domain.Type (TypeId)
import Features.Check.Strategy.Effects.Arity
  ( Application
  , dataApplication
  , labelApplication
  )

type Refs =
  { types ∷ Array Var
  , rows ∷ Array Var
  , effects ∷ Array EVar
  , placed ∷ Array EVar
  , positions ∷ Array Position
  , marks ∷ Array String
  , payloads ∷ Array MTy
  , applications ∷ Array Application
  }

-- The forcing instances' result types and their clause rows.
type Copies = { results ∷ Array MTy, clauses ∷ Array MRow }

type Stages = { stages ∷ Array { parameter ∷ MTy, row ∷ MRow }, result ∷ MTy }

obligationRefs ∷ Copies → Obligation → Refs
obligationRefs copies = case _ of
  Equal lhs rhs → tyRefs copies lhs <> tyRefs copies rhs
  Consume consume → sourceRefs copies consume.site consume.source
    <> targetRefs copies consume.site consume.target
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
  MBase (DataBase owner) → dataRefs false copies owner [] []
  MBase _ → mempty
  MVar variable → none { types = [ variable ] }
  MRecord fields tails →
    foldMap (tyRefs copies <<< snd) fields <> none { rows = tails }
  MData owner arguments rows → dataRefs false copies owner arguments rows
  MHandler label rows → labelRefs false copies label
    <> rowRefs copies rows.inference
    <> foldMap (clauseRefs (elem ty copies.results)) rows.clauses
  MArrow _ _ _ → spineRefs (stagesOf ty)
  where
  clauseRefs copied
    | copied = placedRefs copies
    | otherwise = clauseRowRefs copies
  spineRefs found = foldMap stageRefs found.stages <> tyRefs copies found.result
  stageRefs stage = tyRefs copies stage.parameter <> rowRefs copies stage.row

dataRefs ∷ Boolean → Copies → TypeId → Array MTy → Array MRow → Refs
dataRefs bare copies owner arguments rows =
  none
    { applications =
        [ dataApplication bare owner (length arguments) (length rows) ]
    }
    <> foldMap (tyRefs copies) arguments
    <> foldMap (rowRefs copies) rows

rowRefs ∷ Copies → MRow → Refs
rowRefs copies row = foldMap (labelRefs false copies) row.labels
  <> effectRefs (fromFoldable row.tail)

-- A clause row C that is not a forcing instance's copy.
clauseRowRefs ∷ Copies → MRow → Refs
clauseRowRefs copies row = foldMap (labelRefs true copies) row.labels
  <> effectRefs (fromFoldable row.tail)

sourceRefs ∷ Copies → SiteKind → MRow → Refs
sourceRefs copies site row
  | site == AtInstalledC && elem row copies.clauses = placedRefs copies row
  | site == AtInstalledC = clauseRowRefs copies row
  | otherwise = rowRefs copies row

targetRefs ∷ Copies → SiteKind → MRow → Refs
targetRefs copies = case _ of
  ClauseIntoC _ → clauseRowRefs copies
  _ → rowRefs copies

-- A forcing instance's clause row C, or a copy of it.
placedRefs ∷ Copies → MRow → Refs
placedRefs copies row = foldMap (labelRefs true copies) row.labels
  <> none { placed = fromFoldable row.tail }

-- `inClause`: a label of a C row, whose `Fail` payload may be its head.
labelRefs ∷ Boolean → Copies → MLabel → Refs
labelRefs inClause copies label = markRefs label.mark
  <> foldMap argument label.args
  <> payloadRefs label.effect
  <> none
    { applications =
        [ labelApplication inClause label.effect (length label.args) ]
    }
  where
  payloadRefs = case _ of
    FailEffect → none { payloads = label.args }
    _ → mempty
  argument
    | inClause && label.effect == FailEffect = headRefs copies
    | otherwise = tyRefs copies

-- A C row's `Fail` payload: data may be its head only (Owned.purs).
headRefs ∷ Copies → MTy → Refs
headRefs copies = case _ of
  MData owner arguments rows → dataRefs true copies owner arguments rows
  other → tyRefs copies other

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
