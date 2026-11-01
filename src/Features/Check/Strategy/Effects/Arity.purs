-- trusted surface: every diff needs token review; see docs/engineering.md
-- The declared arities as the A2 validator reads them (dossier §18.148
-- (1); docs/plans/2026-11-01-a2-arity-metadata.md §2), shared by I3's
-- check (k) over package images (Effects.MalformedTerms, Malformed) and
-- record check 5 over recorded types (Effects.RecordRefs, RecordArity).
-- An application is an effect label (its argument count, no rows) or a
-- data type (its type- and row-argument counts). It conforms when its
-- head is declared with exactly its counts, or, when `bare`, has none:
-- a non-`Fail` label of a clause row C (C's labels are R's, bare;
-- statements §2, Generate/Owned.purs `bareLabel`; R-b: bare reading
-- ignores arguments without erasing them, so the declared count is
-- accepted too), or the top-level data payload of a `Fail` label of C
-- (its head only, Owned.purs `headOnly`). A `Fail` label keeps its
-- payload in C, so it is never bare.
module Features.Check.Strategy.Effects.Arity
  ( Application
  , ArityFault(..)
  , arityFault
  , dataApplication
  , labelApplication
  , validDeclarations
  ) where

import Prelude
import Data.Array (length)
import Data.Foldable (all)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Domain.Recorded.Arity (DataArity, Declarations)
import Domain.Row (EffectRef(..))
import Domain.Type (TypeId)
import Domain.Verdict.Search (Applied(..))
import Features.Resolve.Builtin (builtinEffects)

type Application = { applied ∷ Applied, given ∷ DataArity, bare ∷ Boolean }

-- `Unknown`: the head is not declared; `Miscounted`: it is, with other
-- counts.
data ArityFault = Unknown | Miscounted

-- A label of `count` arguments; `inClause` when it is in a C row.
labelApplication ∷ Boolean → EffectRef → Int → Application
labelApplication inClause effect count =
  { applied: AppliedEffect effect
  , given: { types: count, rows: 0 }
  , bare: inClause && effect /= FailEffect
  }

-- Data `owner` with `types` and `rows` arguments; `bare` for a C row's
-- `Fail` payload.
dataApplication ∷ Boolean → TypeId → Int → Int → Application
dataApplication bare owner types rows =
  { applied: AppliedData owner, given: { types, rows }, bare }

arityFault ∷ Declarations → Application → Maybe ArityFault
arityFault declarations application =
  maybe (Just Unknown) judged (declaredOf declarations application.applied)
  where
  judged expected
    | conforms expected = Nothing
    | otherwise = Just Miscounted
  conforms expected = application.given == expected
    || (application.bare && application.given == { types: 0, rows: 0 })

-- Record check 5's first part: the built-ins recorded with Resolve's
-- counts (`Fail` 1, `Console` 0), no negative count, and the data types
-- exactly the program's declared set, recorded independently in
-- `holders.declared` (ruling K-a). A user effect's count has no second
-- record to agree with; only its sign is checked.
validDeclarations ∷ Set TypeId → Declarations → Boolean
validDeclarations declared declarations =
  all builtinRecorded builtinEffects
    && all nonNegative declarations.effects
    && all nonNegativeData declarations.types
    && Map.keys declarations.types == declared
  where
  builtinRecorded found = Map.lookup found.ref declarations.effects
    == Just (length found.parameters)
  nonNegativeData arity = nonNegative arity.types && nonNegative arity.rows

declaredOf ∷ Declarations → Applied → Maybe DataArity
declaredOf declarations = case _ of
  AppliedEffect effect → labelArity <$> Map.lookup effect declarations.effects
  AppliedData owner → Map.lookup owner declarations.types
  where
  labelArity count = { types: count, rows: 0 }

nonNegative ∷ Int → Boolean
nonNegative count = count >= 0
