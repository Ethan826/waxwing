-- Ground (1) and the trusted refuter (T-R0a §5.1, §5.2). `registry` is
-- empty until P-C1, and a `TheoremRef` can be made only in
-- Features.Check.Refute.Theorems, which makes none, so in production no
-- rule exists and `trustedRefuter` cannot be called. `checkDerivation`
-- reads the rule set `Checking.rules` injects: "registered" means
-- present there (ruling R7).
module Features.Check.Refute.Rules
  ( module Exports
  , Refuter
  , RefuterParts
  , RefuterSpec
  , checkDerivation
  , refuterParts
  , registry
  , trustedRefuter
  ) where

import Prelude
import Data.Array (find)
import Data.Either (Either(..), note)
import Data.Foldable (any, traverse_)
import Data.Maybe (Maybe, maybe)
import Domain.Recorded (AtomId, RecordedProblem)
import Domain.Verdict
  ( CX
  , Derivation
  , Evidence(..)
  , RefuterName
  , RuleName(..)
  )
import Domain.Verdict.Internal (Refuted(..))
import Domain.Verdict.Open (Budget, CheckedCX, RefuteRefusal, SearchHint)
import Domain.Verdict.Unsound (Unsound(..))
import Features.Check.Refute.Project (toSig, withBody)
import Features.Check.Refute.Rules.Internal (SoundRule) as Exports
import Features.Check.Refute.Rules.Internal (SoundRule(..))
import Features.Check.Refute.Sig (SigProblem)
import Features.Check.Refute.Theorems (TheoremRef)

-- What a refuter provides (§5.1): an untrusted, possibly incomplete
-- search, and a check that decides `CXChecked (withBody (toSig P)
-- cx.body) cx.rho` and mints nothing.
type RefuterSpec =
  { name ∷ RefuterName
  , search ∷ Budget → Array SearchHint → RecordedProblem → Maybe CX
  , check ∷ RecordedProblem → CX → Either RefuteRefusal CheckedCX
  }

-- A trusted refuter. Only `trustedRefuter` makes one (Q10's two
-- constructors; `shadowRefuter` is Task 4.1's); `decide` reads its parts.
newtype Refuter = Refuter RefuterParts

-- `confirm` runs the spec's check and wraps an accepted counter-instance.
type RefuterParts =
  { name ∷ RefuterName
  , theorem ∷ TheoremRef
  , search ∷ Budget → Array SearchHint → RecordedProblem → Maybe CX
  , confirm ∷ RecordedProblem → CX → Either RefuteRefusal Refuted
  }

-- Empty until P-C1: a rule enters only with a proved theorem (§5.2).
registry ∷ Array SoundRule
registry = []

-- The derivation's rule is looked up in `rules`, its premises must be
-- original `B` atoms, and the rule is re-run on `withBody (toSig P)
-- premises`, which keeps the whole `D`: never on a sub-`D` (F1).
checkDerivation
  ∷ Array SoundRule → RecordedProblem → Derivation → Either Unsound Evidence
checkDerivation rules problem derivation = do
  rule ← note Unregistered (find (named derivation.rule) rules)
  sig ← note Unprojectable (toSig problem)
  traverse_ (original sig) derivation.premises
  rerun rule (withBody sig derivation.premises)
  pure (ByRule derivation)

refuterParts ∷ Refuter → RefuterParts
refuterParts (Refuter parts) = parts

-- RefuteSound proved, named by `theorem` (§5.1).
trustedRefuter ∷ TheoremRef → RefuterSpec → Refuter
trustedRefuter theorem spec =
  Refuter { name: spec.name, theorem, search: spec.search, confirm }
  where
  confirm problem cx = map (const (Refuted cx)) (spec.check problem cx)

named ∷ RuleName → SoundRule → Boolean
named (RuleName wanted) (SoundRule { name: RuleName name }) = name == wanted

-- A premise is an atom of the recorded `B`: never a `D` atom (F1), and
-- never an atom the online substitution rewrote, which has no id
-- (G-grounds). `toSig` keeps every `B` atom with its id.
original ∷ SigProblem → AtomId → Either Unsound Unit
original sig premise =
  if any cites sig.d then Left (DAtomPremise premise)
  else if any cites sig.b then Right unit
  else Left (NotOriginal premise)
  where
  cites entry = entry.id == premise

-- The rule must fire again on the premises alone. What it derives there
-- is not compared: the evidence is the submitted derivation, whose
-- premises were checked above.
rerun ∷ SoundRule → SigProblem → Either Unsound Unit
rerun (SoundRule rule) premisesOnly =
  maybe (Left RuleDeclines) fired (rule.apply premisesOnly)
  where
  fired _ = Right unit
