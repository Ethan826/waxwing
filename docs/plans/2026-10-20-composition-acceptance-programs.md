# Waxwing composition: programs for author review

Date: 2026-10-20.
Status: author-reviewed acceptance direction, not an implementation spec.
No replacement implementation is authorized by this document.

Read each program as a question about the language you want to use.
Expected outcomes express the intended experience, not claims that the
current compiler accepts or executes these programs. Each numbered
program is independent; snippets within one number share declarations.
Examples use current surface conventions where possible. Proposed library
operations and language extensions are identified explicitly.

The focus is record composition, inference, services and typed failures.
This is not a proposal to redesign HKTs, classes, modules or schemas here.

## 1. Use a small part of a larger value

~~~waxwing
fn greeting(person: { name: Text, ...r }): Text =
  "Hello, ${person.name}!";

fn main(): Text =
  greeting({ name: "Ada", age: 36, active: true });
~~~

Proposed outcome: accept; return "Hello, Ada!".

A function asks for the fields it uses. Additional fields are permitted.
No conversion, wrapper declaration, or annotation at the call is needed.

Negative control: greeting({ age: 36 }) is rejected for missing name.

Author question: is this the baseline record experience you expect?
Recommendation: yes, required.

## 2. Add information while preserving the rest

~~~waxwing
fn mark(p: { ...r }): { reviewed: Bool, ...r }
  where r lacks { reviewed } =
  { ...p, reviewed: true };

fn main(): Text = {
  let marked = mark({ name: "Ada", age: 36 });
  marked.name
};
~~~

Proposed outcome: accept; return "Ada". Both name and age survive.
The result's type retains the original field types.

Negative control: passing a record that already has reviewed is rejected
by this explicitly fresh-field operation.

This does not decide whether general spread syntax overrides fields.
The written lacks clause makes this operation deliberately fresh.

Author question: acceptable constraint in a reusable library signature?
Recommendation: yes; ordinary callers should not repeat the constraint.

## 3. Combine independently known pieces

~~~waxwing
fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s =
  { ...a, ...b };

fn main(): Text = {
  let person = join({ name: "Ada" }, { age: 36 });
  person.name
};
~~~

Proposed outcome: accept; return "Ada"; preserve age too.
For disjoint inputs, exchanging a and b preserves the record's fields and
types. Equivalent groupings of three disjoint pieces should work too.

The name join is an example library name, not a naming decision.
Its explicit disjoint contract avoids deciding the default spread policy.

Author question: must this work without caller annotations?
Recommendation: yes, required.

## 4. Infer a uniquely determined split from constraints

~~~waxwing
fn acceptsParts(p: { ...r, ...s }): Bool
  where s lacks { admin } =
  true;

fn main(): Bool =
  acceptsParts({ admin: false });
~~~

Proposed outcome: accept; return true. For this concrete argument, admin
belongs to r and s is empty. The caller writes no row arguments.

The body deliberately ignores p: this is a small test of whether a public
interface can be called, independent of a particular algorithm.

Why it matters: callers should be able to use a valid library interface
without changing its declaration or naming inaccessible type variables.

Negative control: if both r and s lack admin, reject the same argument.

Author question: should constraint facts be used to infer this placement?
Recommendation: yes, required. This reverses the accepted O4 limitation.

## 5. Compose functions without redundant adapter lambdas

~~~waxwing
fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s =
  { ...a, ...b };

fn composeRequirements(
  make: (a, b) -> { x: Int, y: Int },
  use: (a, b) -> Int
): Int = 0;

fn restricted(p: { ...u }, q: { ...v }): Int
  where u lacks { y }, v lacks { x } =
  0;

fn main(): Int =
  composeRequirements(join, restricted);
~~~

Proposed outcome: accept; return 0.

The common parameter types connect the two callbacks. The result requires
x and y. The first input cannot hold y, and the second cannot hold x.
Therefore the first supplies x and the second supplies y.

The callback bodies are intentionally trivial: they isolate compatibility
of independently written interfaces.

The following should remain a valid explicit spelling, not a required fix:

~~~waxwing
fn main(): Int =
  composeRequirements(
    fn(p: { x: Int }, q) => join(p, q),
    restricted
  );
~~~

Author question: is the direct form a usability requirement?
Recommendation: yes, required. This tightens the current acceptance policy.

## 6. Preserve generic contracts through wrappers

~~~waxwing
fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s =
  { ...a, ...b };

