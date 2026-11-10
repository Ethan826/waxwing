// The one minter (dossier §18.174): across the compiled output, a
// `Certified` is constructed only inside Strategy.Substitution's
// `certifyPackage`. Read from compiled JavaScript, where every
// construction outside the constructor's own module spells it through that
// module's import; inside it, the module must export the constructor alone
// and build it only in `create`, so no helper there mints either. Shared
// with the regression probe; `compiled` maps a module name to its JS.
const constructor = /Domain_Verdict_Certified_Internal\.Certified\b/g;
export const minterModule = 'Features.Check.Strategy.Substitution';
export const internalModule = 'Domain.Verdict.Certified.Internal';

// The constructor's own module: exports `Certified` alone, and `new
// Certified(` once, in its `create`.
const internalWrong = text => {
  const exported = /export \{([^}]*)\}/.exec(text ?? '')?.[1]
    .split(',').map(name => name.trim()).filter(Boolean) ?? [];
  const built = ((text ?? '').match(/new Certified\(/g) ?? []).length;
  return [
    ...(String(exported) === 'Certified' ? []
      : [`Certified.Internal exports ${exported.join(', ')}`]),
    ...(built === 1 ? [] : [`Certified.Internal builds it ${built} times`])];
};

// The text of one top-level `var name = …` up to the next top-level one.
const definition = (text, name) => {
  const start = text.indexOf(`\nvar ${name} = `);
  if (start < 0) return '';
  const rest = text.slice(start + 1);
  const end = rest.search(/\n(var |export )/);
  return end < 0 ? rest : rest.slice(0, end);
};

const countIn = text => (text.match(constructor) ?? []).length;

export const mintingWrong = compiled => {
  const counts = Object.entries(compiled)
    .map(([module, text]) => [module, countIn(text)])
    .filter(([, count]) => count > 0);
  const inside = countIn(definition(compiled[minterModule] ?? '',
    'certifyPackage'));
  return [
    ...counts.filter(([module]) => module !== minterModule)
      .map(([module, count]) => `${module} constructs Certified ${count}`),
    ...(counts.some(([module, count]) => module === minterModule
      && count === 1) ? [] : ['Substitution constructs Certified other than'
      + ' once']),
    ...(inside === 1 ? [] : ['certifyPackage does not construct Certified']),
    ...internalWrong(compiled[internalModule])];
};

// The check's own must-fail case: a second minter in the module.
export const boundaryScanWrong = () => {
  const one = '\nvar certifyPackage = function () {\n'
    + '  return new Domain_Verdict_Certified_Internal.Certified(v, c);\n'
    + '};\n';
  const two = `${one}var also = function () {\n`
    + '  return Domain_Verdict_Certified_Internal.Certified.create(v)(c);\n'
    + '};\n';
  const internal = 'export {\n    Certified\n};\n'
    + 'var Certified = function () { this.x = 1; };\n'
    + 'Certified.create = function (a) { return new Certified(a); };\n';
  const helper = internal.replace('    Certified\n',
    '    Certified,\n    mint\n');
  const healthy = { [minterModule]: one, [internalModule]: internal };
  return [
    ...(mintingWrong(healthy).length === 0 ? []
      : ['one minter read as wrong']),
    ...(mintingWrong({ ...healthy, [minterModule]: two }).length > 0 ? []
      : ['a second minter goes unreported']),
    ...(mintingWrong({ ...healthy, [internalModule]: helper }).length > 0
      ? [] : ['an Internal helper goes unreported'])];
};
