const Product = require('../src/models/Product');

test('sanity check', () => {
  expect(1 + 1).toBe(2);
});

test('Product requires pid, pname, price, quantity', () => {
  const err = new Product({}).validateSync();
  expect(Object.keys(err.errors).sort()).toEqual(['pid', 'pname', 'price', 'quantity']);
});

test('Product rejects negative price', () => {
  const err = new Product({ pid: 'P1', pname: 'x', price: -1, quantity: 1 }).validateSync();
  expect(err.errors.price).toBeDefined();
});

test('valid Product passes validation', () => {
  const err = new Product({ pid: 'P1', pname: 'x', price: 1, quantity: 1 }).validateSync();
  expect(err).toBeUndefined();
});
