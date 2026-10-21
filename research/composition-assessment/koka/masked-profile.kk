effect users
  fun find(id : int) : string

effect database
  fun fetchName(id : int) : string

effect log
  fun write(msg : string) : ()

fun profile(id : int) : users string
  find(id)

fun repository(action : () -> <users,database,log|e> a) : <database,log|e> a
  with handler
    fun find(id)
      write("repository: loading user " ++ id.show)
      "User(" ++ fetchName(id) ++ ")"
  action()

// Spelling M: the callback's row is Users + e; its other operations are
// injected past the layer the repository uses.
fun repository-masked(action : () -> <users|e> a) : <database,log|e> a
  with handler
    fun find(id)
      write("repository: loading user " ++ id.show)
      "User(" ++ fetchName(id) ++ ")"
  mask<database>{ mask<log>{ action() } }

// The callback uses Log and Database itself, besides Users.
fun busy() : <users,database,log> string
  write("callback: starting")
  val extra = fetchName(99)
  write("callback: fetched " ++ extra)
  profile(7)

fun logged(tag : string, action : () -> <log,console|e> a) : <console|e> a
  with handler
    fun write(msg) println("  [" ++ tag ++ " log] " ++ msg)
  action()

fun names(tag : string, action : () -> <database|e> a) : e a
  with handler
    fun fetchName(id) tag ++ "-name-" ++ id.show
  action()

fun main()
  println(names("db", { logged("main", { repository-masked(fn() profile(7)) }) }))
