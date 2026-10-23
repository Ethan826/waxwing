// Test-only tokens (ruling R11: Task 5.1 creates this module, Task 4.1
// extends it). Production cannot make a `TheoremRef` or a `SoundRule`:
// their constructors are in Domain.Verdict.Theorem.Internal and
// Features.Check.Refute.Rules.Internal, which only the trusted modules
// import (scripts/structure.mjs). Tests mint them through those modules'
// compiled JS. `stubsFrom` takes a loader and loads nothing itself, so a
// regression probe mints through the clone's output only
// (`context.compilerPath`).
export const stubsFrom = async load => {
  const Theorem = await load('Domain.Verdict.Theorem.Internal');
  const Rule = await load('Features.Check.Refute.Rules.Internal');
  // A `RuleName` is a newtype, so its compiled form is the string.
  const soundRule = (name, theorem, apply) =>
    new Rule.SoundRule({ name, theorem, apply });
  return { theoremRef: name => new Theorem.TheoremRef(name), soundRule };
};
