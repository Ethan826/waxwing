-- D1's generation and elaboration types with their constructors
-- (docs/plans/r0-generation-continuation.md §3.2-§3.3; R0 Task 7.1a).
-- Only Features.Check.Generate.Elab and Features.Check.Generate.Gen
-- import this module (rule E4, scripts/structure-modules.mjs); every
-- other module sees the types without constructors, so a handle exists
-- only where `fresh` made one, an `Elab` reads only what it records,
-- and a `Gen`'s parts are written only by its four primitives.
--
-- Sources: `Elab` is Pottier's `'a co` (Hindley-Milner Elaboration in
-- Applicative Style, ICFP 2014, §4.3) with the static part the set of
-- reads; it is the product of `Const (Set Use)` and a reader over the
-- bindings, an applicative with no `Bind` (McBride and Paterson,
-- Applicative Programming with Effects, JFP 2008). The phantom `s` with
-- nominal roles is `ST`'s (Launchbury and Peyton Jones, PLDI 1994;
-- Control.Monad.ST.Internal's `type role ST nominal representational`).
module Features.Check.Generate.Elab.Internal
  ( Elab(..)
  , Gen(..)
  , GenTy
  , Handle(..)
  , Piece(..)
  , Ref(..)
  , elabSlots
  , elabTy
  , forget
  , orFault
  , readAs
  , readEffect
  , recorded
  ) where

import Prelude
import Data.Either (Either(..), either)
import Data.Map as Map
import Data.Set (Set)
import Data.Set as Set
import Data.Array (mapWithIndex)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Elaborating.Types (Bindings, ElabFault(..), Use, UseSort(..))
import Domain.Elaborating.Types as Fault
import Domain.Checked.Internal (Instantiation, Open(..))
import Domain.Recorded.Atom (CheckedName(..), RTExpr, Var(..))
import Domain.Recorded.Origin (Path)
import Domain.Row (Label(..), Row(..), openRow)
import Features.Check.Generate.Elab.Labels (repeatedLabel)
import Domain.Type (Ty(..), TyRow, VarId, spliceRecord)
import Domain.Verdict.Witness (Binding(..))
import Features.Check.Generate.Elab.Image (imageType)
import Features.Check.Generate.Elab.Log (Log)
import Features.Check.Generate.Elab.Log as Log
import Features.Check.Generate.Elab.Recorded (recordedWith)
import Features.Check.Generate.Elab.Stages (arrowed, stagesOf)
import Features.Check.Generate.Fault (GenerationFault)
import Features.Check.Generate.Out (Out)

-- A fresh problem variable minted by one generation (`Var` is ⟨p, role⟩,
-- T-R0b §2.3).
newtype Handle ∷ Type → Type
newtype Handle s = Handle Var

type role Handle nominal

-- `uses`: what `run` may read (static); `run`: the read.
newtype Elab ∷ Type → Type → Type
newtype Elab s a = Elab
  { uses ∷ Set Use, run ∷ Bindings → Either ElabFault a }

type role Elab nominal representational

-- A writer over the parts, with Task 3.2's generation fault as its
-- failure (Task 7.1 ruling on Q3, 2026-10-23): an id the inputs lack
-- stops generation, before any witness exists.
newtype Gen ∷ Type → Type → Type
newtype Gen s a = Gen
  (Either GenerationFault { value ∷ a, parts ∷ Log Piece })

type role Gen nominal representational

-- One write: entries and variables (`fresh`, `rigid`, `emit`) as Task
-- 3.2's `Out`, or a site with its recorded type (`positioned`, `slots`).
data Piece = Wrote Out | Sited CheckedName RTExpr

-- A generator type: signature variables rigid, fresh ones handles.
data Ref ∷ Type → Type
data Ref s = RigidRef VarId | FlexRef (Handle s)

type GenTy ∷ Type → Type
type GenTy s = Ty (Ref s)

derive instance eqHandle ∷ Eq (Handle s)
derive instance ordHandle ∷ Ord (Handle s)
derive instance eqRef ∷ Eq (Ref s)
derive instance ordRef ∷ Ord (Ref s)

instance functorElab ∷ Functor (Elab s) where
  map change (Elab elab) = Elab elab { run = map change <<< elab.run }

-- Uses: the union; run: `Either`'s apply.
instance applyElab ∷ Apply (Elab s) where
  apply (Elab left) (Elab right) = Elab
    { uses: Set.union left.uses right.uses, run }
    where
    run bindings = left.run bindings <*> right.run bindings

instance applicativeElab ∷ Applicative (Elab s) where
  pure value = Elab { uses: Set.empty, run: const (Right value) }

-- No Bind, Monad or Alt for `Elab`: nothing can choose a read from a
-- value read (§3.2). PureScript forbids orphan instances, so none can be
-- declared elsewhere.

instance functorGen ∷ Functor (Gen s) where
  map change (Gen result) = Gen (map changed result)
    where
    changed written = written { value = change written.value }

instance applyGen ∷ Apply (Gen s) where
  apply = ap

instance applicativeGen ∷ Applicative (Gen s) where
  pure value = Gen (Right { value, parts: Log.none })

instance bindGen ∷ Bind (Gen s) where
  bind (Gen result) next = Gen (either Left continued result)
    where
    continued written = case next written.value of
      Gen more → map (after written.parts) more
    after parts later = later { parts = parts <> later.parts }

instance monadGen ∷ Monad (Gen s)

forget ∷ ∀ s. Ref s → Var
forget = case _ of
  RigidRef index → RigidVar index
  FlexRef (Handle variable) → variable

recorded ∷ ∀ s. GenTy s → RTExpr
recorded = recordedWith forget

-- A pure check of values already read; reads nothing (N6).
orFault ∷ ∀ s a b. (a → Either ElabFault b) → Elab s a → Elab s b
orFault check (Elab elab) = Elab elab { run = check <=< elab.run }

-- The request primitive (§3.2's table): records one use, reads one
-- binding. `Free i` is the hole `i` (§9); an image is a recorded type
-- read back by `imageType`; a record-sorted use takes only a record or a
-- variable (a renaming). Task 4.4's witness has no `Named` binding.
readAs ∷ ∀ s. UseSort → CheckedName → Handle s → Elab s (Ty Open)
readAs sort site (Handle variable) = Elab
  { uses: Set.singleton { var: variable, sort, site }, run }
  where
  run bindings = maybe (Left (Fault.Unbound variable)) bound
    (Map.lookup variable bindings)
  bound = case _ of
    Free index → Right (TVar (Hole index))
    Inline image → either (Left <<< ImageVariable variable) sorted
      (imageType image)
  sorted ty = case sort, ty of
    TypeSort, _ → Right ty
    RecordSort, TRecord _ → Right ty
    RecordSort, TVar _ → Right ty
    RecordSort, _ → Left (SortMismatch variable)
    EffectRowSort, _ → Left (SortMismatch variable)

-- A handle in an effect-row tail (N7): recorded, never dropped, so the
-- seal check reports its `EffectRowSort` use (`SortClash`: no variable
-- has that sort under §12.1's fallback) and `build` never runs. No
-- binding form holds an effect row (docs/plans/r0-ea-representation.md),
-- so the read itself is `SortMismatch`.
readEffect ∷ ∀ s. CheckedName → Handle s → Elab s (TyRow Open)
readEffect site (Handle variable) = Elab
  { uses: Set.singleton { var: variable, sort: EffectRowSort, site }
  , run: const (Left (SortMismatch variable))
  }

-- Every handle read with the sort its position fixes (N7): a `TVar`
-- position by type, a record tail by row, an effect-row tail by
-- `readEffect`; then the images substituted as Core's `substitute` and
-- `spliceRecord` do, a repeated label failing with `DuplicateLabel`.
elabTy ∷ ∀ s. CheckedName → GenTy s → Elab s (Ty Open)
elabTy site ty = case ty of
  TInt → pure TInt
  TBool → pure TBool
  TUnit → pure TUnit
  TText → pure TText
  TVar (RigidRef index) → pure (TVar (Rigid index))
  TVar (FlexRef handle) → readAs TypeSort site handle
  TData owner arguments rows → TData owner
    <$> traverse (elabTy site)
      arguments
    <*> traverse (elabRow site) rows
  THandler label rows → THandler <$> elabLabel site label
    <*> handlerRows rows
  TRecord row → orFault spliced
    (Tuple <$> traverse field row.fields <*> traverse (tailOf site) row.tails)
  TFun _ _ _ → arrowed <$> traverse stage found.stages
    <*> elabTy site found.result
  where
  found = stagesOf ty
  stage (Tuple parameter row) = Tuple <$> elabTy site parameter
    <*> elabRow site row
  field (Tuple name value) = Tuple name <$> elabTy site value
  handlerRows rows = { inference: _, clauses: _ }
    <$> elabRow site
      rows.inference
    <*> traverse (elabRow site) rows.clauses
  spliced (Tuple written images) = maybe
    (Right (spliceRecord written (map snd images)))
    (Left <<< duplicate)
    (repeatedLabel (map fst written) images)
  duplicate (Tuple variable name) = DuplicateLabel variable name

-- The checked instantiation, in the callee's variable order, at `Slot p
-- i`; a record-sorted slot that is a bare handle is read as a row.
elabSlots
  ∷ ∀ s. Path → Array (Tuple UseSort (GenTy s)) → Elab s Instantiation
elabSlots path slots = sequence (mapWithIndex slot slots)
  where
  slot index (Tuple sort ty) = case sort, ty of
    RecordSort, TVar (FlexRef handle) → readAs RecordSort (Slot path index)
      handle
    _, _ → elabTy (Slot path index) ty

tailOf ∷ ∀ s. CheckedName → Ref s → Elab s (Tuple Var (Ty Open))
tailOf site ref = Tuple (forget ref) <$> case ref of
  RigidRef index → pure (TVar (Rigid index))
  FlexRef handle → readAs RecordSort site handle

elabLabel ∷ ∀ s. CheckedName → Label (GenTy s) → Elab s (Label (Ty Open))
elabLabel site (Label effect arguments mark) = labelled
  <$> traverse (elabTy site) arguments
  where
  labelled read = Label effect read mark

-- A row's labels, then its tail's image spliced after them.
elabRow ∷ ∀ s. CheckedName → TyRow (Ref s) → Elab s (TyRow Open)
elabRow site (Row labels tail) = joined
  <$> traverse (elabLabel site) labels
  <*> traverse tailRow tail
  where
  tailRow = case _ of
    RigidRef index → pure (openRow (Rigid index))
    FlexRef handle → readEffect site handle
  joined written = maybe (Row written Nothing) (appended written)
  appended written (Row more rest) = Row (written <> more) rest
