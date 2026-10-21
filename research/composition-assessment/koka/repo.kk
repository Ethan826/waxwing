effect users
  fun find(id : int) : string

effect database
  fun fetchName(id : int) : string

effect log
  fun write(msg : string) : ()

fun profile(id : int) : users string
  find(id)

// The program as written: the callback's row is Users plus e only.
fun with-repository(action : () -> <users|e> a) : <database,log|e> a
  with handler
    fun find(id)
      write("loading a user")
      "User(" ++ fetchName(id) ++ ")"
  action()

fun main()
  with handler
    fun fetchName(id) "Ada"
  with handler
    fun write(msg) println("[log] " ++ msg)
  println(with-repository(fn() profile(7)))
