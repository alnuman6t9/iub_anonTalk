const express = require('express');
const bodyParser = require('body-parser');
const { sql } = require('@vercel/postgres');
const app = express();

app.use(require('cors')());
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. Initialize Tables
app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT, likes INTEGER DEFAULT 0, author_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        res.send("VOID Tables Initialized.");
    } catch (e) { res.status(500).send(e.message); }
});

// 2. Filtered Feed Logic
app.get('/api/posts', async (req, res) => {
    const { filter } = req.query;
    try {
        let result;
        if (filter === 'hot') {
            result = await sql`SELECT * FROM posts ORDER BY likes DESC, created_at DESC LIMIT 50`;
        } else if (filter === 'old') {
            result = await sql`SELECT * FROM posts WHERE created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 50`;
        } else {
            result = await sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;
        }

        const replies = await sql`SELECT * FROM replies ORDER BY created_at ASC`;
        const data = result.rows.map(p => ({
            ...p,
            replies: replies.rows.filter(r => r.post_id === p.id)
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Delete Logic
app.delete('/api/posts/:id', async (req, res) => {
    const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
    if (req.headers.adminpw !== ADMIN_PW) return res.status(401).send("Unauthorized");
    await sql`DELETE FROM replies WHERE post_id = ${req.params.id}`;
    await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
    res.send("Deleted");
});

// Helper routes for liking and replying
app.post('/api/posts/:id/like', async (req, res) => {
    await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

app.post('/api/posts/:id/reply', async (req, res) => {
    await sql`INSERT INTO replies (post_id, content) VALUES (${req.params.id}, ${req.body.content})`;
    res.json({ success: true });
});

app.post('/api/posts', async (req, res) => {
    const r = await sql`INSERT INTO posts (content, author_id) VALUES (${req.body.content}, ${req.body.authorId}) RETURNING *`;
    res.json(r.rows[0]);
});

module.exports = app;
