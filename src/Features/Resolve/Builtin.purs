module Features.Resolve.Builtin
  ( BuiltinEffect
  , Declared
  , Operation(..)
  , builtinEffects
  ) where

import Domain.Ids (EffectId)
import Domain.Row (EffectRef(..))

-- What `Effect.op` names (FX020 §2: by declaration, never by row). Console
-- and Fail are not declared effects, so each has a built-in table below,
-- searched like a declared effect's operations (amendment 2). Imports and
-- collision checks (FX020 Tasks 3 and 4) share it. `print` ranges over
-- every printable type, so it stays compiler-provided until C001.
data Operation
  = UserOperation EffectId Int
  | PrintOperation
  | FailOperation

type Declared = { operation ∷ Operation, arity ∷ Int }

type BuiltinEffect =
  { name ∷ String
  , ref ∷ EffectRef
  , arity ∷ Int
  , operations ∷ Array { name ∷ String, declared ∷ Declared }
  }

builtinEffects ∷ Array BuiltinEffect
builtinEffects =
  [ { name: "Console"
    , ref: ConsoleEffect
    , arity: 0
    , operations:
        [ { name: "print"
          , declared: { operation: PrintOperation, arity: 1 }
          }
        ]
    }
  , { name: "Fail"
    , ref: FailEffect
    , arity: 1
    , operations:
        [ { name: "fail"
          , declared: { operation: FailOperation, arity: 1 }
          }
        ]
    }
  ]
