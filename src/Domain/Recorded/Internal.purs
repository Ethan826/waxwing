-- The recorded problem's constructor (T-R0a §3.1, §2 property 2). Only
-- generation (Features.Check.Generate*) builds a recorded problem, and
-- Domain.Recorded re-exports the types alone with a read-only view;
-- scripts/structure.mjs enforces both.
module Domain.Recorded.Internal (Fields, RecordedProblem(..)) where

import Prelude
import Data.Map (Map)
import Domain.Recorded.Atom
  ( Atom
  , CallSite
  , Holders
  , OutsideKind
  , RTExpr
  , ReqAtom
  , Var
  , VarInfo
  )
import Domain.Recorded.Origin (Entry, Path)
import Domain.Recorded.Effect (EffectProblem)
import Domain.Resolved (FunctionId)

-- T-R0b §10's shape, verbatim. `decl` is carried unconditionally, so
-- equality tells two declarations apart even with no atoms (D1 spec §6.2).
type Fields =
  { decl ∷ FunctionId
  , rigidTy ∷ Array Var -- Forall
  , rigidRow ∷ Array Var
  , flexTy ∷ Array Var -- Exists
  , flexRow ∷ Array Var
  , d ∷ Array (Entry Atom) -- computed (Sig4-Sig8)
  , q ∷ Array (Entry ReqAtom) -- [VOR], empty today
  , b ∷ Array (Entry Atom)
  , bq ∷ Array (Entry ReqAtom) -- [VOR]
  , outside ∷ Array (Entry OutsideKind) -- §3.5
  , adm ∷ Array (Entry CallSite) -- every function reference (E3, E5)
  , split ∷ Array (Entry CallSite) -- RecordSort slots
  , vars ∷ Map Var VarInfo -- §5.2, site table
  , types ∷ Map Path RTExpr -- §5.2, site table
  , holders ∷ Holders -- ruling K-a: the program's holder set
  , effects ∷ EffectProblem -- a-min §10; empty until rules emit
  }

newtype RecordedProblem = RecordedProblem Fields

-- Structural equality: D1's `elaborate` compares problems (D1 spec §6.2).
derive instance eqRecordedProblem ∷ Eq RecordedProblem