fn forwarded(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s =
  join(a, b);

fn main(): Text = {
  let p = forwarded({ name: "Ada" }, { age: 36 });
  p.name
};
~~~

Proposed outcome: accept; return "Ada".
A forwarding function preserves the declared row relationship.
It needs no expanded signature listing concrete fields.

Negative control: a wrapper promising fields its implementation does not
supply is rejected.

Author question: should equivalent direct and forwarded calls both work?
Recommendation: yes, required.

## 7. Choose overlapping-field behavior explicitly

Author direction (2026-10-20): require explicitness and use selected
semigroup instances to choose how overlapping fields combine. No silent
left or right winner. Instance-selection and library spelling remain open.

Illustrative API, not selected class syntax or an existing function:

~~~waxwing
fn main(): Int = {
  let defaults = { port: 8080, debug: false };
  let settings = mergeWith(
    { port: last },
    defaults,
    { port: 9090 }
  );
  settings.port
};
~~~

Intended outcome: return 9090; preserve debug. Here last selects the
right-hand value for port only. It is not a last-value instance for the
whole record, which would discard debug with the left record.

The same field could instead select first, addition, maximum, or another
appropriate lawful instance. With several overlaps, explicitly chosen
instances may differ per field. A constructed dictionary can be named and
reused; the programmer need not repeat it at every internal merge.

Working interpretation: ordinary spread rejects overlap unless a policy is
explicitly supplied through a separate operation. This follows the request
for explicitness, rather than settling the syntax of that operation.

Negative controls: an overlapping field without selected behavior is an
error; an Int field and a Text field cannot silently combine under an
ordinary semigroup instance. Its combine operation takes two values of the
same type and returns that type. Type-changing replacement would need a
separate explicit design, or prior conversion to a common domain type.

Disjoint record combination and heterogeneous record merging are not
thereby ordinary Semigroup instances. The selected field operations have
semigroup laws; a general record-merge API still needs its own typing.

## 8. Decide how reusable a local helper should be

~~~waxwing
fn main(): Int = {
  let getName = fn(p) => p.name;
  let first = getName({ name: "Ada", age: 36 });
  let second = getName({ name: "Grace", active: true });
  0
};
~~~

Choice A: accept, inferring one reusable row-polymorphic local helper.
This proposes local generalization beyond today's monomorphic let.

Choice B: require a named generic declaration:

~~~waxwing
fn getName(p: { name: Text, ...r }): Text = p.name;

fn main(): Int = {
  let first = getName({ name: "Ada", age: 36 });
  let second = getName({ name: "Grace", active: true });
  0
};
~~~

Both forms call the helper at different record layouts. There is no
requirement to infer polymorphic recursion or arbitrary higher-rank types.

Recommendation: prefer A as the desired experience; accept B as a visible
early-release restriction only if you knowingly choose it. Evaluate the
interaction with effects before selecting the generalization policy.

## 9. Fulfill a service in layers, and replace it in a test

~~~waxwing
type User = User(Text);

effect Users {
  fn find(id: Int): User;
};

effect Database {
  fn fetchName(id: Int): Text;
};

effect Log {
  fn write(message: Text): Unit;
};

fn profile(id: Int): User with Users =
  Users.find(id);

fn withRepository(
  action: (Unit) -> a with Users + ...e
): a with Database + Log + ...e =
  with handler Users {
    find(id) => {
      Log.write("loading a user");
      User(Database.fetchName(id))
    }
  } {
    action(())
  };

fn main(): User =
  with handler Database {
    fetchName(id) => "Ada"
  } {
    with handler Log {
      write(message) => ()
    } {
      withRepository(fn(_) => profile(7))
    }
  };
~~~

Proposed outcome: accept; return User("Ada").

The business function needs Users. The repository implementation fulfills
Users using Database and Log. The outer boundary fulfills those services.
Other effects of action pass through the wrapper unchanged.

An independent test can replace Users directly:

~~~waxwing
fn testProfile(): User =
  with handler Users {
    find(id) => User("Test user")
  } {
    profile(7)
  };
~~~

Proposed outcome: accept; return User("Test user"), without Database or Log.

Negative control: invoking profile without providing Users is rejected.
A wrapper that unexpectedly needs another service must expose it.

Author question: does this express the layered dependency fulfillment you
want, including the explicit handler wrapper? Recommendation: required
semantics; surface spelling remains reviewable.

## 10. Compose failures, then remove only the handled family

~~~waxwing
type MissingUser = MissingUser(Int);
type Denied = Denied;

fn lookup(id: Int): Text with Fail(MissingUser) =
  if id == 0 then Fail.fail(MissingUser(id))
  else "Ada";

fn authorize(allowed: Bool): Unit with Fail(Denied) =
  if allowed then () else Fail.fail(Denied);

fn greeting(id: Int, allowed: Bool): Text
  with Fail(MissingUser) + Fail(Denied) = {
    authorize(allowed);
    lookup(id)
  };

fn guestGreeting(id: Int, allowed: Bool): Text
  with Fail(Denied) =
  handle greeting(id, allowed) {
    fail(error: MissingUser) => "Guest"
  };

fn main(): Text =
  handle guestGreeting(0, true) {
    fail(error: Denied) => "Forbidden"
  };
~~~

Proposed outcome: accept; return "Guest".
The inner handler removes MissingUser, leaving Denied.
With main calling guestGreeting(1, false), return "Forbidden".

No wrapper error type is needed just to compose the functions.
A handler removes an entire failure family; constructor-by-constructor
subtraction from one ADT is not required by this example.

Negative control: declaring guestGreeting pure while leaving Denied
unhandled is rejected.

Author question: does this meet the error-composition requirement?
Recommendation: yes, required.

## 11. Extend one input independently, at different field types

Added 2026-10-20 after the second assessment's review (author's
direction: preserve this behavior).

