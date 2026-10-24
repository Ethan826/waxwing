-- D1's `generateIn` (docs/plans/r0-generation-continuation.md §3.5; R0
-- Task 7.1b): Task 3.2's generator over `Gen` and `Elab`. One walk of
-- the declaration writes its recorded problem through `fresh`, `rigid`,
-- `positioned`, `slots` and `emit`, and returns its checked declaration
-- as an `Elab` that reads the witness only through what it records.
-- The entries are written signature first, then body, as Task 3.2 wrote
-- them (test/r0-problem-pin.serial.test.mjs pins every corpus problem).
-- The checked declaration is today's (Check/Function.purs
-- `checkFunction`): the written signature, rigid; the body with its
-- holes renumbered by `holes` (§9); the effect row as written, and
-- `main`'s open tail, which today's checker infers, left closed (§12.1's
-- fallback, Task 7.1 ruling, provisional).
module Features.Check.Generate.Body (generateIn) where

import Prelude
import Data.Maybe (Maybe(..))
import Domain.Checked.Internal (rigid)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Resolved (FunctionDecl, exprSpan)
import Domain.Row (Row(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Generate.Elab (Elab)
import Features.Check.Generate.Expr (expr)
import Features.Check.Generate.Gen (Gen, lifted)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Signature
  ( declaration
  , isEntry
  , parameterLocals
  )
import Features.Check.Holes (holes)

generateIn
  ∷ ∀ s
  . Tables
  → Signatures
  → FunctionDecl
  → Gen s (Elab s Checked.FunctionDecl)
generateIn tables signatures function = do
  locals ← lifted (parameterLocals tables function)
  body ← expr { decl: function.id, tables, signatures, locals }
    (Path { root: InBody, steps: [] })
    function.body
  signature ← declaration tables function body.ty (exprSpan function.body)
  signature
  body.emits
  pure (checkedOf function <$> body.expr)

checkedOf ∷ FunctionDecl → Checked.Expr → Checked.FunctionDecl
checkedOf function body =
  { id: function.id
  , name: function.name
  , sorts: function.sorts
  , parameters: map parameterType function.parameters
  , result: rigid function.result
  , row: rowOf function
  , body: holes body
  , span: function.span
  }
  where
  parameterType parameter = rigid parameter.ty

rowOf ∷ FunctionDecl → TyRow Checked.Open
rowOf function = case rigid (TFun TUnit function.row TUnit) of
  TFun _ (Row labels tail) _
    | isEntry function → Row labels Nothing
    | otherwise → Row labels tail
  _ → Row [] Nothing
