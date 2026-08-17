const request = require('supertest');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Create test environment variables
process.env.SESSION_SECRET = 'test-secret';
process.env.PORT = 3001; // use different port for testing

const app = require('../server.js');

const dataDirName = process.env.DATA_DIR_NAME || 'test-data';
const DATA_DIR = path.join(__dirname, '..', dataDirName);
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');

// Helper to wait for files to be written
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(() => {
  // Ensure data dir exists
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Set up a test password
  const testPassword = 'testpassword';
  const hash = bcrypt.hashSync(testPassword, 10);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ passwordHash: hash }));

  // Set up a basic board
  const board = {
    columns: [
      { id: '1', title: 'To Do', tasks: [] }
    ],
    projects: []
  };
  fs.writeFileSync(BOARD_FILE, JSON.stringify(board));
});

afterAll(() => {
  // Clean up
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
});

describe('API Tests', () => {
  let cookie;

  test('Should not allow access without authentication', async () => {
    const res = await request(app).get('/api/board');
    expect(res.statusCode).toEqual(401);
  });

  test('Should authenticate successfully', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'testpassword' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    // Save cookie for subsequent requests
    cookie = res.headers['set-cookie'];
  });

  test('Should fail authentication with wrong password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'wrongpassword' });

    expect(res.statusCode).toEqual(401);
  });

  test('Should get the board', async () => {
    const res = await request(app)
      .get('/api/board')
      .set('Cookie', cookie);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('columns');
  });

  let newColumnId;

  test('Should create a new column', async () => {
    const res = await request(app)
      .post('/api/columns')
      .set('Cookie', cookie)
      .send({ title: 'In Progress' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toEqual('In Progress');

    newColumnId = res.body.id;
  });

  let newTaskId;

  test('Should create a new task', async () => {
    const res = await request(app)
      .post(`/api/columns/${newColumnId}/tasks`)
      .set('Cookie', cookie)
      .send({ title: 'Test Task', priority: 'high' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toEqual('Test Task');
    expect(res.body.priority).toEqual('high');

    newTaskId = res.body.id;
  });

  test('Should edit a task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${newTaskId}`)
      .set('Cookie', cookie)
      .send({ title: 'Updated Test Task' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  test('Should delete a task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${newTaskId}`)
      .set('Cookie', cookie);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  test('Should delete a column', async () => {
    const res = await request(app)
      .delete(`/api/columns/${newColumnId}`)
      .set('Cookie', cookie);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
