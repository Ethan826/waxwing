-- One declaration's honest effect package (A2 spec §2.2-§2.3; tranche 2
-- read-back design §C.6, §C.7, Task 6; dossier §18.155 (3), (5), (6)),
-- assembled from the read-backs already built: type and record-row
-- images (ReadBack/Images.purs), effect rows (ReadBack/EffectRows.purs)
-- and mark positions (ReadBack/Marks.purs), every label's mark through
-- one computation of the live mark graph's least terms. Untrusted
-- search: it builds the plain `EffectPackage` only, mints nothing, and a
-- defect here can lose an acceptance at the validator, never certify.
--
-- One hole numbering (design §C.3): every part reads the checked body
-- and the finished trace, both renumbered by `recheck` (body numbers,
-- then extension numbers), so a live meta is one hole number in every
-- map, and the package renumbers nothing. Every effect row is read under
-- ReadBack's `holeBindings` (ReadBack/Bound.purs, design §C.7), as the
-- images are.
--
-- Fail-closed, in this order, the first fault returned (§C.6's single
-- routing: `Left`, never a partial package): an `Unsupported` obligation,
-- the first in the record's obligation order, is `Declined kind`; a
-- trace `finish` could not build is `TraceUnfinished fault` (R036 (2);
-- after `Declined`, a fact of the problem alone, so a declined
-- declaration keeps its fault name); least terms meeting a clash are
-- `MarkClash`; then the rows, the marks and
-- the images, each with its own faults; last, a forced `ResultClauses`
-- tail among the effects (spec §3: an input package holds none) is
-- `ForcedRead v`.
module Features.Check.Strategy.ReadBack.Package
  ( readEffects
  , readEffectsWith
  ) where

import Prelude
import Data.Array (find, head, mapMaybe)
import Data.Either (Either(..), either)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Domain.Checked.Internal as Checked
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect (EVar, Obligation(..), UnsupportedKind)
import Domain.Type (Ty)
import Domain.Verdict.EffectPackage (EffectPackage, PRow)
import Features.Check.Flex (Flex)
import Features.Check.MarkStore (MarkStore)
import Features.Check.Strategy.Effects.Forced (forcedTails)
import Features.Check.Strategy.ReadBack (ReadBack)
import Features.Check.Strategy.ReadBack.Bound (boundRow)
import Features.Check.Strategy.ReadBack.EffectRows (readRows)
import Features.Check.Strategy.ReadBack.Fault (ReadFault(..))
import Features.Check.Strategy.ReadBack.Images (readImages, rowFree)
import Features.Check.Strategy.ReadBack.Marks
  ( MarkTerms
  , leastTerms
  , readMarks
  , termOf
  )
import Features.Check.Trace (TraceFault, Traced)

readEffects
  ∷ RecordedProblem
  → ReadBack
  → Checked.FunctionDecl
  → MarkStore (Ty Flex)
  → Either TraceFault Traced
  → Either ReadFault EffectPackage
readEffects problem found checked store =
  readEffectsWith problem found checked (leastTerms store)

-- The same over given least terms: what `readEffects` computes from the
-- store, and what a test plants (a store cannot hold a clash).
readEffectsWith
  ∷ RecordedProblem
  → ReadBack
  → Checked.FunctionDecl
  → MarkTerms
  → Either TraceFault Traced
  → Either ReadFault EffectPackage
readEffectsWith problem found checked terms finished = do
  maybe (Right unit) (Left <<< Declined) (declined problem)
  traced ← unfinished finished
  when (terms.clashes > 0) (Left MarkClash)
  read ← readRows term problem checked traced
  effects ← traverse (boundRow under) read
  marks ← readMarks terms problem checked traced
  images ← readImages term problem checked found
  unforced problem effects
  pure { types: images.types, rows: images.rows, effects, marks }
  where
  unfinished = either (Left <<< TraceUnfinished) Right
  term = termOf terms
  arities = (fields problem).effects.declarations.types
  under = { bindings: found.holeBindings, image: rowFree arities }

-- The first `Unsupported` obligation's kind, in recorded order.
declined ∷ RecordedProblem → Maybe UnsupportedKind
declined problem =
  head (mapMaybe unsupported (fields problem).effects.obligations)
  where
  unsupported placed = case placed.value of
    Unsupported kind → Just kind
    _ → Nothing

-- No forced tail among the effects (A2 spec §3); EffectRows skips them.
unforced ∷ RecordedProblem → Map EVar PRow → Either ReadFault Unit
unforced problem effects =
  maybe (Right unit) (Left <<< ForcedRead)
    (find (flip Map.member effects) (map _.forced (forcedTails problem)))
