import express from "express";
import pool from "./db";
import dotenv from "dotenv";
import cors from "cors";

const app = express();
dotenv.config();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/", (req, res) => { res.json({ msg: "hi" }); });

app.post("/jobs", async (req, res) => {
  try {
    const { recruiter_pubkey, company_name, role_name, job_description, amount, tx_signature, selected_roles } = req.body;
    console.log("[POST /jobs] selected_roles received:", selected_roles);
    if (!recruiter_pubkey || !company_name || !role_name || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    // Ensure selected_roles is a proper array
    const rolesArray = Array.isArray(selected_roles) ? selected_roles : [];

    const result = await pool.query(
      `INSERT INTO jobs (recruiter_pubkey, company_name, role_name, job_description, amount, tx_signature, selected_roles)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[]) RETURNING *`,
      [recruiter_pubkey, company_name, role_name, job_description ?? "", amount, tx_signature ?? "", rolesArray]
    );
    res.status(201).json({ job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/jobs", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM jobs ORDER BY created_at DESC`);
    res.json({ jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/jobs/recruiter/:pubkey", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM jobs WHERE recruiter_pubkey = $1 ORDER BY created_at DESC`,
      [req.params.pubkey]
    );
    res.json({ jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/jobs/:id", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: "Job not found" });
    res.json({ job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => { console.log("Server running on port 3000"); });