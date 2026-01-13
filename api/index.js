const express = require('express');
const bodyParser = require('body-parser');
const { sql } = require('@vercel/postgres');
const app = express();

app.use(require('cors')());
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. GET POSTS WITH FILTERS
app.get('/api/posts', async (req, res) => {
    const { filter } = req.query; // recent, old, hot
    try {
        let query;
        if (filter === 'hot') {
            query = sql`SELECT * FROM posts ORDER BY likes DESC, created_at DESC LIMIT 50`;
        } else if (filter === 'old') {
            // Posts older than 1 hour
            query = sql`SELECT * FROM posts WHERE created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 50`;
        } else {
            // Recent (Default)
            query = sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;
        }

        const postsResult = await query;
        const repliesResult = await sql`SELECT * FROM replies ORDER BY created_at ASC`;
        
        const data = postsResult.rows.map(p => ({
            ...p,
            replies: repliesResult.rows.filter(r => r.post_id === p.id)
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. DELETE POST (ADMIN)
app.delete('/api/posts/:id', async (req, res) => {
    const ADMIN_PW = process.env.ADMIN_PASSWORD || 'noman123';
    if (req.headers.adminpw !== ADMIN_PW) return res.status(401).send("Unauthorized");
    try {
        await sql`DELETE FROM replies WHERE post_id = ${req.params.id}`;
        await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
        res.send("Deleted");
    } catch (e) { res.status(500).send(e.message); }
});

// (Keep the /api/init, /api/posts POST, and /api/posts/:id/reply routes from previous version)
module.exports = app;
