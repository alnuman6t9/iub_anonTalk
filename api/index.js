const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const { sql } = require('@vercel/postgres');

const app = express();
const ADMIN_PW = 'Noman123'; // optional admin password

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

/* -------------------- INIT DATABASE -------------------- */
app.get('/api/init', async (req, res) => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS replies (
                id SERIAL PRIMARY KEY,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        res.json({ success: true, message: "Database initialized" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* -------------------- AUTH -------------------- */
app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.toLowerCase().endsWith('@iub.edu.bd')) {
        return res.status(403).json({ error: "Only IUB email allowed" });
    }

    const token = crypto.randomBytes(32).toString('hex');

    try {
        await sql`
            INSERT INTO sessions (token, email)
            VALUES (${token}, ${email})
        `;
        res.json({ success: true, token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* -------------------- AUTH MIDDLEWARE -------------------- */
const requireAuth = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(' ')[1];

    const result = await sql`
        SELECT * FROM sessions WHERE token = ${token}
    `;

    if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid session" });
    }

    req.user = result.rows[0];
    next();
};

/* -------------------- POSTS -------------------- */
app.get('/api/posts', async (req, res) => {
    const posts = (await sql`
        SELECT * FROM posts ORDER BY created_at DESC LIMIT 50
    `).rows;

    const replies = (await sql`
        SELECT * FROM replies ORDER BY created_at ASC
    `).rows;

    res.json(
        posts.map(p => ({
            ...p,
            replies: replies.filter(r => r.post_id === p.id)
        }))
    );
});

app.post('/api/posts', requireAuth, async (req, res) => {
    const { content } = req.body;

    if (!content || content.length < 2) {
        return res.status(400).json({ error: "Post too short" });
    }

    const r = await sql`
        INSERT INTO posts (content)
        VALUES (${content})
        RETURNING *
    `;

    res.json(r.rows[0]);
});

app.post('/api/posts/:id/reply', requireAuth, async (req, res) => {
    const { content } = req.body;

    const r = await sql`
        INSERT INTO replies (post_id, content)
        VALUES (${req.params.id}, ${content})
        RETURNING *
    `;

    res.json(r.rows[0]);
});

app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
    await sql`
        UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}
    `;
    res.json({ success: true });
});

/* -------------------- ADMIN (OPTIONAL) -------------------- */
app.post('/api/admin/clear', async (req, res) => {
    if (req.body.password !== ADMIN_PW) {
        return res.status(403).json({ error: "Forbidden" });
    }

    await sql`DELETE FROM replies`;
    await sql`DELETE FROM posts`;

    res.json({ success: true });
});

module.exports = app;
