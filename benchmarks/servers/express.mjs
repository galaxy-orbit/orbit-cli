import express from 'express';

import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER)');
for (let i = 1; i <= 100; i++) {
  db.prepare('INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)').run(i, `User ${i}`, `user${i}@example.com`, 20 + (i % 50));
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/json', (req, res) => {
  res.json({
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
  });
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'User ' + id });
});

app.get('/search', (req, res) => {
  const { q, page, limit } = req.query;
  res.json({
    q,
    page: parseInt(page || '1'),
    limit: parseInt(limit || '10'),
  });
});

app.post('/users', (req, res) => {
  res.json({ id: Date.now(), ...req.body });
});

app.get('/db/users/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  res.json(row);
});

app.listen(3005, () => {
  console.log('Express server running on port 3005');
});
