module Features.Check.Remainder (remainder) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Map (Map)
import Domain.Checked.Internal (Open(..))
import Domain.Resolved (EffectInfo)
import Domain.Syntax (Diagnostic, Span)
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.FreshRecord (freshRecord)
import Features.Check.Require (Names, expectType)
import Features.Check.Scheme (State, Threaded)

-- R005 Tranche B design §5.2 (approved, user decision 6; Task 7): what is
-- left of a record once `labels` are taken from it, for `e without { … }`
-- and a record pattern's named rest. The record is required against `{
-- l1: α1, …, ln: αn, ...ρ }`, ρ and the αi fresh and ρ lacking the
-- labels, in one requirement; the result is ρ. Never a subtraction from
-- a resolved type: over a label with two possible homes, a part not yet
-- known, the subtraction removed nothing and the label came back (review
-- F1); ρ lacks it at once, and is what is left once the parts are known.
remainder
  ∷ ∀ r
  . Names
      ( effects ∷ Array EffectInfo
      , introduced ∷ Map String Span
      , functionName ∷ String
      | r
      )
  → State
  → Ty Open
  → Array String
  → Span
  → Either Diagnostic (Threaded (Ty Open))
remainder env state record labels span = left
  <$> expectType env fresh.state record fresh.record span
  where
  fresh = freshRecord state labels true
  rest = TRecord (recordRow [] [ Hole (state.next + Array.length labels) ])
  left reached = { value: rest, state: reached }
