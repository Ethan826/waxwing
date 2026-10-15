module Features.Specialize.Values
  ( Scope
  , Copier
  , typed
  , callee
  , ownerCtor
  , lambda
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Traversable (sequence, traverse)
import Domain.Checked.Internal (Open(..))
import Domain.Checked.Internal as Checked
import Domain.IR.Internal as IR
import Domain.Resolved (CtorId(..), FunctionId(..), sortOf)
import Domain.Syntax (Sort(..), Span)
import Domain.Type (Ty(..), TypeId(..), VarId(..))
import Domain.Type.Record (recordRow)
import Features.Specialize.Keys
  ( Env
  , Specializing
  , applied
  , called
  , ctorAt
  , internal
  )
import Features.Specialize.Lower (lowerType)

-- One key's copy of a function: the checked tables and the key's
-- arguments, each a number or a builtin.
type Scope = { env ∷ Env, arguments ∷ Array IR.Ty }

-- Copies one checked expression (Features.Specialize.Body).
type Copier = Checked.Expr → Specializing IR.Expr

typed ∷ Scope → Span → Ty Checked.Open → Specializing IR.Ty
typed scope = lowerType scope.env scope.arguments

-- The copy of a named function that a call or a bare reference reaches:
-- its instantiation lowered, then the callee's key. Either is an edge to
-- that copy (design §6).
callee
  ∷ Scope
  → Span
  → FunctionId
  → Checked.Instantiation
  → Specializing FunctionId
callee scope span id@(FunctionId index) instantiation =
  instantiated scope span sorts instantiation >>= called scope.env span id
  where
  sorts = maybe [] functionSorts (Array.index scope.env.functions index)
  functionSorts function = function.sorts

-- A construction, partial or not, and a constructor value name the
-- constructor of their owner's copy: the owner type at the reference's
-- instantiation, which is in the owner's variable order (design §7). The
-- reference's own type, lowered first, already created that key.
ownerCtor
  ∷ Scope
  → Span
  → CtorId
  → Checked.Instantiation
  → Specializing CtorId
ownerCtor scope span id@(CtorId index) instantiation = do
  ctor ← maybe' (internal "Invalid constructor id" span) pure
    (Array.index scope.env.ctors index)
  arguments ← instantiated scope span (ownerSorts ctor.owner) instantiation
  owner ← applied scope.env span ctor.owner arguments
  ctorAt scope.env span owner id
  where
  ownerSorts (TypeId owner) = maybe [] typeSorts
    (Array.index scope.env.types owner)
  typeSorts info = info.sorts

-- A reference's instantiation at the key, in slot order. A slot is a type
-- or record variable of the declaration (effect rows are erased, so they
-- take none). An unsolved record-sorted argument is the empty rest, as an
-- unsolved record tail is (Features.Specialize.Lower), not the
-- representative: every empty rest reaches one key (design §5).
instantiated
  ∷ Scope
  → Span
  → Array Sort
  → Checked.Instantiation
  → Specializing (Array IR.Ty)
instantiated scope span sorts instantiation = sequence
  (Array.mapWithIndex argument instantiation)
  where
  slots = Array.filter takesSlot sorts
  takesSlot sort = sort /= RowSort
  argument index ty = typed scope span
    (slotType (sortOf slots (VarId index)) ty)

slotType ∷ Sort → Ty Checked.Open → Ty Checked.Open
slotType sort ty = case sort, ty of
  RecordSort, TVar hole@(Hole _) → TRecord (recordRow [] (Just hole))
  _, _ → ty

-- A lambda's parameters keep their locals and take their types at the key;
-- a parameter has no span of its own, so the lambda's stands for it.
lambda
  ∷ Scope
  → Copier
  → Span
  → Array Checked.Param
  → Checked.Expr
  → Specializing IR.Node
lambda scope copy span parameters body = IR.Lambda
  <$> traverse parameter parameters
  <*> copy body
  where
  parameter checked = withType checked <$> typed scope span checked.ty
  withType checked ty = { local: checked.local, ty }
