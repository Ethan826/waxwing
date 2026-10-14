module Features.Specialize.Layouts
  ( Layouts
  , Interned
  , noLayouts
  , layoutTable
  , internLayout
  , layoutFields
  ) where

import Prelude
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (maybe, maybe')
import Data.Tuple (Tuple, snd)
import Domain.IR.Internal as IR
import Domain.Type.Record (sortFields)

-- Record layouts are hash-consed as arrows are (Features.Specialize.Intern):
-- each closed record type, its fields sorted by label and each field type
-- already a number or a builtin, gets one IR.LayoutId, in first-use order
-- (R001 design §5). Two orderings of one type are one layout, so a key
-- holding it is one key. A layout is not a specialization key: it creates
-- no work and is not counted against the limit, as arrows are not; the
-- function copies that reach a new layout are counted.
type Layouts =
  { numbers ∷ Map (Array (Tuple String IR.Ty)) Int
  , entries ∷ Map Int IR.RecordInfo
  , count ∷ Int
  }

type Interned = { layouts ∷ Layouts, ty ∷ IR.Ty }

noLayouts ∷ Layouts
noLayouts = { numbers: Map.empty, entries: Map.empty, count: 0 }

-- The table in number order.
layoutTable ∷ Layouts → Array IR.RecordInfo
layoutTable layouts = map snd
  (Map.toUnfoldable layouts.entries ∷ Array (Tuple Int IR.RecordInfo))

-- The layout of these fields, sorted here whatever order they come in.
internLayout ∷ Array (Tuple String IR.Ty) → Layouts → Interned
internLayout written layouts = maybe' fresh found
  (Map.lookup fields layouts.numbers)
  where
  fields = sortFields written
  found number = { layouts, ty: numbered number }
  fresh _ =
    { layouts:
        { numbers: Map.insert fields layouts.count layouts.numbers
        , entries: Map.insert layouts.count { fields } layouts.entries
        , count: layouts.count + 1
        }
    , ty: numbered layouts.count
    }
  numbered number = IR.TRecord (IR.LayoutId number)

-- A record type's fields; any other type has none.
layoutFields ∷ Layouts → IR.Ty → Array (Tuple String IR.Ty)
layoutFields layouts = case _ of
  IR.TRecord (IR.LayoutId number) → maybe [] fieldsOf
    (Map.lookup number layouts.entries)
  _ → []
  where
  fieldsOf info = info.fields
