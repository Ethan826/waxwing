-- trusted surface: every diff needs token review; see docs/engineering.md
-- Every expression of a declaration's body with its path, in the
-- vocabulary generation uses (Generate.Fresh `childOf`, `childAt`; T-R0b
-- §6), for the static rules. test/r0-static-rules.test.mjs checks that
-- these paths are exactly the expression paths of the generated `types`.
-- One loop over a worklist, so a long chain of nodes costs no stack.
module Features.Check.Generate.Static.Walk (expressions) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Maybe (maybe)
import Data.Tuple (Tuple(..))
import Domain.Arithmetic (Arithmetic(..), BinaryOp(..))
import Domain.Recorded.Origin (Path, Step(..))
import Domain.Resolved (Expr(..), Item(..), LiteralItem(..))
import Features.Check.Generate.Fresh (child, childAt, childOf)

type Walk =
  { pending ∷ Array (Tuple Path Expr), found ∷ Array (Tuple Path Expr) }

expressions ∷ Path → Expr → Array (Tuple Path Expr)
expressions path body = tailRec step
  { pending: [ Tuple path body ], found: [] }
  where
  step walk = maybe (Done walk.found) (Loop <<< visit walk)
    (Array.uncons walk.pending)
  visit walk { head: head@(Tuple at found), tail } =
    { pending: children at found <> tail
    , found: Array.snoc walk.found head
    }

children ∷ Path → Expr → Array (Tuple Path Expr)
children path = case _ of
  Integer _ _ → []
  Boolean _ _ → []
  Local _ _ → []
  FunctionRef _ _ → []
  CtorRef _ _ → []
  Call _ _ arguments → indexed "Call" "args" arguments
  Construct _ _ arguments → indexed "Construct" "args" arguments
  Arith _ (Binary Plus left right) → pair "Add" left right
  Concat _ left right → pair "Concat" left right
  Interpolate _ parts → indexed "Interpolate" "parts" parts
  Compare _ _ left right → pair "Compare" left right
  If _ condition yes no →
    [ named "If" "condition" condition
    , named "If" "then" yes
    , named "If" "else" no
    ]
  Match _ scrutinee arms → Array.cons (named "Match" "scrutinee" scrutinee)
    (Array.mapWithIndex armAt arms)
  Lambda _ _ body → [ named "Lambda" "body" body ]
  Apply _ function arguments → Array.cons (named "Apply" "function" function)
    (indexed "Apply" "args" arguments)
  Pipe _ left right → [ named "Pipe" "left" left, named "Pipe" "right" right ]
  UnitValue _ → []
  Block _ items result → Array.snoc
    (Array.concat (Array.mapWithIndex item items))
    (named "Block" "result" result)
  OperationRef _ _ _ → []
  Perform _ _ _ arguments → indexed "Perform" "args" arguments
  PrintRef _ → []
  Print _ arguments → indexed "Print" "args" arguments
  ShowRef _ → []
  Show _ arguments → indexed "Show" "args" arguments
  CrashRef _ → []
  Crash _ arguments → indexed "Crash" "args" arguments
  Handler _ _ clauses → Array.mapWithIndex handlerAt clauses
  With _ installed body →
    [ named "With" "handler" installed, named "With" "body" body ]
  Handle _ body clauses → Array.cons (named "Handle" "body" body)
    (Array.mapWithIndex failAt clauses)
  Fail _ _ value → [ named "Fail" "payload" value ]
  TextLiteral _ _ → []
  RecordLiteral _ fields → Array.mapWithIndex literalAt fields
  FieldAccess _ value _ → [ named "FieldAccess" "record" value ]
  RecordUpdate _ value fields → Array.cons
    (named "RecordUpdate" "record" value)
    (Array.mapWithIndex updateAt fields)
  RecordExtension _ items → Array.mapWithIndex literalItem items
  RecordRemoval _ value _ → [ named "RecordRemoval" "record" value ]
  where
  named constructor field found = Tuple (childOf path constructor field) found
  indexed constructor field = Array.mapWithIndex (at constructor field)
  at constructor field index found = Tuple
    (childAt path constructor field index)
    found
  pair constructor left right =
    [ named constructor "left" left, named constructor "right" right ]
  under constructor field last index found = Tuple
    (child (childAt path constructor field index) [ Named last ])
    found
  armAt index arm = under "Match" "arms" "body" index arm.body
  handlerAt index clause = under "Handler" "clauses" "body" index clause.body
  failAt index clause = under "Handle" "clauses" "body" index clause.body
  literalAt index field = under "RecordLiteral" "fields" "value" index
    field.value
  updateAt index field = under "RecordUpdate" "fields" "value" index
    field.value
  item index = case _ of
    Let _ _ value → [ itemAt index "Let" value ]
    Defer _ value → [ itemAt index "Defer" value ]
    Discard value → [ itemAt index "Discard" value ]
  itemAt index form value = Tuple
    ( child (childAt path "Block" "items" index)
        [ Named form, Named "value" ]
    )
    value
  literalItem index = case _ of
    Given field → extensionAt index "Given" field.value
    Spreading _ value → extensionAt index "Spreading" value
  extensionAt index form value = Tuple
    ( child (childAt path "RecordExtension" "items" index)
        [ Named form, Named "value" ]
    )
    value
