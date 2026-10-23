-- `checkDerivation`'s refusals (T-R0a §5.2, AT6; plan Task 5.1). Each
-- names what failed, and the rule is named beside it by
-- `DerivationRefused`, so the fault states its evidence.
module Domain.Verdict.Unsound (Unsound(..)) where

import Domain.Recorded (AtomId)

data Unsound
  -- No injected rule has the derivation's name (ruling R7).
  = Unregistered
  -- `toSig` is undefined: a `D` or `q` atom is outside `TExpr` (CX
  -- refute/statements.md §4.1, condition 2).
  | Unprojectable
  -- A premise is a `D` atom; premises are drawn from `B` only (F1).
  | DAtomPremise AtomId
  -- A premise is no atom of the recorded `B`. An atom the online
  -- substitution rewrote has no id, so citing one lands here.
  | NotOriginal AtomId
  -- Re-run on `withBody (toSig P) premises`, with the whole `D`, the
  -- rule does not fire.
  | RuleDeclines
