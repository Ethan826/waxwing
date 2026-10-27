-- trusted surface: every diff needs token review; see docs/engineering.md
-- A written type with its effect rows and marks kept (a-min statements,
-- docs/plans/r0-amin-statements.md §2, §3): the marked counterpart of
-- Generate.Translate, which erases them. `Declared` is the declaration's
-- own naming (rigid variables, marks as written); `AtUse p` an
-- instance at path p (type and record-row variables as `instances`
-- names them, each effect-row variable `EffFresh p (EffInst v)`, each
-- `nofail(k)` the one position `Instantiated p k`); `InAnnotation p j`
-- parameter j's annotation (declared naming, each unwritten mark the
-- position `Annotation p j n`, n counting unwritten marks in pre-order:
-- a label's mark before its arguments', an arrow's parameter, row, then
-- result, data's arguments then rows). A Console label is always `N`
-- (statements T3-e), and so is a `Fail` label, whose mark is a
-- placeholder (statements §2): never a position, so it takes no index.
-- Arrow spines are walked by loops (Generate.Elab.Stages), in numbering
-- too; recursion enters only parameters, fields and arguments, which
-- nesting bounds.
module Features.Check.Generate.Marked
  ( MarkNaming(..)
  , marked
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (Accum, mapAccumL, traverse)
import Data.Tuple (Tuple(..))
import Domain.Ids (TypeId(..))
import Domain.Recorded.Atom (Base(..), Role(..), Var(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , Fixed(..)
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  )
import Domain.Recorded.Origin (Path)
import Domain.Resolved (VarId)
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Generate.Elab.Stages (stagesOf)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Inputs (Tables)

data MarkNaming
  = Declared
  | AtUse Path
  | InAnnotation Path Int

-- A declared type the tables lack is `UnknownType`; an `Unmarked` mark
-- outside an annotation, or a `MarkMeta`, is `MarkShape`.
marked ∷ Tables → MarkNaming → Ty VarId → Either GenerationFault MTy
marked tables naming ty = numbered naming <$> mtyOf tables naming ty

mtyOf ∷ Tables → MarkNaming → Ty VarId → Either GenerationFault MTy
mtyOf tables naming ty = case ty of
  TInt → base IntBase
  TBool → base BoolBase
  TText → base TextBase
  TUnit → base UnitBase
  TVar variable → pure (MVar (typeVar naming variable))
  TRecord row → MRecord <$> traverse field row.fields
    <@> map (typeVar naming) row.tails
  TData owner arguments rows → known tables owner *>
    (MData owner <$> traverse again arguments <*> traverse rowOf rows)
  THandler label rows → MHandler <$> labelOf naming again label
    <*> (inferenceOnly <$> rowOf rows.inference)
  arrow@(TFun _ _ _) → spineOf (stagesOf arrow)
  where
  again = mtyOf tables naming
  rowOf = markedRow naming again
  base = pure <<< MBase
  field (Tuple name inner) = Tuple name <$> again inner
  inferenceOnly inference = { inference, clauses: Nothing }
  stage (Tuple parameter row) = Tuple <$> again parameter <*> rowOf row
  spineOf found = flip (Array.foldr arrowOf) <$> traverse stage found.stages
    <*> again found.result

known ∷ Tables → TypeId → Either GenerationFault Unit
known tables id@(TypeId index) = maybe (Left (UnknownType id))
  (const (Right unit))
  (Array.index tables.types index)

typeVar ∷ MarkNaming → VarId → Var
typeVar naming variable = case naming of
  AtUse path → FreshVar path (Inst variable)
  _ → RigidVar variable

effectVar ∷ MarkNaming → VarId → EVar
effectVar naming variable = case naming of
  AtUse path → EffFresh path (EffInst variable)
  _ → EffRigid variable

markedRow
  ∷ MarkNaming
  → (Ty VarId → Either GenerationFault MTy)
  → TyRow VarId
  → Either GenerationFault MRow
markedRow naming again (Row labels tail) =
  { labels: _, tail: map (effectVar naming) tail }
    <$> traverse (labelOf naming again) labels

labelOf
  ∷ MarkNaming
  → (Ty VarId → Either GenerationFault MTy)
  → Label (Ty VarId)
  → Either GenerationFault MLabel
labelOf naming again (Label effect arguments mark) =
  { effect, args: _, mark: _ } <$> traverse again arguments
    <*> markOf naming effect mark

-- An unwritten annotation mark carries the placeholder index 0 until
-- `numbered` counts it.
markOf ∷ MarkNaming → EffectRef → Mark → Either GenerationFault MarkRef
markOf naming effect mark
  | effect == ConsoleEffect || effect == FailEffect = Right (Written FixedN)
  | otherwise = case mark, naming of
      NoFail, _ → Right (Written FixedN)
      Plain, _ → Right (Written FixedM)
      MarkVariable k, AtUse path → Right (At (Instantiated path k))
      MarkVariable k, _ → Right (Written (FixedRigid k))
      Unmarked, InAnnotation path j → Right (At (Annotation path j 0))
      _, _ → Left MarkShape

-- Numbering the placeholders in pre-order, an arrow spine by a loop.
type Place = { path ∷ Path, parameter ∷ Int }

numbered ∷ MarkNaming → MTy → MTy
numbered naming ty = case naming of
  InAnnotation path parameter → _.value (numTy { path, parameter } 0 ty)
  _ → ty

-- The count after the first step feeds the second; their values join.
andThen
  ∷ ∀ a b c
  . Accum Int a
  → (Int → Accum Int b)
  → (a → b → c)
  → Accum Int c
andThen first next join =
  { accum: second.accum, value: join first.value second.value }
  where
  second = next first.accum

mapped ∷ ∀ a b. (a → b) → Accum Int a → Accum Int b
mapped f found = { accum: found.accum, value: f found.value }

numTy ∷ Place → Int → MTy → Accum Int MTy
numTy place n = case _ of
  MBase base → { accum: n, value: MBase base }
  MVar variable → { accum: n, value: MVar variable }
  MRecord fields tails →
    mapped (flip MRecord tails) (mapAccumL numField n fields)
  MData owner arguments rows →
    andThen (mapAccumL (numTy place) n arguments) (numRows rows)
      (MData owner)
  MHandler label rows →
    andThen (numLabel place n label) (numHandler rows) MHandler
  arrow@(MArrow _ _ _) → numSpine place n (arrowStages arrow)
  where
  numField count (Tuple name ty) = mapped (Tuple name) (numTy place count ty)
  numRows rows count = mapAccumL (numRow place) count rows
  numHandler rows count = andThen (numRow place count rows.inference)
    (numClauses rows.clauses)
    { inference: _, clauses: _ }
  numClauses clauses count = mapAccumL (numRow place) count clauses

numSpine ∷ Place → Int → MStages → Accum Int MTy
numSpine place n found = andThen (mapAccumL numStage n found.stages)
  (numTy place <@> found.result)
  (flip (Array.foldr arrowOf))
  where
  numStage count (Tuple parameter row) =
    andThen (numTy place count parameter) (numRow place <@> row) Tuple

numRow ∷ Place → Int → MRow → Accum Int MRow
numRow place n row =
  mapped (row { labels = _ }) (mapAccumL (numLabel place) n row.labels)

numLabel ∷ Place → Int → MLabel → Accum Int MLabel
numLabel place n label = andThen (numMark place n label.mark)
  (numArguments label.args)
  (label { mark = _, args = _ })
  where
  numArguments arguments count = mapAccumL (numTy place) count arguments

numMark ∷ Place → Int → MarkRef → Accum Int MarkRef
numMark place n = case _ of
  At (Annotation _ _ _) →
    { accum: n + 1, value: At (Annotation place.path place.parameter n) }
  mark → { accum: n, value: mark }

type MStages = { stages ∷ Array (Tuple MTy MRow), result ∷ MTy }

arrowOf ∷ Tuple MTy MRow → MTy → MTy
arrowOf (Tuple parameter row) = MArrow parameter row

arrowStages ∷ MTy → MStages
arrowStages ty = tailRec step { stages: [], result: ty }
  where
  step found = case found.result of
    MArrow parameter row rest → Loop
      { stages: Array.snoc found.stages (Tuple parameter row), result: rest }
    _ → Done found
