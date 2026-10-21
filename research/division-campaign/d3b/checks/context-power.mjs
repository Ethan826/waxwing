// Two unwritten labels in one cell retain distinct field types.
// This checks interpretation power without changing run.mjs bounds.
import assert from 'node:assert/strict'
import { thetaStar } from '../generic.mjs'
import { coversFails } from '../interp.mjs'

const P = { rigidRows: [0], rigidTys: [], flexRows: [], flexTys: [],
  D: [], B: [] }
const rigid = new Map([['r0', { z1: 'Int', z2: 'Bool' }]])
const st = thetaStar(P, [], () => false)
assert.equal(st.instance, true)
assert.equal(st.independent, true)
const args = [P, [], ['z1', 'z2'], st.theta, rigid]
assert.equal(coversFails(...args), null)
const bad = coversFails(...args, { contextFree: true })
assert.deepEqual(bad, { at: 'r0', got: '{z1:Int,z2:Int}',
  want: '{z1:Int,z2:Bool}' })
console.log('normal coverage: PASS')
console.log('contextFree detected:', JSON.stringify(bad))
