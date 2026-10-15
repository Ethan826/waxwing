// The R001 scale programs (design §8, plan Task 10), shared by
// test/r001-scale.serial.test.mjs. Each is { source, expected, keys }:
// `expected` is what `main` prints, LF included, and `keys` the number of
// specialization keys the program needs.

const range = count => Array.from({ length: count }, (_, index) => index);

// `shapes` distinct record shapes, `{ k: Int, fI: Int }` for each I, flow
// through a chain of `depth` generic functions, each open in its tail and
// each updating `k` before passing the record on. Each link is one key per
// shape, plus `main`.
export const shapeChain = (shapes, depth) => {
  const link = level => `fn c${level}(x: { k: Int, ...r }): `
    + `{ k: Int, ...r } = c${level - 1}(x { k = x.k + 1 }); `;
  const links = range(depth - 1).map(index => link(index + 1)).join('');
  const call = shape => `Console.print(c${depth - 1}({ f${shape}: ${shape}, `
    + 'k: 0 })); ';
  return {
    source: 'fn c0(x: { k: Int, ...r }): { k: Int, ...r } = x; '
      + `${links}fn main(): Unit with Console = { `
      + `${range(shapes).map(call).join('')}() };`,
    expected: range(shapes).map(shape =>
      `{ f${shape}: ${shape}, k: ${depth - 1} }\n`).join(''),
    keys: shapes * depth + 1
  };
};

// A synthetic proxy for the services scenario (design §8), measured, not a
// validation of that unimplemented feature: `envs` environments, records of
// functions, each holding `width` of `services` service functions, the
// windows overlapping. Generic code reaches each service through its label
// alone, open in the rest of the environment; each environment calls each
// of its services through that code, innermost first. One key per
// (environment shape, service), one per service function used, plus
// `main`: environments of one label set share their keys.
export const serviceEnvironments = (services, envs, width) => {
  const service = index => `fn svc${index}(n: Int): Int with Console = { `
    + `Console.print(${index}); n + 1 }; `;
  const use = index => `fn use${index}(env: { s${index}: (Int) -> Int `
    + `with Console, ...r }, n: Int): Int with Console = env.s${index}(n); `;
  const window = env => range(width).map(step => (env + step) % services);
  const field = index => `s${index}: svc${index}`;
  const shapeOf = env => [...window(env)].sort().join();
  const calls = env => window(env).reduce(
    (inner, index) => `use${index}(e${env}, ${inner})`, '0');
  const run = env => `let e${env} = { ${window(env).map(field).join(', ')} }; `
    + `Console.print(${calls(env)}); `;
  return {
    source: `${range(services).map(service).join('')}`
      + `${range(services).map(use).join('')}`
      + `fn main(): Unit with Console = { ${range(envs).map(run).join('')}`
      + '() };',
    expected: range(envs).map(env => [...window(env), width]
      .join('\n')).join('\n') + '\n',
    keys: new Set(range(envs).map(shapeOf)).size * width
      + new Set(range(envs).flatMap(window)).size + 1
  };
};
