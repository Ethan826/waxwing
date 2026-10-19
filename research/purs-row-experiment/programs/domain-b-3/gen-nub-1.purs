module Mdomainb3gennub1 where

import Prim.Row (class Union, class Nub, class Lacks, class Cons)

data P (r :: Row Type) = P
data S (l :: Symbol) = S
data U = U

merge :: forall r s t. Union r s t => Nub t t => P r -> P s -> P t
merge _ _ = P

disj :: forall r s t. Union r s t => Nub t t => P r -> P s -> U
disj _ _ = U

ext :: forall l r o. Cons l U r o => Lacks l r => S l -> P r -> P o
ext _ _ = P

same :: forall r. P r -> P r -> U
same _ _ = U

lack :: forall l r. Lacks l r => S l -> P r -> U
lack _ _ = U

test m0 m1 m2 m3 =
  [ same (merge m0 m1) (merge m0 m2)
  , lack (S :: S "a") m2
  , same m1 (ext (S :: S "a") (merge m0 m3))
  ]
