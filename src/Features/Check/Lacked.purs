module Features.Check.Lacked (refusedAt) where

import Prelude
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..))
import Domain.Problem (Hint(..), Problem(..))
import Domain.Syntax (Diagnostic, Note, NoteReason(..), Span)
import Domain.Type (VarId(..))
import Features.Check.RowStore (Because(..), arrival)
import Features.Check.Subst (Flex(..), Subst, storeOf)
import Features.Check.UnifyFailure (Refusal(..))

-- What a refusal's text names: the enclosing signature's variables and
-- where each record row variable is introduced.
type Named r =
  { variables ∷ Array String, introduced ∷ Map String Span | r }

-- A fact of the row store broken, at `span`, the requirement that broke
-- it (location rule 1). R005 design §5 (D1): a label a written `where r
-- lacks { … }` forbids, noted at the label in the clause; only the
-- violated label is named. Tranche B design §10, approved texts: D2, the
-- label both rows hold, noted where it arrived and why the rows are
-- disjoint; D3'', a rigid tail that may hold the label, noted where the
-- tail is introduced and why; D3, two rigid tails not known disjoint, with
-- its hint; D3', one rigid tail in both rows. D3, D3' and D3'' name the
-- enclosing signature's rigids (location rule 4). (Placeholder P2, for a
-- refusal an equation caused, lost its last cause with the sum rule and
-- bounds in B2; B5 renders the refusals B3's predicates cause.)
refusedAt ∷ ∀ r. Named r → Subst → Span → Refusal → Diagnostic
refusedAt env subst span = case _ of
  Forbidden label lack → at (LackedField label lack.variable)
    [ { span: lack.span, reason: RequiredHere } ]
  Overlap label pair from → at (inBoth label pair.variables)
    [ { span: arrived from, reason: FirstWrittenHere }
    , { span: pair.span, reason: RequiredHere }
    ]
  MayHold tail label because → at (RowMayHaveField (named tail) label)
    (introducedAt (named tail) <> requiredAt because)
  Unproven one other because → at
    ( Hinted (NotKnownDisjoint (named one) (named other))
        (RequireDisjoint (named one) (named other))
    )
    (requiredAt because)
  Twice tail because → at (InBothRows (named tail)) (requiredAt because)
  where
  at problem related = { problem, span, related }
  arrived from = maybe span identity (arrival (storeOf subst) =<< from)
  named tail = nameOf env.variables tail
  introducedAt name = maybe [] (introduction name)
    (Map.lookup name env.introduced)
  introduction name found = [ { span: found, reason: IntroducedHere name } ]
  inBoth label (Tuple one other) = InBothRecords label one other

-- Why the obligation exists: a clause, or the type implying it; a
-- literal's or an implied lack has no note.
requiredAt ∷ Because → Array Note
requiredAt = case _ of
  Lacks lack → [ { span: lack.span, reason: RequiredHere } ]
  Disjoint pair → [ { span: pair.span, reason: RequiredHere } ]
  Joined pair → [ { span: pair.span, reason: RequiredHere } ]
  Implied → []
  Spread _ → []

-- A rigid tail is the enclosing signature's variable at its index.
nameOf ∷ Array String → Flex → String
nameOf variables = case _ of
  Rigid (VarId index) → maybe "" identity (Array.index variables index)
  Meta _ → "_"

