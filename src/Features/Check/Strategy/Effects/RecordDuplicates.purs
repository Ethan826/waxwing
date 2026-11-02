-- trusted surface: every diff needs token review; see docs/engineering.md
-- Record check 6 (dossier §18.155 (2); spec §4.1): the declaration lists
-- `flexEff` and `positions` hold each entry once. The lists are read as
-- recorded, before Effects.Record's scope turns them into sets, which
-- would hide a repeat. A repeat in either is reported once, as the
-- `InDeclaredLists` entry, after every table entry and the declarations
-- entry and before the coverage entry (spec §5 item 1). Repeated
-- references to a variable or position in types and obligations are no
-- defect: only a repeated listing is.
module Features.Check.Strategy.Effects.RecordDuplicates
  ( declaredListsDefect
  ) where

import Prelude
import Data.Array (length, nub)
import Data.Maybe (Maybe(..))
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Effect (Provenance(..), RecordTable(..))
import Domain.Verdict.Search (CheckAt)

declaredListsDefect ∷ RecordedProblem → Maybe CheckAt
declaredListsDefect problem =
  if repeated effects.flexEff || repeated effects.positions then Just at
  else Nothing
  where
  recorded = fields problem
  effects = recorded.effects
  at =
    { provenance:
        InRecord { decl: recorded.decl, table: InDeclaredLists, path: Nothing }
    , check: 6
    }

-- Some entry occurs twice in the list as recorded.
repeated ∷ ∀ a. Ord a ⇒ Array a → Boolean
repeated entries = length (nub entries) < length entries
