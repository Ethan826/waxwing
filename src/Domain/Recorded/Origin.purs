-- Where a recorded entry comes from (T-R0b §6): the node's path, the
-- entry's id, the rule that emitted it and recorder-spec's row. Paths and
-- ids identify; spans are metadata only (§6, "Identities").
module Domain.Recorded.Origin
  ( AtomId
  , Entry
  , Origin
  , OriginKind(..)
  , Path(..)
  , PathRoot(..)
  , RowGroup(..)
  , RuleId(..)
  , SpecRow(..)
  , Step(..)
  ) where

import Prelude
import Domain.Resolved (FunctionId)
import Domain.Syntax (Span)

-- A node's path: from `f.body` (`ε`) or, for signature entries
-- (Sig4-Sig10), from `f.constraints`, `f.parameters`, `f.result` or
-- `f.joined`; each step names a child by its constructor's field and an
-- index (`Call/args/2`, `Match/arms/1/pattern`).
newtype Path = Path { root ∷ PathRoot, steps ∷ Array Step }

data PathRoot
  = InBody
  | InConstraints
  | InParameters
  | InResult
  | InJoined

data Step = Named String | Index Int

-- `index` is the entry's position in its rule's listed order (§3).
type AtomId = { decl ∷ FunctionId, path ∷ Path, index ∷ Int }

type Origin =
  { atom ∷ AtomId
  , rule ∷ RuleId
  , row ∷ SpecRow
  , span ∷ Span
  , kind ∷ OriginKind
  }

-- Recorder-spec §1.1's origin kinds.
data OriginKind = Contract | Types | Body | Inst

-- T-R0b §3's rule ids: Sig1-Sig10, E1-E28, P1-P7.
data RuleId = SigRule Int | ExprRule Int | PatternRule Int

-- Recorder-spec §3's row id (A1-A7, B1-B15, C1-C8, D1-D5, F1-F9, H1-H7,
-- O1-O9; T-R0b §7), so every existing reference to a row stays meaningful.
data SpecRow = SpecRow RowGroup Int

data RowGroup = RowA | RowB | RowC | RowD | RowF | RowH | RowO

-- An atom, requirement atom, marker or site with its origin (§10).
type Entry a = { origin ∷ Origin, value ∷ a }

derive instance eqPathRoot ∷ Eq PathRoot
derive instance ordPathRoot ∷ Ord PathRoot
derive instance eqStep ∷ Eq Step
derive instance ordStep ∷ Ord Step
derive instance eqPath ∷ Eq Path
derive instance ordPath ∷ Ord Path
derive instance eqOriginKind ∷ Eq OriginKind
derive instance eqRuleId ∷ Eq RuleId
derive instance eqSpecRow ∷ Eq SpecRow
derive instance eqRowGroup ∷ Eq RowGroup
