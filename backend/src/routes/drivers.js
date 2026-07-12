const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { status, region, dispatchable } = req.query;
  const clauses = [];
  const params = [];

  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  if (region) { params.push(region); clauses.push(`region = $${params.length}`); }
  if (dispatchable === 'true') {
    clauses.push(`status = 'Available' AND license_expiry >= CURRENT_DATE`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await db.query(`SELECT * FROM drivers ${where} ORDER BY id DESC`, params);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Driver not found.' });
  res.json(rows[0]);
});

router.post('/', authorize('fleet_manager', 'safety_officer'), async (req, res) => {
  try {
    const { name, license_number, license_category, license_expiry, contact_number, safety_score, region } = req.body;
    if (!name || !license_number || !license_category || !license_expiry) {
      return res.status(400).json({ error: 'Name, license number, category, and expiry are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, license_number, license_category, license_expiry, contact_number || null, safety_score || 100, region || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That license number is already registered.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Could not add the driver.' });
  }
});

router.put('/:id', authorize('fleet_manager', 'safety_officer'), async (req, res) => {
  try {
    const { name, license_category, license_expiry, contact_number, safety_score, status, region } = req.body;
    const { rows } = await db.query(
      `UPDATE drivers SET
        name = COALESCE($1, name),
        license_category = COALESCE($2, license_category),
        license_expiry = COALESCE($3, license_expiry),
        contact_number = COALESCE($4, contact_number),
        safety_score = COALESCE($5, safety_score),
        status = COALESCE($6, status),
        region = COALESCE($7, region),
        updated_at = now()
       WHERE id = $8 RETURNING *`,
      [name, license_category, license_expiry, contact_number, safety_score, status, region, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Driver not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update the driver.' });
  }
});

router.delete('/:id', authorize('fleet_manager'), async (req, res) => {
  await db.query('DELETE FROM drivers WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

module.exports = router;
