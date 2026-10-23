// RT1, an independent translator (T-R0b §9 item 1; R0 tranche Task 3.3,
// steps 1-3). A second implementation of T-R0b §3, written from
// research/division-campaign/r0/recorder-rules.md alone, before the
// generator (Task 3.2) exists. It reads resolved syntax from the
// compiled output and returns each declaration's recorded problem in
// test/r0-canonical.mjs's canonical form. Test-only code.
//
// Readings this translator fixes where T-R0b leaves a choice (each is a
// finding in docs/findings.md, "RT1's translator"; RT1's comparison
// decides any disagreement by T-R0b's text):
// - Path steps (§6): a child of a constructor node adds the
//   constructor's name, a field name and, in an array, the index:
//   Call/args/i, Construct/args/i, Add|Concat/left|right,
//   Interpolate/parts/i, Compare/left|right, If/condition|then|else,
//   Match/scrutinee, Match/arms/i/pattern|body, Lambda/body,
//   Apply/function, Apply/args/i, Pipe/left|right,
//   Block/items/i/Let|Defer|Discard/value, Block/result (a defer's
//   own entries at Block/items/i),
//   Perform/args/i, Print|Show|Crash/args/i, Handler/clauses/i/body,
//   With/handler|body, Handle/body, Handle/clauses/i/body,
//   Fail/payload, RecordLiteral/fields/i/value, FieldAccess/record,
//   RecordUpdate/record, RecordUpdate/fields/i/value,
//   RecordExtension/items/i/Given|Spreading/value,
//   RecordRemoval/record; patterns Ctor/args/i,
//   Record/fields/i/pattern.
// - Signature paths: parameter i is parameters/[i], the result
//   result/[], the effect row's label arguments result/[row];
//   constraint k constraints/[k]; joined pair k joined/[k]; Sig3's
//   atom sits at ε (body/[]), Sig10's at result/[]; a rigid variable's
//   origin path is parameters/[variables, i] (§6 gives Sig1 no path).
// - AtomId.index counts the entries one rule emits at one path, over
//   every list, in the rule's listed order; §2.2's markers come after
//   all the listed entries (E5/E6: after the argument equations), in
//   pre-order of the types translated.
// - One marker per `app` built: DataOverRecords when the declared type
//   has a record-row parameter, else DataApplication; HandlerType for
//   a handler type. f's own parameter and result types emit theirs
//   under Sig8.
// - `adm` slots: every `inst` variable; `split` slots: the record-row
//   ones. `spread j` counts from 1.
// - P4's `inst` variables at `Slot p i`, as §5.2 assigns every `inst`,
//   though a checked Ctor pattern has no Instantiation (a T-R0b gap).
// - Rows and origin kinds: as docs/findings.md "RT1's translator"
//   readings 7 and 21 list them.
import { bodyPath, contextOf, emit, eq, finish, rigid }
  from './r0-translator-context.mjs';
import { expr } from './r0-translator-exprs.mjs';
import { pattern } from './r0-translator-records.mjs';
import { flush } from './r0-translator-calls.mjs';
import { R, sortName, translate } from './r0-translator-types.mjs';
import { sigKinds, sigRows, signatureD, typeSpan }
  from './r0-translator-signature.mjs';

const signatureSite = (path, rule, span, kind) =>
  ({ path, rule: `Sig${rule}`, span, kind });

// Sig1 (rigid variables), Sig4-Sig8 (`D`), Sig2 (Γ₀), Sig3 (the body
// against ⟦R⟧ν_f), Sig9 (`Q` empty), Sig10 (`pr ⟦R⟧` of the entry).
export const translateDecl = (program, decl) => {
  const cx = { ...contextOf(program, decl), expr, pattern,
    rigidNaming: index => ({ rigid: index }) };
  decl.sorts.forEach((sort, index) => {
    if (sortName(sort) !== null) rigid(cx, index, sortName(sort), decl.span);
  });
  signatureD(program, decl).forEach(item => emit(cx,
    signatureSite(item.path, item.rule, item.span, sigKinds[item.rule]),
    'd', sigRows[item.rule], item.value));
  const env = new Map();
  decl.parameters.forEach((parameter, index) => {
    const marks = [];
    env.set(index, translate(program, parameter.ty, cx.rigidNaming, marks));
    flush(cx, signatureSite({ root: 'parameters', steps: [index] }, 8,
      parameter.span, 'types'), marks, 'types');
  });
  const resultSpan = typeSpan(decl, decl.parameters.length);
  const resultPath = { root: 'result', steps: [] };
  const marks = [];
  const result = translate(program, decl.result, cx.rigidNaming, marks);
  flush(cx, signatureSite(resultPath, 8, resultSpan, 'types'), marks,
    'types');
  const body = expr(cx, decl.body, bodyPath, env);
  emit(cx, signatureSite(bodyPath, 3, R.exprSpan(decl.body), 'body'), 'b',
    'B1', eq(body, result));
  if (program.entry === decl.id) emit(cx,
    signatureSite(resultPath, 10, resultSpan, 'contract'), 'bq', 'C5',
    { pr: result });
  return finish(cx);
};

export const translateProgram = program =>
  program.functions.map(decl => translateDecl(program, decl));
