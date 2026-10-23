-- R0 generation (T-R0b §1, §10): one declaration's recorded problem,
-- built syntax-directed from the resolved declaration, the tables and
-- the signatures it references. Total and deterministic; it reads no
-- checker state and branches on no solved shape (§4's applicative
-- invariant: Generate.Context holds everything a rule reads, and the
-- import rule in test/r0-generate-signature.test.mjs keeps every
-- checker module out of reach). Test-only in this tranche: compile does
-- not call it (ruling R6). The export list is an enumerated allowlist
-- with no production empty problem (ruling R2; Task 0.3 NB3).
module Features.Check.Generate
  ( module Exports
  , generate
  ) where

import Prelude
import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (Quant(..), Var, VarInfo, VarSort(..))
import Domain.Recorded.Internal (RecordedProblem(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Resolved (FunctionDecl, exprSpan)
import Features.Check.Generate.Expr (expr)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Inputs (Signatures, Tables) as Exports
import Features.Check.Generate.Out (concatOut)
import Features.Check.Generate.Signature (declaration, parameterLocals)
import Features.Check.Generate.Static.Rules (staticRules) as Exports

generate ∷ Tables → Signatures → FunctionDecl → RecordedProblem
generate tables signatures function = RecordedProblem
  { decl: function.id
  , rigidTy: keys rigidType
  , rigidRow: keys rigidRow
  , flexTy: keys flexType
  , flexRow: keys flexRow
  , d: out.d
  , q: []
  , b: out.b
  , bq: out.bq
  , outside: out.outside
  , adm: out.adm
  , split: out.split
  , vars
  , types: Map.fromFoldable out.types
  }
  where
  context =
    { decl: function.id
    , tables
    , signatures
    , locals: parameterLocals tables function
    }
  body = expr context (Path { root: InBody, steps: [] }) function.body
  out = concatOut
    [ declaration tables function body.ty (exprSpan function.body)
    , body.out
    ]
  vars = Map.fromFoldable out.vars
  keys wanted = Array.mapMaybe (keyOf wanted)
    (Map.toUnfoldable vars ∷ Array (Tuple Var VarInfo))
  keyOf wanted (Tuple var info) =
    if wanted info then Just var else Nothing
  rigidType info = rigid info && info.sort == SortType
  rigidRow info = rigid info && info.sort == SortRow
  flexType info = not (rigid info) && info.sort == SortType
  flexRow info = not (rigid info) && info.sort == SortRow
  rigid info = case info.quant of
    Forall _ → true
    Exists → false
