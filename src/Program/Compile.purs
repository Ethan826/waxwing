module Program.Compile (compile) where

import Prelude
import Data.Either (Either)
import Domain.Syntax (Diagnostic)
import Features.Check (check)
import Features.Resolve (resolve)
import Features.Specialize (specialize)
import Format.Go (emit)
import Format.Go.Families (keyed)
import Format.Parse (parse)

-- Emission refuses only a program whose Fail families cannot all be given
-- distinct runtime keys (Format.Go.Families).
compile ∷ String → Either Diagnostic String
compile = map emit <<< (parse >=> resolve >=> check >=> specialize >=> keyed)
