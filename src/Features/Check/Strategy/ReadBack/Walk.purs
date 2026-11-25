-- The checked node a recorded body path names (T-R0b §5.2-§5.3, §6;
-- Task 4.3). Paths name resolved syntax: a constructor, its field and,
-- for an array, an index, and inside an arm, clause, field or item the
-- part (`Match/arms/1/pattern`, `Block/items/0/Let/value`). The checked
-- IR keeps that shape except where checking rebuilds a node, and each
-- such place is listed here:
-- - an over-applied named call or perform, `Call/args/i` (`Perform`),
--   is checked as one `Apply` of the saturated node to the rest
--   (Check/Call.purs `overApplied`);
-- - a builtin call holds one argument, at `Print/args/0` (and `Show`,
--   `Crash`); a builtin reference is a checked `Lambda`.
-- A path with no such node is `Nothing`: the read-back's own failure.
module Features.Check.Strategy.ReadBack.Walk
  ( Node(..)
  , nodeAt
  ) where

import Prelude
import Data.Array (drop, findMap, length, take)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Arithmetic (Arithmetic(..), BinaryOp(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Origin (Step(..))

data Node = AtExpr Checked.Expr | AtPattern Checked.Pattern

-- One child under its label, or an array of them under one label, read
-- by index: each item with the steps after its index. Only the item an
-- index names is wrapped, so no sibling is read: an array's width costs
-- nothing. Each level still builds the node's fixed child list and copies
-- the rest of the path, so a walk's cost grows with the square of its depth.
data Child
  = One (Array Step) Node
  | Many (Array Step) (Int → Maybe (Tuple (Array Step) Node))

nodeAt ∷ Node → Array Step → Maybe Node
nodeAt node steps
  | Array.null steps = Just node
  | otherwise = findMap (descend steps) (children node)

descend ∷ Array Step → Child → Maybe Node
descend steps = case _ of
  One label node → after label steps >>= nodeAt node
  Many label items → after label steps >>= item items

item ∷ (Int → Maybe (Tuple (Array Step) Node)) → Array Step → Maybe Node
item items steps = maybe Nothing indexed (Array.uncons steps)
  where
  indexed found = case found.head of
    Index index → items index >>= at found.tail
    Named _ → Nothing
  at rest (Tuple suffix node) = after suffix rest >>= nodeAt node

-- The steps after `label`, when the path starts with it.
after ∷ Array Step → Array Step → Maybe (Array Step)
after label steps =
  if take (length label) steps == label then Just (drop (length label) steps)
  else Nothing

children ∷ Node → Array Child
children = case _ of
  AtExpr (Checked.Expr found) → expressionChildren found.node
  AtPattern (Checked.Pattern found) → patternChildren found.shape

patternChildren ∷ Checked.Shape → Array Child
patternChildren = case _ of
  Checked.Ctor _ parts → each "Ctor" "args" AtPattern parts
  Checked.Record parts _ → eachPart "Record" "fields" "pattern"
    (AtPattern <<< _.pattern)
    parts
  Checked.Wildcard → []
  Checked.Bind _ → []
  Checked.IntLit _ → []
  Checked.BoolLit _ → []

expressionChildren ∷ Checked.Node → Array Child
expressionChildren node = case node of
  Checked.Call _ _ arguments → expressions "Call" "args" arguments
  Checked.Construct _ _ arguments → expressions "Construct" "args" arguments
  Checked.Apply callee arguments → [ child "Apply" "function" callee ]
    <> expressions "Apply" "args" arguments
    <> overApplied callee arguments
  Checked.Arith arith → arithChildren arith
  Checked.Concat left right → pair "Concat" left right
  Checked.Interpolate parts → expressions "Interpolate" "parts" parts
  Checked.Compare _ left right → pair "Compare" left right
  Checked.Pipe left right → pair "Pipe" left right
  _ → controlChildren node

-- Total over the operators, unlike the groups' `_ →`, so a new operator
-- fails to compile here instead of reading as no node. `+` keeps the
-- path step `Add` its recorded paths were pinned with.
arithChildren ∷ Arithmetic Checked.Expr → Array Child
arithChildren (Binary Plus left right) = pair "Add" left right

controlChildren ∷ Checked.Node → Array Child
controlChildren node = case node of
  Checked.If condition yes no → [ child "If" "condition" condition ]
    <> [ child "If" "then" yes, child "If" "else" no ]
  Checked.Match scrutinee arms → [ child "Match" "scrutinee" scrutinee ]
    <> eachPart "Match" "arms" "pattern" (AtPattern <<< _.pattern) arms
    <> eachPart "Match" "arms" "body" (AtExpr <<< _.body) arms
  Checked.Lambda _ body → [ child "Lambda" "body" body ]
  Checked.Block items result →
    [ Many [ Named "Block", Named "items" ]
        (reading blockItem items)
    , child "Block" "result" result
    ]
  Checked.Print value → expressions "Print" "args" [ value ]
  Checked.Show value → expressions "Show" "args" [ value ]
  Checked.Crash value → expressions "Crash" "args" [ value ]
  _ → effectChildren node

effectChildren ∷ Checked.Node → Array Child
effectChildren node = case node of
  Checked.Perform _ _ _ arguments → expressions "Perform" "args" arguments
  Checked.Handler _ _ clauses → eachPart "Handler" "clauses" "body"
    (AtExpr <<< _.body)
    clauses
  Checked.With handler body → pair' "With" "handler" handler "body" body
  Checked.Handle body clauses → [ child "Handle" "body" body ]
    <> eachPart "Handle" "clauses" "body" (AtExpr <<< _.body) clauses
  Checked.Fail value → [ child "Fail" "payload" value ]
  _ → recordChildren node

recordChildren ∷ Checked.Node → Array Child
recordChildren = case _ of
  Checked.RecordLiteral fields → eachPart "RecordLiteral" "fields" "value"
    (AtExpr <<< _.value)
    fields
  Checked.FieldAccess record _ → [ child "FieldAccess" "record" record ]
  Checked.RecordUpdate record fields → [ child "RecordUpdate" "record" record ]
    <> eachPart "RecordUpdate" "fields" "value"
      (AtExpr <<< _.value)
      fields
  Checked.RecordExtension items →
    [ Many [ Named "RecordExtension", Named "items" ]
        (reading extensionItem items)
    ]
  Checked.RecordRemoval record _ → [ child "RecordRemoval" "record" record ]
  -- Leaves, and the nodes the groups above took. A node with children
  -- missing here reads as no node: a read-back failure RT8 shows.
  _ → []

-- `f(a1…an, b…)` with n parameters: `Apply (Call f a1…an) [b…]`; a
-- perform likewise (Check/Operation.purs checks it as a named call).
overApplied ∷ Checked.Expr → Array Checked.Expr → Array Child
overApplied (Checked.Expr callee) more = case callee.node of
  Checked.Call _ _ supplied → aliased "Call" supplied more
  Checked.Perform _ _ _ supplied → aliased "Perform" supplied more
  _ → []

blockItem ∷ Checked.Item → Tuple (Array Step) Node
blockItem found = Tuple [ Named form, Named "value" ]
  (AtExpr (Checked.itemValue found))
  where
  form = case found of
    Checked.Let _ _ → "Let"
    Checked.Defer _ → "Defer"
    Checked.Discard _ → "Discard"

extensionItem ∷ Checked.LiteralItem → Tuple (Array Step) Node
extensionItem found = Tuple [ Named form, Named "value" ] (AtExpr value)
  where
  form = case found of
    Checked.Given _ → "Given"
    Checked.Spreading _ → "Spreading"
  value = case found of
    Checked.Given field → field.value
    Checked.Spreading spread → spread

child ∷ String → String → Checked.Expr → Child
child constructor field value =
  One [ Named constructor, Named field ] (AtExpr value)

pair ∷ String → Checked.Expr → Checked.Expr → Array Child
pair constructor left right = pair' constructor "left" left "right" right

pair'
  ∷ String → String → Checked.Expr → String → Checked.Expr → Array Child
pair' constructor first left second right =
  [ child constructor first left, child constructor second right ]

expressions ∷ String → String → Array Checked.Expr → Array Child
expressions constructor field = each constructor field AtExpr

each ∷ ∀ a. String → String → (a → Node) → Array a → Array Child
each constructor field wrap values =
  [ Many [ Named constructor, Named field ]
      (reading (Tuple [] <<< wrap) values)
  ]

eachPart
  ∷ ∀ a. String → String → String → (a → Node) → Array a → Array Child
eachPart constructor field part wrap values =
  [ Many [ Named constructor, Named field ]
      (reading (Tuple [ Named part ] <<< wrap) values)
  ]

-- The alias `constructor/args`: the supplied arguments, then the rest.
aliased ∷ String → Array Checked.Expr → Array Checked.Expr → Array Child
aliased constructor supplied more =
  [ Many [ Named constructor, Named "args" ] indexed ]
  where
  indexed index
    | index < length supplied = argument supplied index
    | otherwise = argument more (index - length supplied)
  argument = reading (Tuple [] <<< AtExpr)

-- The one item an index names, wrapped only then.
reading ∷ ∀ a b. (a → b) → Array a → Int → Maybe b
reading wrap values index = map wrap (Array.index values index)
