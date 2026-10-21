# ADR 015: JavaScript first, LLVM next, Go for development

Status: accepted direction (user, 2026-10-20). Backend implementations and
runtime mechanisms require separate designs.

## Context

Go made a practical first target because it is the author's day-job
language. Waxwing's intended audience includes full-stack web developers.
Easy access to common JavaScript libraries is a priority for that audience.
The language's effects and service contracts should work across targets.

## Decision

1. JavaScript is the first-priority production backend to develop. LLVM
   follows for native compilation. Only the Go backend exists today.
2. Go remains a target of convenience during compiler development and
   bootstrapping. It may become disfavored or deprecated once the preferred
   backends meet their needs. It is not deprecated by this decision;
   retirement requires a separate decision and migration plan.
3. JavaScript and WebAssembly are alternative web targets. Wasm is optional
   future work, with no required step between JavaScript and LLVM. A Wasm
   proposal must establish a need that justifies its interop and runtime
   costs for the intended applications.
4. JavaScript planning prioritizes ESM packages and usable typed bindings
   to common libraries. It must address callbacks, asynchronous calls and
   the mapping of foreign errors and cancellation into Waxwing semantics.
   LLVM planning must address layouts, memory management, linking and
   runtime services. Neither design is selected here.
5. Shared IR and language semantics remain independent of the backend.
   Go's scheduler, panic/recover behavior and data representations must not
   decide language rules. Preserve the existing Go backend while this work
   is planned; no compiler migration is authorized here.

## Services and foreign bindings

Use the Effect Platform-style separation already recorded in PKG001:
Waxwing defines a port or service contract, a thin FFI wrapper calls a host
library, and an adapter fulfills the contract. Application assembly selects
an implementation. For example, a Logger contract could be fulfilled by
Pino, Winston, a browser implementation or a test fake, analogous to Nest's
logger integration. Application code can keep using Logger when the chosen
library changes.

Effect Platform and Nest are conceptual precedents. Their runtime or
injection mechanisms are not selected for Waxwing. Service records versus
effect handlers, and the rules for assembling them, still need design.
Direct FFI remains available for adapters and applications that need a
particular host API, including UI libraries.

Constructing a resource may need configuration or other services and may
raise typed failures. Those requirements belong to construction; they should
not be added to every operation on an already constructed service. The
resource's scope owns cleanup and lifetime. Each adapter must define its
foreign errors, defects, asynchronous behavior and cancellation boundary.

A typed foreign declaration is a trusted contract with foreign code.
External data still needs parsing into typed domain values. TypeScript
declarations may help draft bindings; they do not establish their runtime
correctness. Package planning must cover npm dependencies alongside
Waxwing packages and runtime availability, including browser versus server
APIs.

## Consequences and follow-up

J001 now tracks an approved target priority, replacing its earlier status
as an assistant suggestion. I001 retains its existing Go-specific safety
obligations and adds JavaScript binding design as the first priority for
the new backend. PKG001 carries service adapters and host dependencies.

Each backend proposal must explain how it preserves Waxwing's effect,
cleanup and failure semantics and supports its host bindings. This ADR
selects no ABI, collector, effect lowering or concurrency implementation.
Research proofs about records remain separate from backend correctness.

See the [language direction](../plans/2026-10-08-language-direction.md)
and [package and service direction](../plans/2026-10-08-tooling-direction.md).
