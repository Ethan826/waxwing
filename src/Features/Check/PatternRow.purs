module Features.Check.PatternRow
  ( Written
  , KnownRow
  , endsOpen
  , listed
  , growable
  , unknown
  , writtenLabels
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (maybe')
import Domain.Checked.Internal (Open(..))
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Domain.Type.Record (RecordRow, labels, recordRow)
import Features.Check.Matched (PatternEnv)
import Features.Check.Require (expectType, typeName)
import Features.Check.Scheme (State)

-- How a record pattern's written labels meet the record type it is
-- checked against (R004 design §2): which labels the type lacks, whether
-- it may grow to hold them, and whether a pattern without `...` lists
-- every field. A module of its own so that Features.Check.RecordPattern
-- stays under the file budget (R005).

-- A record pattern as resolved: its span, fields and how it ends (none,
-- a bare `...`, or a named rest, R005 design §3).
type Written =
  { span ∷ Span, fields ∷ Array Resolved.FieldPattern, rest ∷ Resolved.Rest }

type KnownRow = RecordRow (Ty Open) Open

-- Whether the pattern ends with `...`, bare or named: it then lists no
-- more fields than it writes.
endsOpen ∷ Written → Boolean
endsOpen written = case written.rest of
  Resolved.NoRest → false
  Resolved.IgnoredRest → true
  Resolved.NamedRest _ → true

-- The first unlisted label in label order, else the tail: a hole tail is
-- closed, as a closed pattern makes a bare hole closed; a rigid one is
-- the rest the pattern misses.
listed
  ∷ ∀ r
  . PatternEnv r
  → State
  → Ty Open
  → { ty ∷ Ty Open, row ∷ KnownRow }
  → Written
  → Either Diagnostic State
listed env state expected known written = maybe' ended missingField
  (Array.find unlisted (labels known.row))
  where
  unlisted label = not (Array.elem label (writtenLabels written))
  missingField label = Left
    (problemAt (PatternMissingField label) written.span)
  ended _
    | Array.null known.row.tails = Right state
    | Array.any rigid known.row.tails = restMissing unit
    | otherwise = expectType env state expected closed written.span
  rigid = case _ of
    Hole _ → false
    Rigid _ → true
  closed = TRecord (recordRow known.row.fields [])
  restMissing _ = do
    name ← typeName env written.span known.ty
    Left (problemAt (PatternMissingRest name) written.span)

-- A record type grows only at a hole tail, and only when a label is new.
growable ∷ KnownRow → Written → Boolean
growable row written = Array.any grows row.tails
  where
  grows = case _ of
    Hole _ → not (Array.null (unknown row written))
    Rigid _ → false

-- The written labels the record type does not hold, in written order.
unknown ∷ KnownRow → Written → Array String
unknown row written = Array.filter absent (writtenLabels written)
  where
  absent label = not (Array.elem label (labels row))

writtenLabels ∷ Written → Array String
writtenLabels written = map fieldLabel written.fields
  where
  fieldLabel field = field.label
