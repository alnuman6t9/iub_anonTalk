const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sql } = require('@vercel/postgres');
const { Resend } = require('resend');

const app = express();
const resend = new Resend('re_bBqa3WrU_28XJ1CCzj4vWL7XDzPbdukCF'); 
const ADMIN_PW = 'Noman123'; 

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/api/init', async (req, res) => {
    try {
        await sql`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, content TEXT NOT NULL, likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS replies (id SERIAL PRIMARY KEY, post_id INTEGER REFERENCES posts(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
        await sql`CREATE TABLE IF NOT EXISTS auth_codes (email TEXT PRIMARY KEY, code TEXT, expires TIMESTAMP);`;
        res.send("Database Initialized Successfully!");
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/auth/send-code', async (req, res) => {
    const { email } = req.body;
    if (!email.toLowerCase().endsWith('@iub.edu.bd')) return res.status(400).json({ error: "IUB email only" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000);
    try {
        await sql`INSERT INTO auth_codes (email, code, expires) VALUES (${email}, ${code}, ${expires}) ON CONFLICT (email) DO UPDATE SET code = ${code}, expires = ${expires}`;
        await resend.emails.send({
            from: 'IUB anonTalk <onboarding@resend.dev>',
            to: email,
            subject: 'Your anonTalk Access Code',
            html: `<div style="background:#000;color:#fff;padding:40px;text-align:center;font-family:sans-serif;border-radius:20px;">
                    <h1 style="letter-spacing:-2px;font-size:40px;">AnonTalk</h1>
                    <p style="color:#888;">Verification code for IUB Anonymous Talk</p>
                    <div style="background:rgba(255,255,255,0.1);padding:20px;border-radius:15px;margin:20px 0;font-size:32px;font-weight:bold;color:#a78bfa;border:1px solid #333;">${code}</div>
                    <p style="font-size:12px;color:#444;">Expired in 10 minutes. Please do not share this code.</p>
                   </div>`
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

app.get('/api/posts', async (req, res) => {
    const posts = (await sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT 50`).rows;
    const replies = (await sql`SELECT * FROM replies ORDER BY created_at ASC`).rows;
    res.json(posts.map(p => ({...p, replies: replies.filter(r => r.post_id === p.id)})));
});

app.post('/api/posts', async (req, res) => {
    const r = await sql`INSERT INTO posts (content) VALUES (${req.body.content}) RETURNING *`;
    res.json(r.rows[0]);
});

app.post('/api/posts/:id/like', async (req, res) => {
    await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${req.params.id}`;
    res.json({ success: true });
});

module.exports = app;
