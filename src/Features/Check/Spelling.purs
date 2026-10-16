module Features.Check.Spelling (Key, key, spelling, isData) where

import Prelude
import Data.Maybe (maybe')
import Data.String.Common (joinWith)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Resolved (TypeId(..))
import Domain.Type (Ty(..))
import Domain.Type.Parts (children)

-- An application with its variables forgotten: rigid variables and holes
-- are one abstract type to coverage (design §5), so `List(a)` in every
-- function and `List(_)` share one key.
type Key = Ty Unit

key ∷ Ty Open → Key
key = map forget
  where
  forget _ = unit

-- A key's canonical text, the map key for its number. Comparing two
-- spellings is one native string comparison; comparing two keys walked
-- both through Ord dictionaries, and with applications nested a thousand
-- deep that comparison was nearly all of checking (P001 final fix). An
-- arrow is `f(` its parameters and final result `)`, which no data
-- application's spelling (a number first) can be.
spelling ∷ Key → String
spelling = case _ of
  TInt → "i"
  TBool → "b"
  TUnit → "u"
  TText → "t"
  TVar _ → "v"
  TData (TypeId id) arguments _ → show id <> "("
    <> joinWith "," (map spelling arguments)
    <> ")"
  arrow@(TFun _ _ _) → "f(" <> joinWith "," (map spelling (children arrow))
    <> ")"
  TRecord row → "r(" <> joinWith "," (map fieldSpelling row.fields)
    <> maybe' (const "") (const ",..") row.tail
    <> ")"
  handler@(THandler _ _) → "h("
    <> joinWith ","
      (map spelling (children handler))
    <> ")"
  where
  fieldSpelling (Tuple label ty) = label <> ":" <> spelling ty

isData ∷ Key → Boolean
isData = case _ of
  TData _ _ _ → true
  _ → false
