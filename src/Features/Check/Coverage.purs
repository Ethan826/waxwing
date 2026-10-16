module Features.Check.Coverage (coverage) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldl, traverse_)
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Problem (Problem(..))
import Domain.Resolved (Ty(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Features.Check.Matrix (simplifyRow)
import Features.Check.Missing (uncovered)
import Features.Check.Search (firstJust)
import Features.Check.Signature (Signature, buildSignature)
import Features.Check.Tables (Lookup)
import Features.Check.Usefulness (useful)
import Features.Check.Walk (foldTypes)

-- Functions in declaration order; within each, matches in source pre-order.
-- The signature is program-wide, so its failure (a table miss, which is a
-- compiler bug) has no span of its own; it surfaces at the first function
-- judged, since every function sees the same failure and the first stops.
coverage ∷ Checked.Program → Either Diagnostic Unit
coverage (Checked.Program program) = traverse_ coverFunction program.functions
  where
  tables = buildSignature program.types program.ctors (roots program.functions)
  coverFunction function = do
    signature ← located function.span tables
    covered signature function.body

covered ∷ Signature → Checked.Expr → Either Diagnostic Unit
covered signature (Checked.Expr expression) = case expression.node of
  Checked.Integer _ → pure unit
  Checked.Boolean _ → pure unit
  Checked.Text _ → pure unit
  Checked.Local _ → pure unit
  Checked.FunctionRef _ _ → pure unit
  Checked.CtorRef _ _ → pure unit
  Checked.Call _ _ arguments → traverse_ recur arguments
  Checked.Construct _ _ arguments → traverse_ recur arguments
  Checked.Add left right → traverse_ recur [ left, right ]
  Checked.Concat left right → traverse_ recur [ left, right ]
  Checked.Interpolate parts → traverse_ recur parts
  Checked.Compare _ left right → traverse_ recur [ left, right ]
  Checked.If condition yes no → traverse_ recur [ condition, yes, no ]
  Checked.Match scrutinee arms → coverMatch signature expression.span scrutinee
    arms
  Checked.Apply callee arguments → traverse_ recur (Array.cons callee arguments)
  Checked.Lambda _ body → recur body
  Checked.Pipe left right → traverse_ recur [ left, right ]
  Checked.UnitValue → pure unit
  Checked.Print value → recur value
  Checked.Show value → recur value
  Checked.Crash value → recur value
  Checked.OperationRef _ _ _ → pure unit
  Checked.Perform _ _ _ arguments → traverse_ recur arguments
  Checked.Handler _ _ clauses → traverse_ (recur <<< handlerBody) clauses
  Checked.With handler body → traverse_ recur [ handler, body ]
  Checked.Handle body clauses → traverse_ recur
    (Array.cons body (map failureBody clauses))
  Checked.Fail value → recur value
  Checked.Block items value → traverse_ recur (Checked.blockParts items value)
  Checked.RecordLiteral fields → traverse_ recur (Checked.fieldValues fields)
  Checked.FieldAccess record _ → recur record
  Checked.RecordUpdate record fields → traverse_ recur
    (Checked.updateParts record fields)
  where
  recur = covered signature
  handlerBody clause = clause.body
  failureBody clause = clause.body

-- A match is judged before the matches nested in its scrutinee and arms.
coverMatch
  ∷ Signature → Span → Checked.Expr → Array Checked.Arm → Either Diagnostic Unit
coverMatch signature span scrutinee arms = do
  recordPlaceholder arms
  redundancy signature span arms
  exhaustiveness signature span (Checked.typeOf scrutinee) arms
  covered signature scrutinee
  traverse_ armBody arms
  where
  armBody arm = covered signature arm.body

-- R004 placeholder, removed in Task 3: a match holding a record pattern
-- stops at its first one, before any matrix is built.
recordPlaceholder ∷ Array Checked.Arm → Either Diagnostic Unit
recordPlaceholder arms = maybe (pure unit) stopped
  (Array.findMap (recordSpan <<< armPattern) arms)
  where
  armPattern arm = arm.pattern
  stopped = Left <<< problemAt (Internal placeholder)
  placeholder = "R004 placeholder: record pattern coverage is Task 3"

recordSpan ∷ Checked.Pattern → Maybe Span
recordSpan (Checked.Pattern pattern) = case pattern.shape of
  Checked.Record _ _ → Just pattern.span
  Checked.Ctor _ fields → Array.findMap recordSpan fields
  Checked.Wildcard → Nothing
  Checked.Bind _ → Nothing
  Checked.IntLit _ → Nothing
  Checked.BoolLit _ → Nothing

-- Only earlier arms can make an arm redundant; the first one is reported.
redundancy ∷ Signature → Span → Array Checked.Arm → Either Diagnostic Unit
redundancy signature span arms = do
  found ← located span (firstJust judge (Array.mapWithIndex earlier arms))
  maybe (pure unit) report found
  where
  rows = map (simplifyRow <<< armRow) arms
  earlier index arm = { pattern: arm.pattern, rows: Array.take index rows }
  judge candidate = verdict candidate <$> useful signature candidate.rows
    [ candidate.pattern ]
  verdict candidate isUseful =
    if isUseful then Nothing else Just (patternSpan candidate.pattern)
  report armSpan = Left (problemAt RedundantArm armSpan)

-- The witness vector has one entry because the match has one column.
exhaustiveness
  ∷ Signature → Span → Ty Open → Array Checked.Arm → Either Diagnostic Unit
exhaustiveness signature span ty arms = do
  found ← located span (uncovered signature (map armRow arms) [ ty ])
  maybe (pure unit) report found
  where
  report witnesses = Left (problemAt (single witnesses) span)
  single = case _ of
    [ witness ] → NonExhaustive witness
    _ → Internal "Expected one missing pattern"

-- Places a table failure, which is a compiler bug, at the span being judged.
located ∷ ∀ a. Span → Lookup a → Either Diagnostic a
located span = either failure Right
  where
  failure problem = Left (problemAt problem span)

-- The data types the bodies carry, deduplicated: every match's column types
-- are reached from them by unfolding constructor fields.
roots ∷ Array Checked.FunctionDecl → Array (Ty Open)
roots functions = Array.fromFoldable (foldl body Set.empty functions)
  where
  body found function = foldTypes collect found function.body
  collect found _ ty = case ty of
    TData _ _ _ → Set.insert ty found
    _ → found

armRow ∷ Checked.Arm → Array Checked.Pattern
armRow arm = [ arm.pattern ]

patternSpan ∷ Checked.Pattern → Span
patternSpan (Checked.Pattern pattern) = pattern.span
