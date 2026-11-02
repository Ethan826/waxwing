-- Why the effect read-back built no package (tranche 2 read-back design
-- §C.6; dossier §18.155 (3), (5)): a read failure is `Left` with one of
-- these, never an invented value. Untrusted search: a fault loses an
-- acceptance at most, and G0 still decides the candidate.
--
-- `Unread v`: no live value reaches variable v (no trace entry, no
-- located value, or one that cannot be converted). `UnreadPosition p`:
-- the same for a mark position, and a position a `Fail` or Console
-- label refers to whose term is not N (Task 9). `Clash key`: two trace
-- entries under one key, kept by the trace and never chosen between.
-- `Apart v`: two live sources give v different values; `PositionApart p`
-- the same for a mark position, by term (Task 9). `MarkClash`: the live
-- mark graph's least terms met a class holding two different constants
-- (Task 9; unreachable from a store). `UnreadImage v` and `ImageApart v`:
-- a type image that needs rows it cannot read, or whose erasure is not
-- today's (design §C.8); also a hole θ binds to a value the package
-- cannot hold (design §C.7, ReadBack/Bound.purs). `Declined k`: an
-- `Unsupported` problem. `ForcedRead v`: the assembled effects bind a
-- forced `ResultClauses` tail v (A2 spec §3), which only a defect in the
-- row read-back could produce (Task 11's assertion).
module Features.Check.Strategy.ReadBack.Fault (ReadFault(..)) where

import Prelude
import Domain.Recorded.Atom (Var)
import Domain.Recorded.Effect (EVar, Position, UnsupportedKind)
import Features.Check.Trace (TraceKey)

data ReadFault
  = Unread EVar
  | UnreadPosition Position
  | PositionApart Position
  | MarkClash
  | Clash TraceKey
  | Apart EVar
  | UnreadImage Var
  | ImageApart Var
  | Declined UnsupportedKind
  | ForcedRead EVar

derive instance eqReadFault ∷ Eq ReadFault
