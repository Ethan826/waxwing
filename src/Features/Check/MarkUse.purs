module Features.Check.MarkUse
  ( instantiateMarks
  , localMarks
  , literalMark
  , openHandlers
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (mapAccumL, traverse)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Checked.Internal (Open(..))
import Domain.Row
  ( EffectRef(..)
  , HandlerRows
  , Label(..)
  , Mark(..)
  , Row(..)
  , normalMark
  , withMark
  )
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Parts (rowsOf, spine)
import Features.Check.Scheme (State, Threaded)
import Features.Check.Subst (empty)
import Features.Check.Walked (bareLabel)

-- Marks in checking are metas for what a use leaves open (FX008 design
-- §3.3, §3.4). A counter supplies their numbers: from the next unused meta
-- of the state, as every other fresh meta.
newtype Supply a = Supply (Int → Tuple Int a)

instance functorSupply ∷ Functor Supply where
  map change (Supply run) = Supply changed
    where
    changed count = map change (run count)

instance applySupply ∷ Apply Supply where
  apply (Supply runChange) (Supply run) = Supply applied
    where
    applied count = continue (runChange count)
    continue (Tuple middle change) = map change (run middle)

instance applicativeSupply ∷ Applicative Supply where
  pure value = Supply (flip Tuple value)

-- A declaration reference instantiates its mark variables with one fresh
-- meta each, shared across its signature. A name the declaration does not
-- have is rigid here (a lambda annotation naming the enclosing signature's)
-- and stays.
instantiateMarks ∷ Array String → State → Threaded (Mark → Mark)
instantiateMarks names state =
  { value: instantiated
  , state: state { next = state.next + Array.length names }
  }
  where
  instantiated mark = case mark of
    MarkVariable name → maybe mark metaOf (Array.elemIndex name names)
    _ → mark
  metaOf index = MarkMeta (state.next + index)

-- A local annotation's marks (lambda parameters), design §3.4: each unwritten
-- mark is a fresh meta, because locals are inferred from their uses; a
-- written `nofail` or `nofail(k)` stays. Each handler type gets a clause row
-- C of its own beside the inference row R: R's labels with marks of their
-- own and a fresh tail. Only a handler type outside another handler type's
-- row does, so the type stays one tree per level of nesting (a copy of R
-- at every level doubled the work, review C1); a nested type's C is never
-- consumed, which keeps that sound.
localMarks ∷ State → Ty Open → Threaded (Ty Open)
localMarks state ty = { value: snd made, state: state { next = fst made } }
  where
  Supply run = freshType true ty
  made = run state.next

next ∷ Supply Int
next = Supply taken
  where
  taken count = Tuple (count + 1) count

freshMark ∷ Mark → Supply Mark
freshMark mark = case mark of
  Plain → MarkMeta <$> next
  _ → pure mark

-- `outside`: not inside a handler type's rows.
freshType ∷ Boolean → Ty Open → Supply (Ty Open)
freshType outside = case _ of
  TData id arguments rows → TData id <$> traverse (freshType outside) arguments
    <*> traverse (freshRow outside) rows
  THandler label rows → THandler <$> freshLabel outside label
    <*> handlerRows outside rows
  arrow@(TFun _ _ _) → arrowType outside arrow
  leaf → pure leaf

-- Along the spine by a loop: parameters, then rows, then the result.
arrowType ∷ Boolean → Ty Open → Supply (Ty Open)
arrowType outside arrow = rebuilt
  <$> traverse (freshType outside)
    found.parameters
  <*> traverse (freshRow outside) (rowsOf arrow)
  <*> freshType outside found.result
  where
  found = spine arrow
  rebuilt parameters rows result = Array.foldr stage result
    (Array.zip parameters rows)
  stage pair rest = TFun (fst pair) (snd pair) rest

freshRow ∷ Boolean → TyRow Open → Supply (TyRow Open)
freshRow outside row@(Row labels tail) =
  if Array.null labels then pure row
  else flip Row tail <$> traverse (freshLabel outside) labels

freshLabel ∷ Boolean → Label (Ty Open) → Supply (Label (Ty Open))
freshLabel outside (Label effect arguments mark) = Label effect
  <$> traverse (freshType outside) arguments
  <*> freshMark mark

handlerRows
  ∷ Boolean → HandlerRows (Ty Open) Open → Supply (HandlerRows (Ty Open) Open)
handlerRows outside rows =
  if outside then withClauses <$> inference <*> inference <*> (Hole <$> next)
  else onlyInference <$> inference
  where
  inference = freshRow false rows.inference
  onlyInference found = rows { inference = found }
  withClauses found copy hole =
    { inference: found, clauses: Just (clausesOf copy hole) }
  -- C keeps no label arguments (Task 7 ruling): a written type has no
  -- bindings, so an empty substitution reads the `Fail` payload heads.
  clausesOf (Row labels _) hole = Row (map (bareLabel empty) labels)
    (Just hole)

-- A handler literal's handled label has a fresh mark meta m (design §3.4),
-- so it unifies with whatever its context writes; Console stays N.
literalMark ∷ Int → Label (Ty Open) → Label (Ty Open)
literalMark meta label@(Label effect _ _) =
  withMark (normalMark effect (MarkMeta meta)) label

-- Opening at a function's use (design §3.4, P5), for handler types, which
-- unify by equality: a handled label in a top-level parameter that is
-- written M, and one in the top-level result written N, each become a fresh
-- mark meta. Nothing deeper is opened, and Console and Fail stay as they
-- are.
openHandlers
  ∷ State
  → Array (Ty Open)
  → Ty Open
  → Threaded { fields ∷ Array (Ty Open), result ∷ Ty Open }
openHandlers state fields result =
  { value: { fields: opened.value, result: closing.value }
  , state: state { next = closing.accum }
  }
  where
  opened = mapAccumL (openAs Plain) state.next fields
  closing = openAs NoFail opened.accum result

-- The handler type's handled label opened if it carries `written`.
openAs ∷ Mark → Int → Ty Open → { accum ∷ Int, value ∷ Ty Open }
openAs written count = case _ of
  THandler (Label effect arguments mark) rows
    | isUser effect && mark == written →
        { accum: count + 1
        , value: THandler (Label effect arguments (MarkMeta count)) rows
        }
  other → { accum: count, value: other }

isUser ∷ EffectRef → Boolean
isUser = case _ of
  UserEffect _ → true
  _ → false
