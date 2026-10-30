-- trusted surface: every diff needs token review; see docs/engineering.md
-- E11 (a-min statements §4): the ambient row each body runs in, the
-- target of every stage consumed in it (E2, E10). The declared row for a
-- function body; a lambda's `⟨p, effect⟩`; `f L + ρ` in a `with` body
-- (Install.purs); `Fail(E…) + ρ` in a `handle` body (Handle.purs
-- `withFailures`); a clause's `⟨p, clauses k⟩`; a deferred expression's
-- `⟨p, effect⟩`. `enter` makes a body's context and records its row at
-- the body's path. `callbacks` are the declaration's parameters that
-- have one-stage function types, the ones the live checker names in its
-- FX017/FX018 diagnostics (Check/Apply.purs `calleeOf`).
module Features.Check.Generate.Ambient
  ( callbackParameters
  , calleeSite
  , enter
  , failing
  , framed
  , ownRow
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..))
import Domain.Recorded.Effect
  ( ERole
  , EVar(..)
  , MLabel
  , MRow
  , MTy(..)
  , MarkRef(..)
  , Position(..)
  , SiteKind(..)
  )
import Domain.Recorded.Origin (Path)
import Domain.Resolved (Expr(..), FailClause, FunctionDecl, LocalId(..))
import Domain.Row (Row(..))
import Domain.Type (Ty(..))
import Features.Check.Generate.Context (Context)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Gen (Gen)
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Marked (MarkNaming(..), marked)
import Features.Check.Generate.Obligation (ambientAt)

-- The context of the body at `path`, whose ambient row is `row`.
enter ∷ ∀ s. Path → MRow → Context s → Gen s (Context s)
enter path row context = context { ambient = row } <$ ambientAt path row

-- A row of one fresh tail: a lambda's or a deferred expression's
-- `⟨p, effect⟩`, a clause's `⟨handler, clauses k⟩`.
ownRow ∷ ERole → Path → MRow
ownRow role path = { labels: [], tail: Just (EffFresh path role) }

-- `f L + ρ`: the installed handler's label under the frame mark at the
-- `with` node, in front of the outer row. A handler whose type is not
-- yet a handler type when generation reads it names no label here, so
-- its body's ambient row is ρ alone. That is not a complete ambient
-- representation, so `with` records an explicit `UnframedInstall`
-- Unsupported for it (Effect.purs `unframed`, §18.124 ruling 4);
-- symbolic framing is Task 9 design.
framed ∷ Path → MTy → MRow → MRow
framed path installed outer = case installed of
  MHandler label _ → inFront [ label { mark = At (Frame path) } ] outer
  _ → outer

-- `Fail(E…) + ρ`, each clause's written label (Fail's mark is the
-- placeholder N, statements §2) in clause order.
failing
  ∷ Tables → Array FailClause → MRow → Either GenerationFault MRow
failing tables clauses outer = inFrontOf outer
  <$> (labelsOf =<< marked tables Declared failures)
  where
  failures = TFun TUnit (Row (map _.label clauses) Nothing) TUnit
  labelsOf = case _ of
    MArrow _ row _ → Right row.labels
    _ → Left MarkShape
  inFrontOf row labels = inFront labels row

inFront ∷ Array MLabel → MRow → MRow
inFront labels row = row { labels = labels <> row.labels }

-- The declaration's parameters of a one-stage function type (a later
-- stage's row is not the parameter's, FX017).
callbackParameters ∷ FunctionDecl → Array LocalId
callbackParameters function = Array.catMaybes
  (Array.mapWithIndex callback function.parameters)
  where
  callback index parameter =
    if oneStage parameter.ty then Just (LocalId index) else Nothing
  oneStage = case _ of
    TFun _ _ (TFun _ _ _) → false
    TFun _ _ _ → true
    _ → false

-- A stage of an application or pipe whose function is a callback
-- parameter is a callback stage (Callback.purs `callbackLacks`).
calleeSite ∷ ∀ s. Context s → SiteKind → Expr → SiteKind
calleeSite context kind = case _ of
  Local _ local | Array.elem local context.callbacks → AtCallback
  _ → kind
