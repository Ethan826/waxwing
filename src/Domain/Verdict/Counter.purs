-- CX's certificate parts (refute/statements.md §4; T-R0a §5.1; Task
-- 5.2): the ground substitution at base `B ⊕ Nat`, the checked
-- certificate a shadow record keeps, and the check's refusals. They were
-- uninhabited in Domain.Verdict.Open, which re-exports the three type
-- names from here, so the token module Domain.Verdict.Internal (`CX`)
-- is unchanged. None is a token: a `CheckedCX` is research evidence in
-- a shadow record and mints nothing; only `trustedRefuter`, given a
-- proved theorem, wraps a counter-instance as `Refuted`.
module Domain.Verdict.Counter
  ( CXGround(..)
  , CXSubst(..)
  , CheckedCX(..)
  , GroundFields
  , RefuteRefusal(..)
  ) where

import Prelude
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Tuple (Tuple)
import Domain.Recorded (AtomId)
import Domain.Recorded.Atom (Base, Var)

-- A ground expression over `B ⊕ Nat`: a recorded base (`Sum.inl`), a
-- fresh base atom (`Sum.inr n`), a function or a closed record. It has
-- no variable by construction; a repeated label (Lean's `wfT`) is the
-- check's to refuse.
data CXGround
  = GroundBase Base
  | GroundFresh Int
  | GroundArrow CXGround CXGround
  | GroundRecord GroundFields

type GroundFields = Array (Tuple String CXGround)

-- CX's `ρ`: rigid type variables to ground expressions, rigid row
-- variables to ground fields with no tail.
newtype CXSubst = CXSubst
  { ty ∷ Array (Tuple Var CXGround)
  , row ∷ Array (Tuple Var GroundFields)
  }

-- A certificate the check accepted, with the number of presence
-- patterns its decision of the body enumerated (CX question 3).
newtype CheckedCX = CheckedCX
  { rho ∷ CXSubst, body ∷ NonEmptyArray AtomId, patterns ∷ Int }

-- Why the check refused a certificate: the first failed conjunct of
-- `CXChecked (withBody (toSig P) body) rho`, in the order of §4.
data RefuteRefusal
  -- `toSig` is undefined (a `D` or `q` atom outside `TExpr`).
  = NoProjection
  -- A body id names no atom of the recorded `B`.
  | NotInBody AtomId
  -- `Scoped`: `D` mentions a variable outside the rigid lists.
  | Unscoped Var
  -- `ρ` binds a variable twice.
  | DuplicateKey Var
  -- `ρ` binds a variable that is not rigid (of that sort).
  | NotRigid Var
  -- `ρ` leaves a rigid variable unbound.
  | RigidUnbound Var
  -- A binding repeats a label in some record (not `wfT`).
  | IllFormed Var
  -- `decideCall` is false on `ρ` applied to `D`.
  | HypothesisFails
  -- `decideCall` is true on `ρ` applied to the body.
  | BodySatisfiable

derive instance eqCXGround ∷ Eq CXGround
derive instance eqRefuteRefusal ∷ Eq RefuteRefusal
