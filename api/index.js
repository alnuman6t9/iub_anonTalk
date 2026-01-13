const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { sql } = require('@vercel/postgres');
const { Resend } = require('resend');

const app = express();
const resend = new Resend('re_b9C7J2Sn_JTjZopUrQqGG444KbTH7mmPw'); // <--- UPDATE THIS
const ADMIN_PW = 'Noman123'; 

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- DATABASE INIT ---
app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER REFERENCES posts(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS auth_codes (email TEXT PRIMARY KEY, code TEXT, expires TIMESTAMP);`;
        res.send("Database initialized.");
    } catch (e) { res.status(500).send(e.message); }
});

// --- IUB AUTH LOGIC ---
app.post('/api/auth/send-code', async (req, res) => {
    const { email } = req.body;
    if (!email.endsWith('@iub.edu.bd')) return res.status(400).json({ error: "IUB email only" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000);

    try {
        await sql`INSERT INTO auth_codes (email, code, expires) VALUES (${email}, ${code}, ${expires}) ON CONFLICT (email) DO UPDATE SET code = ${code}, expires = ${expires}`;
        await resend.emails.send({
            from: 'Void <onboarding@resend.dev>',
            to: email,
            subject: 'Your Verification Code',
            html: `Your Void code is: <strong>${code}</strong>`
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    const result = await sql`SELECT * FROM auth_codes WHERE email = ${email} AND code = ${code} AND expires > NOW()`;
    if (result.rows.length > 0) res.json({ success: true });
    else res.status(401).json({ error: "Invalid code" });
});

// --- POSTS LOGIC ---
app.get('/api/posts', async (req, res) => {
    const { filter } = req.query;
    let pQuery = (filter === 'hot') ? sql`SELECT * FROM posts ORDER BY likes DESC LIMIT 50` : 
                 (filter === 'old') ? sql`SELECT * FROM posts WHERE created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC` :
                 sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;
    const postsRes = await pQuery;
    const repliesRes = await sql`SELECT * FROM replies ORDER BY created_at ASC`;
    res.json(postsRes.rows.map(p => ({...p, replies: repliesRes.rows.filter(r => r.post_id === p.id)})));
});

app.post('/api/posts', async (req, res) => {
    const result = await sql`INSERT INTO posts (content) VALUES (${req.body.content}) RETURNING *`;
    res.json(result.rows[0]);
});

app.post('/api/posts/:id/reply', async (req, res) => {
    await sql`INSERT INTO replies (post_id, content) VALUES (${req.params.id}, ${req.body.content})`;
    res.json({ success: true });
});

app.post('/api/posts/:id/like', async (req, res) => {
    await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

app.post('/api/posts/:id/delete', async (req, res) => {
    if (req.body.password !== ADMIN_PW) return res.status(403).json({ error: "Denied" });
    await sql`DELETE FROM replies WHERE post_id = ${req.params.id}; DELETE FROM posts WHERE id = ${req.params.id};`;
    res.json({ success: true });
});

module.exports = app;