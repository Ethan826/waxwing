-- A recorded marked type laid over a live checked type, part by part, so
-- that each recorded effect-row variable meets the live row at its place
-- (tranche 2 read-back design §C.1's located roles; the inventory's
-- research/t2-read-back-inventory/match.mjs is the research reading).
-- Rows: each recorded label takes the first unused live label of the
-- same effect (a `Fail` label also by its payload's head, when both
-- heads are known), so same-key order is kept; the live labels left
-- over and the live tail are the value of a recorded variable tail.
-- Untrusted search.
--
-- Nothing is invented: where the shapes differ (another constructor, a
-- recorded label with no live counterpart) the variables below that
-- place get no value here, and a variable no source reads is the
-- caller's `Unread`. A closed or rigid recorded tail yields nothing:
-- only variables are read.
module Features.Check.Strategy.ReadBack.EffectMatch
  ( Fact
  , matchRow
  , matchTy
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Maybe (Maybe(..), fromMaybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal (Open)
import Domain.Recorded.Atom (Base(..))
import Domain.Recorded.Effect (EVar(..), MLabel, MRow, MTy(..))
import Domain.Row (EffectRef(..), Label(..), Row(..), TypeHead(..))
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Parts (typeHead)

-- A recorded variable and the live row met at its place.
type Fact = Tuple EVar (TyRow Open)

type Labels = { used ∷ Set Int, facts ∷ Array Fact, missed ∷ Boolean }

matchRow ∷ MRow → TyRow Open → Array Fact
matchRow recorded (Row live tail) = found.facts <> tailFact
  where
  found = foldl (takeLabel live) start recorded.labels
  start = { used: Set.empty, facts: [], missed: false }
  rest = Array.catMaybes (Array.mapWithIndex unused live)
  unused index label
    | Set.member index found.used = Nothing
    | otherwise = Just label
  tailFact
    | found.missed = []
    | otherwise = maybe [] variableFact recorded.tail
  variableFact variable = case variable of
    EffFresh _ _ → [ Tuple variable (Row rest tail) ]
    EffRigid _ → []

matchTy ∷ MTy → Ty Open → Array Fact
matchTy recorded live = case recorded, live of
  MArrow _ _ _, _ → matchArrow recorded live
  MRecord fields _, TRecord row → Array.concatMap (field row.fields) fields
  MData _ arguments rows, TData _ liveArguments liveRows →
    Array.concat (Array.zipWith matchTy arguments liveArguments)
      <> Array.concat (Array.zipWith matchRow rows liveRows)
  MHandler label rows, THandler liveLabel liveRows
    | sameLabel label liveLabel → matchArguments label liveLabel
        <> matchRow rows.inference liveRows.inference
        <> maybe [] (flip matchRow (clausesOf liveRows)) rows.clauses
  _, _ → []
  where
  field liveFields (Tuple name ty) = maybe [] (matchTy ty)
    (map snd' (Array.find (named name) liveFields))
  named name (Tuple label _) = label == name
  snd' (Tuple _ ty) = ty
  clausesOf liveRows = fromMaybe liveRows.inference liveRows.clauses

-- An arrow spine walked in step with the live one, by a loop.
matchArrow ∷ MTy → Ty Open → Array Fact
matchArrow recorded live = tailRec step { recorded, live, facts: [] }
  where
  step at = case at.recorded, at.live of
    MArrow parameter row result, TFun liveParameter liveRow liveResult →
      Loop
        { recorded: result
        , live: liveResult
        , facts: at.facts <> matchTy parameter liveParameter
            <> matchRow row liveRow
        }
    MArrow _ _ _, _ → Done at.facts
    other, liveOther → Done (at.facts <> matchTy other liveOther)

takeLabel ∷ Array (Label (Ty Open)) → Labels → MLabel → Labels
takeLabel live found label =
  maybe (found { missed = true }) taken
    (Array.findIndex free (Array.mapWithIndex Tuple live))
  where
  free (Tuple index each) = not (Set.member index found.used)
    && sameLabel label each
  taken index = maybe found (matched index) (Array.index live index)
  matched index each = found
    { used = Set.insert index found.used
    , facts = found.facts <> matchArguments label each
    }

matchArguments ∷ MLabel → Label (Ty Open) → Array Fact
matchArguments label (Label _ arguments _) =
  Array.concat (Array.zipWith matchTy label.args arguments)

-- The same effect; for `Fail`, the same payload head when both are
-- known (a variable payload's head is not).
sameLabel ∷ MLabel → Label (Ty Open) → Boolean
sameLabel label (Label effect arguments _) = label.effect == effect
  && (effect /= FailEffect || agree recordedHead liveHead)
  where
  recordedHead = Array.head label.args >>= headOf
  liveHead = map sorted (Array.head arguments >>= typeHead)
  agree (Just one) (Just other) = one == other
  agree _ _ = true

headOf ∷ MTy → Maybe TypeHead
headOf = case _ of
  MBase IntBase → Just HeadInt
  MBase BoolBase → Just HeadBool
  MBase UnitBase → Just HeadUnit
  MBase TextBase → Just HeadText
  MBase (DataBase owner) → Just (HeadData owner)
  MData owner _ _ → Just (HeadData owner)
  MRecord fields [] → Just (HeadRecord (Array.sort (map fst fields)))
  _ → Nothing

sorted ∷ TypeHead → TypeHead
sorted = case _ of
  HeadRecord labels → HeadRecord (Array.sort labels)
  other → other
