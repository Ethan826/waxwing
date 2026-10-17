module Format.Parse.Constraint (constraints) where

import Prelude
import Data.Tuple (Tuple(..))
import Domain.Syntax (Label, Requirement(..))
import Format.Lex (Token)
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

-- What follows the constraint's variable.
data Clause = LacksOf (Array Token) | DisjointFrom Token

-- `r lacks { a, b }`, spanning the variable through the closing brace, or
-- `r disjoint s` (R005 Tranche B), through the second variable. A
-- constraint on anything else stops at the word where `lacks` is expected.
constraint ∷ Parser Requirement
constraint = spanned built (Tuple <$> label <*> clause)
  where
  built span (Tuple variable found) = case found of
    LacksOf labels → Lacks
      { variable: written variable
      , span
      , labels: map written labels
      }
    DisjointFrom other → Disjoint
      { variables: Tuple (written variable) (written other), span }

clause ∷ Parser Clause
clause = dispatch [ on "disjoint" disjointClause ] lacksClause

disjointClause ∷ Parser Clause
disjointClause = DisjointFrom <$> (expect "disjoint" *> label)

lacksClause ∷ Parser Clause
lacksClause = LacksOf <$>
  ( expect "lacks" *> expect "{" *> sepByTrailing1 "," "}" label
      <* expect "}"
  )

written ∷ Token → Label
written found = { name: found.text, span: found.span }
