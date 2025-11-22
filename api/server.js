import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/api/articles", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM articles ORDER BY id DESC");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/articles", async (req, res) => {
  try {
    const { title, summary, content, category, slug } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO articles (title, summary, content, category, slug)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, summary, content, category, slug]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.listen(3000, () => {
  console.log("API Santé Planète en ligne sur port 3000");
});
