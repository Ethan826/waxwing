// A checked declaration's types by D1 site (R0 Task 7.1b, D1 spec §3.3,
// §10 T2, T5b), walked beside its resolved declaration, so each child is
// named as generation names it (T-R0b §6): an over-applied call is
// `Apply (Call …)` in the IR but `Call/args/i` in its paths, a builtin
// reference a `Lambda`. Each entry is `{ key, ty }`: `key` a site
// (`siteKey`), `ty` a compiled `Ty Open`. Two keys are not D1 sites:
// `Inner` (an over-applied call's saturated node, typed from the values
// read elsewhere) and `Static` (a type no witness reaches: a fail
// clause's written payload, a builtin's own body type). `skeleton` is the
// IR with every type left out, for AI-IR's structure comparison.
const name = value => value.constructor.name;
const stepsOf = path => path.steps.map(step => step.value0);

// A compiled `CheckedName` as a key; the walk builds the same keys.
export const siteKey = site => JSON.stringify([name(site),
  ...Object.values(site).map(part => (part && part.steps
    ? [name(part.root), ...stepsOf(part)] : part))]);
const key = (form, path, ...rest) => JSON.stringify([form,
  [path.root, ...path.steps], ...rest]);
const at = (path, ...more) => ({ root: path.root,
  steps: [...path.steps, ...more] });

// The resolved leaves: no child expression (`Boolean` compiles to
// `$$Boolean`, a JS global's name). Any other constructor reaching the
// end of the walk is unknown to it, so the walk fails closed rather
// than skip its children (7.1b review, Minor 4).
const leaves = new Set(['Integer', '$$Boolean', 'Local', 'UnitValue',
  'TextLiteral']);
const leaf = resolved => {
  if (!leaves.has(name(resolved)))
    throw new Error(`r0-elab-walk: no arm for ${name(resolved)}`);
};

