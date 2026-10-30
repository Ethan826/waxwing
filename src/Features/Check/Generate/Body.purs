-- trusted surface: every diff needs token review; see docs/engineering.md
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
-- fallback, Task 7.1 ruling, provisional). The declared row, marked as
-- declared, is the body's ambient row (amin Task 8, E10, E11), recorded at
-- the body's root, except for `main`'s open top-level tail (§18.124 ruling
-- 2, statements §4 E8 amendment): there today's checker infers the tail
-- (Check/Function.purs `mainRow`), so the ambient row and `Entry` read
-- one flexible variable `EntryTail` that this module mints once. It
-- carries the result root, where `Entry` is recorded (Sig10), not the
-- body root: a body-root node (a `with` at the root) mints every tail
-- that carries its own path, so the body root would mint it twice
-- (test/r0-marked-corpus.serial.test.mjs found 33 such declarations).
-- The recorded signature (`SignatureAt`) keeps its rigid variable, which
-- rigid accounting still counts, and the checked row above stays
-- closed: that closing is a provisional representation, not E8's
-- specification.
module Features.Check.Generate.Body (generateIn) where

import Prelude
import Data.Maybe (Maybe(..), maybe)
import Domain.Checked.Internal (rigid)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Effect (ERole(..), EVar(..), MRow)
import Domain.Recorded.Origin (Path(..), PathRoot(..), RuleId(..))
import Domain.Resolved (FunctionDecl, exprSpan)
import Domain.Row (Row(..))
import Domain.Type (Ty(..), TyRow)
import Features.Check.Generate.Ambient (callbackParameters)
import Features.Check.Generate.Declared (declaredSignature)
import Features.Check.Generate.Elab (Elab)
import Features.Check.Generate.Expr (expr)
import Features.Check.Generate.Gen (Gen, effected, lifted)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Obligation (ambientAt, entryAt)
import Features.Check.Generate.Out (EffectItem(..))
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
  declared ← lifted (declaredSignature tables function)
  ambient ← entryTail function resultRoot declared.row
  ambientAt root ambient
  body ← expr
    { decl: function.id
    , tables
    , signatures
    , locals
    , ambient
    , callbacks: callbackParameters function
    }
    root
    function.body
  signature ← declaration tables function body.ty body.marked
    (exprSpan function.body)
  signature
  body.emits
  entered function ambient
  pure (checkedOf function <$> body.expr)
  where
  root = Path { root: InBody, steps: [] }
  resultRoot = Path { root: InResult, steps: [] }

-- `main`'s declared row with its rigid top-level tail replaced by the
-- one flexible `EntryTail` at `path` (the result root), minted here and
-- nowhere else: any open top-level tail, implicit or a written `...r`
-- (§18.126; as Check/Function.purs `mainRow`). A closed row and every
-- other function keep the declared row; other signature occurrences of
-- that variable stay rigid.
entryTail ∷ ∀ s. FunctionDecl → Path → MRow → Gen s MRow
entryTail function path row =
  if isEntry function then maybe (pure row) tailed row.tail else pure row
  where
  inferred = EffFresh path EntryTail
  tailed = case _ of
    EffRigid _ →
      row { tail = Just inferred } <$ effected [ MintedVar inferred ]
    EffFresh _ _ → pure row

-- E8: `main`, and only `main`, records its declared row for the entry
-- check (Sig10's rule, at the result root where it records its atom).
entered ∷ ∀ s. FunctionDecl → MRow → Gen s Unit
entered function row = when (isEntry function)
  ( entryAt
      { decl: function.id
      , path: Path { root: InResult, steps: [] }
      , rule: SigRule 10
      }
      function.span
      row
  )

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
