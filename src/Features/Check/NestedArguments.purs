module Features.Check.NestedArguments
  ( admissible
  , admissibleArgument
  , admissibleSlot
  , judged
  , judgedReferences
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Syntax
  ( RowRef(..)
  , RowTail(..)
  , Sort
  , TypeArgument(..)
  , TypeRef(..)
  )
import Domain.Syntax as Syntax
import Domain.Type (Ty(..))
import Domain.Type.Parts (children)

-- `admissible variable ty`: `ty` is a bare variable, or mentions no
-- variable that `variable` selects. Shared with the function half.
admissible ∷ ∀ v. (v → Boolean) → Ty v → Boolean
admissible variable = case _ of
  TVar _ → true
  ty → not (mentions variable ty)

-- A judged argument in a component (Features.Check.Nested): a type
-- argument as before; a record row argument (R012) must be a bare `...r`
-- or mention no variable at all, a record tail included, since a row that
-- grows through a recursive reference, `T({ a: { ...r } })`, would give
-- the type infinitely many instances.
admissibleArgument ∷ ∀ v. Tuple Sort (Ty v) → Boolean
admissibleArgument = admissibleSlot always
  where
  always _ = true

-- `admissibleSlot variable slot`: the same judgement of a type or record
-- row slot for the variables `variable` selects; a function's call judges
-- its rigid variables, a hole being ground (Features.Check.Instantiation,
-- R010: `g({ inner: x })` under `g(x: { ...r })` grows the row).
admissibleSlot ∷ ∀ v. (v → Boolean) → Tuple Sort (Ty v) → Boolean
admissibleSlot variable (Tuple sort ty) =
  if sort == Syntax.RecordSort then
    bareRow ty || not (mentionsRow variable ty)
  else admissible variable ty

-- A declared type's arguments that are types or record rows, each with
-- its parameter's sort: an effect row stands for no type to judge. The
-- resolved arguments run type and record parameters first (`sourceSorts`
-- in declaration order, the effect row parameters left out).
judged ∷ ∀ v. Array Sort → Array (Ty v) → Array (Tuple Sort (Ty v))
judged sorts arguments = Array.zip (Array.filter rowFree sorts) arguments
  where
  rowFree sort = sort /= Syntax.RowSort

-- Their sources, in the same order: a record row argument written `...r`
-- is the record type `{ ...r }` it resolved to.
judgedReferences ∷ Array Sort → Array TypeArgument → Array TypeRef
judgedReferences sorts references = Array.mapMaybe judgedSlot
  (Array.zip sorts references)
  where
  judgedSlot (Tuple sort argument) = case sort, argument of
    Syntax.TypeSort, TypeArgument found → Just found
    Syntax.RecordSort, TypeArgument found → Just found
    Syntax.RecordSort, RowArgument (RowRef span [] (Just (Spread name))) →
      Just (RecordRef span [] [ { name, span } ])
    _, _ → Nothing

mentions ∷ ∀ v. (v → Boolean) → Ty v → Boolean
mentions variable = case _ of
  TVar each → variable each
  ty → Array.any (mentions variable) (children ty)

bareRow ∷ ∀ v. Ty v → Boolean
bareRow = case _ of
  TRecord { fields: [], tails } → not (Array.null tails)
  _ → false

-- Whether a type mentions a selected variable as a type or a record tail.
mentionsRow ∷ ∀ v. (v → Boolean) → Ty v → Boolean
mentionsRow variable = case _ of
  TVar each → variable each
  ty@(TRecord { tails }) → Array.any variable tails
    || Array.any (mentionsRow variable) (children ty)
  ty → Array.any (mentionsRow variable) (children ty)
