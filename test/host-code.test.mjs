import test from 'node:test';
import assert from 'node:assert/strict';
import { HostUsage, HostIo, HostTool } from '../output/Domain.Host/index.js';
import { hostCodeName } from '../output/Format.Wire/index.js';

// A005: the host codes are an ADT; their wire spellings are pinned here.
test('each HostCode maps to its exact wire string', () => {
  assert.equal(hostCodeName(HostUsage.value), 'E_USAGE');
  assert.equal(hostCodeName(HostIo.value), 'E_IO');
  assert.equal(hostCodeName(HostTool.value), 'E_TOOL');
});
