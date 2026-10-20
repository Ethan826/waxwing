module Features.Check.MergeLiteral (mergeLiteral) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (foldM)
import Data.Map as Map
import Data.Maybe (Maybe(..), isJust, maybe)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open(Hole))
import Domain.Checked.Internal as Checked
import Domain.Problem (DuplicateKind(..), Problem(..))
import Domain.Syntax (Diagnostic, NoteReason(..), Span, problemAt)
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.Context (CheckEnv)
import Features.Check.Disjoint (requireDisjoint)
import Features.Check.FreshRecord (freshRest)
import Features.Check.Lacked (refusedAt)
import Features.Check.OriginStore (onOrigins)
import Features.Check.Overlap (Added)
import Features.Check.PartOrigin (itemsAt)
import Features.Check.Require (bounded, expectType, typeName)
import Features.Check.RowMerge.Chain (desugaredWith)
import Features.Check.RowMerge.Merge (Row)
import Features.Check.RowMerge.Occurrence (nextPredicate)
import Features.Check.RowStore (Because(..), Lack)
import Features.Check.Scheme
  ( State
  , Threaded
  , flexible
  , opened
  , resolved
  , threadAll
  )
import Features.Check.Subst (Flex(..), Subst)
import Features.Check.UnifyFailure (Failure(..), Refusal(..))

type Checked a = Either Diagnostic (Threaded a)

-- One item of the literal as a row: a field's, or a spread's type as the
-- substitution has it. `value` is a spread's expression (R8's `comes from
-- here`); `field`, whether the item is a field.
type Piece =
  { span ∷ Span, value ∷ Maybe Span, row ∷ Row, field ∷ Boolean }

-- R005 Tranche B Task 7 (design draft 3 §1.4; plan §2.1): a literal of
-- two or more spreads, its items checked already in written order. Each
-- spread must be a record (a hole becomes `{ ...ρ }`); every two items,
-- in written order, are required disjoint for the reason `Spread` (D2',
-- D3, D3', D3''); the result holds every item's fields and tails, its
-- unknown tails made into `Merge` predicates located at the innermost
-- lambda, else at the literal.
mergeLiteral
  ∷ ∀ r. CheckEnv r → State → Span → Array Added → Checked (Ty Open)
mergeLiteral env state span added = do
  pieces ← threadAll (pieceOf env) state added
  apart ← foldM (paired env pieces.value) pieces.state.subst
    (pairsOf (Array.length pieces.value))
  joined env site pieces.value (pieces.state { subst = apart })
  where
  site = maybe span identity env.lambda

pieceOf ∷ ∀ r. CheckEnv r → State → Added → Checked Piece
pieceOf env state added = case added.given of
  Just (Tuple label ty) → Right
    { value: fieldPiece label ty, state }
  Nothing → spreadPiece env state added
  where
  fieldPiece label ty =
    { span: added.span
    , value: Nothing
    , row: recordRow [ Tuple label (flexible ty) ] []
    , field: true
    }

-- A spread's type, under the substitution, is a record; a hole becomes
-- `{ ...ρ }` (ρ fresh: what it must lack is required pairwise below).
spreadPiece ∷ ∀ r. CheckEnv r → State → Added → Checked Piece
spreadPiece env state added = do
  bounded state ty added.span
  case resolved state.subst ty of
    TRecord row → Right { value: piece (flexible (TRecord row)), state }
    TVar (Hole _) → fromHole unit
    other → notRecord other
  where
  value = map Checked.spanOf (spreadValue added)
  ty = maybe (TRecord (recordRow [] [])) Checked.typeOf
    (spreadValue added)
  fresh = freshRest state []
  fromHole _ = do
    reached ← expectType env fresh.state ty fresh.record added.span
    pure { value: piece (flexible fresh.record), state: reached }
  piece found =
    { span: added.span, value, row: rowOf found, field: false }
  notRecord other = do
    name ← typeName env added.span other
    Left (problemAt (ExpectedRecord name) added.span)

spreadValue ∷ Added → Maybe Checked.Expr
spreadValue added = case added.item of
  Checked.Spreading found → Just found
  Checked.Given _ → Nothing

rowOf ∷ Ty Flex → Row
rowOf = case _ of
  TRecord row → row
  _ → recordRow [] []

-- Every two items, the earlier first, but no two fields (Resolve refused
-- a label written twice).
pairsOf ∷ Int → Array (Tuple Int Int)
pairsOf count = do
  earlier ← Array.range 0 (count - 2)
  later ← Array.range (earlier + 1) (count - 1)
  pure (Tuple earlier later)

-- Two items' rows required disjoint for the reason `Spread`. A label both
-- already hold is D2' at the later item (Tranche A's form); a rigid tail
-- that may hold a field is D3'' at the field; any other refusal at the
-- later item.
paired
  ∷ ∀ r
  . CheckEnv r
  → Array Piece
  → Subst
  → Tuple Int Int
  → Either Diagnostic Subst
