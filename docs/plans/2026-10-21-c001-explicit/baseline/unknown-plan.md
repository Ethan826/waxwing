# Additional unknown-type probes: frozen scope

Proposed before running these additions: h1 prints an empty List whose
unused element type remains unknown; h2 passes the empty List through a
selected last dictionary and then shows it; h3 compares such a result.
Unlike a1/a2/a4, h1/h2 expose the container to a type-sensitive builtin.
Go's dormant constructor fields also use different zero values/layouts as
the element representation changes, but source code cannot directly read an
inactive payload or fabricate an arbitrary unknown value. No unsafe FFI or
new zero-value operation will be introduced to force that access.

Test existing specializeWith using Int, Bool, Text, a closed record with one
Int field and a pure Int-to-Int function as stand-ins. Predictions: h1/h2
print Nil for the first four and fail printability for the function
stand-in; h3 rejects ambiguous comparison before specialization. Record
exact observed outcomes before adopting them as replay expectations.
Differences in acceptance must remain differences, not be called uniform
behavior. a1/a2/a4 remain acceptance observations, not a strong test of
stand-in independence. No universal theorem or language policy follows.
