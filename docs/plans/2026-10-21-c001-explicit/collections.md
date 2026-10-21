# Proposed instance-sensitive collection contracts

Status: proposed API and examples, no collection implementation. `DictMap`,
`OrderedMap` and all functions below are illustrative library interfaces.
They require abstract representations; the acceptance semantics can be
modelled by association lists and rebuilt sorted lists without a module
system or record-composition solver. Production abstraction waits for a
separate library/M001 decision. Class versus record evidence is still open.

## Retention, compatibility and rebuilding

A DictMap stores its Eq dictionary with its entries. Lookup and update
always use that retained value and accept no replacement dictionary. An
OrderedMap similarly stores its Ord dictionary. Its key equivalence is
`compare(x,y) = Equal`; it takes no independent Eq operand. A lookup that
requires Eq can explicitly adapt that Ord. Equality of all ordering results
is sufficient for reusing ordered structure; equality of key equivalence
alone is insufficient when the traversal order changes.

No dictionary equality test is offered. Same carrier type, class ID, method
code address, or constructor name establishes no compatibility between two
values; closures can capture different policies. Distinct dictionary
addresses also do not establish incompatibility. Behavioral compatibility
quantifies over keys, and cannot be inferred by comparing a few samples.

The bounded contract offers these operations:

```text
fromEntries(eq, entries, onCollision): DictMap(k,v)
lookup(map, key): Maybe(v)
put(map, key, value): DictMap(k,v)
entries(map): List(Pair(k,v))
rebuildInto(destinationEq, entries, onCollision): DictMap(k,v)
combineInto(destinationEq, left, right, onCollision): DictMap(k,v)
```

`onCollision(old,new)` is an explicitly supplied pure function; it need not
be associative. Construction traverses entries left to right. On a collision
it keeps the first key representative and replaces its value with
`onCollision(old,new)`. `put` replaces the existing value and keeps the
existing representative; a missing key appends a new entry. Inputs remain
unchanged. If its policy terminates, lookup returns Maybe and raises no
missing-key exception. Entry enumeration for a DictMap is first-insertion
order; OrderedMap enumeration is increasing under its retained comparison.
Delete, if later added, must also retain that policy.

`combineInto` enumerates left then right and inserts every surviving entry
into a fresh destination under the destination dictionary. It never splices
an old tree or trusts source uniqueness under the new policy. The ordered
variant uses destination Ord and rebuilds all ordering structure. This
permits combination of arbitrary source policies without asserting they are
compatible. Its result can collapse keys, and cannot recover keys or values
already collapsed in either source.

A raw `merge(left,right)` that reuses sorted structure is unavailable in
this API. A future compatible-policy witness or abstract family type could
admit structural merge, subject to its own typing and preservation account.
Even reusing the same dictionary value establishes a useful invariant only
if its behavior is stable and lawful. Pure functions can diverge; the
structural map invariant assumes terminating lawful equality or ordering on
relevant keys. Type safety alone guarantees neither lookup results nor
termination.

## C1: equality changes lookup and update

All code blocks are proposed pseudocode. For this example keys are Text
restricted by the test generator to ASCII letters. `asciiFold` maps A-Z to
a-z and preserves other ASCII characters. It is an illustrative helper, not
a Unicode case-folding or standard-library proposal.

```text
exact = make Eq<Text> { equal = textEqual }
folded = make Eq<Text> { equal = foldedEqual }
foldedEqual(x,y) = textEqual(asciiFold(x),asciiFold(y))

a = fromEntries(exact, [("A",1),("a",2)], takeLast)
b = fromEntries(folded, [("A",1),("a",2)], takeLast)
lookup(a,"A") = Just(1)
lookup(a,"a") = Just(2)
lookup(b,"A") = Just(2)
lookup(b,"a") = Just(2)
entries(b) = [("A",2)]
entries(put(a,"a",9)) = [("A",1),("a",9)]
entries(put(b,"a",9)) = [("A",9)]
```

