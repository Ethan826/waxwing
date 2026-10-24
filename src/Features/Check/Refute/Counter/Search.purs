-- CX's search (T-R0a §5.1): untrusted and incomplete; what it returns
-- is evidence only once the check accepts it. Its candidates are T-R0c
-- §2's single-label instances `θ_{R,l,τ}` (refusal-audit.md §2, Lemma
-- SL): every rigid row in `R` is the one field `{ l: τ }`, every other
-- rigid row `{}`, and `τ` and the rigid type variables are distinct
-- fresh base atoms. `R` is empty, then one rigid row, then two, kept
-- only where Lemma SL's hypotheses hold (no `x lacks l` with `x` in `R`;
-- no `x disjoint y` with both in `R`), so the instance satisfies `D`.
-- Labels are those written in the problem's small atom groups and in
-- `D`, then one unwritten label; a hint's labels come first (seeding).
--
-- For each instance it looks for a refuted sub-body: each small group
-- of atoms sharing an id (`withBody` reads every atom of an id), then
-- all small groups together; a refuted sub-body is then shrunk. After
-- the empty `R`, an instance tries alone only the groups that mention
-- a row of `R`: the others read as they did under the empty `R`.
-- Budget: `keys` bounds the presence
-- patterns the search enumerates; a sub-body whose 2^pairs exceeds what
-- is left is skipped. `fuel` and `depth` are not read (a refuter
-- searches even at zero fuel, Task 4.1's documented asymmetry).
module Features.Check.Refute.Counter.Search (searchCX) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array
  ( any
  , concatMap
  , cons
  , deleteAt
  , elem
  , filter
  , index
  , mapWithIndex
  , null
  , partition
  , uncons
  )
import Data.Array.NonEmpty (fromArray)
import Data.Maybe (Maybe(..), maybe)
import Data.String (Pattern(..), contains)
import Data.Tuple (Tuple(..))
import Domain.Recorded (RecordedProblem)
import Domain.Recorded.Atom (Var)
import Domain.Verdict (CX)
import Domain.Verdict.Counter (CXGround(..), CXSubst(..))
import Domain.Verdict.Search (Budget, SearchHint(..))
import Features.Check.Refute.Counter.Decide (decideCall, pairCount)
import Features.Check.Refute.Counter.Groups (Group, groupsOf, labelsIn)
import Features.Check.Refute.Counter.Instance (instantiate, unscoped)
import Features.Check.Refute.Project (toSig)
import Features.Check.Refute.Sig (SigAtom(..), SigProblem)

type Instance = { inR ∷ Array Var, label ∷ String }

type Try = { rho ∷ CXSubst, groups ∷ Array Group }

-- Above this many pairs 2^pairs overflows `Int`; such a sub-body is
-- never tried.
widestPairs ∷ Int
widestPairs = 30

searchCX ∷ Budget → Array SearchHint → RecordedProblem → Maybe CX
searchCX budget hints problem = do
  sig ← toSig problem
  if scopedSig sig then found budget.keys (triesOf hints sig) else Nothing

scopedSig ∷ SigProblem → Boolean
scopedSig sig = null outside.ty && null outside.row
  where
  outside = unscoped sig

triesOf ∷ Array SearchHint → SigProblem → Array Try
triesOf hints sig = concatMap triesAt (instancesOf hints sig groups)
  where
  groups = groupsOf sig
  triesAt one = attempts (rhoOf sig one) (touching one.inR)
  touching inR = if null inR then groups else filter (mentions inR) groups
  mentions inR group = any (flip elem inR) group.rows
  attempts rho tried = map (single rho) tried <> [ { rho, groups } ]
  single rho group = { rho, groups: [ group ] }

instancesOf ∷ Array SearchHint → SigProblem → Array Group → Array Instance
instancesOf hints sig groups =
  cons { inR: [], label: fresh } (filter admissible (concatMap withLabel sets))
  where
  written = labelsIn sig groups
  seeded = partition (hinted hints) written
  labels = seeded.yes <> seeded.no <> [ fresh ]
  fresh = unwritten written
  sets = map pure sig.rigidRow <> pairsOf sig.rigidRow
  withLabel inR = map (instanceOf inR) labels
  instanceOf inR label = { inR, label }
  admissible = singleLabel sig

-- Lemma SL's hypotheses 1 and 2 for `R` and `l`.
singleLabel ∷ SigProblem → Instance → Boolean
singleLabel sig one = not (any excludes (map _.atom sig.d))
  where
  excludes atom = case atom of
    SigLacks row label → elem row one.inR && label == one.label
    SigDisjoint first second → elem first one.inR && elem second one.inR
    SigEqual _ _ → false
    SigFf → false

rhoOf ∷ SigProblem → Instance → CXSubst
rhoOf sig one = CXSubst
  { ty: mapWithIndex freshAtom sig.rigidTy, row: map rowValue sig.rigidRow }
  where
  freshAtom at var = Tuple var (GroundFresh (at + 1))
  rowValue var = Tuple var
    if elem var one.inR then [ Tuple one.label (GroundFresh 0) ] else []

-- The first try whose sub-body is refuted within the pattern budget,
-- shrunk to an irreducible one.
found ∷ Int → Array Try → Maybe CX
found keys tries = tailRec next { at: 0, left: keys }
  where
  next { at, left } = maybe (Done Nothing) (tried at left) (index tries at)
  tried at left try = outcome at try (refutes left try.rho try.groups)
  outcome at try result =
    if result.refuted then Done (certificate try.rho (shrunk result.left try))
    else Loop { at: at + 1, left: result.left }

-- One-at-a-time deletion (the last step of Zeller and Hildebrandt's
-- ddmin, 2002): drop each group in turn while what is left is still
-- refuted, so the check decides a smaller body.
shrunk ∷ Int → Try → Array Group
shrunk keys try = tailRec next { kept: try.groups, at: 0, left: keys }
  where
  next { kept, at, left } =
    maybe (Done kept) (without kept at left) (deleteAt at kept)
  without kept at left fewer =
    if null fewer then Loop { kept, at: at + 1, left }
    else dropped kept fewer at (refutes left try.rho fewer)
  dropped kept fewer at result =
    if result.refuted then Loop { kept: fewer, at, left: result.left }
    else Loop { kept, at: at + 1, left: result.left }

certificate ∷ CXSubst → Array Group → Maybe CX
certificate rho groups = map withBody (fromArray (map _.id groups))
  where
  withBody body = { rho, body }

-- Whether `decideCall` refutes the groups under `rho`, if affordable, and
-- the budget left.
refutes
  ∷ Int → CXSubst → Array Group → { refuted ∷ Boolean, left ∷ Int }
refutes left rho groups =
  if not (null groups) && affordable left (pairCount atoms) then
    decided (decideCall atoms)
  else { refuted: false, left }
  where
  atoms = instantiate rho (concatMap _.entries groups)
  decided result =
    { refuted: not result.satisfiable, left: left - result.patterns }

affordable ∷ Int → Int → Boolean
affordable left pairs = pairs <= widestPairs && power pairs <= left
  where
  power n = tailRec doubled { n, value: 1 }
  doubled { n, value } =
    if n <= 0 then Done value
    else Loop { n: n - 1, value: value * 2 }

hinted ∷ Array SearchHint → String → Boolean
hinted hints label = any mentions hints
  where
  mentions (SearchHint text) = contains (Pattern label) text

pairsOf ∷ Array Var → Array (Array Var)
pairsOf vars = maybe [] split (uncons vars)
  where
  split { head, tail } = map (pairWith head) tail <> pairsOf tail
  pairWith first second = [ first, second ]

-- The first of z, z1, z2, … that is not written.
unwritten ∷ Array String → String
unwritten written = tailRec next 0
  where
  next n = if elem (nameAt n) written then Loop (n + 1) else Done (nameAt n)
  nameAt n = if n == 0 then "z" else "z" <> show n
