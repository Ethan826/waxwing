// Design §B.3's 11 local-annotation declarations (dossier §18.152): the
// candidates `certify` accepts whose recorded implicit annotation row
// moved with the generation correction, `UnframedInstall` apart. Each
// is in test/fixtures/r0/t2-annotation-row-before.json's keys. Read by
// test/r0-t2-honest.serial.test.mjs (H2) and its regression probe.
const probes = 'test/fx008-probes/';
const erased = 'test/fixtures/r0/erased/';

export const annotated = [
  `${probes}rev6/amb.wxw#main`,
  `${probes}rev6/amb3.wxw#f`,
  `${probes}rev6/annotb.wxw#main`,
  `${probes}rev7/annotc.wxw#main`,
  `${probes}rev7/annotd.wxw#main`,
  `${probes}witness/famw2.wxw#main`,
  `${erased}form.annotation-bare.json#g`,
  `${erased}form.annotation-label.json#g`,
  `${erased}obligation-annotation.control.json#g`,
  'test/fx-console-programs.mjs:values#2#main',
  'test/fx008-defer-programs.mjs:a1Control#1#main'
];
