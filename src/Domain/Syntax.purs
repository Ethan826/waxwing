module Domain.Syntax
  ( module Domain.Syntax
  , module Domain.Syntax.Core
  , module Domain.Note
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Traversable (mapAccumL)
import Data.Tuple (Tuple(..))
import Domain.Note (NoteReason(..))
import Domain.Problem (Problem)
import Domain.Syntax.Core
  ( Arm
  , Clause
  , CtorDecl
  , Diagnostic
  , EffectDecl
  , ErrorCode(..)
  , Expr(..)
  , FailClause
  , FunctionDecl
  , HandlerParameterRef
  , Item(..)
  , LabelRef
  , LambdaParam
  , MarkRef(..)
  , Note
  , OperationDecl
  , Operator(..)
  , Parameter
  , Pattern(..)
  , Position
  , Program
  , RefSpine
  , RowRef(..)
  , RowTail(..)
  , Sort(..)
  , Span
  , TypeArgument(..)
  , TypeDecl
  , TypeParameter
  , TypeRef(..)
  )

origin ∷ Position
origin = { offset: 0, line: 1, column: 1 }

exprSpan ∷ Expr → Span
exprSpan = case _ of
  Integer span _ → span
  Boolean span _ → span
  Variable span _ → span
  Call span _ _ → span
  Add span _ _ → span
  Compare span _ _ _ → span
  If span _ _ _ → span
  Match span _ _ → span
  Lambda span _ _ → span
  Apply span _ _ → span
  Pipe span _ _ → span
  UnitValue span → span
  Block span _ _ → span
  HandlerExpr span _ _ → span
  With span _ _ → span
  Handle span _ _ → span
  Fail span _ → span

typeRefSpan ∷ TypeRef → Span
typeRefSpan = case _ of
  IntRef span → span
  BoolRef span → span
  UnitRef span → span
  VarRef span _ → span
  NamedRef span _ _ → span
  THandlerRef span _ _ → span
  FunRef span _ _ _ → span

-- A written spine can be thousands of arrows long, so it is walked by
-- loops, never by one recursion per arrow: one counts the arrows, one takes
-- their parameters (as Domain.Type `spineThrough` does).
typeRefSpine ∷ TypeRef → RefSpine
typeRefSpine reference =
  { parameters: Array.catMaybes taken.value, result: taken.accum }
  where
  count = tailRec counted (Tuple 0 reference)
  counted (Tuple found rest) = case rest of
    FunRef _ _ _ more → Loop (Tuple (found + 1) more)
    _ → Done found
  taken = mapAccumL take reference (Array.replicate count unit)
  take rest _ = case rest of
    FunRef _ parameter _ more → { accum: more, value: Just parameter }
    settled → { accum: settled, value: Nothing }

markSpan ∷ MarkRef → Span
markSpan = case _ of
  NofailRef span → span
  NofailVariableRef span _ → span

patternSpan ∷ Pattern → Span
patternSpan = case _ of
  PWildcard span → span
  PBind span _ → span
  PInt span _ → span
  PBool span _ → span
  PCtor span _ _ → span

problemAt ∷ Problem → Span → Diagnostic
problemAt problem span = { problem, span, related: [] }

-- The effect reference in a handler type's source (FX001 Task 6):
-- `Handler(L(…) with R)` is its own form; `Handler(L(…))` parses as an
-- application, which Resolve read as a handler type.
handlerLabelRef ∷ TypeRef → Maybe LabelRef
handlerLabelRef = case _ of
  THandlerRef _ label _ → Just label
  NamedRef _ "Handler" [ TypeArgument (NamedRef span name arguments) ] →
    Just
      { name
      , arguments: Array.mapMaybe typeArgument arguments
      , mark: Nothing
      , span
      }
  _ → Nothing
  where
  typeArgument = case _ of
    TypeArgument found → Just found
    RowArgument _ → Nothing
