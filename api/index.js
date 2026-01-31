const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { sql } = require("@vercel/postgres");

const app = express();
const ADMIN_PW = "Nom@n123";

app.use(cors());
app.use(bodyParser.json());

// --- INIT DATABASE ---
app.get("/api/init", async (req, res) => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS suggestions (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        by_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    res.send("Database initialized");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// --- GET POSTS ---
app.get("/api/posts", async (req, res) => {
  const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
  const sugs = await sql`SELECT * FROM suggestions ORDER BY created_at ASC`;

  res.json(
    posts.rows.map(p => ({
      ...p,
      suggestions: sugs.rows.filter(s => s.post_id === p.id)
    }))
  );
});

// --- CREATE POST ---
app.post("/api/posts", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Empty post" });

  const result = await sql`
    INSERT INTO posts (content)
    VALUES (${content})
    RETURNING *
  `;
  res.json(result.rows[0]);
});

// --- ADD SUGGESTION ---
app.post("/api/posts/:id/suggest", async (req, res) => {
  const { content, admin } = req.body;
  await sql`
    INSERT INTO suggestions (post_id, content, by_admin)
    VALUES (${req.params.id}, ${content}, ${admin || false})
  `;
  res.json({ success: true });
});

// --- DELETE POST (ADMIN ONLY) ---
app.post("/api/posts/:id/delete", async (req, res) => {
  if (req.body.password !== ADMIN_PW_
