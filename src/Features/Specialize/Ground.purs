module Features.Specialize.Ground
  ( Grounds
  , Tables
  , groundOf
  , groundType
  ) where

import Prelude
import Data.Either (Either(..))
import Data.Map (Map)
import Data.Map as Map
import Data.Array as Array
import Data.Maybe (maybe')
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.IR.Internal as IR
import Domain.Problem (Problem(..))
import Domain.Row (Label(..), Mark(..), closedRow, uniformRows)
import Domain.Syntax (Diagnostic, Span, problemAt)
import Domain.Type (Ty(..), TypeId(..))
import Domain.Type.Parts (arrows)
import Features.Specialize.Keys (Work)

-- The ground type of each output type so far, the arrow table, the
-- effect layouts and the record layouts. Keys hold no effect rows:
-- specialization erases them.
type Grounds =
  { types ∷ Map Int (Ty Void)
  , table ∷ Array IR.FunType
  , effects ∷ Map Int IR.EffectInfo
  , records ∷ Array IR.RecordInfo
  }

type Tables =
  { table ∷ Array IR.FunType
  , effects ∷ Map Int IR.EffectInfo
  , records ∷ Array IR.RecordInfo
  }

groundOf
  ∷ Tables
  → Either Diagnostic (Map Int (Ty Void))
  → Work
  → Either Diagnostic (Map Int (Ty Void))
groundOf tables found work = do
  types ← found
  arguments ← traverse
    ( groundType
        { types
        , table: tables.table
        , effects: tables.effects
        , records: tables.records
        }
        work.span
    )
    work.arguments
  pure (Map.insert work.output (rowless arguments) types)
  where
  -- Rows are erased in specialization (FX001 design §4).
  rowless arguments = TData (TypeId work.declaration) arguments []

groundType ∷ Grounds → Span → IR.Ty → Either Diagnostic (Ty Void)
groundType grounds span = case _ of
  IR.TInt → Right TInt
  IR.TBool → Right TBool
  IR.TUnit → Right TUnit
  IR.TText → Right TText
  IR.TData (TypeId output) → maybe' missing Right
    (Map.lookup output grounds.types)
  arrow@(IR.TFun _) → groundSpine (IR.spine grounds.table arrow)
  IR.THandler (IR.EffectKey output) → maybe' missingEffect groundHandler
    (Map.lookup output grounds.effects)
  IR.TRecord (IR.LayoutId output) → maybe' missing groundRecord
    (Array.index grounds.records output)
  where
  missing _ = Left (problemAt (Internal "Invalid type id") span)
  groundRecord info = TRecord <<< closed <$> traverse field info.fields
  closed fields = { fields, tails: [] }
  field (Tuple label ty) = Tuple label <$> recur ty
  missingEffect _ = Left (problemAt (Internal "Invalid effect key") span)
  groundHandler info = handlerOf info <$> traverse recur info.arguments
  handlerOf info arguments = THandler (Label info.effect arguments Unmarked)
    (uniformRows closedRow)
  recur part = groundType grounds span part
  groundSpine found = arrows <$> traverse recur found.parameters
    <*> recur found.result
