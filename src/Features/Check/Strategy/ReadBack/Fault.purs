-- Why the effect read-back built no package (tranche 2 read-back design
-- §C.6; dossier §18.155 (3), (5)): a read failure is `Left` with one of
-- these, never an invented value. Untrusted search: a fault loses an
-- acceptance at most, and G0 still decides the candidate.
--
-- `Unread v`: no live value reaches variable v (no trace entry and no
-- located value). `RowUnconverted v e`: a value read for v holds a user
-- label `e` with no term (ReadBack/Convert.purs `UnmarkedLabel`: no mark,
-- or one the injected terms do not read; R036 (3)). `UnreadPosition p`:
-- the same as `Unread` for a mark position, and a position a `Fail` or
-- Console label refers to whose term is not N (Task 9). `Clash key`: two
-- trace entries under one key, kept by the trace and never chosen
-- between. `Apart v`: two live sources give v different values;
-- `PositionApart p` the same for a mark position, by term (Task 9).
-- `MarkClash`: the live mark graph's least terms met a class holding two
-- different constants (Task 9; unreachable from a store).
-- `ImageUnconverted v e`: the live type at v's position holds a user
-- label `e` with no term, as `RowUnconverted` (R036 (3)). `ImageApart
-- v`: a type image whose erasure is not today's (design §C.8).
--
-- `UnreadImage v` is a recorded coarsening (R036 (3); dossier §18.161
-- (2)) of two kinds of cause, which it does not tell apart:
-- - no value reaches v: v has no `vars` entry, or no live value at its
--   position (ReadBack/Images.purs);
-- - a value reaches v that the package cannot hold: an auxiliary whose
--   image needs rows (Images `rowFree`; the statsEvidence cause), a
--   record-row variable whose image is no record (Images `recordRow`),
--   and a hole θ binds to a value the package cannot hold (design §C.7,
--   ReadBack/Bound.purs: a bound effect-row tail, a merged record
--   repeating a label, a bound record tail that is not a record, a value
--   with no row-free image).
--
-- `Declined k`: an `Unsupported` problem. `TraceUnfinished f`: the
-- trace could not be finished (Check/Trace.purs `finish`: a meta the
-- extended numbering lacks; R036 (2)). `ForcedRead v`: the assembled
-- effects bind a forced `ResultClauses` tail v (A2 spec §3), which only a
-- defect in the row read-back could produce (Task 11's assertion).
module Features.Check.Strategy.ReadBack.Fault (ReadFault(..)) where

import Prelude
import Domain.Recorded.Atom (Var)
import Domain.Recorded.Effect (EVar, Position, UnsupportedKind)
import Domain.Row (EffectRef)
import Features.Check.Trace (TraceFault, TraceKey)

data ReadFault
  = Unread EVar
  | RowUnconverted EVar EffectRef
  | UnreadPosition Position
  | PositionApart Position
  | MarkClash
  | Clash TraceKey
  | Apart EVar
  | UnreadImage Var
  | ImageUnconverted Var EffectRef
  | ImageApart Var
  | Declined UnsupportedKind
  | TraceUnfinished TraceFault
  | ForcedRead EVar

derive instance eqReadFault ∷ Eq ReadFault
