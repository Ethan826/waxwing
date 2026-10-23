-- The ground requirement rule, three-valued over a type that may still
-- mention variables (Task 4.2; T-R0b §5.4, docs/plans/r0-validr-draft.md
-- §4.1, read before G-ValidR). A function type is neither printable nor
-- comparable, at any depth through record fields and `app` arguments;
-- a handler type neither. A declared type whose constructors hold a
-- function (the problem's holder set, ruling K-a) is `Open`: `ValidR`
-- leaves its value unfixed until G-ValidR (§3.2(a)). A head the
-- program does not declare is `Unjudged`, never printable: missing
-- metadata is no evidence. What a
-- variable contributes is the caller's `view`: §3.2(a)'s detector, G0's
-- guard and G0's check each read variables differently.
module Features.Check.GroundRule
  ( Judgement(..)
  , View
  , atomType
  , both
  , judge
  ) where

import Prelude
import Data.Array (cons, foldl)
import Data.Set as Set
import Data.Tuple (snd)
import Domain.Recorded.Atom
  ( Base(..)
  , Head(..)
  , Holders
  , RTExpr(..)
  , ReqAtom(..)
  , Var
  )
import Domain.Type (TypeId)

-- Ordered by what a conjunction keeps: a definite failure wins, then an
-- open point, then a part the caller cannot judge.
data Judgement = Holds | Unjudged | Open | Fails

type View = Var → Judgement

atomType ∷ ReqAtom → RTExpr
atomType = case _ of
  Printable ty → ty
  Comparable ty → ty

judge ∷ Holders → View → RTExpr → Judgement
judge holders view = case _ of
  Base base → based holders base
  Arrow _ _ → Fails
  TVar variable → view variable
  Record fields tails → every
    (map (judge holders view <<< snd) fields <> map view tails)
  App (DataHead id) arguments → every
    (declared holders id `cons` map (judge holders view) arguments)
  App (HandlerHead _) _ → Fails

-- The conjunction: the later constructor of `Judgement` wins (derived
-- `Ord` follows constructor order).
both ∷ Judgement → Judgement → Judgement
both = max

every ∷ Array Judgement → Judgement
every = foldl both Holds

based ∷ Holders → Base → Judgement
based holders = case _ of
  IntBase → Holds
  BoolBase → Holds
  TextBase → Holds
  UnitBase → Holds
  DataBase id → declared holders id

declared ∷ Holders → TypeId → Judgement
declared holders id
  | not (Set.member id holders.declared) = Unjudged
  | Set.member id holders.holding = Open
  | otherwise = Holds

derive instance eqJudgement ∷ Eq Judgement
derive instance ordJudgement ∷ Ord Judgement
