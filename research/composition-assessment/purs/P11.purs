module P11 where

import Prim.Row (class Cons, class Lacks)

data R (r :: Row Type) = R
data L (l :: Symbol) = L

insert :: forall l t r rr. Lacks l r => Cons l t r rr => L l -> t -> R r -> R rr
insert _ _ _ = R

both :: forall r. Lacks "a" r => R r -> Int
both q = go (insert (L :: L "a") 1 q) (insert (L :: L "a") true q)
  where
  go :: forall x y. R x -> R y -> Int
  go _ _ = 0

main :: Int
main = both (R :: R (name :: Int))
