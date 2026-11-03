-- A recorded marked type laid over a live checked type so that each
-- recorded mark position (`At p`) meets the live mark at its place
-- (tranche 2 read-back design §C.1; the inventory's research/
-- t2-read-back-inventory/match.mjs `mark`). Labels pair as
-- ReadBack/EffectMatch.purs pairs them (same effect, a `Fail` label also
-- by its payload's head; the first unused live label), so same-key order
-- is kept. A written mark (`Written`) is not a position and is not read.
-- Untrusted search.
--
-- Nothing is invented: where the shapes differ, the positions below
-- that place get no reading here; a position no source reads is the
-- caller's `UnreadPosition`.
module Features.Check.Strategy.ReadBack.MarkMatch
  ( Reading
  , marksOfRow
  , marksOfTy
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Maybe (fromMaybe, maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Recorded.Effect (MLabel, MRow, MTy(..), MarkRef(..), Position)
import Domain.Row (Label(..), Mark, Row(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Strategy.ReadBack.EffectMatch
  ( candidateOf
  , sameData
  , sameLabel
  )

-- A recorded position and the live mark met at its place.
type Reading = Tuple Position Mark

type Paired = { used ∷ Set Int, readings ∷ Array Reading }

marksOfTy ∷ MTy → Ty Open → Array Reading
marksOfTy recorded live = case recorded, live of
  MArrow parameter row result, TFun liveParameter liveRow liveResult →
    marksOfTy parameter liveParameter <> marksOfRow row liveRow
      <> marksOfTy result liveResult
  MRecord fields _, TRecord row → Array.concatMap (field row.fields) fields
  MData _ arguments rows, TData _ liveArguments liveRows
    | sameData recorded live →
        Array.concat (Array.zipWith marksOfTy arguments liveArguments)
          <> Array.concat (Array.zipWith marksOfRow rows liveRows)
  MHandler label rows, THandler liveLabel liveRows
    | sameLabel label liveLabel → marksOfLabel label liveLabel
        <> marksOfRow rows.inference liveRows.inference
        <> maybe [] (flip marksOfRow (clausesOf liveRows)) rows.clauses
  _, _ → []
  where
  field liveFields (Tuple name ty) = maybe [] (marksOfTy ty)
    (map valueOf (Array.find (named name) liveFields))
  named name (Tuple label _) = label == name
  valueOf (Tuple _ ty) = ty
  clausesOf liveRows = fromMaybe liveRows.inference liveRows.clauses

marksOfRow ∷ MRow → TyRow Open → Array Reading
marksOfRow recorded (Row live _) = paired.readings
  where
  paired = foldl (takeLabel live) start recorded.labels
  start = { used: Set.empty, readings: [] }

-- The live label is EffectMatch's `candidateOf`: an ambiguous `Fail`
-- label takes none, and its positions get no reading here.
takeLabel ∷ Array (Label (Ty Open)) → Paired → MLabel → Paired
takeLabel live found label =
  maybe found taken (candidateOf live found.used label)
  where
  taken (Tuple index each) = found
    { used = Set.insert index found.used
    , readings = found.readings <> marksOfLabel label each
    }

marksOfLabel ∷ MLabel → Label (Ty Open) → Array Reading
marksOfLabel label (Label _ arguments mark) = own label.mark
  <> Array.concat (Array.zipWith marksOfTy label.args arguments)
  where
  own = case _ of
    At position → [ Tuple position mark ]
    Written _ → []
