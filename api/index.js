const express = require('express');
const bodyParser = require('body-parser');
const { sql } = require('@vercel/postgres');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. DATABASE INIT (Visit /api/init once after deploying)
app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT, likes INTEGER DEFAULT 0, author_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        res.send("VOID Database Initialized Successfully.");
    } catch (e) { 
        console.error(e);
        res.status(500).send("DB Init Error: " + e.message); 
    }
});

// 2. FETCH ALL POSTS
app.get('/api/posts', async (req, res) => {
    try {
        const postsResult = await sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;
        const repliesResult = await sql`SELECT * FROM replies ORDER BY created_at ASC`;
        const posts = postsResult.rows;
        const replies = repliesResult.rows;
        
        const combined = posts.map(p => ({
            ...p,
            replies: replies.filter(r => r.post_id === p.id)
        }));
        res.json(combined);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. CREATE POST
app.post('/api/posts', async (req, res) => {
    const { content, authorId } = req.body;
    if (!content) return res.status(400).json({ error: "Content is empty" });
    try {
        const r = await sql`INSERT INTO posts (content, author_id) VALUES (${content}, ${authorId}) RETURNING *`;
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. REPLY & LIKE & DELETE (Keep these as they were)
app.post('/api/posts/:id/reply', async (req, res) => {
    await sql`INSERT INTO replies (post_id, content) VALUES (${req.params.id}, ${req.body.content})`;
    res.json({ success: true });
});

app.post('/api/posts/:id/like', async (req, res) => {
    await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

app.delete('/api/posts/:id', async (req, res) => {
    const ADMIN_PW = process.env.ADMIN_PASSWORD || 'nom@n123';
    if (req.headers.adminpw !== ADMIN_PW) return res.status(401).send("Unauthorized");
    await sql`DELETE FROM replies WHERE post_id = ${req.params.id}`;
    await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
    res.send("Deleted");
});

module.exports = app;
