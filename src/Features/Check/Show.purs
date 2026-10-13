module Features.Check.Show (showCall, showRef) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe')
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved as Resolved
import Domain.Row (openRow)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..))
import Features.Check.Context (CheckEnv, Infer)
import Features.Check.Scheme (State, Threaded)

type Result = Either Diagnostic (Threaded Checked.Expr)

-- `show(x)` renders what `print(x)` would write, as Text. It performs
-- nothing, so unlike `print` it consumes no Console. Its argument is judged
-- printable after the body's other constraints, with print's (Printable).
showCall
  ∷ ∀ r. Infer r → CheckEnv r → State → Span → Array Resolved.Expr → Result
showCall infer env state span arguments = maybe' arity found
  (Array.head arguments)
  where
  arity _ = Left (problemAt Arity span)
  found argument
    | Array.length arguments /= 1 = arity unit
    | otherwise = do
        checked ← infer env state argument
        pure
          { value: Checked.Expr
              { ty: TText
              , span
              , node: Checked.Show checked.value
              }
          , state: checked.state
          }

-- A bare `show` is a monomorphic lambda at each fresh use, as bare `print`
-- is, over a fresh parameter and, as bare `crash` is, a fresh open row: it
-- performs nothing, so it fits wherever any arrow is expected.
showRef ∷ ∀ r. CheckEnv r → State → Span → Result
showRef _ state span = Right
  { value: Checked.Expr
      { ty: TFun parameter (openRow (Hole (state.next + 1))) TText
      , span
      , node: Checked.Lambda [ { local: Just local, ty: parameter } ] body
      }
  , state: state { next = state.next + 2 }
  }
  where
  parameter = TVar (Hole state.next)
  local = Resolved.LocalId (-1)
  body = Checked.Expr { ty: TText, span, node: Checked.Show value }
  value = Checked.Expr { ty: parameter, span, node: Checked.Local local }