`lookup(a,folded,"a")` and `put(a,folded,"a",9)` must fail arity/type
checking. Relabelling a's entries as folded would leave two equivalent keys.
Dictionary retention prevents accidental replacement during a single
operation, while rebuilding addresses cross-instance combination.

## C2: explicit destination and collisions

```text
right = fromEntries(exact, [("a",10),("B",20)], takeLast)
combineInto(folded,a,right,add)
  = [("A",13),("B",20)] under folded
combineInto(folded,a,right,takeLast)
  = [("A",10),("B",20)] under folded
combineInto(exact,a,right,add)
  = [("A",1),("a",12),("B",20)] under exact
rebuildInto(exact,entries(b),takeLast)
  = [("A",2)] under exact
```

The first result combines values 1, 2 and 10 in that order. The final
conversion does not restore the missing lowercase key or original value. Use
a non-associative collision function in a future test to detect
reassociation, and swap inputs to detect order changes. No law-dependent
parallel reduction or merge optimization is licensed.

## C3: ordering changes structure without changing equality

```text
up = make Ord<Int> { compare = ascendingInt }
down = reverseOrd(up)
u = orderedFrom(up, [(1,"one"),(2,"two"),(3,"three")], takeLast)
d = orderedFrom(down, [(1,"uno"),(2,"dos"),(3,"tres")], takeLast)
orderedEntries(u) = [(1,"one"),(2,"two"),(3,"three")]
orderedEntries(d) = [(3,"tres"),(2,"dos"),(1,"uno")]
orderedLookup(u,2) = Just("two")
orderedLookup(d,2) = Just("dos")
orderedLookup(orderedPut(d,2,"TWO"),2) = Just("TWO")
orderedCombineInto(up,u,d,takeLast)
  = [(1,"uno"),(2,"dos"),(3,"tres")] under up
```

Both policies equate exactly the same keys. A balanced search tree built
under ascending order can have root 2, left 1, right 3. Reinterpreting that
tree under descending order searches left for 3 and can miss it. Retaining
down in the other operand does not repair a raw structural merge into up.
Ordering compatibility must include direction, not just key equality.

## C4: cross-module transfer without a module design

These names describe boundaries, not proposed import/export syntax:

```text
Package A produces exactMap : DictMap(Text,Int)
Package B produces foldedMap : DictMap(Text,Int)
Client calls lookup(exactMap,"A") with A's retained policy
Client calls lookup(foldedMap,"a") with B's retained policy
Client calls combineInto(clientEq,exactMap,foldedMap,add)
```

The client supplies the destination dictionary explicitly; source policies
travel with their values. No package-owned instance is silently selected
from the carrier type. Publicly exposing raw constructors would invalidate
this invariant. An abstract module interface, or a private ADT inside the
future collection library, must enforce constructor access. This tranche
states that requirement without designing modules. Serialization must
rebuild with an explicitly supplied policy; a process address cannot be a
portable compatibility witness. Serialization implementation is deferred.

## Alternatives kept open

| Mechanism | What it buys | Cost or remaining obligation |
|---|---|---|
| Retention plus rebuilding (bounded recommendation) | Works with runtime-constructed dictionaries, no equality decision | Rebuild cost; explicit collisions; lost information stays lost |
| Abstract policy family/module type | Can exclude mixed-family structural merges statically | Requires M001 identity/abstraction rules and mapping value construction to families |
| Generative token or branded collection type | Can conservatively prove common construction origin | Needs generation, scope/escape and typing rules; origin is not a proof of laws |
| Runtime identity tag | Can conservatively recognize an unchanged policy allocation | Requires unforgeable association and lifetime discipline; fresh equivalent values may fail |
| Behavioral compatibility proof | Can justify wider structural reuse | No general automatic decision for arbitrary functions; proof interface and trust boundary needed |

No new branding, token, type-level dictionary identity, or policy solver is
selected or invented for this tranche. Rebuilding is a proposed library
contract using ordinary operations. Its local insertion/enumeration
invariant still needs the focused argument in [assurance](assurance.md).
