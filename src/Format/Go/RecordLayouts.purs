module Format.Go.RecordLayouts (emittedLayouts) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Set (Set)
import Data.Set as Set
import Domain.IR.Internal as IR
import Domain.IR.Parts as Parts
import Format.Go.Context (children)
import Format.Go.RecordUse (closed, note)

-- The record layouts whose struct is emitted (R011): those some emitted
-- type mentions, and those their fields hold. An open tail's layout that
-- is only a specialization-key argument is interned but no value, field,
-- parameter, pattern or helper has its type, so it has no struct. Layout
-- ids are the interned ones, so the survivors keep their names.
emittedLayouts ∷ IR.Program → Set Int
emittedLayouts program'@(IR.Program program) =
  closed program.records (foldl note Set.empty (rootTypes program'))

-- Every type Go is written for: declarations first, then each expression
-- and pattern of every function, whose names the lowering emits.
rootTypes ∷ IR.Program → Array IR.Ty
rootTypes (IR.Program program) = declaredTypes
  <> Array.concatMap inFunction program.functions
  where
  declaredTypes = Array.concatMap inCtor program.ctors
    <> Array.concatMap inArrow program.funTypes
    <> Array.concatMap inEffect program.effects
  inCtor ctor = ctor.fields
  inArrow arrow = [ arrow.parameter, arrow.result ]
  inEffect effect = effect.arguments
    <> Array.concatMap inOperation effect.operations
  inOperation operation = Array.snoc operation.parameters operation.result
  inFunction definition = Array.snoc definition.parameters definition.result
    <> typesIn definition.body

-- An expression's own type and what its node declares, then its parts'.
typesIn ∷ IR.Expr → Array IR.Ty
typesIn (IR.Expr expression) = Array.cons expression.ty
  (declaredIn expression.node <> Array.concatMap typesIn parts)
  where
  parts = children expression.node <> Parts.effectParts expression.node

declaredIn ∷ IR.Node → Array IR.Ty
declaredIn = case _ of
  IR.Match _ arms → Array.concatMap armTypes arms
  IR.Lambda params _ → map paramType params
  IR.HandlerValue _ clauses → Array.concatMap clauseTypes clauses
  IR.Handle _ clauses → map payloadType clauses
  _ → []
  where
  armTypes arm = patternTypes arm.pattern
  clauseTypes clause = map paramType clause.parameters
  payloadType clause = clause.payload

paramType ∷ IR.Param → IR.Ty
paramType param = param.ty

-- A pattern's type and its parts', a named rest's remainder included: the
-- remainder may have a shape no expression has (R005).
patternTypes ∷ IR.Pattern → Array IR.Ty
patternTypes (IR.Pattern pattern) =
  Array.cons pattern.ty (shapeTypes pattern.shape)

shapeTypes ∷ IR.Shape → Array IR.Ty
shapeTypes = case _ of
  IR.Ctor _ parts → Array.concatMap patternTypes parts
  IR.Record fields rest → Array.concatMap fieldTypes fields <> restType rest
  _ → []
  where
  fieldTypes field = patternTypes field.pattern
  restType = case _ of
    IR.NamedRest _ ty → [ ty ]
    _ → []
