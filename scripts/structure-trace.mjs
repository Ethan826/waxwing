// The trace gate (tranche 2 Task 7; design §C.4, §I Task 3d; dossier
// §18.155 (4)): inference never reads the live-value trace. Read from
// each src module's syntax tree (tools/style/src/Style/Trace.purs, the
// same CST parser as the style gate), never its text.
//
// Rules. (1) Every src module parses cleanly. (2) A use of the record
// label `trace` (accessor path, record update, literal field or pun,
// record pattern) appears only in the allowlisted declarations below, in
// exactly the counts listed: State's field is written by Scheme `start`,
// appended to by DeclarationUse `traced` and Apply `appliedAt` and
// `pipedAt`, and read once, by Function `checkFunction`, as `finish`'s
// argument after every check has run (that declaration's literal field
// is `Rechecked`'s). A listed entry that no longer matches is a finding
// too. (3) Features.Check.Trace exists, has an export list, and exports
// `Trace` without constructors and not by `module` re-export. (4) No
// instance of any class has `Trace` in its head (Eq, Ord, Show and
// Generic, the design's four, and Newtype or any other, since a method
// could read it); TraceKey's are allowed. (5) `finish` is brought into
// scope (named, open or hiding import) by Features.Check.Function alone,
// which re-exports nothing of it.
//
// Limits (reasoned). The gate sees syntax: a label reached through a
// type-level string (a `Proxy "trace"` with a record library; none is a
// dependency) or through code outside src/ is not seen; a use of the
// label `trace` for an unrelated record in an allowlisted declaration
// passes if the count is unchanged. Instances are matched by the type
// constructor's unqualified name, so a different type named Trace
// counts too (fails closed). The floor stops an empty or truncated scan.
export const traceModule = 'Features.Check.Trace';
export const finishImporter = 'Features.Check.Function';
export const traceType = 'Trace';
// Falls only with the owner's approval.
export const traceFloors = { modules: 460 };

const check = 'Features.Check';
export const traceAllowed = [
  [`${check}.Scheme`, 'start', 'field', 1],
  [`${check}.DeclarationUse`, 'traced', 'update', 1],
  [`${check}.DeclarationUse`, 'traced', 'accessor', 1],
  [`${check}.Apply`, 'appliedAt', 'update', 1],
  [`${check}.Apply`, 'appliedAt', 'accessor', 1],
  [`${check}.Apply`, 'pipedAt', 'update', 1],
  [`${check}.Apply`, 'pipedAt', 'accessor', 1],
  [`${check}.Function`, 'checkFunction', 'accessor', 1],
  [`${check}.Function`, 'checkFunction', 'field', 1]
].map(([module, declaration, form, count]) =>
  ({ module, declaration, form, count }));

const groupKey = (module, declaration, form) =>
  `${module} ${declaration} (${form})`;

const useFindings = modules => {
  const found = new Map();
  for (const { name, uses } of modules)
    for (const use of uses) {
      const key = groupKey(name, use.declaration, use.form);
      found.set(key, (found.get(key) ?? 0) + 1);
    }
  const allowed = new Map(traceAllowed.map(entry => [groupKey(entry.module,
    entry.declaration, entry.form), entry.count]));
  const keys = [...new Set([...found.keys(), ...allowed.keys()])].sort();
  return keys.filter(key => found.get(key) !== allowed.get(key))
    .map(key => `trace gate: ${key} uses the label \`trace\` `
      + `${found.get(key) ?? 0} times, allowed ${allowed.get(key) ?? 0}`
      + ' (inference never reads the trace; scripts/structure-trace.mjs)');
};

const exportFindings = modules => {
  const owners = modules.filter(item => item.name === traceModule);
  if (owners.length !== 1)
    return [`trace gate: ${owners.length} modules named ${traceModule}`];
  const [owner] = owners;
  const exposed = owner.exported.filter(entry =>
    entry.startsWith(`${traceType}(`) || entry === `module ${traceModule}`);
  if (!owner.exportList || !owner.exported.includes(traceType)
    || exposed.length > 0)
    return [`trace gate: ${traceModule} must export ${traceType} without`
      + ` its constructor (exports ${JSON.stringify(owner.exportList
        ? owner.exported : 'everything')})`];
  return [];
};

const instanceFindings = modules => modules.flatMap(({ name, instances }) =>
  instances.filter(item => item.types.includes(traceType)).map(item =>
    `trace gate: ${name} declares an instance ${item.className} on`
    + ` ${traceType}`));

const bringsFinish = item => item.name === traceModule && (item.open
  || item.names.includes('finish') !== item.hiding);

const finishFindings = modules => modules.flatMap(module => {
  if (!module.imports.some(bringsFinish)) return [];
  if (module.name !== finishImporter)
    return [`trace gate: ${module.name} imports ${traceModule}'s finish`];
  const leaked = !module.exportList || module.exported.some(entry =>
    entry === 'finish' || entry.startsWith('module '));
  return leaked ? [`trace gate: ${module.name} re-exports finish`] : [];
});

// `sources`: src file path to text; `facts`: Style.Trace's reader.
export const traceFindings = (sources, facts, floors = traceFloors) => {
  const read = Object.entries(sources).map(([file, source]) =>
    ({ file, ...facts(source) }));
  const unparsed = read.filter(item => !item.parsed).map(item =>
    `trace gate: ${item.file} does not parse`);
  const modules = read.filter(item => item.parsed);
  const floor = modules.length < floors.modules ? [`trace gate read`
    + ` ${modules.length} modules, floor ${floors.modules}`] : [];
  return [...unparsed, ...floor, ...useFindings(modules),
    ...exportFindings(modules), ...instanceFindings(modules),
    ...finishFindings(modules)];
};

// The checkStructure entry: every src .purs file in `files`, read with
// the built Style.Trace (verify builds before this runs).
export const traceGate = async (files, readText) => {
  const { facts } = await import('../output/Style.Trace/index.js');
  return traceFindings(Object.fromEntries(files.filter(file =>
    file.startsWith('src/') && file.endsWith('.purs')).map(file =>
    [file, readText(file)])), facts);
};
