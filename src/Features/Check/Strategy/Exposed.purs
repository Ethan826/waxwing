-- trusted surface: every diff needs token review; see docs/engineering.md
-- Scope A's defensive check (decision U3 as realized by dossier §18.198;
-- design §4 D6 as amended): the outside kinds a candidate's terms expose
-- once substituted. Generation narrows the `DataApplication` marker on
-- the written terms; a variable inside an argument may still become an
-- arrow, a record or an excluded head under the candidate, and a
-- generation regression could drop a marker. Every `app` node of `B`,
-- `BQ` and `D` under the candidate is read again here:
-- - a head with a record-row parameter exposes `DataOverRecords`;
-- - any other head that is not admitted, or an argument holding an
--   arrow, a record, a handler head, or a head or nullary type that is
--   not admitted, exposes `DataApplication`.
-- A handler head outside any argument has its own marker and is not
-- read. `checkSubstitution` returns the kinds in its `Valid`, and rule 1
-- blocks Solved on them as on a marker (Features.Check.Decide).
module Features.Check.Strategy.Exposed (exposedBy) where

import Prelude
import Data.Array (concatMap, nubEq, null)
import Data.Set as Set
import Data.Tuple (snd)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom
  ( Atom(..)
  , Base(..)
  , Head(..)
  , Holders
  , OutsideKind(..)
  , RTExpr(..)
  )
import Domain.Recorded.Origin (Entry)
import Domain.Type (TypeId)
import Features.Check.GroundRule (atomType)
import Features.Check.Spine (spine)
import Features.Check.Strategy.Candidate (Substitution, under)

exposedBy ∷ RecordedProblem → Substitution → Array OutsideKind
exposedBy problem candidate = nubEq (concatMap (nodes holders) terms)
  where
  view = fields problem
  holders = view.holders
  terms = map (under candidate)
    ( concatMap atomTerms (values view.b)
        <> concatMap atomTerms (values view.d)
        <> map atomType (values view.bq)
    )
  values ∷ ∀ a. Array (Entry a) → Array a
  values = map _.value

atomTerms ∷ Atom → Array RTExpr
atomTerms = case _ of
  Equal one other → [ one, other ]
  Lacks _ _ → []
  Disjoint _ _ → []
  Ff → []

-- The kinds every `app` node in `ty` exposes, outside any argument.
nodes ∷ Holders → RTExpr → Array OutsideKind
nodes holders ty = case ty of
  Arrow _ _ → concatMap (nodes holders) (parts ty)
  Base _ → []
  TVar _ → []
  Record entries _ → concatMap (nodes holders <<< snd) entries
  App (HandlerHead _) arguments → concatMap (nodes holders) arguments
  App (DataHead id) arguments →
    node holders id arguments <> concatMap (nodes holders) arguments

node ∷ Holders → TypeId → Array RTExpr → Array OutsideKind
node holders id arguments
  | Set.member id holders.overRecords = [ DataOverRecords ]
  | Set.member id holders.admitted
      && null (concatMap (unplain holders) arguments) = []
  | otherwise = [ DataApplication ]

-- Whatever makes an argument not plain (D6 4′ and 8), at any depth.
unplain ∷ Holders → RTExpr → Array Unit
unplain holders ty = case ty of
  Arrow _ _ → [ unit ]
  Record _ _ → [ unit ]
  TVar _ → []
  Base (DataBase id) → if Set.member id holders.admitted then [] else [ unit ]
  Base _ → []
  App (HandlerHead _) _ → [ unit ]
  App (DataHead id) arguments →
    if Set.member id holders.admitted then
      concatMap (unplain holders) arguments
    else [ unit ]

-- An arrow spine's parameters and result, by a loop (Features.Check.Spine).
parts ∷ RTExpr → Array RTExpr
parts ty = found.parameters <> [ found.result ]
  where
  found = spine ty
