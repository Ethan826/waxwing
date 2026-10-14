module Format.Diagnostic.Qualify (hint) where

import Prelude
import Data.Array as Array
import Data.Maybe (maybe')
import Data.String (joinWith)
import Domain.Problem (Candidate)

-- FX020. One candidate is the approved wording (2026-10-13); several are
-- pinned by the controller, awaiting the user's review. One effect:
-- `; use Log.log, or import it with Log { log }`. Several: `; use A.log or
-- B.log, or import one with A { log } or B { log }`, and from three
-- `A.log, B.log or C.log`. The import part writes an effect's parameters
-- (FX022): `Fail(E) { fail }`, `Box(t) { put }`; `use` stays bare.
hint ∷ String → Array Candidate → String
hint name effects = "; use " <> alternatives qualified <> ", or import "
  <> pronoun
  <> " with "
  <> alternatives imported
  where
  qualified = map (qualify name <<< _.name) effects
  imported = map (importing name) effects
  pronoun = if Array.length effects == 1 then "it" else "one"

qualify ∷ String → String → String
qualify name effect = effect <> "." <> name

importing ∷ String → Candidate → String
importing name effect = effect.name <> arguments <> " { " <> name <> " }"
  where
  arguments
    | Array.null effect.parameters = ""
    | otherwise = "(" <> joinWith ", " effect.parameters <> ")"

-- `a`, `a or b`, `a, b or c`.
alternatives ∷ Array String → String
alternatives entries = maybe' joined withLast (Array.unsnoc entries)
  where
  joined _ = joinWith ", " entries
  withLast { init, last }
    | Array.null init = last
    | otherwise = joinWith ", " init <> " or " <> last
