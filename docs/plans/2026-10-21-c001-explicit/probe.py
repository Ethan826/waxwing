"""Bounded semantic probe, not a Waxwing compiler or typing oracle.

Frozen cases: selected numeric/value-flow examples from P1-P4,
C1-C2 and demonstrations of policy relabelling and distinct choices.
The Stats check evaluates component results, not record composition.
No generation, completeness claim or Lean.
"""

from dataclasses import dataclass
from operator import add, mul
from typing import Callable


@dataclass(frozen=True)
class Evidence:
    combine: Callable


def fold_from(dictionary, seed, values):
    for value in values:
        seed = dictionary.combine(seed, value)
    return seed


def configured(dictionary):
    def apply_chosen(x, y):
        return fold_from(dictionary, x, [y])
    return apply_chosen


def reverse(dictionary):
    def swapped(x, y):
        return dictionary.combine(y, x)
    return Evidence(swapped)


@dataclass(frozen=True)
class RetainedMap:
    equal: Callable
    pairs: tuple


def insert(equal, pairs, key, value, collision):
    for index, (old_key, old_value) in enumerate(pairs):
        if equal(old_key, key):
            pairs[index] = (old_key, collision(old_value, value))
            return
    pairs.append((key, value))


def build(equal, pairs, collision):
    result = []
    for key, value in pairs:
        insert(equal, result, key, value, collision)
    return RetainedMap(equal, tuple(result))


def lookup(mapping, key):
    for old_key, value in mapping.pairs:
        if mapping.equal(old_key, key):
            return ("Just", value)
    return ("Nothing",)


def last(_old, new):
    return new


def exact(x, y):
    return x == y


def folded(x, y):
    assert x.isascii() and y.isascii()
    return x.lower() == y.lower()


def tree_lookup(compare, tree, key):
    if tree is None:
        return None
    root, value, left, right = tree
    order = compare(key, root)
    if order == 0:
        return value
    return tree_lookup(compare, left if order < 0 else right, key)


sum_d, product_d, last_d = Evidence(add), Evidence(mul), Evidence(last)
assert [fold_from(d, 2, [3, 4]) for d in
        [sum_d, product_d, last_d]] == [9, 24, 4]
assert fold_from(reverse(last_d), 2, [3, 4]) == 2
assert (sum_d.combine(2, 3), last_d.combine(10, 20)) == (5, 20)
assert [configured(d)(2, 3) for d in
        [sum_d, product_d, last_d]] == [5, 6, 3]
assert [configured(d)(2, 3) for d in
        [last_d, product_d, sum_d]] == [3, 6, 5]
assert (sum_d.combine(2, 3), product_d.combine(2, 3)) == (5, 6)
print("Selected numeric/value-flow observations from P1-P4: pass")

a = build(exact, [("A", 1), ("a", 2)], last)
b = build(folded, [("A", 1), ("a", 2)], last)
assert (lookup(a, "A"), lookup(a, "a")) == (("Just", 1), ("Just", 2))
assert lookup(b, "A") == lookup(b, "a") == ("Just", 2)
assert b.pairs == (("A", 2),)
assert build(a.equal, a.pairs + (("a", 9),), last).pairs == (
    ("A", 1), ("a", 9))
assert build(b.equal, b.pairs + (("a", 9),), last).pairs == (("A", 9),)
right = build(exact, [("a", 10), ("B", 20)], last)
assert build(folded, a.pairs + right.pairs, add).pairs == (
    ("A", 13), ("B", 20))
assert build(folded, a.pairs + right.pairs, last).pairs == (
    ("A", 10), ("B", 20))
assert build(exact, a.pairs + right.pairs, add).pairs == (
    ("A", 1), ("a", 12), ("B", 20))
assert build(exact, b.pairs, last).pairs == (("A", 2),)
print("C1-C2 retained equality, updates and destination rebuilding: pass")

tree = (2, "two", (1, "one", None, None), (3, "three", None, None))
ascending = lambda x, y: (x > y) - (x < y)
descending = lambda x, y: ascending(y, x)
assert tree_lookup(ascending, tree, 3) == "three"
assert tree_lookup(descending, tree, 3) is None
assert configured(sum_d)(2, 3) != configured(product_d)(2, 3)
print("C3 policy-relabel counterexample misses 3: demonstrated")
print("Sum and product choices yield 5 and 6: demonstrated")
print("Limits: Python model only; no Waxwing parsing, typing or lowering")
