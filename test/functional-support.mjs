import { member } from '../output/Data.Set/index.js';
import { ordTypeId } from '../output/Domain.Ids/index.js';
import { closedRow } from '../output/Domain.Row/index.js';
import { TFun, TInt } from '../output/Domain.Type/index.js';

export const int = TInt.value;

export const fun = (parameter, result) =>
  TFun.create(parameter)(closedRow)(result);

export const ctor = (owner, fields) =>
  ({ name: `C${owner}`, owner, fields, fieldSyntax: [], span: null });

export const holds = (found, id) => member(ordTypeId)(id)(found);
