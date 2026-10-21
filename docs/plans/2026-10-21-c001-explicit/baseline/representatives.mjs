export const representatives = async load => {
  const [types, row, tuple] = await Promise.all([
    load('Domain.Type'), load('Domain.Row'), load('Data.Tuple')
  ]);
  return {
    Int: types.TInt.value,
    Bool: types.TBool.value,
    Text: types.TText.value,
    Record: new types.TRecord({ tails: [], fields: [
      new tuple.Tuple('probe', types.TInt.value)
    ] }),
    Function: new types.TFun(types.TInt.value, row.closedRow, types.TInt.value)
  };
};
