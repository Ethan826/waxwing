module Features.Check.LocalUses (usesOf) where

import Prelude
import Data.Array as Array
import Data.Foldable (sum)
import Domain.Resolved (Expr(..), Item(..), LocalId(..))

-- How many times a parameter (a local numbered below the parameter count)
-- is read in an expression. A diagnostic that proposes rewriting a
-- parameter's type asks this: a rewrite aimed at one use may break another.
-- It runs on the failure path only, once per rejected function.
usesOf ∷ Int → Expr → Int
usesOf index expression = case expression of
  Local _ (LocalId found) | found == index → 1
  _ → sum (map (usesOf index) (parts expression))

parts ∷ Expr → Array Expr
parts = case _ of
  Call _ _ arguments → arguments
  Construct _ _ arguments → arguments
  Add _ left right → [ left, right ]
  Compare _ _ left right → [ left, right ]
  If _ test yes no → [ test, yes, no ]
  Match _ subject arms → Array.cons subject (map _.body arms)
  Lambda _ _ body → [ body ]
  Apply _ callee arguments → Array.cons callee arguments
  Pipe _ left right → [ left, right ]
  Block _ items result → Array.snoc (map itemBody items) result
  Perform _ _ _ arguments → arguments
  Print _ arguments → arguments
  Crash _ arguments → arguments
  Handler _ _ clauses → map _.body clauses
  With _ handler body → [ handler, body ]
  Handle _ body clauses → Array.cons body (map _.body clauses)
  Fail _ payload → [ payload ]
  _ → []

itemBody ∷ Item → Expr
itemBody = case _ of
  Let _ _ value → value
  Defer _ value → value
  Discard value → value
