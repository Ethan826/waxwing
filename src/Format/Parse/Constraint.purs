module Format.Parse.Constraint (constraints) where

import Prelude
import Domain.Syntax (Requirement(..))
import Format.Parse.Grammar
  ( Parser
  , dispatch
  , expect
  , on
  , sepBy1
  , sepByTrailing1
  , spanned
  )
import Format.Parse.RecordType (label)

-- A signature's optional `where c, c, …` between its types and `=` (R005
-- design §2). The commas outside braces separate constraints and those
-- inside separate labels, which are always braced.
constraints ∷ Parser (Array Requirement)
constraints = dispatch
  [ on "where" (expect "where" *> sepBy1 "," constraint) ]
  (pure [])

-- `r lacks { a, b }`, spanning the variable through the closing brace. A
-- constraint on anything but `lacks` stops at the word where it is
-- expected; `disjoint` is reserved for Tranche B and has no form yet.
constraint ∷ Parser Requirement
constraint = spanned lacksOf
  ( both <$> label <* expect "lacks" <* expect "{"
      <*> sepByTrailing1 "," "}" label
      <* expect "}"
  )
  where
  both variable labels = { variable, labels }
  lacksOf span found = Lacks
    { variable: written found.variable
    , span
    , labels: map written found.labels
    }
  written found = { name: found.text, span: found.span }
