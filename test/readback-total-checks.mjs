// R036 (1), T5: the loop scan's restored-defect checks (fix round 1, I1-I3),
// for test/regression-r0-t2-prerequisites.mjs. Each returns the names
// of the planted cases the scan misses, empty when all are found.
// `recJs` is the compiled Control.Monad.Rec.Class under test.
import { recDrivers, scanModule } from './readback-total-loops.mjs';

const js = body => 'import * as Control_Monad_Rec_Class from '
  + `"../Control.Monad.Rec.Class/index.js";\n${body}`;
const listed = (body, drivers) => scanModule('P', js(body), drivers)
  .map(entry => `${entry.kind} ${entry.key}`);

export const loopChecks = recJs => {
  const drivers = recDrivers(recJs);
  // I1: the body behind a `$lazy_` binding is scanned as its name's.
  const lazyWrong = () => {
    const found = listed(`
var $runtime_lazy = function (name, moduleName, init) { return init; };
var $lazy_f = $runtime_lazy("f", "P", function () {
  while (true) { break; }
  return Control_Monad_Rec_Class.tailRec(f);
});
var f = $lazy_f(3);
`, drivers);
    return ['loop P.f', 'tailRec P.f'].filter(entry =>
      !found.includes(entry));
  };
  // I2: every loop driver, not only the tailRec family.
  const driversWrong = () => ['forever', 'whileJust', 'untilJust']
    .filter(driver => !listed(`var f = function (s) { return `
      + `Control_Monad_Rec_Class.${driver}(s); };\n`, drivers)
      .includes('tailRec P.f'));
  // I3: a point-free alias of a driver, called only from elsewhere.
  const aliasWrong = () => (listed(`var step = function (n) { return n; };
var x = Control_Monad_Rec_Class.tailRec(step);
export { x };
`, drivers).includes('tailRec P.x') ? [] : ['x']);
  return { lazyWrong, driversWrong, aliasWrong };
};
