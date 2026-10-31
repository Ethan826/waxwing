-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.5, E20 and E21: handlers and `with` (E17 is Generate.Perform,
-- E22 and E23 are Generate.Failure). Each marker's condition is syntactic
-- (§3.5): decided from the node and the tables, never a solved type.
-- Children: `Handler/clauses/k/body`, `With/handler`, `With/body`.
-- Checked nodes as today's (Handler.purs, ClauseBody.purs; D1 spec §3.5,
-- R0 Task 7.1b): a clause's parameter types are read at
-- `ClauseParamType p c k` (spec §12.2; the clauses are in
-- Generate.HandlerClause). A handler literal's marked type and its
-- `HandlerLit` (E4) are Generate.Literal's; `with`'s marked type is its
-- `⟨p, res⟩` (amin tranche 1, Task 4), and it records `Install` (E5,
-- Task 9) with its consumptions.
module Features.Check.Generate.Effect
  ( handler
  , marker
  , with
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), fromMaybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (OutsideKind(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MTy(..)
  , Obligation(..)
  , Position(..)
  , SiteKind(..)
  , SiteRole(..)
  , UnsupportedKind(..)
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr, HandlerClause, Ty, VarId)
import Domain.Row (Label(..), closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Ambient (enter, framed)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fresh (childOf, instances, nodeRes)
import Features.Check.Generate.Gen
  ( Gen
  , GenEntry(..)
  , Tagged
  , effected
  , emit
  , lifted
  , slots
  )
import Features.Check.Generate.HandlerClause (effectId, handlerClause)
import Features.Check.Generate.Literal (literalAt, literalType, literalVars)
import Features.Check.Generate.Lookup (effectSorts)
import Features.Check.Generate.Minted (Part(..), mintedAt)
import Features.Check.Generate.Node
  ( Ruled
  , fixed
  , flex
  , markedFlex
  , markersAt
  , tagged
  )
import Features.Check.Generate.Obligation
  ( consumedAt
  , equalAt
  , siteAt
  , unsupportedAt
  )
import Features.Check.Generate.Out (EffectItem(..))

-- E20: `app (Handler e) [⟨p, inst j⟩ …]`, `Outside HandlerType` (O3),
-- clause bodies with parameters at θ of their declared types; markers of
-- those types follow (origin inst). The checked node holds the written
-- label's arguments (Check/ClauseBody.purs `labelArgs`), which the
-- witness binds `⟨p, inst j⟩` to.
handler
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Label (Ty VarId)
  → Array HandlerClause
  → Gen s (Ruled s)
handler recur context path span label@(Label effect _ mark) clauses = do
  sorts ← lifted (effectSorts context.tables effect)
  inst ← instances path (ExprRule 20) span sorts
  found ← sequence (Array.mapWithIndex (clauseOf inst.naming) clauses)
  read ← slots path inst.slots
  let markedType = literalType path effect inst.all
  effected
    ( mintedAt path (literalVars path <> Array.mapWithIndex clauseRow clauses)
        (map PartTy ([ markedType ] <> Array.concatMap _.marked found))
    )
  pure
    { ty: Type.THandler (Label effect (map snd inst.slots) mark)
        { inference: closedRow, clauses: Nothing }
    , marked: markedType
    , node: fixed
        ( Checked.Handler (effectId effect) <$> read
            <*> traverse _.clause found
        )
    , emits: do
        emit (at context path (ExprRule 20))
          ( marker true HandlerType 3 span
              <> markersAt InstOrigin span (Array.concatMap _.marks found)
          )
        literalAt (at context path (ExprRule 20)) span
          (Array.mapWithIndex clauseRow clauses)
        traverse_ _.emits found
    }
  where
  snd (Tuple _ ty) = ty
  -- Each clause's own row c, `⟨p, clauses k⟩` (statements §2, ownership
  -- table): the clause body's ambient row (E11), minted by the literal,
  -- whose path it carries.
  clauseRow place _ = EffFresh path (Clauses place)
  clauseOf naming place = handlerClause recur context
    { handler: path, clause: place, label }
    naming

-- E21: `⟨p, res⟩`, `Outside HandlerType`; no equation through the
-- handler. The body runs in `f L + ρ` (E11, Task 8; Install.purs), `L`
-- the handler's label under the frame mark `Frame p`.
with
  ∷ ∀ s. Recur s → Context s → Path → Span → Expr → Expr → Gen s (Ruled s)
with recur context path span handlerExpr body = do
  handlerPart ← recur context (childOf path "With" "handler") handlerExpr
  install context path span handlerPart.marked
  inside ← enter bodyPath (framed path handlerPart.marked context.ambient)
    context
  -- `Frame p` carries this node's path, so the node mints it (an owner
  -- mints only what carries its own path, Generate.Minted), whatever
  -- the handler's type: `Install` names it. Nothing else this node's
  -- types name carries its path.
  effected [ MintedPosition (Frame path) ]
  bodyPart ← recur inside bodyPath body
  res ← nodeRes path (ExprRule 21) span
  pure
    { ty: flex res
    , marked: markedFlex res
    , node: fixed (Checked.With <$> handlerPart.expr <*> bodyPart.expr)
    , emits: do
        emit (at context path (ExprRule 21)) (marker true HandlerType 3 span)
        equalAt (at context path (ExprRule 21)) WithNode span (markedFlex res)
          bodyPart.marked
        handlerPart.emits
        bodyPart.emits
    }
  where
  bodyPath = childOf path "With" "body"

-- E5 (statements §4, §13): `Install` under `InstallSite` names the
-- frame `Frame p`, the handler child's marked type as it stands (R9 A2)
-- and the outer ambient row ρ.
install ∷ ∀ s. Context s → Path → Span → MTy → Gen s Unit
install context path span handlerType =
  siteAt (at context path (ExprRule 21)) InstallSite span
    ( Install
        { frame: Frame path, handler: handlerType, ambient: context.ambient }
    )
    *> installed context path span handlerType

-- Over an `MHandler`, R is consumed into ρ ignoring marks (`InstallR`),
-- and C, the owned C or else R's bare alias (rule J), meets ρ at the
-- installed-C site with marks, bare (Lend `assume`; N8). Any other
-- type names no label for `Ambient.framed`, so the body's ambient row
-- would be the outer row alone: not a complete ambient representation.
-- It records `UnframedInstall` (§18.124 ruling 4; Decide routes it to
-- `EffectsUnchecked`, never Solved) and no consumption: its R is read
-- from the package through `Install`, never a guessed source (R9 Q6).
-- Symbolic framing is unresolved; `UnframedInstall` restricts it.
installed ∷ ∀ s. Context s → Path → Span → MTy → Gen s Unit
installed context path span = case _ of
  MHandler _ rows →
    consumedAt site span
      { site: InstallR
      , source: rows.inference
      , target: context.ambient
      , marks: false
      , bare: false
      }
      *> consumedAt site span
        { site: AtInstalledC
        , source: fromMaybe rows.inference rows.clauses
        , target: context.ambient
        , marks: true
        , bare: true
        }
  _ → unsupportedAt (at context path (ExprRule 21)) span UnframedInstall
  where
  site = at context path (ExprRule 21)

-- An explicit marker of this rule (origin body), when its condition
-- holds.
marker ∷ ∀ s. Boolean → OutsideKind → Int → Span → Array (Tagged s)
marker holds kind row span =
  if holds then [ tagged (EmitOutside kind) RowO row Body span ] else []