paired env pieces subst (Tuple one other) =
  case Array.index pieces one, Array.index pieces other of
    Just earlier, Just later
      | earlier.field && later.field → Right subst
      | otherwise → either (refused earlier later) Right
          ( requireDisjoint { failed: unexpected } (lack earlier later) subst
              earlier.row
              later.row
          )
    _, _ → Right subst
  where
  lack earlier later =
    { because: Spread { earlier: earlier.span, later: later.span }
    , from: Nothing
    }
  unexpected _ = Left (Unexpected "a literal's items refused as a shape")
  refused earlier later = case _ of
    Refused (Repeated label items) → Left
      { problem: Duplicate DuplicateField label
      , span: items.later
      , related: [ { span: items.earlier, reason: FirstWrittenHere } ]
      }
    Refused found@(MayHold _ _ _) → Left
      (refusedAt env subst (fieldSpan earlier later) found)
    Refused found → Left (refusedAt env subst later.span found)
    _ → Left (problemAt (Internal "a literal's items failed") later.span)
  fieldSpan earlier later = if earlier.field then earlier.span else later.span

-- The result: every item's fields and tails, its unknown tails desugared
-- (each part paired with the one before it in the chain for the reason
-- of their two items), each part's expression recorded.
joined
  ∷ ∀ r. CheckEnv r → Span → Array Piece → State → Checked (Ty Open)
joined env site pieces state =
  either failed made
    ( desugaredWith { failed: unexpected } (Just site) reasonOf written
        state.subst
    )
  where
  written = recordRow (Array.concatMap fieldsOf pieces)
    (Array.concatMap tailsOf pieces)
  fieldsOf piece = piece.row.fields
  tailsOf piece = piece.row.tails
  first = nextPredicate state.subst
  made found =
    Right
      { value: opened (TRecord found.row)
      , state: state
          { subst = onOrigins (itemsAt first (itemSpans pieces)) found.subst }
      }
  unexpected _ = Left (Unexpected "a literal's parts refused as a shape")
  failed = case _ of
    Refused found → Left (refusedAt env state.subst site found)
    _ → Left (problemAt (Internal "a literal's parts failed") site)
  metas = Array.filter isMeta written.tails
  reasonOf part = itemReason site pieces (previous part) part
  previous part = maybe part identity
    (Array.index metas =<< map (_ - 1) (Array.elemIndex part metas))

-- `Spread` between the items of two parts, the earlier in written order
-- first (a part's item: the spread whose row holds it; every part has
-- one, the literal's span standing in otherwise).
itemReason ∷ Span → Array Piece → Flex → Flex → Lack
itemReason literal pieces one other =
  { because: Spread
      { earlier: min (itemOf one) (itemOf other)
      , later: max (itemOf one) (itemOf other)
      }
  , from: Nothing
  }
  where
  itemOf part = maybe literal spanOf (Array.find (holding part) pieces)
  holding part piece = Array.elem part piece.row.tails
  spanOf piece = piece.span

-- Each unknown part's spread expression.
itemSpans ∷ Array Piece → Map.Map Int Span
itemSpans pieces = Map.fromFoldable (Array.concatMap entries pieces)
  where
  entries piece = maybe [] (spansOf piece) piece.value
  spansOf piece span = Array.mapMaybe (entry span) piece.row.tails
  entry span = case _ of
    Meta meta → Just (Tuple meta span)
    Rigid _ → Nothing

isMeta ∷ Flex → Boolean
isMeta = isJust <<< metaOf
  where
  metaOf = case _ of
    Meta meta → Just meta
    Rigid _ → Nothing
