fun combine [r ::: {Type}] [s ::: {Type}] [r ~ s] (a : $r) (b : $s) : $(r ++ s) =
    a ++ b

fun composeRequirements [a ::: {Type}] [b ::: {Type}]
    (make : $a -> $b -> $[X = int, Y = int]) (use : $a -> $b -> int) : int = 0

fun restricted [u ::: {Type}] [v ::: {Type}] [[Y] ~ u] [[X] ~ v]
    (p : $u) (q : $v) : int = 0

val p5 : int = composeRequirements combine restricted
