import Fastify from 'fastify';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
for (let i = 1; i <= 100; i++) {
  db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)').run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}

const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const listUsersStmt = db.prepare('SELECT id, name, email, age FROM users LIMIT 50');
const insertUserStmt = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');

const app = Fastify({ logger: false });

app.get('/', async () => ({ message: 'Hello World!' }));

app.get('/health', async () => ({ status: 'ok' }));

app.get('/json', async () => ({
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

app.get('/users/:id', async (request) => {
  const { id } = request.params;
  return { id, name: 'User ' + id };
});

app.get('/search', async (request) => {
  const { q, page, limit } = request.query;
  return {
    q,
    page: parseInt(page || '1'),
    limit: parseInt(limit || '10'),
  };
});

app.post('/users', async (request) => {
  return { id: Date.now(), ...request.body };
});

app.get('/db/users', async () => listUsersStmt.all());

app.post('/db/users', async (request, reply) => {
  const { name, email, age } = request.body;
  const info = insertUserStmt.run(name, email, age);
  reply.send({ id: Number(info.lastInsertRowid), name, email, age });
});

app.get('/db/users/:id', (request, reply) => {
  reply.send(getUserStmt.get(Number(request.params.id)));
});

await app.listen({ port: 3004 });
console.log('Fastify server running on port 3004');