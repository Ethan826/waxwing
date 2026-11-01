-- trusted surface: every diff needs token review; see docs/engineering.md
-- A2's readings of an effect package (spec §2.2, §2.4, §2.5, §4.2):
-- `erase` gives the substitution G0 judges, mirroring generation's
-- `recordedWith` (Generate/Elab/Recorded.purs) case for case; `settle`
-- replaces each hole by lowering's default for its sort, as ReadBack.Type
-- `settled` does; `under` reads a recorded marked type through a package,
-- each mark by §2.2's `MarkRef` rule; `key` is a label's key, a `Fail`
-- label's that of its payload's head (Domain.Type.Parts `typeHead`).
-- Arrow spines are taken apart by a loop, as Features.Check.Spine does.
module Features.Check.Strategy.Effects.Package
  ( erase
  , eraseTy
  , key
  , settle
  , settleTy
  , under
  , underRow
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (concatMap, filter, foldr, head, null, snoc, sort, sortWith)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , RTExpr(App, Arrow, Base, Record)
  , Var(..)
  )
import Domain.Recorded.Atom as Atom
import Domain.Recorded.Effect
  ( EVar(..)
  , Fixed(..)
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  )
import Domain.Recorded.Hole (isHole)
import Domain.Row (EffectRef(..), LabelKey(..), TypeHead(..))
import Domain.Verdict.EffectPackage
  ( EffectPackage
  , PLabel
  , PRecordRow
  , PRow
  , PTail(..)
  , PTy(..)
  , Term(..)
  )
import Features.Check.Strategy.Candidate (Substitution)

-- `result` is never an arrow.
type Stages a r = { stages ∷ Array { parameter ∷ a, row ∷ r }, result ∷ a }

-- `types` and `rows` merged (I3 keeps their keys apart by sort); a row
-- variable's image is a `Record` term, as Candidate's `generic` reads it.
erase ∷ EffectPackage → Substitution
erase package = Map.union (map eraseTy package.types)
  (map (eraseTy <<< PRecord) package.rows)

-- Effect rows and terms are dropped; nullary data, `PData t [] []`, is
-- the base `DataBase t`.
eraseTy ∷ PTy → RTExpr
eraseTy = case _ of
  PBase base → Base base
  PVar variable → Atom.TVar variable
  PRecord row → Record (sortWith fst (map field row.fields)) (sort row.tails)
  PData owner arguments rows
    | null arguments && null rows → Base (DataBase owner)
    | otherwise → App (DataHead owner) (map eraseTy arguments)
  PHandler label _ → App (HandlerHead label.effect) (map eraseTy label.args)
  arrow@(PArrow _ _ _) → arrowed (stagesOf arrow)
  where
  field (Tuple label value) = Tuple label (eraseTy value)
  parameter stage = eraseTy stage.parameter
  arrowed found = foldr Arrow (eraseTy found.result)
    (map parameter found.stages)

stagesOf ∷ PTy → Stages PTy PRow
stagesOf ty = tailRec step { stages: [], result: ty }
  where
  step found = case found.result of
    PArrow parameter row rest → Loop
      { stages: snoc found.stages { parameter, row }, result: rest }
    PBase _ → Done found
    PVar _ → Done found
    PRecord _ → Done found
    PData _ _ _ → Done found
    PHandler _ _ → Done found

unstages ∷ Stages PTy PRow → PTy
unstages found = foldr staged found.result found.stages
  where
  staged stage rest = PArrow stage.parameter stage.row rest

-- Marks hold no holes, so they are kept.
settle ∷ EffectPackage → EffectPackage
settle package = package
  { types = map settleTy package.types
  , rows = map settleRecord package.rows
  , effects = map settleRow package.effects
  }

-- A type hole is `Int`, a record tail hole is dropped and a `PTailHole`
-- closes its row (ReadBack.Type `settled`, W §1.5).
settleTy ∷ PTy → PTy
settleTy ty = case ty of
  PBase _ → ty
  PVar variable
    | isHole variable → PBase IntBase
    | otherwise → ty
  PRecord row → PRecord (settleRecord row)
  PData owner arguments rows →
    PData owner (map settleTy arguments) (map settleRow rows)
  PHandler label rows → PHandler (settleLabel label)
    { inference: settleRow rows.inference
    , clauses: map settleRow rows.clauses
    }
  PArrow _ _ _ → settleArrow (stagesOf ty)
  where
  settleArrow found = unstages
    { stages: map settleStage found.stages, result: settleTy found.result }
  settleStage stage =
    { parameter: settleTy stage.parameter, row: settleRow stage.row }

settleRecord ∷ PRecordRow → PRecordRow
settleRecord row =
  { fields: map field row.fields, tails: filter (not <<< isHole) row.tails }
  where
  field (Tuple label value) = Tuple label (settleTy value)

