import { Elysia } from 'elysia';
import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
for (let i = 1; i <= 100; i++) {
  db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)').run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}

const getUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const listUsersStmt = db.prepare('SELECT id, name, email, age FROM users LIMIT 50');
const insertUserStmt = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');

const app = new Elysia()
  .get('/', () => ({ message: 'Hello World!' }))
  .get('/health', () => ({ status: 'ok' }))
  .get('/json', () => ({
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
  }))
  .get('/users/:id', ({ params }) => ({ id: params.id, name: 'User ' + params.id }))
  .get('/search', ({ query }) => ({
    q: query.q,
    page: parseInt(query.page as string || '1'),
    limit: parseInt(query.limit as string || '10'),
  }))
  .post('/users', ({ body }) => ({ id: Date.now(), ...(body as object) }))
  .get('/db/users', () => listUsersStmt.all())
  .post('/db/users', ({ body }) => {
    const { name, email, age } = body as any;
    const info = insertUserStmt.run(name, email, age);
    return { id: Number(info.lastInsertRowid), name, email, age };
  })
  .get('/db/users/:id', ({ params }) => getUserStmt.get(Number(params.id)))
  .listen(3002);

console.log('Elysia server running on port 3002');

