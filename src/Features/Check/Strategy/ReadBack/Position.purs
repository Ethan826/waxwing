-- One positioned variable's value in the checked declaration (T-R0b
-- §5.2's `CheckedName`; Task 4.3): the settled type at its checked-IR
-- position, read directly. A position with no node of its kind is the
-- read-back's own failure, `Left` with what was missing: generation and
-- checking disagree about the body's shape.
--
-- Amendment to §5.2's list of `Slot` nodes (Task 4.3, after RT8's first
-- run: 372 accepted declarations failed here): P4 positions its owner's
-- `inst i` at `Slot p i` of a constructor pattern, which holds no
-- instantiation. Checking unifies the pattern's type with the owner
-- applied to its variables (Check/Match.purs `matchCtor`,
-- Check/Tables.purs `ownerType`: a type argument per type or record-row
-- parameter, effect rows apart), so slot `i` reads as the type argument
-- at its `rank`, its place among the owner's non-effect-row variables.
module Features.Check.Strategy.ReadBack.Position (Slotted, valueAt) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), note)
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (CheckedName(..), RTExpr, VarSort)
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Type (Ty(..))
import Features.Check.Strategy.ReadBack.Type (readSorted, readType)
import Features.Check.Strategy.ReadBack.Walk (Node(..), nodeAt)

-- A slot's index, and its rank among the slots generation records.
type Slotted = { index ∷ Int, rank ∷ Int }

-- An expression's instantiation slot is read by the variable's sort
-- (ReadBack.Type `readSorted`, R022), as specialization reads it
-- (Specialize/Values.purs `instantiated`, `slotType`); every other
-- position, a constructor pattern's slot included, plainly, as lowering
-- reads it there (Specialize/Body.purs `copyPattern`, `copyRest`: a bare
-- hole is `Int`). Task 4.4b's carry.
valueAt
  ∷ Checked.Expr
  → (Path → Int → Slotted)
  → VarSort
  → CheckedName
  → Either String RTExpr
valueAt body ranked sort = case _ of
  Slot path index → node body path >>= slot sort (ranked path index)
  NodeType path → plain (Checked.typeOf <$> expression body path)
  ParamType path index → plain (expression body path >>= parameter index)
  LambdaBody path → plain (expression body path >>= lambdaBody)
  PatternType path → plain (patternType <$> pattern body path)
  RestType path → plain (pattern body path >>= restType)
  RigidName _ → Left "a flexible variable with a rigid position"
  Auxiliary → Left "an auxiliary variable has no position"
  where
  plain = map readType

expression ∷ Checked.Expr → Path → Either String Checked.Expr
expression body path = node body path >>= case _ of
  AtExpr found → Right found
  AtPattern _ → Left "a pattern where an expression was expected"

pattern ∷ Checked.Expr → Path → Either String Checked.Pattern
pattern body path = node body path >>= case _ of
  AtPattern found → Right found
  AtExpr _ → Left "an expression where a pattern was expected"

node ∷ Checked.Expr → Path → Either String Node
node body (Path path) = case path.root of
  InBody → note "no checked node at the path"
    (nodeAt (AtExpr body) path.steps)
  InConstraints → signature
  InParameters → signature
  InResult → signature
  InJoined → signature
  where
  signature = Left "a flexible variable positioned in the signature"

-- Instantiation slot `index` of the reference or call at the node; an
-- over-applied call's is its saturated call's (ReadBack.Walk).
slot ∷ VarSort → Slotted → Node → Either String RTExpr
slot sort at = case _ of
  AtExpr (Checked.Expr found) → readSorted sort <$>
    (instantiation found.node >>= indexed at.index)
  AtPattern (Checked.Pattern found) → readType <$>
    (ownerArgument found.ty >>= indexed at.rank)

indexed ∷ Int → Array (Ty Open) → Either String (Ty Open)
indexed index = note "no such instantiation slot" <<< flip Array.index index

ownerArgument ∷ Ty Open → Either String (Array (Ty Open))
ownerArgument = case _ of
  TData _ arguments _ → Right arguments
  _ → Left "a constructor pattern whose type is no declared type"

instantiation ∷ Checked.Node → Either String Checked.Instantiation
instantiation = case _ of
  Checked.FunctionRef _ slots → Right slots
  Checked.CtorRef _ slots → Right slots
  Checked.Call _ slots _ → Right slots
  Checked.Construct _ slots _ → Right slots
  Checked.OperationRef _ _ slots → Right slots
  Checked.Perform _ _ slots _ → Right slots
  Checked.Handler _ slots _ → Right slots
  Checked.Apply (Checked.Expr callee) _ → saturated callee.node
  _ → Left "no instantiation at the node"

saturated ∷ Checked.Node → Either String Checked.Instantiation
saturated = case _ of
  Checked.Call _ slots _ → Right slots
  Checked.Perform _ _ slots _ → Right slots
  _ → Left "an application at a call's path, of no call"

parameter ∷ Int → Checked.Expr → Either String (Ty Open)
parameter index (Checked.Expr found) = case found.node of
  Checked.Lambda parameters _ →
    note "no such lambda parameter" (_.ty <$> Array.index parameters index)
  _ → Left "no lambda at a parameter's path"

lambdaBody ∷ Checked.Expr → Either String (Ty Open)
lambdaBody (Checked.Expr found) = case found.node of
  Checked.Lambda _ body → Right (Checked.typeOf body)
  _ → Left "no lambda at a lambda body's path"

patternType ∷ Checked.Pattern → Ty Open
patternType (Checked.Pattern found) = found.ty

restType ∷ Checked.Pattern → Either String (Ty Open)
restType (Checked.Pattern found) = case found.shape of
  Checked.Record _ (Checked.NamedRest _ ty) → Right ty
  _ → Left "no named rest at a rest's path"
