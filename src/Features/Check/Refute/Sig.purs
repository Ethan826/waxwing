-- CX's `SigProblem` as rules and refuters read it (T-R0a §5; CX
-- refute/statements.md §4.1), with each atom's recorded id. Built by
-- `toSig` (Features.Check.Refute.Project).
module Features.Check.Refute.Sig
  ( SigAtom(..)
  , SigEntry
  , SigExpr(..)
  , SigProblem
  , SigVar(..)
  ) where

import Data.Tuple (Tuple)
import Domain.Recorded (AtomId)
import Domain.Recorded.Atom (Base, Var)

-- A type variable of the projection: a recorded one, or the fresh
-- flexible variable standing for the `n`th `app` occurrence of the body.
data SigVar = Named Var | Generalized Int

-- Lean's `TExpr` (Composition/Syntax.lean): base, arrow, type variable,
-- record with row-variable tails.
data SigExpr
  = SigBase Base
  | SigArrow SigExpr SigExpr
  | SigTVar SigVar
  | SigRecord (Array (Tuple String SigExpr)) (Array Var)

data SigAtom
  = SigEqual SigExpr SigExpr
  | SigLacks Var String
  | SigDisjoint Var Var
  | SigFf

-- An atom with its recorded id, so a rule's premises name original atoms.
type SigEntry = { id ∷ AtomId, atom ∷ SigAtom }

-- Lean's `SigProblem` (Composition/Sig/Validity.lean).
type SigProblem =
  { rigidTy ∷ Array Var
  , rigidRow ∷ Array Var
  , d ∷ Array SigEntry
  , b ∷ Array SigEntry
  }
