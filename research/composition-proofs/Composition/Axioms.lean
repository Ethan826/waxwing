/-
Axiom dependencies of every headline theorem. Run:
`lake env lean Composition/Axioms.lean`; the output is in axioms.out.
-/
import Composition.Programs

open Composition Composition.Programs

#print axioms c1
#print axioms c2_label
#print axioms c2
#print axioms d7_biased
#print axioms c7a
#print axioms c7b
#print axioms first_c7_false
#print axioms sigFails_iff
#print axioms c10
#print axioms instance_alone_insufficient
#print axioms c11
#print axioms fails_while_satisfiable
#print axioms p3_overlap
#print axioms p4_solved
#print axioms p4_admin_forced
#print axioms p4_split_forced
#print axioms p4_negative
#print axioms p4_no_lacks_two_solutions
#print axioms p5_solved
#print axioms p5_split_forced
#print axioms p5_negative
#print axioms p11
#print axioms p11_negative
#print axioms p6_holds
#print axioms p6_negative_refuted
#print axioms p6_negative_fails
