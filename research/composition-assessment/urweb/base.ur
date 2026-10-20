fun combine [r ::: {Type}] [s ::: {Type}] [r ~ s] (a : $r) (b : $s) : $(r ++ s) =
    a ++ b

fun forwarded [r ::: {Type}] [s ::: {Type}] [r ~ s] (a : $r) (b : $s) : $(r ++ s) =
    combine a b

val p3 = (combine ({Who = "Ada"}) ({Age = 36})).Who

val p6 = (forwarded ({Who = "Ada"}) ({Age = 36})).Who

fun both [r ::: {Type}] [[A] ~ r] (q : $r) : int =
    let
        val first = q ++ {A = 1}
        val second = q ++ {A = True}
    in
        0
    end

val p11 = both ({Who = "Ada"})
