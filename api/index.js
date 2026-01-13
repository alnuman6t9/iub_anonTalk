const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { sql } = require('@vercel/postgres');

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_EMAIL = '2431986@iub.edu.bd';

/* ---------------- INIT DB ---------------- */
app.get('/api/init', async (req, res) => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

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

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* -*
