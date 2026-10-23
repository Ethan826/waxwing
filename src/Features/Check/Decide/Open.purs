-- §3.2(a)'s detector (Task 4.2; plan G-A-i(f), revised for §18.70): the
-- `BQ` atoms whose meaning `ValidR` leaves open, which block Solved for
-- every strategy through `decide`'s rule 1. Keyed on G-ValidR's open
-- set, read before G-ValidR; it imports no Features.Check.Strategy*
-- (ruling R11), so G0's limits never reach it.
--
-- The open set, before G-ValidR (controller reading of 2026-10-23,
-- pending the author's G-ValidR ruling; docs/findings.md):
-- - a declared type whose constructors hold a function (the holder
--   set), wherever the ground rule meets it before a definite failure;
-- - `cmp` at a rigid variable, whose value at θR's fresh bases waits on
--   r0-validr-draft.md's κ policy (F-a…F-d, open);
-- - not `pr` at a rigid variable: the author's Pr-1 ruling (rigid
--   variables printable, today's behaviour) fixes it, so it is G0's
--   guard decline, §3.2(b), not a block.
-- A flexible variable is neutral here: a candidate's binding is judged
-- by the check, never by this detector. The atom is read after
-- reduction through entailed equalities, or as recorded when there is
-- none.
--
-- The holder set is the problem's own (ruling K-a, author 2026-10-23).
module Features.Check.Decide.Open
  ( openAtom
  , openRequirements
  ) where

import Prelude
import Data.Array (filter)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (ReqAtom(..), Var)
import Domain.Recorded.Origin (Entry)
import Features.Check.Entailed (Reduction(..), reduction)
import Features.Check.GroundRule (Judgement(..), View, atomType, judge)
import Features.Check.Mentions (isRigid)

openRequirements ∷ RecordedProblem → Array (Entry ReqAtom)
openRequirements problem =
  filter (isOpen <<< _.value) (fields problem).bq
  where
  isOpen = openAtom problem

-- Partially applied to a problem, it solves the problem's equations
-- once for all its atoms.
openAtom ∷ RecordedProblem → ReqAtom → Boolean
openAtom problem = isOpen
  where
  holders = (fields problem).holders
  reduce = reduction problem
  isOpen atom = judge holders (openView atom) (reducedOr (atomType atom))
    == Open
  reducedOr recorded = case reduce recorded of
    Reduced ty → ty
    NoUnifier → recorded
    OutsideFragment → recorded

openView ∷ ReqAtom → View
openView = case _ of
  Printable _ → const Holds
  Comparable _ → rigidOpen

rigidOpen ∷ Var → Judgement
rigidOpen variable = if isRigid variable then Open else Holds
