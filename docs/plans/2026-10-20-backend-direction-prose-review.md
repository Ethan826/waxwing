# Backend direction prose review

Reviewed 2026-10-20 using Humanizer and the Garner loop in
`docs/engineering.md`, as requested in the author's Claude memory.

## Catalogue before rewriting

| Passage | Pattern | Why it needs attention |
|---|---|---|
| "WebAssembly and JavaScript are the preferred long-term directions, with LLVM another possibility." | Unclear ranking | The README hides the adopted order: JS first, LLVM next; Wasm is optional. |
| "Assistant recommendation, not a user-selected target" | Stale qualification | The author has now selected the target priorities. |
| "Connecting them to external services needs the planned Go FFI." | Target-specific assumption | Readers could infer that Go is the intended production platform. |
| Draft: "Service fulfillment is mediated through host-specific adapter implementations." | Garner: abstract nouns and passive voice | Name the pieces: an FFI wrapper calls a library; an adapter fulfills a Waxwing service. |
| Draft: "Go is not the destination, but a stepping stone." | Humanizer: staged contrast | State its development role and the conditional retirement decision directly. |

The rewrite will preserve the current implementation status and Go-specific
safety requirements. Backend priorities authorize direction only; service
representation, runtime design and implementation still need design.

## Catalogue after rewriting

| Passage | Pattern | Revision |
|---|---|---|
| "Resource construction can require configuration, other services and typed failures." | Garner: imprecise verb | Construction may raise a failure; it does not require one. Use "may need" and "may raise". |
| "Resource construction owns its setup requirements and failures" | Garner: abstract actor | Say that constructing a resource may require other services and may fail. |

Final review checked README, ADR 015, both direction documents and the
J001/I001 entries for staged contrasts, needless closers, unexplained
terms and unsupported implementation claims. Effect remains ordinary
prose. The Logger example explains the adapter role. Go retirement remains
conditional; JS and LLVM remain planned. Existing Go safety obligations
and the distinction between a trusted binding and parsed data are kept.

Documentation validation: width and whitespace checks pass. The new local
ADR and direction links resolve. No npm commands, compiler checks or Lean
builds were run; no implementation or proof files were changed by this task.
