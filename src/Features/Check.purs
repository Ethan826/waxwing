-- Today's single-diagnostic view of the collecting driver
-- (Features.Check.Outcomes): the first diagnostic in its order, or the
-- checked program.
module Features.Check (check) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either (Either(..), either)
import Domain.Checked.Internal as Checked
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic)
import Features.Check.Outcomes (checkProgram)

check ∷ Resolved.Program → Either Diagnostic Checked.Program
check = either (Left <<< NonEmptyArray.head) Right <<< _.program
  <<< checkProgram
