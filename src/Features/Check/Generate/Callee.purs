-- trusted surface: every diff needs token review; see docs/engineering.md
-- An occurrence's callee, constructor owner or operation instantiated
-- (T-R0b §3.2, E3-E6; D1 spec §3.3, R0 Task 7.1b): its `⟨p, inst i⟩`
-- minted, its types under θ, the entries the reference itself records
-- and its instantiation read at `Slot p i`. The signature is read
-- first, then the types it holds, then their marked translations at
-- the use (Generate.Marked `AtUse p`, amin tranche 1 Task 3), recorded
-- as the use's instance (`InstanceAt`, Task 4) with what it mints: a
-- function use's result carries its ResultC (Generate.Owned
-- `resultClauses`), a constructor's or an operation's never, as the live
-- checker opens and owns clauses at function uses only (Check/Use.purs
-- `openedUse`; controller ruling, Task 4).
module Features.Check.Generate.Callee
  ( Called
  , atUse
  , ctorInstance
  , functionInstance
  , recordInstance
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Instantiation)
import Domain.Recorded.Atom (Callee(..))
import Domain.Recorded.Effect (InstanceSig, MTy(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId)
import Domain.Resolved (CtorId, FunctionId, Ty, TyRow, VarId)
import Domain.Row (closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Context (Context)
import Features.Check.Generate.Elab (Elab, GenTy)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Fresh (instances)
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom(..)
  , GenEntry(..)
  , Tagged
  , effected
  , lifted
  , slots
  )
import Features.Check.Generate.Lookup (calleeOf, ctorShape)
import Features.Check.Generate.Marked (MarkNaming(..), marked)
import Features.Check.Generate.Minted (Part(..), mintedAt)
import Features.Check.Generate.Node (markersAt, tagged)
import Features.Check.Generate.Opening (openedHandlers, openedRow)
import Features.Check.Generate.Out (EffectItem(..))
import Features.Check.Generate.Owned (resultClauses)
import Features.Check.Generate.Signature (calleeClauses)
import Features.Check.Generate.Translate (named, translate, translateAll)

-- An instantiated callee, owner or operation: its parameter (or field)
-- types and result under θ, its listed entries, the markers of those
-- types, and its instantiation as read.
type Called s =
  { parameters ∷ Array (GenTy s)
  , result ∷ GenTy s
  , entries ∷ Array (Tagged s)
  , markers ∷ Array (Tagged s)
  , slots ∷ Elab s Instantiation
  , instance ∷ InstanceSig
  }

-- E3's entries (origin inst): θ(D_g) written (F2) and implied (F3), the
-- `adm` site of every reference (F7, every `inst` slot) and a `split`
-- site when `g` has a record-row variable (H2, those slots). The
-- signature is read first, then the types it holds.
functionInstance
  ∷ ∀ s
  . Context s
  → Path
  → Span
  → FunctionId
  → RuleId
  → Gen s (Called s)
functionInstance context path span function rule = do
  signature ← lifted (calleeOf context.signatures function)
  inst ← instances path rule span signature.sorts
  parameters ← lifted
    (translateAll context.tables inst.naming signature.parameters)
  result ← lifted (translate context.tables inst.naming signature.result)
  clauses ← lifted (calleeClauses context.tables inst.naming signature)
  read ← slots path inst.slots
  markedTypes ← lifted
    (atUse context path signature.parameters signature.row signature.result)
  let
    owned = resultClauses path
      (openedHandlers path (openedRow path markedTypes))
  recordInstance path owned
  pure
    { parameters: parameters.tys
    , result: result.ty
    , entries: map (instOf RowF 2 <<< EmitB) clauses.written
        <> map (instOf RowF 3 <<< EmitB) clauses.implied
        <> [ instOf RowF 7 (EmitAdm { callee, slots: inst.all }) ]
        <> splitSite inst.rows
    , markers: markersAt InstOrigin span (parameters.marks <> result.marks)
    , slots: read
    , instance: owned
    }
  where
  callee = CalleeFunction function
  splitSite rows =
    if Array.null rows then []
    else [ instOf RowH 2 (EmitSplit { callee, slots: rows }) ]
  instOf group number entry = tagged entry group number InstOrigin span

-- E4's entries (origin inst): `disjoint` per joined pair of the
-- constructor (F8; reading 8: not the fields' implied `lacks`).
ctorInstance
  ∷ ∀ s. Context s → Path → Span → CtorId → RuleId → Gen s (Called s)
ctorInstance context path span ctor rule = do
  shape ← lifted (ctorShape context.tables ctor)
  inst ← instances path rule span shape.sorts
  fields ← lifted (translateAll context.tables inst.naming shape.fields)
  owner ← lifted (translate context.tables inst.naming shape.owner)
  pairs ← lifted (traverse (pairOf inst.naming) shape.joined)
  read ← slots path inst.slots
  found ← lifted (atUse context path shape.fields closedRow shape.owner)
  let opened = openedRow path found
  recordInstance path opened
  pure
    { parameters: fields.tys
    , result: owner.ty
    , entries: map joinedPair pairs
    , markers: markersAt InstOrigin span (fields.marks <> owner.marks)
    , slots: read
    , instance: opened
    }
  where
  pairOf naming { variables: Tuple one other } =
    GenDisjoint <$> named naming one <*> named naming other
  joinedPair atom = tagged (EmitB atom) RowF 8 InstOrigin span

-- Parameter (or field) types, the callee's row and the result, marked
-- at the use `p`; read after their erased translations, so a fault those
-- raise comes first. The row is marked as the one stage of `Unit → Unit`
-- (Check/DeclarationUse.purs reads a signature's row the same way); a
-- marked arrow is always an arrow, so any other result is `MarkShape`,
-- the marked translation's shape fault (controller ruling, Task 4 fix 1).
atUse
  ∷ ∀ s
  . Context s
  → Path
  → Array (Ty VarId)
  → TyRow VarId
  → Ty VarId
  → Either GenerationFault InstanceSig
atUse context path parameters row result =
  { parameters: _, row: _, result: _ } <$> traverse markedAt parameters
    <*> (rowOf =<< markedAt (Type.TFun Type.TUnit row Type.TUnit))
    <*> markedAt result
  where
  markedAt = marked context.tables (AtUse path)
  rowOf = case _ of
    MArrow _ found _ → Right found
    _ → Left MarkShape

-- The use's instance at `p` and what it mints there: every variable and
-- position the instance names at p (`⟨p, inst v⟩` for each effect-row
-- variable it names, its `nofail(k)` positions, its ResultC tail). The
-- stage variables before the last are minted where a node's type names
-- them (Generate.Node `mintedStages`). A constructor pattern records one
-- too: it is a use of the constructor's signature.
recordInstance ∷ ∀ s. Path → InstanceSig → Gen s Unit
recordInstance path sig = effected
  ( [ InstanceAt path sig ] <> mintedAt path []
      (map PartTy sig.parameters <> [ PartRow sig.row, PartTy sig.result ])
  )
