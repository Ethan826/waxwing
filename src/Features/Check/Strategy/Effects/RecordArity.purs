-- trusted surface: every diff needs token review; see docs/engineering.md
-- Record check 5 (dossier §18.148 (1); docs/plans/
-- 2026-11-01-a2-arity-metadata.md §2.3): the recorded declared arities
-- are valid (Effects.Arity `validDeclarations`), and every application an
-- entry records conforms to them. An entry is judged only against valid
-- arities, so a defect in the arities is never blamed on an entry that
-- reads them: it is reported once, as the `InDeclarations` entry, after
-- every table entry and before the coverage entry (Effects.Record).
module Features.Check.Strategy.Effects.RecordArity
  ( applicationsWrong
  , declarationsDefect
  , validArities
  ) where

import Prelude
import Data.Array (any)
import Data.Maybe (Maybe(..), isJust, maybe)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Arity (Declarations)
import Domain.Recorded.Effect (Provenance(..), RecordTable(..))
import Domain.Verdict.Search (CheckAt)
import Features.Check.Strategy.Effects.Arity (arityFault, validDeclarations)
import Features.Check.Strategy.Effects.RecordRefs (Refs)

-- The recorded arities when they are valid.
validArities ∷ RecordedProblem → Maybe Declarations
validArities problem = valid (fields problem)
  where
  valid recorded
    | validDeclarations recorded.holders.declared
        recorded.effects.declarations = Just recorded.effects.declarations
    | otherwise = Nothing

-- Check 5 of one entry: an application valid arities lack or count
-- otherwise. Invalid arities judge no entry.
applicationsWrong ∷ Maybe Declarations → Refs → Boolean
applicationsWrong arities refs = maybe false wrong arities
  where
  wrong declarations =
    any (isJust <<< arityFault declarations) refs.applications

-- Check 5 of the arities themselves.
declarationsDefect ∷ RecordedProblem → Maybe CheckAt
declarationsDefect problem = maybe (Just at) (const Nothing)
  (validArities problem)
  where
  decl = (fields problem).decl
  at =
    { provenance: InRecord { decl, table: InDeclarations, path: Nothing }
    , check: 5
    }
