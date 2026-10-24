-- CX's check (T-R0a §5.1; refute/statements.md §4): it decides
-- `CXChecked (withBody (toSig P) body) rho` and mints nothing. The
-- conjuncts in §4's order: `Scoped`; `ρ`'s keys duplicate-free, rigid
-- of their sort, binding every rigid variable, each to a well-formed
-- ground expression (rows: ground fields, no tail); `decideCall` true on
-- `ρ` applied to the whole `D`, false on `ρ` applied to the sub-body.
-- The sub-body is every `B` atom carrying one of the certificate's ids
-- (`withBody`; `AtomId` is not unique), so the check reads the whole
-- `D` and never a sub-`D` (C1-D, X7). Its soundness is CX-KP with
-- CX-PR for the projection: stated, unproved, so the refuter runs only
-- in shadow (§18.69 Q10). The two decisions run last, each only once
-- the conjuncts before it hold.
module Features.Check.Refute.Counter.Check (checkCX, checkSig) where

import Prelude
import Data.Array (filter, find, head, length)
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Either (Either(..), note)
import Data.Foldable (any, elem, traverse_)
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded (AtomId, RecordedProblem)
import Domain.Recorded.Atom (Var)
import Domain.Verdict (CX)
import Domain.Verdict.Counter
  ( CXGround(..)
  , CXSubst(..)
  , CheckedCX(..)
  , GroundFields
  , RefuteRefusal(..)
  )
import Features.Check.Refute.Counter.Decide (decideCall)
import Features.Check.Refute.Counter.Instance
  ( groundTerm
  , instantiate
  , unscoped
  )
import Features.Check.Refute.Counter.Term (wfT)
import Features.Check.Refute.Project (toSig, withBody)
import Features.Check.Refute.Sig (SigProblem, SigVar(..))

checkCX ∷ RecordedProblem → CX → Either RefuteRefusal CheckedCX
checkCX problem cx = do
  sig ← note NoProjection (toSig problem)
  traverse_ (inBody sig) cx.body
  checkSig sig cx.body cx.rho

-- The conjuncts on the projection, `body` naming the sub-body.
checkSig
  ∷ SigProblem
  → NonEmptyArray AtomId
  → CXSubst
  → Either RefuteRefusal CheckedCX
checkSig whole body rho@(CXSubst bindings) = do
  scoped whole
  distinctKeys (map fst bindings.ty)
  distinctKeys (map fst bindings.row)
  traverse_ (rigidIn whole.rigidTy <<< fst) bindings.ty
  traverse_ (rigidIn whole.rigidRow <<< fst) bindings.row
  traverse_ (boundIn (map fst bindings.ty)) whole.rigidTy
  traverse_ (boundIn (map fst bindings.row)) whole.rigidRow
  traverse_ groundTy bindings.ty
  traverse_ groundRow bindings.row
  hypothesis rho whole
  refuting rho body (withBody whole body)

inBody ∷ SigProblem → AtomId → Either RefuteRefusal Unit
inBody sig id =
  if any (eq id <<< _.id) sig.b then Right unit else Left (NotInBody id)

-- `Scoped P`. A generalized variable in `D` breaks `toSig`'s contract
-- (it puts none there), so it is reported as `NoProjection`.
scoped ∷ SigProblem → Either RefuteRefusal Unit
scoped sig = do
  traverse_ tyScoped outside.ty
  maybe (Right unit) (Left <<< Unscoped) (head outside.row)
  where
  outside = unscoped sig
  tyScoped var = case var of
    Named name → Left (Unscoped name)
    Generalized _ → Left NoProjection

distinctKeys ∷ Array Var → Either RefuteRefusal Unit
distinctKeys keys = maybe (Right unit) (Left <<< DuplicateKey) (find twice keys)
  where
  twice key = length (filter (eq key) keys) > 1

rigidIn ∷ Array Var → Var → Either RefuteRefusal Unit
rigidIn rigid key = if elem key rigid then Right unit else Left (NotRigid key)

boundIn ∷ Array Var → Var → Either RefuteRefusal Unit
boundIn keys var = if elem var keys then Right unit else Left (RigidUnbound var)

groundTy ∷ Tuple Var CXGround → Either RefuteRefusal Unit
groundTy (Tuple var ground) =
  if wfT (groundTerm ground) then Right unit else Left (IllFormed var)

groundRow ∷ Tuple Var GroundFields → Either RefuteRefusal Unit
groundRow (Tuple var fields) = groundTy (Tuple var (GroundRecord fields))

hypothesis ∷ CXSubst → SigProblem → Either RefuteRefusal Unit
hypothesis rho sig =
  if (decideCall (instantiate rho sig.d)).satisfiable then Right unit
  else Left HypothesisFails

refuting
  ∷ CXSubst
  → NonEmptyArray AtomId
  → SigProblem
  → Either RefuteRefusal CheckedCX
refuting rho body sig =
  if decided.satisfiable then Left BodySatisfiable
  else Right (CheckedCX { rho, body, patterns: decided.patterns })
  where
  decided = decideCall (instantiate rho sig.b)