settleRow ∷ PRow → PRow
settleRow row = { labels: map settleLabel row.labels, tail: rigid =<< row.tail }
  where
  rigid = case _ of
    PTailRigid variable → Just (PTailRigid variable)
    PTailHole _ → Nothing

settleLabel ∷ PLabel → PLabel
settleLabel label = label { args = map settleTy label.args }

-- A recorded type read through a package: a declared rigid (`RigidVar`,
-- Generate.Gen `rigid`) is itself, a flexible variable (`FreshVar`,
-- `fresh`) or effect variable its image, `Nothing` when the package has
-- none. Records come out in canonical form, fields by label and tails
-- sorted, as Candidate's `under` writes them.
under ∷ EffectPackage → MTy → Maybe PTy
under package ty = case ty of
  MBase base → Just (PBase base)
  MVar variable@(RigidVar _) → Just (PVar variable)
  MVar variable@(FreshVar _ _) → Map.lookup variable package.types
  MRecord fields tails → record <$> traverse field fields
    <*> traverse (tailUnder package) tails
  MData owner arguments rows → PData owner <$> traverse recur arguments
    <*> traverse (underRow package) rows
  MHandler label rows → PHandler <$> labelUnder package label
    <*> handlerUnder rows
  MArrow _ _ _ → unstages <$> arrowUnder package (markedStages ty)
  where
  recur = under package
  field (Tuple label value) = Tuple label <$> recur value
  record own spliced = PRecord
    { fields: sortWith fst (own <> concatMap _.fields spliced)
    , tails: sort (concatMap _.tails spliced)
    }
  handlerUnder rows = handler <$> underRow package rows.inference
    <*> traverse (underRow package) rows.clauses
  handler inference clauses = { inference, clauses }

tailUnder ∷ EffectPackage → Var → Maybe PRecordRow
tailUnder package = case _ of
  variable@(RigidVar _) → Just { fields: [], tails: [ variable ] }
  variable@(FreshVar _ _) → Map.lookup variable package.rows

markedStages ∷ MTy → Stages MTy MRow
markedStages ty = tailRec step { stages: [], result: ty }
  where
  step found = case found.result of
    MArrow parameter row rest → Loop
      { stages: snoc found.stages { parameter, row }, result: rest }
    MBase _ → Done found
    MVar _ → Done found
    MRecord _ _ → Done found
    MData _ _ _ → Done found
    MHandler _ _ → Done found

arrowUnder ∷ EffectPackage → Stages MTy MRow → Maybe (Stages PTy PRow)
arrowUnder package found = stages <$> traverse stage found.stages
  <*> under package found.result
  where
  stages read result = { stages: read, result }
  stage marked = staged <$> under package marked.parameter
    <*> underRow package marked.row
  staged parameter row = { parameter, row }

-- The recorded labels, then the tail's image's labels and tail.
underRow ∷ EffectPackage → MRow → Maybe PRow
underRow package row = spliced <$> traverse (labelUnder package) row.labels
  <*> traverse image row.tail
  where
  image = case _ of
    EffRigid variable →
      Just { labels: [], tail: Just (PTailRigid variable) }
    variable@(EffFresh _ _) → Map.lookup variable package.effects
  spliced labels = maybe { labels, tail: Nothing } (extended labels)
  extended labels found = { labels: labels <> found.labels, tail: found.tail }

labelUnder ∷ EffectPackage → MLabel → Maybe PLabel
labelUnder package label = labelled <$> traverse (under package) label.args
  <*> markUnder package label.mark
  where
  labelled args mark = { effect: label.effect, args, mark }

markUnder ∷ EffectPackage → MarkRef → Maybe Term
markUnder package = case _ of
  Written FixedN → Just TermN
  Written FixedM → Just TermM
  Written (FixedRigid name) → Just (TermJ (Set.singleton name))
  At position → Map.lookup position package.marks

-- `Nothing` for a keyless `Fail` label (spec §4.2): its payload a
-- variable, an arrow, a handler or a record with a tail. A closed
-- record's head is its sorted labels (Domain.Row `TypeHead`).
key ∷ PLabel → Maybe LabelKey
key label = case label.effect of
  FailEffect → FailKey <$> (typeHead =<< head label.args)
  other → Just (EffectKey other)

typeHead ∷ PTy → Maybe TypeHead
typeHead = case _ of
  PBase IntBase → Just HeadInt
  PBase BoolBase → Just HeadBool
  PBase UnitBase → Just HeadUnit
  PBase TextBase → Just HeadText
  PBase (DataBase owner) → Just (HeadData owner)
  PData owner _ _ → Just (HeadData owner)
  PRecord { fields, tails: [] } → Just (HeadRecord (sort (map fst fields)))
  PRecord _ → Nothing
  PVar _ → Nothing
  PArrow _ _ _ → Nothing
  PHandler _ _ → Nothing