const walker = sites => {
  const add = (form, path, ty, ...rest) =>
    sites.push({ key: key(form, path, ...rest), ty });
  const slots = (path, instantiation) => instantiation.forEach(
    (ty, index) => add('Slot', path, ty, index));
  const each = (path, label, field, resolved, checked) =>
    resolved.forEach((item, index) =>
      expr(item, checked[index], at(path, label, field, index)));
  const pattern = (resolved, checked, path) => {
    const found = checked.value0;
    add('PatternType', path, found.ty);
    if (name(resolved) === 'Ctor')
      resolved.value2.forEach((part, index) => pattern(part,
        found.shape.value1[index], at(path, 'Ctor', 'args', index)));
    if (name(resolved) === 'Record') {
      resolved.value1.forEach((field, index) => pattern(field.pattern,
        found.shape.value0[index].pattern,
        at(path, 'Record', 'fields', index, 'pattern')));
      if (name(found.shape.value1) === 'NamedRest')
        add('RestType', path, found.shape.value1.value1);
    }
  };
  // A named call (`Call`, `Construct`, `Perform`): its instantiation and
  // arguments are fields `slotsAt` and `argsAt` of its node, which an
  // over-application wraps in an `Apply` of the rest.
  const named = (resolved, node, path, label, slotsAt, argsAt) => {
    const over = name(node) === 'Apply';
    const called = over ? node.value0.value0 : null;
    const inner = over ? called.node : node;
    if (over) sites.push({ key: key('Inner', path), ty: called.ty });
    slots(path, inner[slotsAt]);
    each(path, label, 'args', resolved, [...inner[argsAt],
      ...(over ? node.value1 : [])]);
  };
  const blockItem = (resolved, checked, path, index) => {
    const form = name(resolved);
    const value = { Let: 'value2', Defer: 'value1', Discard: 'value0' };
    expr(resolved[value[form]],
      name(checked) === 'Let' ? checked.value1 : checked.value0,
      at(path, 'Block', 'items', index, form, 'value'));
  };
  const builtinRef = (resolved, node, path) => {
    add('ParamType', path, node.value0[0].ty, 0);
    const body = node.value1.value0;
    add('ParamType', path, body.node.value0.value0.ty, 0);
    if (name(resolved) === 'CrashRef') add('LambdaBody', path, body.ty);
    else sites.push({ key: JSON.stringify(['Static']), ty: body.ty });
  };
  const builtinCall = (resolved, node, path, label) => {
    if (name(node) !== 'Apply') {
      expr(resolved.value1[0], node.value0, at(path, label, 'args', 0));
      return;
    }
    sites.push({ key: JSON.stringify(['Static']), ty: node.value0.value0.ty });
    each(path, label, 'args', resolved.value1, node.value1);
  };
  const handler = (resolved, node, path) => {
    slots(path, node.value1);
    resolved.value2.forEach((clause, index) => {
      const checked = node.value2[index];
      checked.parameters.forEach((parameter, k) =>
        add('ClauseParamType', path, parameter.ty, index, k));
      expr(clause.body, checked.body,
        at(path, 'Handler', 'clauses', index, 'body'));
    });
  };
  const children = (resolved, node, path) => {
    const r = resolved;
    const pair = (label, one, two, left = 'left', right = 'right') => {
      expr(r[one], node.value0, at(path, label, left));
      expr(r[two], node.value1, at(path, label, right));
    };
    // `+` is `Arith (Binary Plus l r)` in both trees, at the step `Add`;
    // another operator fails closed.
    const plus = (found, made) => {
      if (name(found) !== 'Binary' || name(found.value0) !== 'Plus')
        throw new Error(`r0-elab-walk: no arm for ${name(found.value0)}`);
      expr(found.value1, made.value1, at(path, 'Add', 'left'));
      expr(found.value2, made.value2, at(path, 'Add', 'right'));
    };
    switch (name(r)) {
      case 'FunctionRef': case 'CtorRef': slots(path, node.value1); return;
      case 'OperationRef': slots(path, node.value2); return;
      case 'Call': named(r.value2, node, path, 'Call', 'value1', 'value2');
        return;
      case 'Construct':
        named(r.value2, node, path, 'Construct', 'value1', 'value2'); return;
      case 'Perform':
        named(r.value3, node, path, 'Perform', 'value2', 'value3'); return;
      case 'Arith': plus(r.value1, node.value0); return;
      case 'Concat': pair('Concat', 'value1', 'value2'); return;
      case 'Compare':
        expr(r.value2, node.value1, at(path, 'Compare', 'left'));
        expr(r.value3, node.value2, at(path, 'Compare', 'right')); return;
      case 'Interpolate':
        each(path, 'Interpolate', 'parts', r.value1, node.value0); return;
      case 'If':
        expr(r.value1, node.value0, at(path, 'If', 'condition'));
        expr(r.value2, node.value1, at(path, 'If', 'then'));
        expr(r.value3, node.value2, at(path, 'If', 'else')); return;
      default: return more(r, node, path);
    }
  };
  const more = (r, node, path) => {
    switch (name(r)) {
      case 'Match':
        expr(r.value1, node.value0, at(path, 'Match', 'scrutinee'));
        r.value2.forEach((arm, k) => {
          pattern(arm.pattern, node.value1[k].pattern,
            at(path, 'Match', 'arms', k, 'pattern'));
          expr(arm.body, node.value1[k].body,
            at(path, 'Match', 'arms', k, 'body'));
        }); return;
      case 'Lambda':
        node.value0.forEach((parameter, k) =>
          add('ParamType', path, parameter.ty, k));
        expr(r.value2, node.value1, at(path, 'Lambda', 'body')); return;
      case 'Apply':
        expr(r.value1, node.value0, at(path, 'Apply', 'function'));
        each(path, 'Apply', 'args', r.value2, node.value1); return;
      case 'Pipe':
        expr(r.value2, node.value1, at(path, 'Pipe', 'right'));
        expr(r.value1, node.value0, at(path, 'Pipe', 'left')); return;
      case 'Block':
        r.value1.forEach((found, i) => blockItem(found, node.value0[i], path,
          i));
        expr(r.value2, node.value1, at(path, 'Block', 'result')); return;
      default: return rest(r, node, path);
    }
  };
  const rest = (r, node, path) => {
    switch (name(r)) {
      case 'PrintRef': case 'ShowRef': case 'CrashRef':
        builtinRef(r, node, path); return;
      case 'Print': builtinCall(r, node, path, 'Print'); return;
      case 'Show': builtinCall(r, node, path, 'Show'); return;
      case 'Crash': builtinCall(r, node, path, 'Crash'); return;
      case 'Handler': handler(r, node, path); return;
      case 'With':
        expr(r.value1, node.value0, at(path, 'With', 'handler'));
        expr(r.value2, node.value1, at(path, 'With', 'body')); return;
      case 'Handle':
        expr(r.value1, node.value0, at(path, 'Handle', 'body'));
        r.value2.forEach((clause, k) => {
          sites.push({ key: JSON.stringify(['Static']),
            ty: node.value1[k].payload });
          expr(clause.body, node.value1[k].body,
            at(path, 'Handle', 'clauses', k, 'body'));
        }); return;
      case 'Fail': expr(r.value2, node.value0, at(path, 'Fail', 'payload'));
        return;
      default: return records(r, node, path);
    }
  };
  const records = (r, node, path) => {
    switch (name(r)) {
      case 'RecordLiteral': r.value1.forEach((field, i) => expr(field.value,
        node.value0[i].value, at(path, 'RecordLiteral', 'fields', i,
          'value'))); return;
      case 'FieldAccess':
        expr(r.value1, node.value0, at(path, 'FieldAccess', 'record')); return;
      case 'RecordUpdate':
        expr(r.value1, node.value0, at(path, 'RecordUpdate', 'record'));
        r.value2.forEach((field, i) => expr(field.value, node.value1[i].value,
          at(path, 'RecordUpdate', 'fields', i, 'value'))); return;
      case 'RecordExtension': r.value1.forEach((found, i) => {
        const given = name(found) === 'Given';
        const checked = node.value0[i].value0;
        expr(given ? found.value0.value : found.value1,
          given ? checked.value : checked,
          at(path, 'RecordExtension', 'items', i, name(found), 'value'));
      }); return;
      case 'RecordRemoval':
        expr(r.value1, node.value0, at(path, 'RecordRemoval', 'record'));
        return;
      default: return leaf(r);
    }
  };
  const expr = (resolved, checked, path) => {
    add('NodeType', path, checked.value0.ty);
    children(resolved, checked.value0.node, path);
  };
  return expr;
};

// The sites of a checked declaration's body, in walk order.
export const sitesOf = (resolvedDecl, checkedDecl) => {
  const sites = [];
  walker(sites)(resolvedDecl.body, checkedDecl.body,
    { root: 'InBody', steps: [] });
  return sites;
};
