// Đặt trước khi require server: dotenv không ghi đè biến đã có,
// nên test không bao giờ chạm vào database productdb thật.
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/productdb_test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/server');
const Product = require('../src/models/Product');

describe('Product API CRUD', () => {
  let createdId;
  const validProduct = { pid: 'CI001', pname: 'Test Product', price: 100000, quantity: 5 };

  before(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await Product.init(); // chờ index unique được tạo xong trước khi test trùng pid
    await Product.deleteMany({ pid: /^CI/ });
  });

  after(async () => {
    await Product.deleteMany({ pid: /^CI/ });
    await mongoose.connection.close();
  });

  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('POST creates a product', async () => {
    const res = await request(app).post('/api/products').send(validProduct);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.pid, 'CI001');
    createdId = res.body._id;
  });

  it('POST with duplicate pid returns 400', async () => {
    const res = await request(app).post('/api/products').send(validProduct);
    assert.equal(res.statusCode, 400);
  });

  it('POST with missing field returns 400', async () => {
    const res = await request(app).post('/api/products').send({ pid: 'CI002' });
    assert.equal(res.statusCode, 400);
  });

  it('POST with negative price returns 400', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ pid: 'CI003', pname: 'Bad', price: -5, quantity: 1 });
    assert.equal(res.statusCode, 400);
  });

  it('GET list includes created product', async () => {
    const res = await request(app).get('/api/products');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.some((p) => p.pid === 'CI001'));
  });

  it('GET by id returns the product', async () => {
    const res = await request(app).get(`/api/products/${createdId}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.pid, 'CI001');
  });

  it('GET with malformed id returns 400', async () => {
    const res = await request(app).get('/api/products/not-an-id');
    assert.equal(res.statusCode, 400);
  });

  it('PUT updates quantity', async () => {
    const res = await request(app).put(`/api/products/${createdId}`).send({ quantity: 99 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.quantity, 99);
  });

  it('PUT on non-existent id returns 404', async () => {
    const res = await request(app)
      .put('/api/products/000000000000000000000000')
      .send({ quantity: 1 });
    assert.equal(res.statusCode, 404);
  });

  it('DELETE removes the product', async () => {
    const res = await request(app).delete(`/api/products/${createdId}`);
    assert.equal(res.statusCode, 200);
  });

  it('GET after delete returns 404', async () => {
    const res = await request(app).get(`/api/products/${createdId}`);
    assert.equal(res.statusCode, 404);
  });
});