~~~waxwing
fn both(q: { ...r }): Int where r lacks { a } = {
  let first = { ...q, a: 1 };
  let second = { ...q, a: true };
  0
};

fn main(): Int = both({ name: "Ada" });
~~~

Required outcome: accept; return 0. There is no ambiguity about `q`: it
has no `a`. The two new records independently add `a` at different
types. The same holds for an unannotated helper and for a merge with two
spreads:

~~~waxwing
fn main(): Int = {
  let both = fn(q) => {
    let first = { ...q, a: 1 };
    let second = { ...q, a: true };
    0
  };
  both({ name: "Ada" })
};
~~~

~~~waxwing
fn main(): Int = {
  let f = fn(q) => {
    let m1 = { ...{ a: 1 }, ...q };
    let m2 = { ...{ a: true }, ...q };
    0
  };
  f({ b: 1 })
};
~~~

Negative control: `both({ name: "Ada", a: 2 })` is rejected (`r lacks {
a }`).

Why it matters: a foundation that gives a field one type wherever
records are joined (Simon 2014, as translated in the foundation
assessment §4.3) refuses this; rejecting it would be a surprising
restriction on structural records.

## Author response (2026-10-20)

- Programs 1, 3, 4, 5, 6, 9 and 10: agreed.
- Program 2: tentative agreement, with a question about the repeated row
  variable. Clarification: r denotes the same unchanged remainder on both
  sides. The input lacks reviewed; the result adds reviewed explicitly.
  It is not a variable that means different fields in input and output.
- Program 7: explicit behavior selected through semigroup instances, as
  elaborated above. Exact API and instance syntax are not selected.
- Program 8: agreed to the preferred local-polymorphic-helper experience;
  no named-helper-only early-release exception was accepted in the reply.

These are usability requirements for evaluating established foundations.
Programs 4 and 5 are no longer to be dismissed as accepted annotation
burdens or O4 limitations. Program 8 is a requested capability beyond the
current monomorphic let. No new inference rules or replacement compiler
implementation are authorized here.

For program 2, expanding the row makes the contract explicit:

~~~text
r      = { name: Text, age: Int }
input  = { name: Text, age: Int }
output = { reviewed: Bool, name: Text, age: Int }
~~~

An inverse operation could take { reviewed: Bool, ...r } and return
{ ...r }; r would again mean exactly the same remainder. A descriptive
name such as ...rest can replace ...r without changing the contract.

After review, required programs become acceptance cases for candidate
existing calculi and implementations. Compare the actual code and inferred
contracts; do not substitute solver stress counts for this review.

## Relationship to current work

The baseline record and effect features already have implementations.
The multi-spread surface and its integration are in flight. Programs 4
and 5 intentionally ask for more inference than the adopted solver
provides; program 8A asks for a change to local generalization. Program 7
records explicit instance-selected composition. No programs in this
document were executed as a new verification suite.

Source references:
- docs/plans/2026-10-19-row-merge-limitations.md
- docs/plans/2026-10-19-row-merge-proposals.md
- docs/plans/2026-10-19-row-merge-implementation-plan.md
- docs/plans/2026-10-10-modules-and-instance-selection-direction.md
- docs/language.md
