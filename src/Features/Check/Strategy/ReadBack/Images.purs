-- The package's type and record-row images (tranche 2 read-back design
-- §C.8, Task 6a; dossier §18.155 (6)): each flexible variable today's
-- read-back gives a value (ReadBack's `unsettled`) gets a `PTy` or a
-- `PRecordRow` that keeps what `RTExpr` drops (arrow rows, label marks,
-- handler R and C, data rows). Untrusted search: a defect here can lose
-- an acceptance at the validator, never certify.
--
-- A positioned variable reads the live checked type at its position (the
-- one ReadBack.Position `valueAt` erases), converted by ReadBack.Convert
-- with the injected least terms; a record-row variable's fields and tails
-- come from the live record type the same way. An auxiliary has no
-- position: Robinson unification completed it (ReadBack step 2), so its
-- image converts only when it needs no row (no arrow, no handler head,
-- no data with row arguments, by the problem's declared arities);
-- otherwise it is `UnreadImage v`. No row or mark is invented. Every
-- image is read under ReadBack's `holeBindings` (ReadBack/Bound.purs,
-- design §C.7) before its erasure is compared, so a hole θ binds reads
-- θ's value here as in σ.
--
-- `ImageApart v` is an erasure-agreement guard only: the image's erasure
-- (Effects.Package `eraseTy`, spec §2.5) must be today's image up to
-- record field order (§18.150's canonical comparison: tails keep their
-- order; θ's completions are not field-sorted). It catches a
-- wrong position, constructor or hole; it cannot see a wrong row, mark
-- or C, which erasure drops.
module Features.Check.Strategy.ReadBack.Images
  ( Images
  , readImages
  , rowFree
  ) where

import Prelude
import Data.Array (foldM, sortWith)
import Data.Either (Either(..), either, hush, note)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Domain.Checked.Internal as Checked
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Arity (DataArity)
import Domain.Recorded.Atom
  ( Base(..)
  , CheckedName(..)
  , Head(..)
  , RTExpr(..)
  , Var(..)
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Hole (isHole)
import Domain.Row (Mark)
import Domain.Type (TypeId)
import Domain.Verdict.EffectPackage (PRecordRow, PTy(..), Term)
import Features.Check.Spine (spine, unspine)
import Features.Check.Strategy.Effects.Package (eraseTy)
import Features.Check.Strategy.ReadBack (ReadBack, slotted)
import Features.Check.Strategy.ReadBack.Bound (boundTy)
import Features.Check.Strategy.ReadBack.Convert
  ( Unconverted(..)
  , convertTy
  )
import Features.Check.Strategy.ReadBack.Fault (ReadFault(..))
import Features.Check.Strategy.ReadBack.Position (liveAt, liveType)

type Images = { types ∷ Map Var PTy, rows ∷ Map Var PRecordRow }

type Reading =
  { live ∷ Var → CheckedName → Either ReadFault PTy
  , vars ∷ Map Var VarInfo
  , arities ∷ Map TypeId DataArity
  , bound ∷ PTy → Either ReadFault PTy
  }

readImages
  ∷ (Mark → Maybe Term)
  → RecordedProblem
  → Checked.FunctionDecl
  → ReadBack
  → Either ReadFault Images
readImages terms problem checked found =
  foldM (placed reading) { types: Map.empty, rows: Map.empty }
    (Map.toUnfoldable found.unsettled ∷ Array (Tuple Var RTExpr))
  where
  view = fields problem
  reading =
    { live
    , vars: view.vars
    , arities: view.effects.declarations.types
    , bound: boundTy
        { bindings: found.holeBindings
        , image: rowFree view.effects.declarations.types
        }
    }
  ranked = slotted problem
  -- A position failure stays `UnreadImage v`; a conversion failure is
  -- `ImageUnconverted v e` (R036 (3)). `Nothing` here is the position's.
  live variable name =
    note (UnreadImage variable)
      (hush (liveAt checked.body ranked name))
      >>= converted variable
  converted variable = either (unconverted variable) Right
    <<< convertTy terms
    <<< liveType
  unconverted variable (UnmarkedLabel effect) =
    Left (ImageUnconverted variable effect)

-- One variable's image, filed by its sort once its erasure agrees.
placed ∷ Reading → Images → Tuple Var RTExpr → Either ReadFault Images
placed reading images (Tuple variable today) =
  note unread (Map.lookup variable reading.vars) >>= filed
  where
  unread = UnreadImage variable
  filed info = imageOf reading variable today info >>= reading.bound
    >>= sorted info.sort
  sorted sort image = case sort of
    SortType → typed image <$ agreed image
    SortRow → note unread (recordRow image) >>= rowAgreed
  rowAgreed row = rowed row <$ agreed (PRecord row)
  -- Tails compared in order: stricter than `eraseTy`, which sorts them.
  agreed image
    | fieldOrder (eraseTy image) == fieldOrder today = Right unit
    | otherwise = Left (ImageApart variable)
  typed image = images { types = Map.insert variable image images.types }
  rowed row = images { rows = Map.insert variable row images.rows }

-- The live type at a position, or an auxiliary's row-free image.
imageOf ∷ Reading → Var → RTExpr → VarInfo → Either ReadFault PTy
imageOf reading variable today info = case info.position of
  Auxiliary → note (UnreadImage variable) (rowFree reading.arities today)
  position → reading.live variable position

-- A record-row variable's image: a record, or a bare hole read as its
-- tail (ReadBack.Type `readSorted`, R022). The tail reading applies at
-- every position, though `valueAt` reads it by sort only at an expression
-- slot; at a `Plain` position today's image is the bare hole, and the
-- guard reports the mismatch as `ImageApart`.
recordRow ∷ PTy → Maybe PRecordRow
recordRow = case _ of
  PRecord row → Just row
  PVar variable
    | isHole variable → Just { fields: [], tails: [ variable ] }
  _ → Nothing

-- An `RTExpr` that needs no row, as a `PTy`; `Nothing` for an arrow, a
-- handler head, data whose declared row arguments are not none, or a
-- variable or tail outside the package's domain (`namable`).
rowFree ∷ Map TypeId DataArity → RTExpr → Maybe PTy
rowFree arities ty = case ty of
  Base (DataBase owner) → rowless owner []
  Base base → Just (PBase base)
  TVar variable → PVar <$> namable variable
  Record entries tails → PRecord <$> record entries tails
  App (DataHead owner) arguments → traverse recur arguments
    >>= rowless owner
  App (HandlerHead _) _ → Nothing
  Arrow _ _ → Nothing
  where
  recur = rowFree arities
  field (Tuple label value) = Tuple label <$> recur value
  record entries tails = { fields: _, tails: _ } <$> traverse field entries
    <*> traverse namable tails
  rowless owner arguments =
    Map.lookup owner arities >>= declared owner arguments
  declared owner arguments arity
    | arity.rows == 0 = Just (PData owner arguments [])
    | otherwise = Nothing

-- A hole or a rigid, what a package image may name (A2 spec §2.2: `PVar`
-- and record tails); θ may bind an auxiliary to another flexible
-- variable it left unbound, which no package can name (C11).
namable ∷ Var → Maybe Var
namable variable = case variable of
  RigidVar _ → Just variable
  FreshVar _ _
    | isHole variable → Just variable
    | otherwise → Nothing

-- Record fields sorted by label, everything else kept (§18.150).
fieldOrder ∷ RTExpr → RTExpr
fieldOrder ty = case ty of
  Arrow _ _ → unspine
    { parameters: map fieldOrder found.parameters
    , result: fieldOrder found.result
    }
  Record entries tails → Record (sortWith fst (map field entries)) tails
  App head arguments → App head (map fieldOrder arguments)
  _ → ty
  where
  found = spine ty
  field (Tuple label value) = Tuple label (fieldOrder value)
