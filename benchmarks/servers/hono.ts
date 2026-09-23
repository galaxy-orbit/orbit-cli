import { Hono } from 'hono';
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
for (let i = 1; i <= 100; i++) {
  db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)').run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}

const app = new Hono();

app.get('/', (c) => c.json({ message: 'Hello World!' }));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/json', (c) => c.json({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    country: 'USA',
    zip: '10001',
  },
  tags: ['developer', 'typescript', 'bun'],
  createdAt: new Date().toISOString(),
  metadata: {
    lastLogin: new Date().toISOString(),
    loginCount: 42,
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  },
}));

app.get('/users/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ id, name: 'User ' + id });
});

app.get('/search', (c) => {
  const q = c.req.query('q');
  const page = c.req.query('page');
  const limit = c.req.query('limit');
  return c.json({
    q,
    page: parseInt(page || '1'),
    limit: parseInt(limit || '10'),
  });
});

app.post('/users', async (c) => {
  const body = await c.req.json();
  return c.json({ id: Date.now(), ...body });
});

const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const listUsersStmt = db.prepare('SELECT id, name, email, age FROM users LIMIT 50');
const insertUserStmt = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');

app.get('/db/users', (c) => c.json(listUsersStmt.all()));
app.post('/db/users', async (c) => {
  const { name, email, age } = await c.req.json();
  const info = insertUserStmt.run(name, email, age);
  return c.json({ id: Number(info.lastInsertRowid), name, email, age });
});
app.get('/db/users/:id', (c) => c.json(getUserStmt.get(Number(c.req.param('id')))));

export default {
  port: 3003,
  fetch: app.fetch,
};

console.log('Hono server running on port 3003');
