module Program.Compile (compile, compileReport) where

import Prelude
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Either (Either(..), either)
import Domain.Syntax (Diagnostic)
import Features.Check.Outcomes (checkProgram)
import Features.Resolve (resolve)
import Features.Specialize (specialize)
import Format.Go (emit)
import Format.Go.Families (keyed)
import Format.Parse (parse)

-- Emission refuses only a program whose Fail families cannot all be given
-- distinct runtime keys (Format.Go.Families). Checking reports every
-- diagnostic, in Features.Check.Outcomes' order; each other stage stops
-- at its first.
compileReport ∷ String → Either (NonEmptyArray Diagnostic) String
compileReport = map emit <<<
  ( alone parse >=> alone resolve >=> (_.program <<< checkProgram)
      >=> alone specialize
      >=> alone keyed
  )

-- The first diagnostic, as the CLI prints it.
compile ∷ String → Either Diagnostic String
compile = either (Left <<< NonEmptyArray.head) Right <<< compileReport

alone
  ∷ ∀ a b. (a → Either Diagnostic b) → a → Either (NonEmptyArray Diagnostic) b
alone stage = either (Left <<< NonEmptyArray.singleton) Right <<< stage
