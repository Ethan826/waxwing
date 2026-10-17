-- The sub-expressions of an IR node in evaluation order, split from
-- Domain.IR.Internal to keep it under the file limit. Like it, only
-- specialization and Go lowering read it (scripts/structure.mjs).
module Domain.IR.Parts (itemValue, recordParts, blockParts, effectParts) where

import Prelude
import Data.Array as Array
import Domain.IR.Internal as IR

itemValue ∷ IR.Item → IR.Expr
itemValue = case _ of
  IR.Let _ value → value
  IR.Defer value → value
  IR.Discard value → value

-- A record node's expressions in evaluation order; any other node has
-- none here.
recordParts ∷ IR.Node → Array IR.Expr
recordParts = case _ of
  IR.RecordLiteral fields → map fieldValue fields
  IR.FieldAccess record _ → [ record ]
  IR.RecordUpdate record fields → Array.cons record (map fieldValue fields)
  _ → []
  where
  fieldValue field = field.value

-- A block's expressions in evaluation order: its items', then its value.
blockParts ∷ Array IR.Item → IR.Expr → Array IR.Expr
blockParts items value = Array.snoc (map itemValue items) value

-- The expressions inside an FX001 effect node, in evaluation order: a
-- handler's clause bodies and a `handle`'s clause bodies after its body.
-- Any other node has none here.
effectParts ∷ IR.Node → Array IR.Expr
effectParts = case _ of
  IR.Perform _ _ arguments → arguments
  IR.HandlerValue _ clauses → map clauseBody clauses
  IR.Install handler body → [ handler, body ]
  IR.Handle body clauses → Array.cons body (map failBody clauses)
  IR.Abort _ value → [ value ]
  _ → []
  where
  clauseBody clause = clause.body
  failBody clause = clause.body
