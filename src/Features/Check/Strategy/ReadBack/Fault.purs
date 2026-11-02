-- Why the effect read-back built no package (tranche 2 read-back design
-- §C.6; dossier §18.155 (3), (5)): a read failure is `Left` with one of
-- these, never an invented value. Untrusted search: a fault loses an
-- acceptance at most, and G0 still decides the candidate.
--
-- `Unread v`: no live value reaches variable v (no trace entry, no
-- located value, or one that cannot be converted). `UnreadPosition p`:
-- the same for a mark position, and a position a `Fail` or Console label
-- refers to whose term is not N (Task 9). `Clash key`: two trace entries under one
-- key, kept by the trace and never chosen between. `Apart v`: two live
-- sources give v different values; `PositionApart p` the same for a
-- mark position, by term (Task 9). `UnreadImage v` and `ImageApart v`:
-- a type image that needs rows it cannot read, or whose erasure is not
-- today's (design §C.8). `Declined k`: an `Unsupported` problem.
module Features.Check.Strategy.ReadBack.Fault (ReadFault(..)) where

import Prelude
import Domain.Recorded.Atom (Var)
import Domain.Recorded.Effect (EVar, Position, UnsupportedKind)
import Features.Check.Trace (TraceKey)

data ReadFault
  = Unread EVar
  | UnreadPosition Position
  | PositionApart Position
  | Clash TraceKey
  | Apart EVar
  | UnreadImage Var
  | ImageApart Var
  | Declined UnsupportedKind

derive instance eqReadFault ∷ Eq ReadFault
