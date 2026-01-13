const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sql } = require('@vercel/postgres');
const { Resend } = require('resend');

const app = express();
// Your Resend API Key integrated
const resend = new Resend('re_bBqa3WrU_28XJ1CCzj4vWL7XDzPbdukCF'); 
const ADMIN_PW = 'admin123'; 

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// --- DATABASE SETUP ---
app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER REFERENCES posts(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS auth_codes (email TEXT PRIMARY KEY, code TEXT, expires TIMESTAMP);`;
        res.send("Database and Tables Initialized Successfully.");
    } catch (e) { res.status(500).send(e.message); }
});

// --- IUB AUTHENTICATION ---
app.post('/api/auth/send-code', async (req, res) => {
    const { email } = req.body;
    if (!email.toLowerCase().endsWith('@iub.edu.bd')) {
        return res.status(400).json({ error: "Only @iub.edu.bd emails are allowed." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000); // 10 min expiry

    try {
        await sql`INSERT INTO auth_codes (email, code, expires) VALUES (${email}, ${code}, ${expires}) 
                  ON CONFLICT (email) DO UPDATE SET code = ${code}, expires = ${expires}`;
        
        await resend.emails.send({
            from: 'Void <onboarding@resend.dev>',
            to: email,
            subject: 'VOID Access Code',
            html: `<div style="background:#000; color:#fff; padding:30px; font-family:sans-serif; border-radius:15px; text-align:center;">
                    <h1 style="letter-spacing:-2px;">VOID</h1>
                    <p style="color:#aaa;">Use the code below to verify your student status:</p>
                    <div style="font-size:32px; font-weight:bold; color:#a78bfa; margin:20px 0;">${code}</div>
                    <p style="font-size:12px; color:#555;">This code expires in 10 minutes.</p>
                   </div>`
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/verify', async (req, res) => {
    const { email, code } = req.body;
    const result = await sql`SELECT * FROM auth_codes WHERE email = ${email} AND code = ${code} AND expires > NOW()`;
    if (result.rows.length > 0) res.json({ success: true });
    else res.status(401).json({ error: "Invalid or expired code." });
});

// --- FEED LOGIC ---
app.get('/api/posts', async (req, res) => {
    const { filter } = req.query;
    let query;
    if (filter === 'hot') query = sql`SELECT * FROM posts ORDER BY likes DESC LIMIT 50`;
    else if (filter === 'old') query = sql`SELECT * FROM posts WHERE created_at < NOW() - INTERVAL '1 hour' ORDER BY created_at DESC`;
    else query = sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`;

    const posts = (await query).rows;
    const replies = (await sql`SELECT * FROM replies ORDER BY created_at ASC`).rows;
    res.json(posts.map(p => ({...p, replies: replies.filter(r => r.post_id === p.id)})));
});

app.post('/api/posts', async (req, res) => {
    const r = await sql`INSERT INTO posts (content) VALUES (${req.body.content}) RETURNING *`;
    res.json(r.rows[0]);
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
    if (req.body.password !== ADMIN_PW) return res.status(403).send("Unauthorized");
    await sql`DELETE FROM replies WHERE post_id = ${req.params.id}`;
    await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

module.exports = app;
